/* Dashboard principal. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  PA.Pages = PA.Pages || {};
  const D = PA.Dates, C = PA.C, UI = PA.UI, Store = PA.Store, I = PA.Insights;
  const esc = UI.esc, icon = UI.icon;

  PA.Pages.dashboard = {
    title: 'Dashboard', subtitle: 'Visão geral do planejamento',
    render(view) {
      const plan = Store.plan();
      const st = I.stats(plan);
      const alerts = I.alerts(plan, st);
      const sugg = I.suggestions(plan, st).slice(0, 6);
      const kpi = (lbl, val, ic, color, bg, link, sub) => '<div class="card kpi link"><a class="stretch" href="' + link + '" aria-label="' + esc(lbl) + '"></a><span class="lbl">' + esc(lbl) + '</span><span class="val">' + val + '</span><span class="small muted">' + (sub || '&nbsp;') + '</span><span class="ico" style="background:' + bg + ';color:' + color + '">' + icon(ic) + '</span></div>';
      const specials = I.nextSpecialsList(plan, 6);

      const catRows = Object.keys(st.byCategory).sort((a, b) => st.byCategory[b] - st.byCategory[a]).map((k) => ({ label: k, n: st.byCategory[k], color: UI.catColor(k) }));
      const statusRows = Object.keys(C.STATUSES).filter((k) => st.byStatus[k]).map((k) => ({ label: C.STATUSES[k].label, n: st.byStatus[k], color: C.STATUSES[k].color }));
      const prioRows = ['critica', 'alta', 'media', 'baixa'].filter((k) => st.byPriority[k]).map((k) => ({ label: C.PRIORITIES[k].label, n: st.byPriority[k], color: C.PRIORITIES[k].color }));
      const ico = { danger: 'warning', warn: 'warning', info: 'calendar', ok: 'checkc' };

      view.innerHTML =
        '<div class="page-head"><div><h1>' + esc(plan.settings.name) + '</h1><p>' + (plan.settings.city ? esc(plan.settings.city) + '/' : '') + esc(plan.settings.state) + ' · ano de referência ' + plan.settings.year + '</p></div>' +
        '<div class="row wrap"><button class="btn" data-act="quick">' + icon('wand') + 'Entrada rápida</button><button class="btn primary" data-act="new">' + icon('plus') + 'Nova proposta</button></div></div>' +
        '<div class="grid g4 mb">' +
        kpi('Propostas', st.total, 'list', '#4f46e5', '#eef2ff', '#/propostas', 'cadastradas no planejamento') +
        kpi('Aprovadas', st.approved, 'checkc', '#0891b2', '#e0f2fe', '#/central?status=aprovada', 'prontas ou já em andamento') +
        kpi('Pendentes de validação', st.pending, 'clock', '#7c3aed', '#ede9fe', '#/propostas?status=pendente', 'propostas e em validação') +
        kpi('Programadas', st.scheduled, 'calendar', '#2563eb', '#dbeafe', '#/calendario', 'com data no calendário') +
        kpi('Com conflitos', st.withConflict, 'warning', st.withConflict ? '#dc2626' : '#16a34a', st.withConflict ? '#fee2e2' : '#dcfce7', '#/conflitos', st.conflictCount + ' conflito(s) abertos') +
        kpi('Datas bloqueadas/restritas', st.blockedDays60, 'ban', '#d97706', '#fef3c7', '#/datas', 'nos próximos 60 dias') +
        kpi('Sem data definida', st.unscheduled, 'flag', '#0d9488', '#ccfbf1', '#/gerador', 'aguardando programação') +
        '<div class="card"><div class="row"><div class="donut" style="--p:' + st.organizedPct + '" data-label="' + st.organizedPct + '%"></div><div><b>Propostas organizadas</b><p class="small muted">' + (st.total - st.unscheduled - st.canceled) + ' de ' + (st.total - st.canceled) + ' com data ou concluídas</p></div></div></div>' +
        '</div>' +
        '<div class="grid g-main">' +
        '<div class="col" style="gap:16px">' +
        '<div class="card"><div class="card-h"><h2>' + icon('bolt') + 'Alertas inteligentes</h2></div>' +
        (alerts.length ? '<div class="alert-list">' + alerts.map((a) => '<div class="alert ' + a.level + '">' + icon(ico[a.level] || 'info') + '<div class="txt">' + esc(a.text) + '</div>' + (a.linkLabel ? '<a class="btn sm" href="' + a.link + '">' + esc(a.linkLabel) + '</a>' : '') + '</div>').join('') + '</div>' : UI.empty('checkc', 'Tudo em ordem', 'Nenhum alerta no momento.')) + '</div>' +
        '<div class="card"><div class="card-h"><h2>' + icon('star') + 'Sugestões do assistente</h2><span class="small muted">Nada é alterado sem a sua aprovação</span></div>' +
        (sugg.length ? sugg.map((s) => '<div class="list-item">' + '<span class="date-box" style="width:38px;background:#f5f3ff;color:#7c3aed;padding:9px 0">' + icon(s.icon) + '</span><div class="grow"><div>' + esc(s.text) + '</div><details class="expl"><summary>Por que sugiro isso?</summary><ul><li>' + esc(s.why) + '</li></ul></details></div><a class="btn sm" href="' + s.link + '">' + esc(s.linkLabel) + '</a></div>').join('') : UI.empty('star', 'Sem sugestões', 'Cadastre propostas para receber sugestões.')) + '</div>' +
        '<div class="card"><div class="card-h"><h2>' + icon('calendar') + 'Próximos compromissos</h2><a class="btn sm ghost" href="#/central">Ver todos</a></div>' +
        (st.upcoming.length ? st.upcoming.map((a) => { const d = D.parse(a.date); return '<div class="list-item"><div class="date-box"><b>' + d.getDate() + '</b><span>' + D.MONTHS[d.getMonth()].slice(0, 3) + '</span></div><div class="grow"><b class="nm">' + esc(a.name) + '</b><div class="small muted">' + esc(D.WEEKDAYS[d.getDay()]) + (a.startTime ? ' · ' + esc(UI.timeRange(a)) : ' · dia todo') + (a.responsible ? ' · ' + esc(a.responsible) : '') + '</div></div>' + UI.statusBadge(a.status) + '<button class="btn sm ghost" data-detail="' + a.id + '">Abrir</button></div>'; }).join('') : UI.empty('calendar', 'Nada programado à frente', 'Use o gerador para organizar suas propostas.', '<a class="btn primary" href="#/gerador">' + icon('zap') + 'Abrir gerador</a>')) + '</div>' +
        '</div>' +
        '<div class="col" style="gap:16px">' +
        '<div class="card"><div class="card-h"><h2>Datas especiais próximas</h2><a class="btn sm ghost" href="#/datas">Gerenciar</a></div>' +
        (specials.length ? specials.map((o) => '<div class="list-item"><div class="date-box" style="background:' + (o.eff === 'bloqueio' ? '#fee2e2;color:#b91c1c' : o.eff === 'restricao' ? '#fef3c7;color:#b45309' : o.eff === 'preferencial' ? '#dcfce7;color:#15803d' : '#eef2f7;color:#475569') + '"><b>' + D.parse(o.start).getDate() + '</b><span>' + D.MONTHS[D.parse(o.start).getMonth()].slice(0, 3) + '</span></div><div class="grow"><b>' + esc(o.name) + '</b><div class="small muted">' + esc(C.IMPACTS[o.eff].label) + (o.confirmed === false || o.needsReview ? ' · <span style="color:#b45309">precisa de revisão</span>' : '') + '</div></div></div>').join('') : '<p class="muted">Nenhuma data especial nos próximos 120 dias.</p>') + '</div>' +
        '<div class="card"><div class="card-h"><h2>Por status</h2></div>' + (statusRows.length ? UI.barRows(statusRows) : '<p class="muted">Sem dados.</p>') + '</div>' +
        '<div class="card"><div class="card-h"><h2>Por prioridade</h2></div>' + (prioRows.length ? UI.barRows(prioRows) : '<p class="muted">Sem dados.</p>') + '</div>' +
        '<div class="card"><div class="card-h"><h2>Por categoria</h2></div>' + (catRows.length ? UI.barRows(catRows) : '<p class="muted">Sem dados.</p>') + '</div>' +
        '</div></div>';

      view.onclick = (e) => {
        const d = e.target.closest('[data-detail]'); if (d) return PA.Forms.detail(d.dataset.detail);
        const b = e.target.closest('[data-act]'); if (!b) return;
        if (b.dataset.act === 'quick') PA.Forms.quickEntry(); else if (b.dataset.act === 'new') PA.Forms.activityForm(null, null, { onSaved: () => PA.App.render() });
      };
    },
  };
})(window);
