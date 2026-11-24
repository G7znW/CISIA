-- =============================================================
-- CISIA — banco de dados (Supabase / Postgres) — recriação completa
--
-- Rode no SQL Editor do Supabase (uma vez; pode rodar de novo quando quiser).
--
-- ATENÇÃO: este script APAGA as tabelas da CISIA que já existirem
-- (perfis, perguntas, respostas, notas, publicações, curtidas e mensagens)
-- e cria tudo de novo, já no formato que o site usa. As CONTAS de login
-- (Authentication > Users) são mantidas: cada uma ganha um perfil novo,
-- mas as contas de administrador precisam ser marcadas de novo (último passo).
--
-- Regras de segurança aplicadas (S-SDLC):
--  * Nada é legível sem login (o papel "anon" não tem acesso a nenhuma tabela).
--  * Quem escreveu o conteúdo é sempre o usuário logado (author_id = auth.uid()),
--    nunca um valor enviado pelo navegador. Nomes vêm de profiles.
--  * Privilégio mínimo: cada tabela libera só as colunas que o site realmente
--    precisa gravar (GRANT por coluna); o resto é impossível pelo navegador.
--  * Validação no servidor: tamanhos, listas de níveis/disciplinas e links
--    http(s) são conferidos aqui, não só no JavaScript do site.
--  * E-mails e dados de login ficam só em auth.users: nenhum perfil expõe e-mail.
-- =============================================================


-- ---------- 0. limpeza do que existia antes ----------
drop trigger if exists trg_handle_new_user on auth.users;

drop table if exists public.messages, public.project_reactions, public.projects,
  public.answer_ratings, public.question_ratings, public.answers, public.questions,
  public.profiles cascade;

drop function if exists public.rate_answer(uuid, int);
drop function if exists public.rate_question(uuid, int);
drop function if exists public.toggle_project_reaction(uuid);
drop function if exists public.mark_messages_read(text);
drop function if exists public.ensure_my_profile();
drop function if exists public.protect_moderation_fields();
drop function if exists public.handle_new_user();
drop function if exists public.create_profile(uuid, text, jsonb);
drop function if exists public.register_visit();
drop function if exists public.admin_set_banned(uuid, boolean);
drop function if exists public.admin_user_emails();
drop function if exists public.is_admin();
drop function if exists public.is_banned();

-- o bucket de anexos da versão anterior não era usado pelo site (só links)
do $$
begin
  drop policy if exists "attachments_public_read" on storage.objects;
  drop policy if exists "attachments_authenticated_upload" on storage.objects;
  delete from storage.buckets where id = 'attachments';
exception when others then
  raise notice 'Bucket "attachments" não removido (%). Se existir, apague em Storage.', sqlerrm;
end $$;


-- ---------- 1. perfis (1 por conta de login) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  role text not null default 'Aluno' check (role in ('Aluno', 'Professor')),
  level text not null check (level in ('Ensino Fundamental', 'Ensino Médio', 'Ensino Técnico', 'Ensino Superior')),
  bio text not null default '' check (char_length(bio) <= 500),
  company text not null default '' check (char_length(company) <= 100),
  school text not null default '' check (char_length(school) <= 100),
  streak int not null default 0 check (streak >= 0),
  last_access_date date,
  is_admin boolean not null default false,
  banned boolean not null default false,
  created_at timestamptz not null default now()
);

-- Funções usadas nas regras de acesso (security definer: leem profiles sem
-- cair em recursão das próprias regras; search_path vazio evita sequestro).
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

create function public.is_banned() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.banned from public.profiles p where p.id = auth.uid()), false);
$$;

