/* Indicadores, alertas e sugestões inteligentes (sempre explicáveis; nunca aplicam nada sozinhos). */
(function (root) {
  const PA = (root.PA = root.PA || {});
  const D = PA.Dates, C = PA.C, P = PA.Planner, Cf = PA.Conflicts;

  const UNSCHEDULABLE = ['cancelada', 'concluida'];

  function stats(plan, ctx) {
    const acts = plan.activities;
    const today = D.today();
    const conflicts = (ctx && ctx.conflicts) || Cf.detect(plan);
    const act = Cf.active(conflicts);
    const conflictIds = {}; act.forEach((c) => c.activityIds.forEach((id) => { conflictIds[id] = true; }));
    const live = acts.filter((a) => a.status !== 'cancelada');
    const s = {
      total: acts.length,
      approved: acts.filter((a) => C.APPROVED_STATUSES.indexOf(a.status) >= 0).length,
      pending: acts.filter((a) => a.status === 'proposta' || a.status === 'validacao').length,
      scheduled: acts.filter((a) => P.isScheduled(a)).length,
      withConflict: Object.keys(conflictIds).length,
      conflictCount: act.length,
      completed: acts.filter((a) => a.status === 'concluida').length,
      canceled: acts.filter((a) => a.status === 'cancelada').length,
      unscheduled: live.filter((a) => !a.date && a.status !== 'concluida').length,
      noDuration: live.filter((a) => !a.duration && a.status !== 'concluida').length,
    };
    const base = live.length || 1;
    s.organizedPct = Math.round((100 * live.filter((a) => a.date || a.status === 'concluida').length) / base);
    const idx = PA.Specials.index(plan, today, D.addDays(today, 60));
    let blocked = 0, special = 0;
    D.range(today, D.addDays(today, 60)).forEach((d) => { const i = idx.get(d); if (i.blocked.length || i.restricted.length) blocked++; if (i.occs.length) special++; });
    s.blockedDays60 = blocked; s.specialDays60 = special;
    s.nextSpecial = idx.occs.filter((o) => o.start >= today && o.eff !== 'neutro').sort((a, b) => (a.start < b.start ? -1 : 1))[0] || null;
    s.upcoming = acts.filter((a) => P.isScheduled(a) && a.date >= today).sort((a, b) => ((a.date + (a.startTime || '99')) < (b.date + (b.startTime || '99')) ? -1 : 1)).slice(0, 6);
    s.byStatus = {}; acts.forEach((a) => { s.byStatus[a.status] = (s.byStatus[a.status] || 0) + 1; });
    s.byCategory = {}; acts.forEach((a) => { s.byCategory[a.category] = (s.byCategory[a.category] || 0) + 1; });
    s.byPriority = {}; acts.forEach((a) => { s.byPriority[a.priority] = (s.byPriority[a.priority] || 0) + 1; });
    s.holidayActs = acts.filter((a) => P.isScheduled(a) && act.some((c) => c.type === 'feriado' && c.activityIds.indexOf(a.id) >= 0)).length;
    s.conflicts = conflicts;
    return s;
  }

  function alerts(plan, st) {
    st = st || stats(plan);
    const out = [];
    const add = (level, text, link, linkLabel) => out.push({ level, text, link, linkLabel });
    const act = Cf.active(st.conflicts);
    const time = act.filter((c) => ['mesmo_horario', 'responsavel', 'local', 'fixa_flexivel', 'intervalo'].indexOf(c.type) >= 0);
    const timeActs = {}; time.forEach((c) => c.activityIds.forEach((id) => { timeActs[id] = 1; }));
    if (Object.keys(timeActs).length) add('danger', Object.keys(timeActs).length + ' atividade(s) com conflito de horário, responsável ou local.', '#/conflitos', 'Ver conflitos');
    if (st.holidayActs) add('danger', st.holidayActs + ' atividade(s) programada(s) em feriados.', '#/conflitos', 'Resolver');
    const blocked = act.filter((c) => c.type === 'bloqueada').length;
    if (blocked) add('danger', blocked + ' atividade(s) programada(s) em datas bloqueadas.', '#/conflitos', 'Resolver');
    const special = act.filter((c) => c.type === 'data_especial').length;
    if (special) add('warn', special + ' atividade(s) coincidem com datas especiais de restrição parcial.', '#/conflitos', 'Revisar');
    if (st.noDuration) add('warn', st.noDuration + ' proposta(s) ainda não possuem duração definida.', '#/propostas', 'Completar');
    const hi = plan.activities.filter((a) => !a.date && C.prio(a.priority).rank >= 3 && UNSCHEDULABLE.indexOf(a.status) < 0);
    if (hi.length) add('warn', hi.length + ' atividade(s) de prioridade alta/crítica ainda não programada(s).', '#/gerador', 'Programar');
    const review = PA.Specials.occurrences(plan, D.today(), D.addDays(D.today(), 90)).filter((o) => o.needsReview || o.confirmed === false);
    const uniq = {}; review.forEach((o) => { uniq[o.srcId || o.id] = 1; });
    if (Object.keys(uniq).length) add('info', Object.keys(uniq).length + ' data(s) especial(is) nos próximos 90 dias ainda precisam de revisão/confirmação.', '#/datas', 'Revisar datas');
    if (st.nextSpecial) { const dd = D.diffDays(D.today(), st.nextSpecial.start); add('info', 'Próxima data especial em ' + (dd === 0 ? 'hoje' : dd + ' dia(s)') + ': ' + st.nextSpecial.name + ' (' + D.br(st.nextSpecial.start) + ').', '#/datas', 'Ver datas'); }
    if (st.total) add(st.organizedPct >= 80 ? 'ok' : 'info', 'Cronograma com ' + st.organizedPct + '% de preenchimento.', '#/gerador', st.organizedPct >= 100 ? '' : 'Programar restantes');
    return out;
  }

  function suggestions(plan, st) {
    st = st || stats(plan);
    const out = [];
    const S = plan.settings;
    const acts = plan.activities.filter(P.isScheduled);
    const weeks = {}; acts.forEach((a) => { const w = D.startOfWeek(a.date); (weeks[w] = weeks[w] || []).push(a); });
    Object.keys(weeks).sort().forEach((w) => {
      const n = weeks[w].length, lim = S.overloadWeek || 10;
      if (n > lim) out.push({ icon: 'layers', text: 'A semana de ' + D.short(w) + ' possui muitos compromissos (' + n + '). Sugiro transferir ' + Math.min(3, n - lim) + ' atividade(s) flexíveis para a semana seguinte.', why: 'Limite de referência por semana: ' + lim + '.', link: '#/calendario', linkLabel: 'Abrir calendário' });
    });
    if (acts.length >= 6) {
      const dates = acts.map((a) => a.date).sort(); const days = {}; dates.forEach((d) => { days[d] = 1; });
      const span = Math.max(1, D.diffDays(dates[0], dates[dates.length - 1]) + 1);
      if (Object.keys(days).length / span < 0.25 && span > 10) out.push({ icon: 'layers', text: 'A programação atual está concentrada em poucos dias (' + Object.keys(days).length + ' dias em um intervalo de ' + span + ').', why: 'Mais dias livres podem ser usados para equilibrar a carga.', link: '#/gerador', linkLabel: 'Gerar distribuição equilibrada' });
    }
    plan.activities.filter((a) => !a.date && C.prio(a.priority).rank >= 3 && UNSCHEDULABLE.indexOf(a.status) < 0).slice(0, 3).forEach((a) => {
      out.push({ icon: 'flag', text: '"' + a.name + '" possui prioridade ' + C.prio(a.priority).label.toLowerCase() + ' e ainda não foi programada.', why: 'Atividades críticas e de alta prioridade são alocadas primeiro pelo gerador.', link: '#/gerador', linkLabel: 'Programar' });
    });
    const pend = plan.activities.filter((a) => !a.date && ['aprovada', 'aguardando'].indexOf(a.status) >= 0);
    if (pend.length) out.push({ icon: 'calendar', text: 'Existem ' + pend.length + ' proposta(s) aprovada(s) que podem ser programadas agora.', why: 'Status "Aprovada" ou "Aguardando programação" e sem data definida.', link: '#/gerador', linkLabel: 'Abrir gerador' });
    plan.activities.filter((a) => a.preferredDate && UNSCHEDULABLE.indexOf(a.status) < 0).forEach((a) => {
      const i = PA.Specials.index(plan, a.preferredDate, a.preferredDate).get(a.preferredDate);
      const o = i.occs.find((x) => x.eff === 'bloqueio' || x.eff === 'restricao');
      if (o) out.push({ icon: 'alert', text: 'A data escolhida para "' + a.name + '" coincide com ' + o.name + '. Deseja buscar outra data?', why: o.rule || o.description || 'Data com ' + C.IMPACTS[o.eff].label.toLowerCase() + '.', link: '#/propostas?validar=' + a.id, linkLabel: 'Ver alternativas' });
    });
    const locDay = {}; acts.forEach((a) => { if (a.location) { const k = a.date + '|' + P.norm(a.location); (locDay[k] = locDay[k] || []).push(a); } });
    const shared = Object.keys(locDay).filter((k) => locDay[k].length >= 2);
    if (shared.length) out.push({ icon: 'pin', text: 'Existem ' + shared.length + ' dia(s) com 2 ou mais atividades no mesmo local, o que otimiza a agenda e a logística.', why: 'Exemplo: ' + locDay[shared[0]].map((a) => a.name).join(' + ') + ' em ' + D.br(shared[0].split('|')[0]) + '.', link: '#/calendario', linkLabel: 'Ver calendário' });
    if (acts.length) {
      const today = D.today(); const ctx = P.createContext(plan, { from: today, to: D.addDays(today, 30) });
      const free = D.range(today, D.addDays(today, 30)).filter((d) => { const i = ctx.dayInfo(d); return i.allowedDay && !i.hard && i.count === 0 && !i.restricted.length; });
      if (free.length) out.push({ icon: 'sparkles', text: 'O dia ' + D.br(free[0]) + ' (' + D.WEEKDAYS[D.weekday(free[0])] + ') apresenta a melhor disponibilidade: está totalmente livre.', why: free.length + ' dia(s) livres nos próximos 30 dias.', link: '#/gerador', linkLabel: 'Programar' });
    }
    if (st.noDuration) out.push({ icon: 'clock', text: st.noDuration + ' proposta(s) sem duração. Defina a duração para permitir programação por horário.', why: 'Sem duração, o sistema usa o padrão de ' + D.durLabel(S.defaultDuration) + '.', link: '#/propostas', linkLabel: 'Completar' });
    return out;
  }

  function nextSpecialsList(plan, n) {
    const today = D.today();
    return PA.Specials.occurrences(plan, today, D.addDays(today, 120)).filter((o) => o.eff !== 'neutro' || !o.isHoliday).sort((a, b) => (a.start < b.start ? -1 : 1)).slice(0, n || 6);
  }

  PA.Insights = { stats, alerts, suggestions, nextSpecialsList };
  if (typeof module !== 'undefined') module.exports = PA.Insights;
})(typeof window !== 'undefined' ? window : globalThis);
