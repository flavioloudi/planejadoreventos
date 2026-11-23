/* Detecção de conflitos. Pura: recebe o planejamento (ou uma lista de atividades simulada) e devolve conflitos explicáveis. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  const D = PA.Dates, C = PA.C, P = PA.Planner;

  const TYPES = {
    mesmo_horario: { label: 'Mesmo horário', severity: 'alta' },
    responsavel: { label: 'Responsável simultâneo', severity: 'alta' },
    local: { label: 'Mesmo local', severity: 'alta' },
    fixa_flexivel: { label: 'Atividade fixa × flexível', severity: 'alta' },
    bloqueada: { label: 'Data bloqueada', severity: 'alta' },
    feriado: { label: 'Feriado', severity: 'alta' },
    data_especial: { label: 'Data especial', severity: 'media' },
    excesso_dia: { label: 'Excesso no dia', severity: 'media' },
    excesso_semana: { label: 'Excesso na semana', severity: 'baixa' },
    intervalo: { label: 'Intervalo insuficiente', severity: 'baixa' },
    fora_periodo: { label: 'Fora do período', severity: 'media' },
    dia_nao_permitido: { label: 'Dia não permitido', severity: 'baixa' },
  };
  const SEV_RANK = { alta: 3, media: 2, baixa: 1 };
  const SEV_LABEL = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

  function gapBetween(ea, eb) { return ea.start >= eb.end ? ea.start - eb.end : eb.start - ea.end; }

  function detect(plan, opts) {
    opts = opts || {};
    const S = plan.settings;
    const acts = (opts.activities || plan.activities).filter(P.isScheduled);
    const out = [];
    const push = (type, ids, date, time, text, suggestion, keyExtra, severity) => {
      const key = type + '|' + ids.slice().sort().join(',') + '|' + date + (keyExtra ? '|' + keyExtra : '');
      const ex = (plan.conflictExceptions || []).find((e) => e.key === key);
      out.push({ key, type, typeLabel: TYPES[type].label, severity: severity || TYPES[type].severity, activityIds: ids, date, time: time || '', description: text, suggestion, exception: ex || null });
    };
    const name = (a) => '"' + a.name + '"';
    const timeOf = (a) => (a.startTime ? a.startTime + '–' + (a.endTime || D.fromMin(D.toMin(a.startTime) + (a.duration || S.defaultDuration))) : 'sem horário definido');

    const byDate = {};
    acts.forEach((a) => { (byDate[a.date] = byDate[a.date] || []).push(a); });
    const dates = Object.keys(byDate).sort();
    if (!dates.length) return out;
    const idx = PA.Specials.index(plan, D.addDays(dates[0], -1), D.addDays(dates[dates.length - 1], 1));

    dates.forEach((date) => {
      const list = byDate[date];
      const info = idx.get(date);
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          const ea = P.entryOf(a, S.defaultDuration), eb = P.entryOf(b, S.defaultDuration);
          if (ea.start == null || eb.start == null) continue;
          const ids = [a.id, b.id];
          const fixedA = a.locked || P.isDateFixed(a), fixedB = b.locked || P.isDateFixed(b);
          const sameResp = ea.responsible && ea.responsible === eb.responsible;
          const sameLoc = ea.location && ea.location === eb.location;
          if (D.overlap(ea.start, ea.end, eb.start, eb.end)) {
            const when = D.fromMin(Math.max(ea.start, eb.start)) + '–' + D.fromMin(Math.min(ea.end, eb.end));
            if (sameResp) push('responsavel', ids, date, when, 'O responsável ' + a.responsible + ' está em ' + name(a) + ' e ' + name(b) + ' ao mesmo tempo.', 'Mover uma das atividades para outro horário ou delegar a responsabilidade.');
            if (sameLoc) push('local', ids, date, when, 'O local "' + a.location + '" está reservado para ' + name(a) + ' e ' + name(b) + ' no mesmo horário.', 'Escolher outro local ou alterar um dos horários.');
            if (!sameResp && !sameLoc) {
              if (fixedA !== fixedB) push('fixa_flexivel', ids, date, when, 'A atividade fixa ' + name(fixedA ? a : b) + ' coincide com a flexível ' + name(fixedA ? b : a) + '.', 'Reprogramar a atividade flexível (a fixa será preservada).');
              else {
                const pr = (x) => C.prio(x.priority).label.toLowerCase();
                push('mesmo_horario', ids, date, when, name(a) + ' (prioridade ' + pr(a) + ') e ' + name(b) + ' (prioridade ' + pr(b) + ') estão no mesmo horário.', 'Mover a atividade de menor prioridade para outro horário ou data.');
              }
            }
          } else if ((S.minGap || 0) > 0 && gapBetween(ea, eb) < S.minGap) {
            push('intervalo', ids, date, timeOf(a) + ' / ' + timeOf(b), 'Apenas ' + gapBetween(ea, eb) + ' min entre ' + name(a) + ' e ' + name(b) + ' (mínimo configurado: ' + S.minGap + ' min).', 'Afastar os horários para respeitar o intervalo mínimo.');
          }
        }
      }
      if (list.length > S.maxPerDay) {
        push('excesso_dia', list.map((x) => x.id), date, '', list.length + ' atividades em ' + D.br(date) + ' (limite: ' + S.maxPerDay + ').', 'Transferir ' + (list.length - S.maxPerDay) + ' atividade(s) de menor prioridade para outro dia.');
      }
      list.forEach((a) => {
        info.occs.forEach((o) => {
          if (o.eff === 'neutro' || o.eff === 'preferencial') return;
          const fixedNote = a.locked ? ' A atividade é fixa e não será alterada sem sua autorização.' : '';
          const rule = o.rule ? ' Regra: ' + o.rule : '';
          if (o.eff === 'bloqueio') {
            push(o.isHoliday ? 'feriado' : 'bloqueada', [a.id], date, timeOf(a), name(a) + ' está programada em "' + o.name + '" (' + (o.isHoliday ? 'feriado' : 'bloqueio total') + ').' + rule + fixedNote, 'Mover para a próxima data disponível.', o.name);
          } else {
            push(o.isHoliday ? 'feriado' : 'data_especial', [a.id], date, timeOf(a), name(a) + ' coincide com "' + o.name + '" (' + C.IMPACTS[o.eff].label.toLowerCase() + ').' + rule + fixedNote, 'Confirmar a manutenção da data ou buscar outra data.', o.name, 'media');
          }
        });
        if (S.workDays.indexOf(D.weekday(date)) < 0) {
          push('dia_nao_permitido', [a.id], date, timeOf(a), name(a) + ' está em ' + D.WEEKDAYS[D.weekday(date)] + ', dia fora do funcionamento configurado.', 'Mover para um dia de funcionamento.');
        }
        const outOf = a.minDate && date < a.minDate ? 'antes da data inicial permitida (' + D.br(a.minDate) + ')' : a.deadline && date > a.deadline ? 'depois da data limite (' + D.br(a.deadline) + ')' : '';
        if (outOf) push('fora_periodo', [a.id], date, timeOf(a), name(a) + ' está ' + outOf + '.', 'Alterar a data para dentro do período solicitado ou ajustar o período da proposta.');
      });
    });
    const weeks = {};
    acts.forEach((a) => { const w = D.startOfWeek(a.date); (weeks[w] = weeks[w] || []).push(a); });
    Object.keys(weeks).forEach((w) => {
      const lim = S.overloadWeek || 10;
      if (weeks[w].length > lim) push('excesso_semana', weeks[w].map((x) => x.id), w, '', 'A semana de ' + D.br(w) + ' possui ' + weeks[w].length + ' atividades (referência: ' + lim + ').', 'Redistribuir atividades flexíveis para a semana seguinte.');
    });
    out.sort((x, y) => (SEV_RANK[y.severity] - SEV_RANK[x.severity]) || (x.date < y.date ? -1 : 1));
    return out;
  }

  const active = (list) => list.filter((c) => !c.exception);
  const forActivity = (list, id) => list.filter((c) => c.activityIds.indexOf(id) >= 0);

  PA.Conflicts = { detect, active, forActivity, TYPES, SEV_LABEL, SEV_RANK };
  if (typeof module !== 'undefined') module.exports = PA.Conflicts;
})(typeof window !== 'undefined' ? window : globalThis);
