-- =============================================================
-- CISIA — schema Supabase (Postgres)
-- Roda no SQL Editor do seu projeto (supabase.com/dashboard), uma vez só.
-- Substitui por completo o que o server.js fazia: login, perguntas,
-- respostas, avaliações, projetos, anexos e banimento de usuários.
--
-- Este script é seguro de rodar mais de uma vez (idempotente): se algo falhar
-- no meio e você rodar de novo, ele não reclama de "já existe".
-- =============================================================

create extension if not exists pgcrypto;

-- ---------- perfis (1 por conta do Supabase Auth) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null default '',
  level text,
  is_admin boolean not null default false,
  banned boolean not null default false,
  banned_reason text,
  banned_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Funções auxiliares (security definer: podem ler profiles sem
-- disparar recursão de RLS nas próprias policies que as usam).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_banned() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select banned from public.profiles where id = auth.uid()), false);
$$;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- Só quem é admin pode alterar banned/banned_reason/banned_at/is_admin —
-- mesmo que a policy acima permita o UPDATE em si (ex: trocar o próprio nível).
-- auth.uid() só existe quando a chamada vem de uma sessão logada (o app, com a
-- anon key); quando é nulo, é o SQL Editor ou a service role rodando direto no
-- banco — aí confiamos em quem tem acesso ao projeto (é assim que você promove
-- a primeira conta a admin, no passo final deste script).
create or replace function public.protect_moderation_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.banned := old.banned;
    new.banned_reason := old.banned_reason;
    new.banned_at := old.banned_at;
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_moderation on public.profiles;
create trigger trg_protect_moderation
  before update on public.profiles
  for each row execute function public.protect_moderation_fields();

-- Cria o perfil automaticamente ao cadastrar (nome/nível vêm do signUp)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, level)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'level'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- perguntas ----------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  level text not null,
  discipline text not null,
  author_name text not null,
  author_email text not null references public.profiles(email),
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.questions enable row level security;
drop policy if exists "questions_select_all" on public.questions;
create policy "questions_select_all" on public.questions for select using (true);
drop policy if exists "questions_insert_own" on public.questions;
create policy "questions_insert_own" on public.questions for insert
  with check (auth.jwt()->>'email' = author_email and not public.is_banned());
drop policy if exists "questions_delete_admin" on public.questions;
create policy "questions_delete_admin" on public.questions for delete using (public.is_admin());

-- ---------- respostas ----------
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  author_name text not null,
  author_email text not null references public.profiles(email),
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  ratings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.answers enable row level security;
drop policy if exists "answers_select_all" on public.answers;
create policy "answers_select_all" on public.answers for select using (true);
drop policy if exists "answers_insert_own" on public.answers;
create policy "answers_insert_own" on public.answers for insert
  with check (auth.jwt()->>'email' = author_email and not public.is_banned());
drop policy if exists "answers_delete_admin" on public.answers;
create policy "answers_delete_admin" on public.answers for delete using (public.is_admin());

-- Avaliação (1 a 5) via função: evita condição de corrida entre dois
-- avaliadores e impede que o cliente edite qualquer outro campo da resposta.
create or replace function public.rate_answer(p_answer_id uuid, p_value int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email text := auth.jwt()->>'email';
  v_author text;
  v_ratings jsonb;
begin
  if v_email is null then raise exception 'Faça login para avaliar.'; end if;
  if public.is_banned() then raise exception 'Sua conta foi removida da CISIA.'; end if;
  if p_value < 1 or p_value > 5 then raise exception 'Nota inválida.'; end if;

  select author_email, ratings into v_author, v_ratings
    from public.answers where id = p_answer_id for update;
  if v_author is null then raise exception 'Resposta não encontrada.'; end if;
  if v_author = v_email then raise exception 'Você não pode avaliar sua própria resposta.'; end if;

  update public.answers
    set ratings = jsonb_set(ratings, array[v_email], to_jsonb(p_value))
    where id = p_answer_id
    returning ratings into v_ratings;
  return v_ratings;
end;
$$;

-- ---------- projetos extracurriculares ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  area text not null,
  level text,
  author_name text not null,
  author_email text not null references public.profiles(email),
  links jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.projects enable row level security;
drop policy if exists "projects_select_all" on public.projects;
create policy "projects_select_all" on public.projects for select using (true);
drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects for insert
  with check (auth.jwt()->>'email' = author_email and not public.is_banned());
drop policy if exists "projects_delete_own_or_admin" on public.projects;
create policy "projects_delete_own_or_admin" on public.projects for delete
  using (auth.jwt()->>'email' = author_email or public.is_admin());

-- ---------- anexos (Storage) ----------
insert into storage.buckets (id, name, public)
  values ('attachments', 'attachments', true)
  on conflict (id) do nothing;
drop policy if exists "attachments_public_read" on storage.objects;
create policy "attachments_public_read" on storage.objects
  for select using (bucket_id = 'attachments');
drop policy if exists "attachments_authenticated_upload" on storage.objects;
create policy "attachments_authenticated_upload" on storage.objects
  for insert with check (bucket_id = 'attachments' and auth.role() = 'authenticated');

-- ---------- tempo real ----------
-- Isolado num bloco que nunca derruba o resto do script: se sua conta não tiver
-- permissão para mexer na publication, ou a tabela já estiver nela, isso só
-- gera um aviso (RAISE NOTICE) em vez de desfazer tudo que veio antes.
do $$
declare
  t text;
begin
  foreach t in array array['questions','answers','projects','profiles'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when others then
      raise notice 'Tempo real: não foi possível adicionar a tabela % (% ) — provavelmente já estava adicionada, ou habilite manualmente em Database > Replication.', t, sqlerrm;
    end;
  end loop;
end $$;

-- =============================================================
-- ÚLTIMO PASSO (rode manualmente, depois de criar sua própria conta pela
-- tela de cadastro do app): torna você um administrador da CISIA.
-- =============================================================
-- update public.profiles set is_admin = true where email = 'seuemail@gmail.com';
