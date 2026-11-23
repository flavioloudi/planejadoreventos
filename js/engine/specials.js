/* Datas especiais: feriados embutidos (apenas os de regra conhecida), recorrência e índice por dia. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  const D = PA.Dates, C = PA.C;

  // Feriados estaduais de referência. NUNCA tratados como confirmados: exigem revisão do usuário.
  const STATE_DATES = {
    SP: [['07-09', 'Revolução Constitucionalista (SP)']],
    RJ: [['04-23', 'Dia de São Jorge (RJ)']],
    BA: [['07-02', 'Independência da Bahia']],
    CE: [['03-25', 'Data Magna do Ceará']],
    PE: [['03-06', 'Data Magna de Pernambuco']],
    RS: [['09-20', 'Revolução Farroupilha']],
    SC: [['08-11', 'Dia de Santa Catarina']],
    PR: [['12-19', 'Emancipação Política do Paraná']],
    AM: [['09-05', 'Elevação do Amazonas à categoria de província']],
    PA: [['08-15', 'Adesão do Grão-Pará à Independência']],
    MA: [['07-28', 'Adesão do Maranhão à Independência']],
    TO: [['10-05', 'Criação do Estado do Tocantins']],
    MS: [['10-11', 'Criação do Estado de Mato Grosso do Sul']],
    RO: [['01-04', 'Criação do Estado de Rondônia']],
    SE: [['07-08', 'Autonomia política de Sergipe']],
    PB: [['08-05', 'Fundação do Estado da Paraíba']],
    PI: [['10-19', 'Dia do Piauí']],
    RN: [['10-03', 'Mártires de Cunhaú e Uruaçu (RN)']],
    AP: [['09-13', 'Criação do Território Federal do Amapá']],
    RR: [['10-05', 'Criação dos Estados de Roraima e Amapá']],
  };

  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');

  function builtinForYear(year, state) {
    const out = [];
    const add = (key, date, name, category, impact, confirmed, scope, description, rule) => {
      out.push({
        id: key + '@' + year, key, srcId: key, name, start: date, end: date, category, scope, impact, confirmed, needsReview: !confirmed,
        builtin: true, description: description || '', rule: rule || '', recurrence: 'anual',
      });
    };
    const nat = (mmdd, name, desc) => add('bi:nac:' + mmdd, year + '-' + mmdd, name, 'Feriado', 'bloqueio', true, 'nacional', desc || 'Feriado nacional.', 'Não programar atividades.');
    nat('01-01', 'Confraternização Universal');
    nat('04-21', 'Tiradentes');
    nat('05-01', 'Dia do Trabalho');
    nat('09-07', 'Independência do Brasil');
    nat('10-12', 'Nossa Senhora Aparecida', 'Feriado nacional religioso.');
    nat('11-02', 'Finados', 'Feriado nacional religioso.');
    nat('11-15', 'Proclamação da República');
    if (year >= 2024) nat('11-20', 'Dia da Consciência Negra', 'Feriado nacional a partir de 2024 (Lei 14.759/2023).');
    nat('12-25', 'Natal', 'Feriado nacional religioso.');

    const e = D.easter(year);
    add('bi:mov:sexta-santa', D.addDays(e, -2), 'Sexta-feira Santa', 'Feriado religioso', 'bloqueio', true, 'nacional', 'Feriado nacional móvel (2 dias antes da Páscoa).', 'Não programar atividades.');
    add('bi:mov:pascoa', e, 'Páscoa', 'Data comemorativa', 'neutro', true, 'nacional', 'Domingo de Páscoa.', '');
    const pf = (key, date, name, desc) => add(key, date, name, 'Ponto facultativo', 'restricao', false, 'nacional', desc, 'Programar apenas com alerta.');
    pf('bi:mov:carnaval-seg', D.addDays(e, -48), 'Carnaval (segunda-feira)', 'Ponto facultativo tradicional. Confirme o decreto/calendário oficial do ano.');
    pf('bi:mov:carnaval-ter', D.addDays(e, -47), 'Carnaval (terça-feira)', 'Ponto facultativo tradicional. Confirme o decreto/calendário oficial do ano.');
    pf('bi:mov:cinzas', D.addDays(e, -46), 'Quarta-feira de Cinzas', 'Ponto facultativo até as 14h. Confirme o decreto do ano.');
    pf('bi:mov:corpus', D.addDays(e, 60), 'Corpus Christi', 'Ponto facultativo nacional (feriado em muitos municípios). Confirme localmente.');

    (STATE_DATES[state] || []).forEach((x) => {
      add('bi:uf:' + state + ':' + x[0], year + '-' + x[0], x[1], 'Feriado', 'restricao', false, 'estadual',
        'Data estadual de referência. Confirme na legislação estadual vigente antes de utilizá-la.', 'Programar apenas com alerta.');
    });

    const com = (key, date, name) => add(key, date, name, 'Data comemorativa', 'neutro', true, 'nacional', 'Data comemorativa (não é feriado).', '');
    com('bi:com:mulher', year + '-03-08', 'Dia Internacional da Mulher');
    com('bi:com:maes', D.nthWeekday(year, 5, 0, 2), 'Dia das Mães');
    com('bi:com:namorados', year + '-06-12', 'Dia dos Namorados');
    com('bi:com:estudante', year + '-08-11', 'Dia do Estudante');
    com('bi:com:pais', D.nthWeekday(year, 8, 0, 2), 'Dia dos Pais');
    com('bi:com:professor', year + '-10-15', 'Dia do Professor');
    return out;
  }

  function effectiveImpact(settings, occ) {
    let imp = occ.impact;
    if (C.isHolidayCategory(occ.category)) {
      if (settings.holidayPolicy === 'ignorar') imp = 'neutro';
      else if (settings.holidayPolicy === 'restricao' && imp === 'bloqueio') imp = 'restricao';
    } else if (settings.specialPolicy === 'ignorar') imp = 'neutro';
    else if (settings.specialPolicy === 'alertar' && imp === 'bloqueio') imp = 'restricao';
    return imp;
  }

  function addUnit(date, n, unit) {
    if (unit === 'dias') return D.addDays(date, n);
    if (unit === 'semanas') return D.addDays(date, n * 7);
    if (unit === 'meses') return D.addMonths(date, n);
    return D.addMonths(date, n * 12);
  }

  // Expande uma data manual conforme a recorrência, devolvendo ocorrências que tocam [from, to].
  function expandManual(sp, from, to) {
    const out = [];
    const span = sp.end && sp.start ? D.diffDays(sp.start, sp.end) : 0;
    let every = 1, unit = 'anos';
    if (sp.recurrence === 'mensal') unit = 'meses';
    else if (sp.recurrence === 'semanal') unit = 'semanas';
    else if (sp.recurrence === 'personalizada') { every = Math.max(1, Number(sp.recurEvery) || 1); unit = sp.recurUnit || 'dias'; }
    const recurring = sp.recurrence && sp.recurrence !== 'none';
    let start = sp.start, i = 0;
    while (start && start <= to && i < 3000) {
      const end = D.addDays(start, span);
      if (sp.recurUntil && start > sp.recurUntil) break;
      if (end >= from) out.push(Object.assign({}, sp, { id: sp.id + '@' + start, srcId: sp.id, start, end }));
      if (!recurring) break;
      i++;
      const next = addUnit(sp.start, every * i, unit);
      if (next <= start) break;
      start = next;
    }
    return out;
  }

  function occurrences(plan, from, to) {
    const out = [];
    const disabled = plan.disabledBuiltins || [];
    const y1 = Number(from.slice(0, 4)), y2 = Number(to.slice(0, 4));
    for (let y = y1; y <= y2; y++) {
      builtinForYear(y, plan.settings.state).forEach((o) => {
        if (disabled.indexOf(o.key) >= 0) return;
        if (o.end >= from && o.start <= to) out.push(o);
      });
    }
    (plan.specials || []).forEach((sp) => expandManual(sp, from, to).forEach((o) => out.push(o)));
    out.forEach((o) => {
      o.isHoliday = C.isHolidayCategory(o.category);
      o.eff = effectiveImpact(plan.settings, o);
    });
    return out;
  }

  const EMPTY = Object.freeze({ occs: [], blocked: [], restricted: [], preferred: [], holidays: [], neutral: [] });

  function index(plan, from, to) {
    const occs = occurrences(plan, from, to);
    const days = {};
    occs.forEach((o) => {
      const a = D.max(o.start, from), b = D.min(o.end, to);
      D.range(a, b).forEach((d) => {
        const e = days[d] || (days[d] = { occs: [], blocked: [], restricted: [], preferred: [], holidays: [], neutral: [] });
        e.occs.push(o);
        if (o.eff === 'bloqueio') e.blocked.push(o);
        else if (o.eff === 'restricao') e.restricted.push(o);
        else if (o.eff === 'preferencial') e.preferred.push(o);
        else e.neutral.push(o);
        if (o.isHoliday) e.holidays.push(o);
      });
    });
    return { from, to, occs, get: (d) => days[d] || EMPTY };
  }

  PA.Specials = { builtinForYear, occurrences, index, effectiveImpact, expandManual, STATE_DATES, slug };
  if (typeof module !== 'undefined') module.exports = PA.Specials;
})(typeof window !== 'undefined' ? window : globalThis);
