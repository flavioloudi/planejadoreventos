/* Validador de viabilidade de propostas. Pura e explicável. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  const D = PA.Dates, C = PA.C, P = PA.Planner, Cf = PA.Conflicts;

  const STATUS = {
    viavel: { label: 'Viável', color: '#16a34a', rank: 0 },
    ressalvas: { label: 'Viável com ressalvas', color: '#d97706', rank: 1 },
    ajustes: { label: 'Necessita ajustes', color: '#7c3aed', rank: 2 },
    inviavel: { label: 'Inviável', color: '#dc2626', rank: 3 },
  };
  const DEFAULT_SPAN = 60;

  function windowOf(plan, a, today) {
    const from = D.max(a.minDate || '0000-00-00', today || D.today());
    const to = a.deadline || D.addDays(from, DEFAULT_SPAN);
    return { from, to, openEnded: !a.deadline };
  }

  function validate(plan, a, opts) {
    opts = opts || {};
    const S = plan.settings;
    const today = opts.today || D.today();
    const reasons = [];
    const add = (level, text) => reasons.push({ level, text });
    const res = { activityId: a.id, status: 'viavel', summary: '', reasons, alternatives: [], availableDates: 0, window: null };
    const finish = (status, summary) => { res.status = status; res.summary = summary; return res; };
    const dur = a.duration || S.defaultDuration;

    // 1. Informação suficiente
    const missing = [];
    if (!a.name || !a.name.trim()) missing.push('nome');
    if (!a.duration) missing.push('duração estimada');
    if (missing.length) add('error', 'Faltam informações para programar: ' + missing.join(', ') + '.' + (!a.duration ? ' Usando a duração padrão (' + D.durLabel(S.defaultDuration) + ') apenas como estimativa.' : ''));
    if (!a.responsible) add('warn', 'Responsável não informado: não será possível verificar conflitos de agenda do responsável.');
    if (a.needsLocation && !a.location) add('warn', 'A atividade exige local, mas nenhum local foi sugerido.');
    if (!a.minDate && !a.deadline && !a.preferredDate) add('info', 'Nenhum período informado: será considerado um intervalo de ' + DEFAULT_SPAN + ' dias a partir de hoje.');

    // 2. Coerência de datas
    let dateError = false;
    if (a.minDate && a.deadline && a.minDate > a.deadline) { add('error', 'A data inicial permitida (' + D.br(a.minDate) + ') é posterior à data limite (' + D.br(a.deadline) + ').'); dateError = true; }
    if (a.preferredDate) {
      if ((a.minDate && a.preferredDate < a.minDate) || (a.deadline && a.preferredDate > a.deadline)) { add('error', 'A data preferencial (' + D.br(a.preferredDate) + ') está fora do intervalo permitido' + (a.minDate || a.deadline ? ' (' + D.rangeLabel(a.minDate || '…', a.deadline || '…') + ')' : '') + '.'); dateError = true; }
      else if (a.preferredDate < today) add('warn', 'A data preferencial (' + D.br(a.preferredDate) + ') já passou.');
    }
    if (a.deadline && a.deadline < today) {
      add('error', 'A data limite (' + D.br(a.deadline) + ') já passou.');
      res.window = { from: today, to: a.deadline };
      res.alternatives = extend(plan, a, { from: today, to: D.addDays(today, DEFAULT_SPAN) }, opts).alts;
      return finish('inviavel', 'Proposta inviável: a data limite já passou.' + (res.alternatives.length ? ' Sugestão: prorrogar o prazo até ' + D.br(res.alternatives[0].date) + '.' : ''));
    }
    if (dateError) {
      return finish('ajustes', 'Necessita ajustes: revise as datas informadas.');
    }

    // 3. Janela e candidatos
    const win = windowOf(plan, a, today);
    res.window = win;
    if (win.from > win.to) return finish('inviavel', 'Proposta inviável: o período informado não possui datas.');
    const ctx = P.createContext(plan, { from: win.from, to: D.max(win.to, D.addDays(win.to, 0)), exclude: [a.id] });
    const fixedDate = P.isDateFixed(a);
    const cwin = fixedDate ? { from: a.preferredDate, to: a.preferredDate } : win;
    const { list, rej } = ctx.candidates(a, cwin, { balance: true, considerPreferred: true, noTime: false });
    res.availableDates = list.length;
    res.alternatives = list.slice(0, 3).map((c) => ({ date: c.date, startTime: c.slot.start != null ? D.fromMin(c.slot.start) : '', endTime: c.slot.end != null ? D.fromMin(c.slot.end) : '', note: c.why.slice(0, 2).join('. ') }));

    // 4. Duração × janela
    const maxWin = Math.max.apply(null, ctx.windows.map((w) => w.end - w.start));
    const dayLen = ctx.windows[ctx.windows.length - 1].end - ctx.windows[0].start;
    if (dur > dayLen) add('error', 'A duração (' + D.durLabel(dur) + ') é maior que a jornada diária configurada (' + D.durLabel(dayLen) + '). Divida a atividade em mais de um dia.');
    else if (dur > maxWin) add('warn', 'A duração (' + D.durLabel(dur) + ') é maior que qualquer turno isolado (' + D.durLabel(maxWin) + '); a atividade ocupará mais de um turno.');

    // 5. Data preferencial
    if (a.preferredDate && !(a.preferredDate < today)) {
      const info = ctx.dayInfo(a.preferredDate);
      if (info.hard) add(fixedDate ? 'error' : 'warn', 'A data preferencial (' + D.br(a.preferredDate) + ') coincide com ' + info.blocked.map((o) => o.name + (o.isHoliday ? ' (feriado' + (o.scope ? ' ' + (C.SCOPES[o.scope] || '').toLowerCase() : '') + ')' : ' (bloqueio total)')).join(', ') + '.');
      else if (!info.allowedDay) add('warn', 'A data preferencial cai em ' + D.WEEKDAYS[info.weekday] + ', fora dos dias de funcionamento.');
      else {
        if (info.restricted.length) add('warn', 'A data preferencial coincide com ' + info.restricted.map((o) => o.name).join(', ') + (info.restricted[0].isHoliday ? ' (' + (info.restricted[0].category || '').toLowerCase() + ')' : ' (restrição parcial)') + '.');
        const others = info.items.filter((b) => b.id !== a.id);
        const higher = others.filter((b) => C.prio(b.priority).rank > C.prio(a.priority).rank);
        const slot = ctx.findSlot(a, a.preferredDate);
        if (slot.fail) add('warn', 'Já existe ' + (higher.length ? 'uma atividade de prioridade superior ("' + higher[0].name + '")' : 'outro compromisso') + ' que impede a data preferencial' + (slot.fail === 'responsavel' ? ' (mesmo responsável)' : slot.fail === 'local' ? ' (mesmo local)' : slot.fail === 'intervalo' ? ' (intervalo mínimo)' : ' no horário') + '.');
        if (info.count >= S.maxPerDay) add('warn', 'O dia preferencial já atingiu o limite de ' + S.maxPerDay + ' atividades.');
      }
    }

    // 6. Prioridade no período
    const rank = C.prio(a.priority).rank;
    if (list.length) {
      const first = list[0];
      if (first.info.count >= Math.max(1, S.maxPerDay - 1)) add('warn', 'Mesmo a melhor data (' + D.br(first.date) + ') já está com alta concentração de atividades (' + first.info.count + ').');
      const wk = ctx.weekCount(first.date);
      if (wk >= (S.overloadWeek || 10)) add('warn', 'A semana de ' + D.br(D.startOfWeek(first.date)) + ' já possui ' + wk + ' atividades (concentração excessiva).');
      const hi = Object.keys(ctx.busy()).filter((d) => d >= win.from && d <= win.to).reduce((n, d) => n + ctx.busy()[d].filter((b) => C.prio(b.priority).rank > rank).length, 0);
      if (hi && rank <= 2) add('info', hi + ' atividade(s) de prioridade superior ocupam o período e foram preservadas.');
    }
    // 7. Conflitos atuais da própria atividade
    if (P.isScheduled(a)) {
      const cfs = Cf.active(Cf.forActivity(Cf.detect(plan), a.id));
      cfs.slice(0, 3).forEach((c) => add(c.severity === 'alta' ? 'error' : 'warn', 'Conflito atual: ' + c.description));
      if (cfs.some((c) => c.severity === 'alta')) res.hasConflict = true;
    }

    const errors = reasons.filter((r) => r.level === 'error').length, warns = reasons.filter((r) => r.level === 'warn').length;
    if (!list.length) {
      const ext = extend(plan, a, win, opts);
      res.alternatives = ext.alts;
      add('error', 'Não existem datas disponíveis entre ' + D.br(win.from) + ' e ' + D.br(win.to) + '. ' + P.rejectionText(rej));
      const tip = ext.alts.length ? ' Sugestão: ampliar o período até ' + D.br(ext.alts[0].date) + (ext.alts.length > 1 ? ' (há ' + ext.alts.length + ' opções)' : '') + '.' : ' Sugestão: ampliar o período, flexibilizar dias/horários ou revisar as datas bloqueadas.';
      return finish(errors > 1 && !a.duration ? 'ajustes' : 'inviavel', 'Proposta inviável no período informado. Não existem datas disponíveis.' + tip);
    }
    if (errors) return finish('ajustes', 'Necessita ajustes. ' + reasons.filter((r) => r.level === 'error').map((r) => r.text).join(' '));
    if (warns) return finish('ressalvas', 'Proposta com ressalva. ' + reasons.filter((r) => r.level === 'warn')[0].text + (warns > 1 ? ' (+' + (warns - 1) + ' observação' + (warns > 2 ? 'ões' : '') + ')' : '') + ' Existem ' + list.length + ' data(s) disponível(is) no período.');
    return finish('viavel', 'Proposta viável. Existem ' + list.length + ' data' + (list.length > 1 ? 's' : '') + ' disponíve' + (list.length > 1 ? 'is' : 'l') + ' dentro do período desejado.');
  }

  // Busca alternativas após o fim da janela (ampliação sugerida)
  function extend(plan, a, win, opts) {
    const to = D.addDays(win.to, 21);
    const ctx = P.createContext(plan, { from: win.from, to, exclude: [a.id] });
    const { list } = ctx.candidates(a, { from: win.from, to }, { balance: true, earliest: true });
    const alts = list.sort((x, y) => (x.date < y.date ? -1 : 1)).slice(0, 3).map((c) => ({ date: c.date, startTime: c.slot.start != null ? D.fromMin(c.slot.start) : '', endTime: c.slot.end != null ? D.fromMin(c.slot.end) : '', note: 'Fora do período atual; exige ampliar o prazo.' }));
    return { alts };
  }

  function validateAll(plan, opts) {
    const out = {};
    plan.activities.forEach((a) => { if (a.status !== 'cancelada' && a.status !== 'concluida') out[a.id] = validate(plan, a, opts); });
    return out;
  }

  PA.Validator = { validate, validateAll, STATUS, windowOf, DEFAULT_SPAN };
  if (typeof module !== 'undefined') module.exports = PA.Validator;
})(typeof window !== 'undefined' ? window : globalThis);
