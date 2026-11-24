/* Diagnóstico de carregamento: se algum arquivo não carregar, mostra qual em vez de deixar a tela branca.
   (Arquivo separado e sem innerHTML com texto de erro, para valer com a política de segurança do navegador.) */
(function () {
  var failed = [];
  function show(title, lines) {
    var app = document.getElementById('app');
    if (!app) return;
    app.textContent = '';
    var box = document.createElement('div');
    box.style.cssText = 'max-width:640px;margin:48px auto;padding:20px;font:15px/1.5 system-ui,sans-serif;color:#eee;background:#1b1f2a;border:1px solid #444;border-radius:12px';
    var h = document.createElement('h2');
    h.style.margin = '0 0 8px';
    h.textContent = title;
    box.appendChild(h);
    lines.forEach(function (text) {
      var p = document.createElement('p');
      p.textContent = text;
      box.appendChild(p);
    });
    app.appendChild(box);
  }
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'SCRIPT' && t.src) {
      failed.push(t.src.replace(location.origin + '/', ''));
      var lines = ['Estes arquivos não foram encontrados (confira se estão nas pastas certas, como no README):'].concat(failed);
      if (failed.some(function (f) { return /config\.js$/.test(f); })) lines.push('O config.js vem do .env: abra o site por node --env-file=.env server.js em http://127.0.0.1:3000 (Live Server não serve).');
      show('A CISIA não conseguiu carregar', lines);
    } else if (e.message && !failed.length) {
      var app = document.getElementById('app');
      if (app && !app.children.length) show('A CISIA não conseguiu carregar', ['Erro de JavaScript: ' + e.message, 'Abra o Console (F12) para ver o arquivo e a linha.']);
    }
  }, true);
})();
