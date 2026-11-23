/* Aplicação: roteador, menu lateral e barra superior. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  const UI = PA.UI, Store = PA.Store, esc = UI.esc, icon = UI.icon;

  const ROUTES = [
    { path: 'dashboard', label: 'Dashboard', icon: 'grid', page: 'dashboard' },
    { path: 'propostas', label: 'Propostas de atividades', icon: 'list', page: 'proposals' },
    { path: 'gerador', label: 'Gerador de programação', icon: 'zap', page: 'generator' },
    { path: 'calendario', label: 'Calendário', icon: 'calendar', page: 'calendar' },
    { path: 'central', label: 'Central de compromissos', icon: 'checksq', page: 'center' },
    { path: 'datas', label: 'Datas especiais', icon: 'flag', page: 'specials' },
    { path: 'conflitos', label: 'Conflitos e validações', icon: 'warning', page: 'conflicts', badge: true },
    { path: 'relatorios', label: 'Relatórios', icon: 'file', page: 'reports' },
    { path: 'configuracoes', label: 'Configurações', icon: 'sliders', page: 'settings' },
  ];

  function parseHash() {
    const h = (location.hash || '#/dashboard').replace(/^#\/?/, ''); const parts = h.split('?'); const params = {};
    (parts[1] || '').split('&').filter(Boolean).forEach((kv) => { const p = kv.split('='); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
    return { path: parts[0] || 'dashboard', params };
  }

  const App = {
    render() {
      const { path, params } = parseHash();
      const route = ROUTES.find((r) => r.path === path) || ROUTES[0];
      const plan = Store.plan();
      const conflicts = PA.Conflicts.active(PA.Conflicts.detect(plan)).length;
      document.getElementById('sidebar').innerHTML =
        '<div class="brand"><div class="logo">' + icon('calendar') + '</div><div><b>Planejador Inteligente</b><span>de Atividades</span></div></div>' +
        '<nav class="nav">' + ROUTES.map((r) => '<a href="#/' + r.path + '" class="' + (r === route ? 'active' : '') + '"' + (r === route ? ' aria-current="page"' : '') + '>' + icon(r.icon) + '<span>' + esc(r.label) + '</span>' + (r.badge && conflicts ? '<span class="count">' + conflicts + '</span>' : '') + '</a>').join('') + '</nav>' +
        '<div class="side-foot"><label for="plan-sel">Planejamento</label><select id="plan-sel">' + Store.plans().map((p) => '<option value="' + p.id + '"' + (p.id === plan.id ? ' selected' : '') + '>' + esc(p.settings.name) + '</option>').join('') + '</select></div>';
      document.getElementById('plan-sel').onchange = (e) => Store.setCurrent(e.target.value);
      document.getElementById('topbar').innerHTML = '<button class="btn ghost icon menu-btn" id="menu-btn" aria-label="Abrir menu">' + icon('menu') + '</button><div class="grow"><h1>' + esc(route.label) + '</h1></div><span class="sub">' + esc(plan.settings.name) + ' · ' + (plan.settings.city ? esc(plan.settings.city) + '/' : '') + esc(plan.settings.state) + '</span>';
      document.getElementById('menu-btn').onclick = () => toggle(true);
      const view = document.getElementById('view');
      const sy = root.scrollY;
      view.onclick = view.onchange = view.ondragstart = view.ondragover = view.ondrop = view.ondragend = view.onkeydown = null;
      try { PA.Pages[route.page].render(view, params); } catch (err) { console.error(err); view.innerHTML = '<div class="card">' + UI.empty('warning', 'Ocorreu um erro ao exibir esta página', String(err && err.message || err), '<a class="btn primary" href="#/dashboard">Voltar ao dashboard</a>') + '</div>'; }
      if (App._last === route.path) root.scrollTo(0, sy); else { root.scrollTo(0, 0); view.focus({ preventScroll: true }); }
      App._last = route.path; document.title = route.label + ' · Planejador Inteligente';
      toggle(false);
    },
  };
  function toggle(open) { document.getElementById('sidebar').classList.toggle('open', open); document.getElementById('backdrop').classList.toggle('show', open); }

  PA.App = App;
  Store.subscribe((kind) => { if (kind === 'plan') App._last = null; App.render(); });
  root.addEventListener('hashchange', App.render);
  document.getElementById('backdrop').onclick = () => toggle(false);
  if (!location.hash) location.replace('#/dashboard');
  App.render();
})(window);