-- Cria o perfil a partir dos dados do cadastro, sempre validando o que veio
-- do navegador (metadados do signUp são controlados por quem se cadastra).
create function public.create_profile(p_id uuid, p_email text, p_meta jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := left(btrim(coalesce(nullif(btrim(p_meta->>'nome'), ''), split_part(coalesce(p_email, ''), '@', 1))), 80);
  v_level text := p_meta->>'level';
  v_role text := p_meta->>'papel';
begin
  if v_name = '' then v_name := 'Usuário'; end if;
  if v_level is null or v_level not in ('Ensino Fundamental', 'Ensino Médio', 'Ensino Técnico', 'Ensino Superior') then
    v_level := 'Ensino Médio';
  end if;
  if v_role is null or v_role not in ('Aluno', 'Professor') then v_role := 'Aluno'; end if;
  insert into public.profiles (id, name, level, role) values (p_id, v_name, v_level, v_role)
  on conflict (id) do nothing;
end;
$$;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.create_profile(new.id, new.email, coalesce(new.raw_user_meta_data, '{}'::jsonb));
  return new;
end;
$$;

create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- contas que já existiam ganham perfil
do $$
begin
  perform public.create_profile(u.id, u.email, coalesce(u.raw_user_meta_data, '{}'::jsonb)) from auth.users u;
end $$;

alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or not public.is_banned());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()) and not public.is_banned())
  with check (id = (select auth.uid()));
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (bio, company, school) on public.profiles to authenticated;


-- ---------- 2. perguntas e respostas ----------
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 150),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  level text not null check (level in ('Ensino Fundamental', 'Ensino Médio', 'Ensino Técnico', 'Ensino Superior')),
  discipline text not null check (discipline in ('Matemática', 'Português', 'Física', 'Química', 'Biologia', 'História', 'Geografia', 'Programação', 'Inglês', 'Filosofia')),
  created_at timestamptz not null default now()
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index answers_question_id_idx on public.answers (question_id);

-- 1 nota (1 a 5) por pessoa em cada pergunta/resposta; não vale a própria.
create table public.question_ratings (
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  value smallint not null check (value between 1 and 5),
  primary key (question_id, user_id)
);

create table public.answer_ratings (
  answer_id uuid not null references public.answers(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  value smallint not null check (value between 1 and 5),
  primary key (answer_id, user_id)
);

alter table public.questions enable row level security;
create policy questions_select on public.questions for select to authenticated using (not public.is_banned());
create policy questions_insert on public.questions for insert to authenticated
  with check (author_id = (select auth.uid()) and not public.is_banned());
create policy questions_delete_admin on public.questions for delete to authenticated using (public.is_admin());

alter table public.answers enable row level security;
create policy answers_select on public.answers for select to authenticated using (not public.is_banned());
create policy answers_insert on public.answers for insert to authenticated
  with check (author_id = (select auth.uid()) and not public.is_banned());
create policy answers_delete_admin on public.answers for delete to authenticated using (public.is_admin());

alter table public.question_ratings enable row level security;
create policy question_ratings_select on public.question_ratings for select to authenticated using (not public.is_banned());
create policy question_ratings_insert on public.question_ratings for insert to authenticated
  with check (user_id = (select auth.uid()) and not public.is_banned()
    and not exists (select 1 from public.questions q where q.id = question_id and q.author_id = (select auth.uid())));
create policy question_ratings_update on public.question_ratings for update to authenticated
  using (user_id = (select auth.uid()) and not public.is_banned())
  with check (user_id = (select auth.uid()));

alter table public.answer_ratings enable row level security;
create policy answer_ratings_select on public.answer_ratings for select to authenticated using (not public.is_banned());
create policy answer_ratings_insert on public.answer_ratings for insert to authenticated
  with check (user_id = (select auth.uid()) and not public.is_banned()
    and not exists (select 1 from public.answers a where a.id = answer_id and a.author_id = (select auth.uid())));
create policy answer_ratings_update on public.answer_ratings for update to authenticated
  using (user_id = (select auth.uid()) and not public.is_banned())
  with check (user_id = (select auth.uid()));

revoke all on public.questions, public.answers, public.question_ratings, public.answer_ratings from anon, authenticated;
grant select, delete on public.questions, public.answers to authenticated;
grant insert (title, body, level, discipline) on public.questions to authenticated;
grant insert (question_id, body) on public.answers to authenticated;
grant select on public.question_ratings, public.answer_ratings to authenticated;
grant insert (question_id, value), update (value) on public.question_ratings to authenticated;
grant insert (answer_id, value), update (value) on public.answer_ratings to authenticated;


-- ---------- 3. publicações (projetos, artigos, TCCs, pesquisas) ----------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('Projeto extracurricular', 'Artigo científico', 'TCC', 'Pesquisa')),
  title text not null check (char_length(btrim(title)) between 1 and 150),
  description text not null check (char_length(btrim(description)) between 1 and 3000),
  link text check (link is null or (char_length(link) <= 500 and link ~* '^https?://\S+$')),
  document text check (document is null or (char_length(document) <= 500 and document ~* '^https?://\S+$')),
  created_at timestamptz not null default now()
);

