// Teste de fumaça da lógica (sem DOM): node tests/engine.test.js
const path = require('path');
const files = ['core/dates', 'core/constants', 'engine/specials', 'core/store', 'core/demo', 'engine/planner', 'engine/conflicts', 'engine/validator', 'engine/scheduler', 'engine/nlp', 'engine/insights', 'engine/reports'];
files.forEach((f) => require(path.join('..', 'js', f + '.js')));
const PA = globalThis.PA;
const D = PA.Dates;
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('FALHA:', msg); } else console.log('ok   :', msg); };

PA.Store.setAdapter({ load: () => null, save: () => true, clear: () => {} });
// Feriados
ok(D.easter(2024) === '2024-03-31', 'Páscoa 2024');
ok(D.easter(2025) === '2025-04-20', 'Páscoa 2025');
const hol = PA.Specials.builtinForYear(2025, 'SP');
ok(hol.some((h) => h.name === 'Sexta-feira Santa' && h.start === '2025-04-18'), 'Sexta-feira Santa 2025');
ok(hol.some((h) => h.name.startsWith('Carnaval (segunda') && h.start === '2025-03-03'), 'Carnaval 2025');
ok(hol.find((h) => h.name === 'Corpus Christi').start === '2025-06-19', 'Corpus Christi 2025');
ok(!PA.Specials.builtinForYear(2023, 'SP').some((h) => h.name.includes('Consciência')), 'Consciência negra só >= 2024');
ok(hol.filter((h) => h.scope === 'estadual').every((h) => h.confirmed === false), 'Estaduais não confirmados');

const plan = PA.Store.plan();
ok(plan.activities.length > 10, 'demo carregada: ' + plan.activities.length);
const conf = PA.Conflicts.detect(plan);
console.log('conflitos demo:', conf.map((c) => c.type + ' ' + c.date));
ok(conf.some((c) => c.type === 'responsavel'), 'detecta responsável simultâneo');
ok(conf.some((c) => c.type === 'bloqueada'), 'detecta data bloqueada');
ok(conf.some((c) => c.type === 'local'), 'detecta local');

const vals = PA.Validator.validateAll(plan);
Object.keys(vals).forEach((id) => { const a = plan.activities.find((x) => x.id === id); console.log(' -', a.name, '=>', vals[id].status, '|', vals[id].summary.slice(0, 110)); });

const ids = plan.activities.filter((a) => !a.date && ['aprovada', 'aguardando', 'proposta', 'validacao'].indexOf(a.status) >= 0).map((a) => a.id);
['horario', 'dia', 'hibrido', 'prioridade'].forEach((mode) => {
  const t0 = Date.now();
  const g = PA.Scheduler.generate(plan, ids, { mode, from: D.today(), to: D.addDays(D.today(), 42) });
  console.log(mode, 'sel', g.stats.selected, 'prog', g.stats.scheduled, 'sem data', g.stats.unscheduled, 'conf', g.stats.conflicts, 'qualidade', g.quality.score, (Date.now() - t0) + 'ms');
  ok(g.stats.scheduled + g.stats.unscheduled === g.stats.selected, mode + ': contagem consistente');
  ok(g.conflicts.filter((c) => c.severity === 'alta').length === 0, mode + ': sem conflitos graves (' + g.stats.conflicts + ' avisos)');
  if (mode === 'horario') {
    g.unscheduled.forEach((u) => console.log('   sem data:', plan.activities.find((a) => a.id === u.activityId).name, '-', u.reason, u.suggestion));
    const cer = plan.activities.find((a) => a.name.startsWith('Cerimônia'));
    const ev = g.assignments.find((x) => x.activityId === cer.id);
    const un = g.unscheduled.find((x) => x.activityId === cer.id);
    // Data fixa: ou mantém a data original, ou fica sem data com justificativa (nunca é movida em silêncio).
    ok((ev && ev.date === cer.preferredDate) || (!ev && un && un.reason), 'data fixa preservada (ou sem data com justificativa)');
    const blockedHit = g.assignments.some((x) => plan.specials.some((s) => s.impact === 'bloqueio' && x.date >= s.start && x.date <= s.end));
    ok(!blockedHit, 'nenhuma atividade em data bloqueada');
    ok(!g.assignments.some((x) => PA.Dates.weekday(x.date) === 0 || PA.Dates.weekday(x.date) === 6), 'sem fins de semana');
  }
  if (mode === 'dia') ok(g.assignments.every((x) => !x.startTime), 'modo dia sem horário');
});
const g2 = PA.Scheduler.generate(plan, ids, { mode: 'horario', seed: 5 });
ok(g2.stats.scheduled > 0, 'regeneração com semente');

// Locked não alterado
const locked = plan.activities.filter((a) => a.locked);
const gl = PA.Scheduler.generate(plan, locked.map((a) => a.id).concat(ids));
ok(locked.every((a) => !gl.assignments.some((x) => x.activityId === a.id)), 'atividades fixas não são reatribuídas');

// Reprogramação
const rs = PA.Scheduler.reschedule(plan);
console.log('reprogramação: mudanças', rs.changes.length, 'sem solução', rs.unresolved.length, 'fixas afetadas', rs.locked.length);
rs.changes.forEach((c) => console.log('  ', plan.activities.find((a) => a.id === c.activityId).name, c.from.date, '->', c.to.date, c.to.startTime));
ok(rs.changes.every((c) => !plan.activities.find((a) => a.id === c.activityId).locked), 'reprogramação não move fixas');

// NLP
const n = PA.NLP.parse('Realizar uma reunião com os coordenadores durante a segunda semana de agosto, preferencialmente pela manhã, com duração de duas horas.', '2026-07-01');
console.log(JSON.stringify(n.fields));
ok(n.fields.duration === 120, 'NLP duração 2h');
ok(n.fields.preferredPeriod === 'manha', 'NLP manhã');
ok(n.fields.category === 'Reunião', 'NLP categoria');
ok(n.fields.minDate && n.fields.minDate.startsWith('2026-08') && n.fields.deadline.startsWith('2026-08'), 'NLP segunda semana de agosto: ' + n.fields.minDate + ' ' + n.fields.deadline);
ok(/^Reuni/.test(n.fields.name || ''), 'NLP nome: ' + n.fields.name);
ok(/coordenadores/i.test(n.fields.audience || ''), 'NLP público: ' + n.fields.audience);
const n2 = PA.NLP.parse('Workshop de liderança no dia 15 de outubro às 14h por 3 horas e meia no auditório, prioridade alta', '2026-07-01');
console.log(JSON.stringify(n2.fields));
ok(n2.fields.duration === 210 && n2.fields.preferredDate === '2026-10-15' && n2.fields.preferredTime === '14:00', 'NLP workshop');

// Insights & relatórios
const st = PA.Insights.stats(plan);
console.log(PA.Insights.alerts(plan, st).map((a) => a.level + ': ' + a.text));
console.log(PA.Insights.suggestions(plan, st).map((a) => a.text));
Object.keys(PA.Reports.REPORTS).forEach((k) => { const t = PA.Reports.build(plan, k); ok(t.columns.length > 0 && PA.Reports.toCSV(t).length > 10 && PA.Reports.toExcel(t).length > 10, 'relatório ' + k + ' (' + t.rows.length + ' linhas)'); });
console.log(fails ? '\n' + fails + ' FALHA(S)' : '\nTODOS OS TESTES PASSARAM');
process.exit(fails ? 1 : 0);
