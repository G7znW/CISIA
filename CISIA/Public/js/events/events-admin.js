/* Eventos do painel administrativo (o banco só aceita se a conta for admin) */
function bindAdminEvents() {
  app.querySelectorAll('[data-toggle-ban]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const email = emailKey(btn.getAttribute('data-toggle-ban'));
      await Api.setBanned(email, !isBanned(email));
    });
  });

  app.querySelectorAll('[data-remove-question]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Remover esta pergunta e todas as respostas dela?')) await Api.removeQuestion(btn.getAttribute('data-remove-question'));
    });
  });
  app.querySelectorAll('[data-remove-project]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Remover esta publicação?')) await Api.removeProject(btn.getAttribute('data-remove-project'));
    });
  });
}