create table public.project_reactions (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  primary key (project_id, user_id)
);

alter table public.projects enable row level security;
create policy projects_select on public.projects for select to authenticated using (not public.is_banned());
create policy projects_insert on public.projects for insert to authenticated
  with check (author_id = (select auth.uid()) and not public.is_banned());
create policy projects_delete_admin on public.projects for delete to authenticated using (public.is_admin());

alter table public.project_reactions enable row level security;
create policy project_reactions_select on public.project_reactions for select to authenticated using (not public.is_banned());
create policy project_reactions_insert on public.project_reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and not public.is_banned());
create policy project_reactions_delete_own on public.project_reactions for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.projects, public.project_reactions from anon, authenticated;
grant select, delete on public.projects to authenticated;
grant insert (kind, title, description, link, document) on public.projects to authenticated;
grant select, delete on public.project_reactions to authenticated;
grant insert (project_id) on public.project_reactions to authenticated;


-- ---------- 4. mensagens diretas ----------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  check (from_id <> to_id)
);
create index messages_to_id_idx on public.messages (to_id);
create index messages_from_id_idx on public.messages (from_id);

alter table public.messages enable row level security;
create policy messages_select on public.messages for select to authenticated
  using ((from_id = (select auth.uid()) or to_id = (select auth.uid())) and not public.is_banned());
create policy messages_insert on public.messages for insert to authenticated
  with check (from_id = (select auth.uid()) and not public.is_banned());
create policy messages_mark_read on public.messages for update to authenticated
  using (to_id = (select auth.uid()) and not public.is_banned())
  with check (to_id = (select auth.uid()));

revoke all on public.messages from anon, authenticated;
grant select on public.messages to authenticated;
grant insert (to_id, body) on public.messages to authenticated;
grant update (is_read) on public.messages to authenticated;


-- ---------- 5. funções que o site chama ----------
-- Sequência de dias ativos, calculada pelo banco (o navegador não escolhe o valor).
create function public.register_visit() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_last date;
begin
  select p.last_access_date into v_last from public.profiles p where p.id = auth.uid();
  if not found or v_last = v_today then return; end if;
  update public.profiles
    set streak = case when v_last = v_today - 1 then streak + 1 else 1 end,
        last_access_date = v_today
    where id = auth.uid();
end;
$$;

-- Banir / reativar: só administrador, nunca a si mesmo nem outro administrador.
create function public.admin_set_banned(p_user uuid, p_banned boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem fazer isso.' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'Você não pode banir a própria conta.' using errcode = '22023';
  end if;
  update public.profiles set banned = p_banned where id = p_user and not is_admin;
end;
$$;

-- E-mails ficam só em auth.users; o painel admin os lê por aqui.
create function public.admin_user_emails() returns table (id uuid, email text)
language sql stable security definer set search_path = '' as $$
  select u.id, u.email::text from auth.users u where public.is_admin();
$$;

-- Funções não são chamáveis por visitantes sem login; só o que o site usa é liberado.
revoke all on function public.is_admin(), public.is_banned(), public.create_profile(uuid, text, jsonb),
  public.handle_new_user(), public.register_visit(), public.admin_set_banned(uuid, boolean),
  public.admin_user_emails() from public, anon, authenticated;
grant execute on function public.is_admin(), public.is_banned(), public.register_visit(),
  public.admin_set_banned(uuid, boolean), public.admin_user_emails() to authenticated;


-- ---------- 6. tempo real ----------
-- Um aviso (e não um erro) se a tabela já estiver na publicação ou se faltar permissão.
do $$
declare t text;
begin
  foreach t in array array['profiles', 'questions', 'answers', 'question_ratings', 'answer_ratings',
                           'projects', 'project_reactions', 'messages'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when others then
      raise notice 'Tempo real: tabela % não adicionada (%). Habilite em Database > Replication.', t, sqlerrm;
    end;
  end loop;
end $$;


-- =============================================================
-- ÚLTIMO PASSO (manual): depois de criar sua conta pelo site, torne-a
-- administradora (troque pelo seu e-mail):
--
-- update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'seuemail@gmail.com');
-- =============================================================
