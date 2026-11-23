/* Gerador Inteligente de Programação: parâmetros → simulação → aprovação. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  PA.Pages = PA.Pages || {};
  const D = PA.Dates, C = PA.C, UI = PA.UI, Store = PA.Store, Sch = PA.Scheduler;
  const esc = UI.esc, icon = UI.icon;

  const G = { sel: null, params: null, planId: null, result: null, approved: {}, step: 1 };
  const FINAL = ['cancelada', 'concluida'];

  function ensure(plan) {
    if (G.planId !== plan.id) { G.planId = plan.id; G.sel = null; G.params = null; G.result = null; G.approved = {}; G.step = 1; }
    if (!G.params) G.params = Sch.defaultParams(plan);
    if (!G.sel) { G.sel = {}; plan.activities.forEach((a) => { if (!a.date && FINAL.indexOf(a.status) < 0) G.sel[a.id] = true; }); }
  }

  PA.Pages.generator = {
    title: 'Gerador de programação', subtitle: 'Gere, simule e aprove cronogramas otimizados',
    preselect(ids) { G.sel = {}; ids.forEach((i) => { G.sel[i] = true; }); G.result = null; G.step = 1; },
    render(view) {
      const plan = Store.plan(); ensure(plan);
      if (G.step === 2 && G.result) renderSim(view, plan); else renderSetup(view, plan);
    },
  };

  // =================================================================== Etapa 1
  function renderSetup(view, plan) {
    const p = G.params, S = plan.settings;
    const acts = plan.activities.filter((a) => FINAL.indexOf(a.status) < 0).sort((a, b) => (C.prio(b.priority).rank - C.prio(a.priority).rank) || (a.name < b.name ? -1 : 1));
    const n = Object.keys(G.sel).filter((k) => G.sel[k] && Store.activity(k)).length;
    const dayChip = (d) => '<button type="button" class="chip-btn ' + (p.allowedDays.indexOf(d) >= 0 ? 'on' : '') + '" data-day="' + d + '">' + D.WEEKDAYS_SHORT[d] + '</button>';
    const shift = (k) => { const s = p.shifts[k]; return '<div class="row wrap"><label class="check" style="min-width:90px"><input type="checkbox" data-shift="' + k + '" ' + (s.enabled ? 'checked' : '') + '> ' + C.PERIODS[k] + '</label><input type="time" data-shift-start="' + k + '" value="' + s.start + '" style="width:110px"><span>às</span><input type="time" data-shift-end="' + k + '" value="' + s.end + '" style="width:110px"></div>'; };
    const chk = (k, label, hint) => '<label class="check" title="' + esc(hint || '') + '"><input type="checkbox" data-p="' + k + '" ' + (p[k] ? 'checked' : '') + '> ' + esc(label) + '</label>';

    view.innerHTML =
      '<div class="page-head"><div><h1>Gerador Inteligente de Programação</h1><p>Selecione as propostas, defina os parâmetros e veja uma simulação antes de confirmar qualquer alteração.</p></div></div>' +
      '<div class="steps"><div class="step on"><b>1</b> Selecionar e configurar</div><div class="step"><b>2</b> Simulação</div><div class="step"><b>3</b> Aprovação</div></div>' +
      '<div class="grid g-main" style="align-items:start">' +
      '<div class="col" style="gap:16px">' +
      '<div class="card"><div class="card-h"><h2>' + icon('list') + 'Propostas a programar <span class="badge b-info" id="sel-n">' + n + '</span></h2><div class="row"><button class="btn sm" data-sel-all="pend">Apenas sem data</button><button class="btn sm" data-sel-all="all">Todas</button><button class="btn sm ghost" data-sel-all="none">Limpar</button></div></div>' +
      (acts.length ? '<div class="pick-list">' + acts.map((a) => '<label class="pick"><input type="checkbox" data-pick="' + a.id + '" ' + (G.sel[a.id] ? 'checked' : '') + '><span class="swatch" style="background:' + UI.catColor(a.category) + '"></span><div class="grow"><b>' + esc(a.name) + '</b><div class="small muted">' + esc([a.responsible, a.duration ? D.durLabel(a.duration) : 'sem duração', a.minDate || a.deadline ? D.rangeLabel(a.minDate || '…', a.deadline || '…') : '', a.date ? 'já em ' + D.br(a.date) : ''].filter(Boolean).join(' · ')) + '</div></div>' + (a.locked ? UI.badge('Fixa', 'b-purple') : '') + UI.prioBadge(a.priority) + '</label>').join('') + '</div>' : UI.empty('list', 'Nenhuma atividade disponível', 'Cadastre propostas para gerar a programação.', '<a class="btn primary" href="#/propostas">Ir para propostas</a>')) +
      '<p class="small muted mt-s">Atividades marcadas como <b>fixas</b> e já programadas são preservadas e nunca alteradas automaticamente. Atividades já programadas e não fixas, se selecionadas, poderão ser reposicionadas (você verá o antes e o depois).</p></div>' +
      '<div class="card"><div class="card-h"><h2>' + icon('zap') + 'Modo de geração</h2></div><div class="mode-cards">' +
      Object.keys(C.MODES).map((k) => '<button type="button" class="mode ' + (p.mode === k ? 'on' : '') + '" data-mode="' + k + '"><b>' + icon({ dia: 'calendar', horario: 'clock', hibrido: 'layers', prioridade: 'flag' }[k]) + C.MODES[k].label + '</b><span>' + esc(C.MODES[k].desc) + '</span></button>').join('') + '</div></div>' +
      '</div>' +
      '<div class="col" style="gap:16px">' +
      '<div class="card"><div class="card-h"><h2>' + icon('sliders') + 'Parâmetros</h2></div><div class="col">' +
      '<div class="grid g2" style="gap:10px">' + UI.field('Data inicial', '<input type="date" data-p="from" value="' + p.from + '">') + UI.field('Data final', '<input type="date" data-p="to" value="' + p.to + '">') + '</div>' +
      '<div class="chips"><button class="chip-btn" data-range="14">2 semanas</button><button class="chip-btn" data-range="30">30 dias</button><button class="chip-btn" data-range="60">60 dias</button><button class="chip-btn" data-range="90">90 dias</button></div>' +
      '<div><div class="lbl-txt mb" style="margin-bottom:6px">Dias da semana permitidos</div><div class="chips">' + [1, 2, 3, 4, 5, 6, 0].map(dayChip).join('') + '</div></div>' +
      '<div><div class="lbl-txt" style="margin-bottom:6px">Turnos e horários disponíveis</div><div class="col" style="gap:6px">' + shift('manha') + shift('tarde') + shift('noite') + '</div></div>' +
      '<div class="grid g2" style="gap:10px">' + UI.field('Máx. atividades por dia', '<input type="number" min="1" max="30" data-p="maxPerDay" value="' + p.maxPerDay + '">') + UI.field('Intervalo mínimo (min)', '<input type="number" min="0" step="5" data-p="minGap" value="' + p.minGap + '">') + UI.field('Duração padrão (min)', '<input type="number" min="5" step="5" data-p="defaultDuration" value="' + p.defaultDuration + '">', { hint: 'Para propostas sem duração.' }) + '</div>' +
      '<div class="col" style="gap:8px">' +
      chk('respectHolidays', 'Respeitar feriados', 'Não programar em feriados bloqueantes') + chk('respectBlocked', 'Respeitar datas bloqueadas') + chk('respectPriorities', 'Respeitar prioridades', 'Críticas e altas são alocadas primeiro e podem realocar prioridades menores') +
      chk('balance', 'Evitar concentração de atividades', 'Prefere dias com menos compromissos') + chk('avoidConsecutive', 'Evitar atividades consecutivas') + chk('considerPreferred', 'Considerar datas preferenciais') +
      chk('considerResources', 'Considerar disponibilidade de locais e responsáveis') + '</div>' +
      '</div></div>' +
      '<div class="card"><button class="btn primary" style="width:100%;justify-content:center;padding:12px" data-act="run">' + icon('play') + 'Gerar simulação</button><p class="small muted mt-s center">Nada será alterado até você aprovar a simulação.</p></div>' +
      '</div></div>';

    view.onclick = (e) => {
      const t = e.target, q = (s) => t.closest(s);
      const mode = q('[data-mode]'); if (mode) { p.mode = mode.dataset.mode; return PA.App.render(); }
      const day = q('[data-day]'); if (day) { const d = Number(day.dataset.day); const i = p.allowedDays.indexOf(d); if (i >= 0) p.allowedDays.splice(i, 1); else p.allowedDays.push(d); return day.classList.toggle('on'); }
      const rg = q('[data-range]'); if (rg) { p.to = D.addDays(p.from, Number(rg.dataset.range)); return PA.App.render(); }
      const sa = q('[data-sel-all]'); if (sa) {
        G.sel = {}; plan.activities.forEach((a) => { if (FINAL.indexOf(a.status) >= 0) return; if (sa.dataset.selAll === 'all' || (sa.dataset.selAll === 'pend' && !a.date)) G.sel[a.id] = true; }); return PA.App.render();
      }
      if (q('[data-act=run]')) return run();
    };
    view.onchange = (e) => {
      const t = e.target;
      if (t.dataset.pick) { G.sel[t.dataset.pick] = t.checked; view.querySelector('#sel-n').textContent = Object.keys(G.sel).filter((k) => G.sel[k] && Store.activity(k)).length; return; }
      if (t.dataset.p) { p[t.dataset.p] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? Number(t.value) : t.value; return; }
      if (t.dataset.shift) { p.shifts[t.dataset.shift].enabled = t.checked; return; }
      if (t.dataset.shiftStart) { p.shifts[t.dataset.shiftStart].start = t.value; return; }
      if (t.dataset.shiftEnd) { p.shifts[t.dataset.shiftEnd].end = t.value; }
    };

    function run() {
      const ids = Object.keys(G.sel).filter((k) => G.sel[k] && Store.activity(k));
      if (!ids.length) return UI.toast('Selecione ao menos uma atividade.', 'warn');
      if (!p.from || !p.to || p.from > p.to) return UI.toast('Informe um período válido (data inicial anterior à final).', 'warn');
      if (!p.allowedDays.length) return UI.toast('Selecione ao menos um dia da semana.', 'warn');
      if (!Object.keys(p.shifts).some((k) => p.shifts[k].enabled)) return UI.toast('Habilite ao menos um turno.', 'warn');
      if (p.maxPerDay < 1) return UI.toast('O máximo por dia deve ser pelo menos 1.', 'warn');
      G.result = Sch.generate(Store.plan(), ids, p); G.approved = {}; G.result.assignments.forEach((x) => { G.approved[x.activityId] = true; }); G.step = 2;
      PA.App.render(); window.scrollTo(0, 0);
    }
    void S;
  }

  // =================================================================== Etapa 2
  function monthsBetween(a, b) { const out = []; let m = D.startOfMonth(a); while (m <= b) { out.push(m); m = D.addMonths(m, 1); } return out; }

  function renderSim(view, plan) {
    const r = G.result, p = r.params, q = r.quality;
    const byId = {}; plan.activities.forEach((a) => { byId[a.id] = a; });
    const approvedList = r.assignments.filter((x) => G.approved[x.activityId]);
    const nApproved = approvedList.length;
    const wkRows = Object.keys(r.stats.byWeek).sort().map((w) => ({ label: D.short(w) + ' – ' + D.short(D.addDays(w, 6)), n: r.stats.byWeek[w] }));
    const prRows = ['critica', 'alta', 'media', 'baixa'].filter((k) => r.stats.byPriority[k]).map((k) => ({ label: C.PRIORITIES[k].label, n: r.stats.byPriority[k], color: C.PRIORITIES[k].color }));
    const col = UI.scoreColor(q.score);

    // Calendário
    const asg = {}; r.assignments.forEach((x) => { (asg[x.date] = asg[x.date] || []).push(x); });
    const dates = Object.keys(asg).sort();
    const from = dates.length ? dates[0] : p.from, to = dates.length ? dates[dates.length - 1] : p.to;
    const idx = PA.Specials.index(plan, D.startOfMonth(from), D.endOfMonth(to));
    const existing = {}; plan.activities.forEach((a) => { if (a.date && r.activityIds.indexOf(a.id) < 0 && FINAL.indexOf(a.status) < 0) (existing[a.date] = existing[a.date] || []).push(a); });
    const keptSet = r.kept;
    plan.activities.forEach((a) => { if (keptSet.indexOf(a.id) >= 0) (existing[a.date] = existing[a.date] || []).push(a); });
    const conflictIds = {}; r.conflicts.forEach((c) => c.activityIds.forEach((id) => { conflictIds[id] = true; }));

    const calHTML = monthsBetween(from, to).map((ms) => {
      const first = D.startOfWeek(ms), last = D.addDays(D.startOfWeek(D.endOfMonth(ms)), 6);
      let cells = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => '<div class="dow">' + d + '</div>').join('');
      D.range(first, last).forEach((d) => {
        const inM = d.slice(0, 7) === ms.slice(0, 7); const info = idx.get(d); const allowed = p.allowedDays.indexOf(D.weekday(d)) >= 0;
        const cls = ['day', inM ? '' : 'out', !allowed ? 'off' : '', info.blocked.length ? 'blocked' : info.restricted.length ? 'restricted' : '', d === D.today() ? 'today' : ''].join(' ');
        const evs = (existing[d] || []).map((a) => '<div class="ev old" style="--c:' + UI.actColor(a) + '" title="' + esc(a.name + ' (já programada)') + '"><span class="n">' + esc(a.name) + '</span></div>').join('') +
          (asg[d] || []).map((x) => { const a = byId[x.activityId]; return '<div class="ev new ' + (conflictIds[x.activityId] ? 'conf' : '') + '" style="--c:' + UI.actColor(a) + ';' + (G.approved[x.activityId] ? '' : 'opacity:.4;text-decoration:line-through') + '" title="' + esc(a.name + (x.startTime ? ' ' + x.startTime + '–' + x.endTime : '')) + '"><span class="t">' + (x.startTime || '') + '</span><span class="n">' + esc(a.name) + '</span></div>'; }).join('');
        const sp = info.occs.slice(0, 2).map((o) => '<span class="sp ' + o.eff + '" title="' + esc(o.name) + '">' + esc(o.name) + '</span>').join('');
        cells += '<div class="' + cls + '"><div class="dn"><b>' + D.parse(d).getDate() + '</b></div>' + sp + evs + '</div>';
      });
      return '<h3 style="margin:14px 0 8px;text-transform:capitalize">' + D.monthLabel(ms) + '</h3><div class="month">' + cells + '</div>';
    }).join('');

    view.innerHTML =
      '<div class="page-head"><div><h1>Simulação da programação</h1><p>Revise a proposta de cronograma. <b>Nada foi aplicado ainda.</b> Modo: ' + esc(C.MODES[p.mode].label) + ' · período ' + esc(D.rangeLabel(p.from, p.to)) + '</p></div>' +
      '<div class="row wrap"><button class="btn" data-act="params">' + icon('sliders') + 'Alterar parâmetros</button><button class="btn" data-act="regen">' + icon('refresh') + 'Regenerar</button><button class="btn" data-act="discard">' + icon('trash') + 'Descartar</button></div></div>' +
      '<div class="steps"><div class="step"><b>1</b> Selecionar e configurar</div><div class="step on"><b>2</b> Simulação</div><div class="step"><b>3</b> Aprovação</div></div>' +
      '<div class="grid g4 mb">' +
      '<div class="card kpi"><span class="lbl">Selecionadas</span><span class="val">' + r.stats.selected + '</span></div>' +
      '<div class="card kpi"><span class="lbl">Serão programadas</span><span class="val" style="color:var(--ok)">' + r.stats.scheduled + '</span><span class="small muted">' + (r.stats.kept ? r.stats.kept + ' fixa(s) preservada(s)' : '&nbsp;') + '</span></div>' +
      '<div class="card kpi"><span class="lbl">Ficaram sem data</span><span class="val" style="color:' + (r.stats.unscheduled ? 'var(--danger)' : 'var(--ok)') + '">' + r.stats.unscheduled + '</span></div>' +
      '<div class="card kpi"><span class="lbl">Conflitos / avisos</span><span class="val" style="color:' + (r.stats.conflicts ? 'var(--warn)' : 'var(--ok)') + '">' + r.stats.conflicts + '</span></div></div>' +
      '<div class="grid g-main" style="align-items:start"><div class="col" style="gap:16px">' +
      '<div class="card"><div class="card-h"><h2>' + icon('list') + 'Programação sugerida <span class="badge b-info">' + nApproved + ' de ' + r.assignments.length + ' marcadas</span></h2><div class="row"><button class="btn sm" data-all="1">Marcar todas</button><button class="btn sm ghost" data-all="0">Desmarcar</button></div></div>' +
      (r.assignments.length ? '<div class="table-wrap"><table class="t"><thead><tr><th></th><th>Data</th><th>Horário</th><th>Atividade</th><th>Por que esta data?</th><th></th></tr></thead><tbody>' +
        r.assignments.map((x) => { const a = byId[x.activityId]; const was = a.date ? '<div class="small" style="color:#b45309">Mudará de ' + esc(D.br(a.date)) + (a.startTime ? ' ' + a.startTime : '') + '</div>' : '';
          return '<tr><td><input type="checkbox" data-ap="' + a.id + '" ' + (G.approved[a.id] ? 'checked' : '') + ' aria-label="Aprovar"></td><td class="nowrap"><b>' + esc(D.WEEKDAYS_SHORT[D.weekday(x.date)] + ' ' + D.br(x.date)) + '</b></td><td class="nowrap">' + (x.startTime ? esc(x.startTime + '–' + x.endTime) : '<span class="muted">dia todo</span>') + '</td>' +
            '<td><div class="title-cell"><span class="swatch" style="background:' + UI.actColor(a) + '"></span><div><div class="nm">' + esc(a.name) + '</div><div class="sm">' + esc([a.responsible, a.location].filter(Boolean).join(' · ')) + '</div>' + was + '</div></div>' + (conflictIds[a.id] ? UI.badge('Aviso de conflito', 'b-warn') : '') + '</td>' +
            '<td style="max-width:340px"><details class="expl"><summary>' + esc(x.why[0] || 'Ver motivos') + '</summary><ul>' + x.why.map((w) => '<li>' + esc(w) + '</li>').join('') + '</ul></details></td><td class="act"><button class="btn sm ghost icon" data-edit-asg="' + a.id + '" title="Editar data/horário">' + icon('edit') + '</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="muted">Nenhuma atividade pôde ser alocada.</p>') + '</div>' +
      (r.unscheduled.length ? '<div class="card"><div class="card-h"><h2>' + icon('warning') + 'Sem data <span class="badge b-danger">' + r.unscheduled.length + '</span></h2></div><div class="col">' + r.unscheduled.map((u) => { const a = byId[u.activityId]; return '<div class="alert danger"><div class="txt"><b>' + esc(a.name) + '</b> ' + UI.prioBadge(a.priority) + '<div class="small">' + esc(u.reason) + '</div><div class="small" style="color:var(--primary)">' + esc(u.suggestion) + '</div></div></div>'; }).join('') + '</div><p class="small muted mt-s">As propostas sem data <b>não são excluídas</b>: permanecem no sistema.</p></div>' : '') +
      (r.conflicts.length ? '<div class="card"><div class="card-h"><h2>' + icon('warning') + 'Conflitos e avisos detectados</h2></div><div class="col">' + r.conflicts.map((c) => '<div class="alert warn">' + icon('warning') + '<div class="txt"><b>' + esc(c.typeLabel) + '</b> · ' + esc(D.br(c.date)) + ' ' + UI.sevBadge(c.severity) + '<div class="small">' + esc(c.description) + '</div></div></div>').join('') + '</div></div>' : '') +
      '<div class="card"><div class="card-h"><h2>' + icon('calendar') + 'Calendário da simulação</h2><div class="legend"><span><i class="swatch" style="background:#6366f1"></i>Nova</span><span><i class="swatch" style="background:#cbd5e1"></i>Já existente</span><span><i class="swatch" style="background:#fecaca"></i>Bloqueio</span><span><i class="swatch" style="background:#fde68a"></i>Restrição</span></div></div>' + calHTML + '</div>' +
      '</div><div class="col" style="gap:16px;position:sticky;top:76px">' +
      '<div class="card"><div class="row"><div class="score" style="--p:' + q.score + ';--c:' + col + '"><div><b>' + q.score + '</b><small>de 100</small></div></div><div><h3>Qualidade: ' + Sch.qualityLabel(q.score) + '</h3><p class="small muted">Índice calculado sobre a simulação atual.</p></div></div>' +
      '<div class="col mt" style="gap:7px">' + q.parts.map((x) => '<div><div class="row between small"><span>' + esc(x.label) + '</span><b>' + x.value + '/' + x.max + '</b></div><div class="progress"><i style="width:' + Math.round(100 * x.value / x.max) + '%;background:' + UI.scoreColor(100 * x.value / x.max) + '"></i></div><div class="small muted">' + esc(x.detail) + '</div></div>').join('') + '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Distribuição por semana</h3></div>' + (wkRows.length ? UI.barRows(wkRows) : '<p class="muted small">—</p>') + '<div class="card-h mt"><h3>Por prioridade</h3></div>' + (prRows.length ? UI.barRows(prRows) : '<p class="muted small">—</p>') + '</div>' +
      '<div class="card"><div class="card-h"><h3>Datas utilizadas (' + r.stats.usedDates.length + ')</h3></div><div class="chips">' + (r.stats.usedDates.map((d) => '<span class="badge b-info">' + D.short(d.date) + (d.count > 1 ? ' ×' + d.count : '') + '</span>').join('') || '<span class="muted small">—</span>') + '</div>' +
      '<div class="card-h mt"><h3>Datas evitadas (' + r.avoided.length + ')</h3></div><div class="col" style="gap:5px;max-height:190px;overflow:auto">' + (r.avoided.map((d) => '<div class="small"><b>' + D.short(d.date) + '</b> · ' + esc(d.reasons.join(', ')) + '</div>').join('') || '<span class="muted small">Nenhuma data útil bloqueada no período.</span>') + '</div></div>' +
      '<div class="card"><button class="btn primary" style="width:100%;justify-content:center;padding:12px" data-act="apply"' + (nApproved ? '' : ' disabled') + '>' + icon('check') + (nApproved === r.assignments.length ? 'Aprovar toda a programação' : 'Aprovar ' + nApproved + ' selecionada(s)') + '</button><p class="small muted mt-s center">Somente as atividades marcadas serão efetivadas.</p></div>' +
      '</div></div>';

    view.onclick = async (e) => {
      const t = e.target; const g = (s) => t.closest(s);
      if (g('[data-act=params]')) { G.step = 1; return PA.App.render(); }
      if (g('[data-act=regen]')) { G.params.seed = (G.params.seed || 0) + 1; G.result = Sch.generate(Store.plan(), r.activityIds, G.params); G.approved = {}; G.result.assignments.forEach((x) => { G.approved[x.activityId] = true; }); UI.toast('Nova alternativa gerada (variação ' + G.params.seed + ').'); return PA.App.render(); }
      if (g('[data-act=discard]')) { if (await UI.confirm({ title: 'Descartar simulação', message: 'Descartar esta simulação? Nenhuma atividade será alterada.', confirmLabel: 'Descartar' })) { G.result = null; G.step = 1; PA.App.render(); } return; }
      const all = g('[data-all]'); if (all) { r.assignments.forEach((x) => { G.approved[x.activityId] = all.dataset.all === '1'; }); return PA.App.render(); }
      const ed = g('[data-edit-asg]'); if (ed) return editAssignment(ed.dataset.editAsg);
      if (g('[data-act=apply]')) return apply();
    };
    view.onchange = (e) => { const t = e.target; if (t.dataset.ap) { G.approved[t.dataset.ap] = t.checked; PA.App.render(); } };

    function editAssignment(id) {
      const x = r.assignments.find((y) => y.activityId === id); const a = byId[id];
      UI.modal({
        title: 'Editar: ' + a.name, size: 'sm',
        body: '<div class="col"><div class="grid g2" style="gap:10px">' + UI.field('Data', '<input type="date" id="ed-d" value="' + x.date + '">') + UI.field('Início', '<input type="time" id="ed-t" value="' + (x.startTime || '') + '"' + (x.mode === 'dia' ? ' placeholder="--:--"' : '') + '>', { hint: x.mode === 'dia' ? 'Opcional (modo por dia).' : '' }) + '</div><p class="small muted">A simulação será reavaliada (conflitos e qualidade).</p></div>',
        footer: [{ label: 'Cancelar' }, { label: 'Aplicar', cls: 'primary', onClick: (m) => {
          const d = m.q('#ed-d').value, tm = m.q('#ed-t').value; if (!d) { UI.toast('Informe a data.', 'warn'); return false; }
          const dur = a.duration || p.defaultDuration; const list = r.assignments.map((y) => (y.activityId === id ? Object.assign({}, y, { date: d, startTime: tm, endTime: tm ? D.fromMin(D.toMin(tm) + dur) : '', why: ['Ajustada manualmente pelo usuário'].concat(y.why.slice(0, 0)) }) : y));
          G.result = Sch.evaluate(Store.plan(), r, list); list.forEach((y) => { if (G.approved[y.activityId] == null) G.approved[y.activityId] = true; }); UI.toast('Simulação reavaliada.'); PA.App.render(); return true;
        } }],
      });
    }

    async function apply() {
      const list = r.assignments.filter((x) => G.approved[x.activityId]);
      if (!list.length) return;
      const moved = list.filter((x) => byId[x.activityId].date);
      const ok = await UI.confirm({ title: 'Aprovar programação', confirmLabel: 'Confirmar e aplicar', html: '<p>Aplicar a programação de <b>' + list.length + '</b> atividade(s)?</p>' + (moved.length ? '<div class="notice warn">' + icon('warning') + '<div>' + moved.length + ' atividade(s) já programada(s) terão data/horário alterados. O histórico de cada uma registrará a mudança.</div></div>' : '') + (r.stats.unscheduled || list.length < r.assignments.length ? '<p class="small muted mt-s">As demais permanecerão como propostas, sem alteração.</p>' : '') });
      if (!ok) return;
      Store.applyAssignments(list.map((x) => ({ activityId: x.activityId, date: x.date, startTime: x.startTime, endTime: x.endTime, note: 'Gerador (' + C.MODES[p.mode].label.toLowerCase() + '), qualidade ' + q.score + '. ' + x.why.slice(0, 2).join('; ') })), 'Programação');
      UI.toast(list.length + ' atividade(s) programada(s).', 'ok', { label: 'Ver calendário', fn: () => UI.go('#/calendario') });
      G.result = null; G.step = 1; G.sel = null; PA.App.render();
    }
  }
})(window);
