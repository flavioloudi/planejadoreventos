/* Motor de geração de programação, índice de qualidade e reprogramação. Puro, sem DOM, determinístico (com semente opcional). */
(function (root) {
  const PA = (root.PA = root.PA || {});
  const D = PA.Dates, C = PA.C, P = PA.Planner, Cf = PA.Conflicts, V = PA.Validator;

  function defaultParams(plan) {
    const S = plan.settings, today = D.today();
    return {
      mode: 'horario', from: today, to: D.addDays(today, 42), allowedDays: S.workDays.slice(),
      shifts: JSON.parse(JSON.stringify(S.shifts)), maxPerDay: S.maxPerDay, minGap: S.minGap, defaultDuration: S.defaultDuration,
      respectHolidays: S.holidayPolicy !== 'ignorar', respectBlocked: S.specialPolicy !== 'ignorar', respectPriorities: true,
      balance: !!S.preferences.balance, avoidConsecutive: !!S.preferences.avoidConsecutive, considerPreferred: S.preferences.considerPreferred !== false,
      considerResources: true, seed: 0,
    };
  }

  function hashNum(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }

  const isLocked = (a) => !!a.locked && !!a.date;

  function activityWindow(a, params) {
    if (P.isDateFixed(a)) return { from: a.preferredDate, to: a.preferredDate, fixed: true };
    let from = D.max(a.minDate || params.from, params.from), to = D.min(a.deadline || params.to, params.to);
    return { from, to };
  }

  function timedInMode(a, mode) {
    if (mode === 'dia') return false;
    if (mode === 'hibrido') return P.isTimeFixed(a);
    return true;
  }

  function sortOrder(list, params, plan) {
    const winSize = (a) => { const w = activityWindow(a, params); return Math.max(1, D.diffDays(w.from, w.to) + 1); };
    return list.slice().sort((a, b) => {
      const fa = P.isDateFixed(a) ? 1 : 0, fb = P.isDateFixed(b) ? 1 : 0; if (fa !== fb) return fb - fa;
      const ta = P.isTimeFixed(a) ? 1 : 0, tb = P.isTimeFixed(b) ? 1 : 0; if (ta !== tb) return tb - ta;
      if (params.respectPriorities || params.mode === 'prioridade') { const d = C.prio(b.priority).rank - C.prio(a.priority).rank; if (d) return d; }
      const w = winSize(a) - winSize(b); if (w) return w;
      return (a.deadline || '9999') < (b.deadline || '9999') ? -1 : 1;
    });
  }

  function runOnce(plan, selected, params) {
    const keep = [], todo = [];
    selected.forEach((a) => { if (isLocked(a)) keep.push(a); else todo.push(a); });
    const ctx = P.createContext(plan, Object.assign({}, params, { exclude: todo.map((a) => a.id) }));
    const jitter = params.seed ? (key) => (hashNum(key + ':' + params.seed) - 0.5) * 24 : null;
    const out = { assignments: [], unscheduled: [], kept: keep.map((a) => a.id) };
    let ordered = sortOrder(todo, params, plan);
    if (params.mode === 'prioridade') {
      const hi = ordered.filter((a) => C.prio(a.priority).rank >= 3), lo = ordered.filter((a) => C.prio(a.priority).rank < 3);
      ordered = hi.concat(lo);
    }
    const assigned = {};
    const options = (a) => ({ balance: params.balance, avoidConsecutive: params.avoidConsecutive, considerPreferred: params.considerPreferred, noTime: !timedInMode(a, params.mode), earliest: params.mode === 'prioridade' && C.prio(a.priority).rank >= 3, jitter });
    const tryPlace = (a) => {
      const win = activityWindow(a, params);
      if (win.from > win.to) return { fail: 'Período da atividade (' + D.rangeLabel(a.minDate || '…', a.deadline || '…') + ') não intercepta o período de planejamento (' + D.rangeLabel(params.from, params.to) + ').' };
      const r = ctx.candidates(a, win, options(a));
      if (!r.list.length) return { fail: P.rejectionText(r.rej, win), rej: r.rej };
      const best = r.list[0];
      ctx.place(a, best); return { best, count: r.list.length };
    };
    ordered.forEach((a) => {
      const r = tryPlace(a);
      if (r.best) {
        const b = r.best, why = b.why.slice();
        if (r.count > 1) why.unshift('Escolhida entre ' + r.count + ' opção(ões) disponível(is)');
        if (params.respectPriorities && C.prio(a.priority).rank >= 3) why.push('Prioridade ' + C.prio(a.priority).label.toLowerCase() + ': alocada antes das demais');
        assigned[a.id] = { activityId: a.id, date: b.date, startTime: b.slot.start != null ? D.fromMin(b.slot.start) : '', endTime: b.slot.end != null ? D.fromMin(b.slot.end) : '', why, score: b.score, mode: timedInMode(a, params.mode) ? 'horario' : 'dia' };
      } else out.unscheduled.push({ activityId: a.id, reason: r.fail });
    });
    // Reparo: tenta abrir espaço para atividades prioritárias substituindo outras de prioridade menor (mesma geração)
    if (params.respectPriorities) {
      out.unscheduled.slice().forEach((u) => {
        const ua = todo.find((a) => a.id === u.activityId); const urank = C.prio(ua.priority).rank;
        const victims = Object.keys(assigned).map((id) => todo.find((a) => a.id === id)).filter((v) => C.prio(v.priority).rank < urank && !P.isDateFixed(v)).sort((x, y) => C.prio(x.priority).rank - C.prio(y.priority).rank);
        for (let i = 0; i < victims.length; i++) {
          const v = victims[i], saved = assigned[v.id];
          ctx.unplace(v.id);
          const r = tryPlace(ua);
          if (!r.best) { ctx.place(v, { date: saved.date, slot: { start: saved.startTime ? D.toMin(saved.startTime) : null, end: saved.endTime ? D.toMin(saved.endTime) : null } }); continue; }
          const b = r.best;
          const why = b.why.slice(); why.unshift('Encaixada ao realocar "' + v.name + '" (prioridade ' + C.prio(v.priority).label.toLowerCase() + ')');
          assigned[ua.id] = { activityId: ua.id, date: b.date, startTime: b.slot.start != null ? D.fromMin(b.slot.start) : '', endTime: b.slot.end != null ? D.fromMin(b.slot.end) : '', why, score: b.score, mode: timedInMode(ua, params.mode) ? 'horario' : 'dia' };
          delete assigned[v.id];
          const rv = tryPlace(v);
          if (rv.best) { const bb = rv.best; assigned[v.id] = { activityId: v.id, date: bb.date, startTime: bb.slot.start != null ? D.fromMin(bb.slot.start) : '', endTime: bb.slot.end != null ? D.fromMin(bb.slot.end) : '', why: bb.why.concat(['Realocada para dar lugar a atividade de maior prioridade']), score: bb.score, mode: timedInMode(v, params.mode) ? 'horario' : 'dia' }; }
          else out.unscheduled.push({ activityId: v.id, reason: 'Perdeu o encaixe para uma atividade de prioridade superior e não há outra data disponível. ' + rv.fail });
          out.unscheduled = out.unscheduled.filter((x) => x.activityId !== ua.id);
          break;
        }
      });
    }
    todo.forEach((a) => { if (assigned[a.id]) out.assignments.push(assigned[a.id]); });
    out.assignments.sort((x, y) => (x.date + x.startTime < y.date + y.startTime ? -1 : 1));
    return out;
  }

  function weekOf(date) { return D.startOfWeek(date); }

  // Índice de qualidade 0–100
  function quality(plan, selected, assignments, params, conflicts) {
    const total = selected.length || 1;
    const wOf = (a) => C.prio(a.priority).weight;
    const byId = {}; selected.forEach((a) => { byId[a.id] = a; });
    const keptIds = selected.filter(isLocked).map((a) => a.id);
    const placedIds = assignments.map((x) => x.activityId).concat(keptIds);
    const totalW = selected.reduce((s, a) => s + wOf(a), 0) || 1;
    const placedW = placedIds.reduce((s, id) => s + (byId[id] ? wOf(byId[id]) : 0), 0);
    const parts = [];
    // 1. Quantidade programada (30)
    parts.push({ key: 'programadas', label: 'Atividades programadas', max: 30, value: 30 * (placedIds.length / total), detail: placedIds.length + ' de ' + selected.length });
    // 2. Conflitos (20)
    const hi = conflicts.filter((c) => c.severity === 'alta').length, md = conflicts.filter((c) => c.severity === 'media').length, lo = conflicts.length - hi - md;
    const pen = Math.min(20, hi * 6 + md * 3 + lo * 1);
    parts.push({ key: 'conflitos', label: 'Ausência de conflitos', max: 20, value: 20 - pen, detail: conflicts.length ? conflicts.length + ' conflito(s)' : 'Nenhum conflito' });
    // 3. Prioridades (15)
    const hiSel = selected.filter((a) => C.prio(a.priority).rank >= 3);
    const hiPlaced = hiSel.filter((a) => placedIds.indexOf(a.id) >= 0).length;
    const prioVal = (hiSel.length ? 0.6 * (hiPlaced / hiSel.length) : 0.6) + 0.4 * (placedW / totalW);
    parts.push({ key: 'prioridades', label: 'Respeito às prioridades', max: 15, value: 15 * prioVal, detail: hiSel.length ? hiPlaced + ' de ' + hiSel.length + ' críticas/altas programadas' : 'Sem atividades de prioridade alta' });
    // 4. Aproveitamento das datas (10)
    const days = {}; assignments.forEach((x) => { days[x.date] = (days[x.date] || 0) + 1; });
    const usedDays = Object.keys(days).length;
    let avail = 0; const idx = PA.Specials.index(plan, params.from, params.to);
    D.range(params.from, params.to).forEach((d) => { const i = idx.get(d); if (params.allowedDays.indexOf(D.weekday(d)) >= 0 && !(i.hard || i.blocked.length)) avail++; });
    const target = Math.max(1, Math.min(avail, Math.ceil(assignments.length / Math.max(1, Math.min(params.maxPerDay, 2)))));
    parts.push({ key: 'aproveitamento', label: 'Aproveitamento das datas', max: 10, value: assignments.length ? 10 * Math.min(1, usedDays / target) : 0, detail: usedDays + ' dia(s) utilizado(s) de ' + avail + ' disponíveis' });
    // 5. Distribuição (15)
    let distVal = 1;
    if (assignments.length > 1) {
      const wk = {}; assignments.forEach((x) => { const w = weekOf(x.date); wk[w] = (wk[w] || 0) + 1; });
      const first = Object.keys(wk).sort()[0], last = Object.keys(wk).sort().pop();
      const counts = []; for (let w = first; w <= last; w = D.addDays(w, 7)) counts.push(wk[w] || 0);
      const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
      const sd = Math.sqrt(counts.reduce((a, b) => a + (b - mean) * (b - mean), 0) / counts.length);
      const maxDay = Math.max.apply(null, Object.keys(days).map((k) => days[k]));
      distVal = Math.max(0, 1 - Math.min(1, (mean ? sd / mean : 0) * 0.8)) * (maxDay > params.maxPerDay ? 0.7 : 1);
    }
    parts.push({ key: 'distribuicao', label: 'Distribuição equilibrada', max: 15, value: 15 * distVal, detail: 'Variação entre semanas' });
    // 6. Preferências (10)
    let pref = 0, prefN = 0;
    assignments.forEach((x) => {
      const a = byId[x.activityId];
      if (a.preferredDate) { prefN++; const d = Math.abs(D.diffDays(a.preferredDate, x.date)); pref += d === 0 ? 1 : d <= 2 ? 0.6 : d <= 7 ? 0.3 : 0; }
      if (a.preferredPeriod && x.startTime) { prefN++; const m = D.toMin(x.startTime); const per = m < 720 ? 'manha' : m < 1080 ? 'tarde' : 'noite'; pref += per === a.preferredPeriod ? 1 : 0; }
      if (a.preferredTime && x.startTime) { prefN++; pref += Math.abs(D.toMin(x.startTime) - D.toMin(a.preferredTime)) <= 30 ? 1 : 0.2; }
    });
    parts.push({ key: 'preferencias', label: 'Respeito às preferências', max: 10, value: prefN ? 10 * (pref / prefN) : 10, detail: prefN ? Math.round(100 * pref / prefN) + '% das preferências atendidas' : 'Sem preferências informadas' });
    const score = Math.round(parts.reduce((s, p) => s + p.value, 0));
    parts.forEach((p) => { p.value = Math.round(p.value * 10) / 10; });
    return { score: Math.max(0, Math.min(100, score)), parts };
  }

  function label(score) { return score >= 85 ? 'Excelente' : score >= 70 ? 'Boa' : score >= 50 ? 'Regular' : 'Fraca'; }

  function generate(plan, activityIds, userParams) {
    const params = Object.assign(defaultParams(plan), userParams || {});
    const selected = plan.activities.filter((a) => activityIds.indexOf(a.id) >= 0 && a.status !== 'cancelada' && a.status !== 'concluida');
    const run = runOnce(plan, selected, params);
    return finalize(plan, selected, params, run);
  }

  // Reavalia uma simulação após edição manual (assignments substituídos / itens removidos).
  function evaluate(plan, result, assignments) {
    const selected = plan.activities.filter((a) => result.activityIds.indexOf(a.id) >= 0);
    const assigned = {}; assignments.forEach((x) => { assigned[x.activityId] = true; });
    const prev = {}; result.unscheduled.forEach((u) => { prev[u.activityId] = u.reason; });
    const unscheduled = selected.filter((a) => !assigned[a.id] && result.kept.indexOf(a.id) < 0).map((a) => ({ activityId: a.id, reason: prev[a.id] || 'Removida da simulação pelo usuário.' }));
    return finalize(plan, selected, result.params, { assignments, unscheduled, kept: result.kept });
  }

  function finalize(plan, selected, params, run) {
    // Simula e detecta conflitos
    const sim = plan.activities.map((a) => {
      const x = run.assignments.find((y) => y.activityId === a.id);
      if (x) return Object.assign({}, a, { date: x.date, startTime: x.startTime, endTime: x.endTime });
      if (selected.indexOf(a) >= 0 && !isLocked(a)) return Object.assign({}, a, { date: '', startTime: '', endTime: '' });
      return a;
    });
    const involved = {}; run.assignments.forEach((x) => { involved[x.activityId] = true; });
    const conflicts = Cf.detect(plan, { activities: sim }).filter((c) => c.activityIds.some((id) => involved[id]) && !c.exception);
    const q = quality(plan, selected, run.assignments, params, conflicts);
    // Estatísticas
    const byWeek = {}, byPriority = { critica: 0, alta: 0, media: 0, baixa: 0 }, usedDates = {};
    run.assignments.forEach((x) => {
      const a = selected.find((s) => s.id === x.activityId);
      byWeek[weekOf(x.date)] = (byWeek[weekOf(x.date)] || 0) + 1; byPriority[a.priority] = (byPriority[a.priority] || 0) + 1; usedDates[x.date] = (usedDates[x.date] || 0) + 1;
    });
    const idx = PA.Specials.index(plan, params.from, params.to);
    const avoided = [];
    D.range(params.from, params.to).forEach((d) => {
      const i = idx.get(d); const reasons = [];
      if (params.allowedDays.indexOf(D.weekday(d)) < 0) return; // fins de semana não entram na lista
      i.blocked.forEach((o) => { if (o.isHoliday ? params.respectHolidays : params.respectBlocked) reasons.push(o.name + (o.isHoliday ? ' (feriado)' : ' (bloqueio)')); });
      i.restricted.forEach((o) => reasons.push(o.name + ' (restrição parcial)'));
      if (reasons.length) avoided.push({ date: d, reasons });
    });
    const unscheduled = run.unscheduled.map((u) => {
      const a = selected.find((s) => s.id === u.activityId);
      const win = V.windowOf(plan, a, params.from);
      let suggestion = '';
      const ext = P.createContext(plan, Object.assign({}, params, { from: params.from, to: D.addDays(D.max(params.to, a.deadline || params.to), 28), exclude: [a.id] }));
      const alt = ext.candidates(a, { from: D.max(params.from, a.minDate || params.from), to: D.addDays(D.max(params.to, a.deadline || params.to), 28) }, { earliest: true, balance: true, noTime: !timedInMode(a, params.mode) });
      if (alt.list.length && !P.isDateFixed(a)) { const first = alt.list.sort((x, y) => (x.date < y.date ? -1 : 1))[0]; suggestion = 'Sugestão: ampliar o período até ' + D.br(first.date) + (first.slot.start != null ? ' (' + D.fromMin(first.slot.start) + ')' : '') + '.'; }
      else if (P.isDateFixed(a)) suggestion = 'Data fixa: escolha manualmente outra data ou libere a flexibilidade.';
      else suggestion = 'Sugestão: ampliar o período de planejamento, aumentar o limite diário ou liberar mais dias da semana.';
      void win;
      return { activityId: u.activityId, reason: u.reason, suggestion };
    });
    const total = selected.length;
    const programmed = run.assignments.length + run.kept.length;
    return {
      params, activityIds: selected.map((a) => a.id), assignments: run.assignments, kept: run.kept, unscheduled,
      conflicts, quality: q, avoided,
      stats: { selected: total, scheduled: programmed, unscheduled: unscheduled.length, kept: run.kept.length, conflicts: conflicts.length, usedDates: Object.keys(usedDates).sort().map((d) => ({ date: d, count: usedDates[d] })), byWeek, byPriority },
      simulated: sim,
    };
  }

  // -------- Reprogramação ------------------------------------------------
  const MOVABLE_TYPES = ['bloqueada', 'feriado', 'responsavel', 'local', 'mesmo_horario', 'fixa_flexivel', 'fora_periodo', 'excesso_dia', 'dia_nao_permitido', 'intervalo'];

  function reschedule(plan, opts) {
    opts = opts || {};
    const S = plan.settings;
    const today = D.today();
    const horizon = opts.horizon || 45;
    const byId = {}; plan.activities.forEach((a) => { byId[a.id] = a; });
    let conflicts = Cf.active(Cf.detect(plan)).filter((c) => MOVABLE_TYPES.indexOf(c.type) >= 0 && c.date >= (opts.from || today));
    if (opts.onlyIds) conflicts = conflicts.filter((c) => c.activityIds.some((id) => opts.onlyIds.indexOf(id) >= 0));
    const rankOf = (a) => C.prio(a.priority).rank;
    const toMove = {}; const lockedAffected = {}; const reasons = {};
    const pick = (c) => {
      const cand = c.activityIds.map((id) => byId[id]).filter(Boolean);
      const movable = cand.filter((a) => !a.locked && !P.isDateFixed(a));
      if (c.type === 'excesso_dia') { // mover o necessário (menor prioridade)
        const sorted = movable.sort((x, y) => rankOf(x) - rankOf(y)); const excess = cand.length - S.maxPerDay;
        return sorted.slice(0, Math.max(0, excess));
      }
      const single = ['bloqueada', 'feriado', 'fora_periodo', 'dia_nao_permitido'].indexOf(c.type) >= 0;
      if (single) return movable;
      if (!movable.length) return [];
      movable.sort((x, y) => (rankOf(x) - rankOf(y)) || (x.date < y.date ? 1 : -1));
      // se uma das atividades já vai ser movida, não mover outra
      if (cand.some((a) => toMove[a.id])) return [];
      return [movable[0]];
    };
    conflicts.forEach((c) => {
      const picked = pick(c);
      picked.forEach((a) => { toMove[a.id] = a; (reasons[a.id] = reasons[a.id] || []).push(c.typeLabel + ': ' + c.description); });
      c.activityIds.forEach((id) => { const a = byId[id]; if (a && (a.locked || P.isDateFixed(a)) && ['bloqueada', 'feriado', 'fora_periodo'].indexOf(c.type) >= 0) lockedAffected[id] = (lockedAffected[id] || []).concat([c.description]); });
    });
    plan.activities.forEach((a) => { if (a.status === 'reprogramar' && a.date && !a.locked && !toMove[a.id]) { toMove[a.id] = a; reasons[a.id] = ['Marcada como "Reprogramação necessária".']; } });
    const ids = Object.keys(toMove);
    const ctx = P.createContext(plan, { from: today, to: D.addDays(today, 365), exclude: ids });
    const order = ids.map((id) => toMove[id]).sort((a, b) => (rankOf(b) - rankOf(a)) || ((a.deadline || '9999') < (b.deadline || '9999') ? -1 : 1));
    const changes = [], unresolved = [];
    order.forEach((a) => {
      const anchor = a.date;
      const lo = D.max(a.minDate || today, opts.from || today);
      const strictTo = a.deadline || D.addDays(anchor, horizon);
      const hasTime = !!a.startTime;
      const so = { balance: true, avoidConsecutive: true, considerPreferred: true, anchorDate: anchor, noTime: !hasTime };
      let r = ctx.candidates(a, { from: lo, to: strictTo }, so), extended = false;
      if (!r.list.length) { r = ctx.candidates(a, { from: lo, to: D.addDays(strictTo, 28) }, so); extended = r.list.length > 0; }
      if (!r.list.length) { unresolved.push({ activityId: a.id, reason: P.rejectionText(r.rej), reasons: reasons[a.id] }); return; }
      const b = r.list[0]; ctx.place(a, b);
      changes.push({
        activityId: a.id, from: { date: a.date, startTime: a.startTime, endTime: a.endTime },
        to: { date: b.date, startTime: b.slot.start != null ? D.fromMin(b.slot.start) : '', endTime: b.slot.end != null ? D.fromMin(b.slot.end) : '' },
        reasons: reasons[a.id], why: b.why, extended, alternatives: r.list.slice(1, 4).map((x) => ({ date: x.date, startTime: x.slot.start != null ? D.fromMin(x.slot.start) : '', endTime: x.slot.end != null ? D.fromMin(x.slot.end) : '' })),
      });
    });
    return {
      affected: Object.keys(toMove).concat(Object.keys(lockedAffected).filter((id) => !toMove[id])), changes, unresolved,
      locked: Object.keys(lockedAffected).map((id) => ({ activityId: id, reasons: lockedAffected[id] })), conflictsBefore: conflicts.length,
    };
  }

  PA.Scheduler = { defaultParams, generate, evaluate, quality, qualityLabel: label, reschedule, activityWindow };
  if (typeof module !== 'undefined') module.exports = PA.Scheduler;
})(typeof window !== 'undefined' ? window : globalThis);
