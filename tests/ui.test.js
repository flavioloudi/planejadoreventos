// Teste de interface com jsdom: renderiza todas as páginas e exercita fluxos principais.
// Uso: node tests/ui.test.js  (requer jsdom: npm i --prefix .tmp-jsdom jsdom)
const path = require('path');
const fs = require('fs');
const { JSDOM } = require(path.join('..', '.tmp-jsdom', 'node_modules', 'jsdom'));
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script src="[^"]+"><\/script>/g, '');
const dom = new JSDOM(html, { url: 'http://localhost/index.html', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
w.print = () => {}; w.scrollTo = () => {};
w.Element.prototype.scrollIntoView = function () {};
const errors = [];
w.addEventListener('error', (e) => errors.push(e.message));
w.console.error = (...a) => errors.push(a.join(' '));
const src = (f) => fs.readFileSync(path.join(root, 'js', f), 'utf8');
['core/dates.js', 'core/constants.js', 'engine/specials.js', 'core/store.js', 'core/demo.js', 'engine/planner.js', 'engine/conflicts.js', 'engine/validator.js', 'engine/scheduler.js', 'engine/nlp.js', 'engine/insights.js', 'engine/reports.js', 'ui/ui.js', 'ui/forms.js',
  'ui/pages/dashboard.js', 'ui/pages/proposals.js', 'ui/pages/generator.js', 'ui/pages/calendar.js', 'ui/pages/center.js', 'ui/pages/specials.js', 'ui/pages/conflicts.js', 'ui/pages/reports.js', 'ui/pages/settings.js', 'ui/app.js']
  .forEach((f) => { try { w.eval(src(f)); } catch (e) { errors.push(f + ': ' + e.stack); } });

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FALHA:', m); } else console.log('ok   :', m); };
const doc = w.document, PA = w.PA;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (s) => doc.querySelector(s);
const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const go = async (h) => { w.location.hash = h; await sleep(30); };

(async () => {
  ok(errors.length === 0, 'scripts carregam sem erro ' + errors.join(' | '));
  const routes = ['dashboard', 'propostas', 'gerador', 'calendario', 'central', 'datas', 'conflitos', 'relatorios', 'configuracoes'];
  for (const r of routes) {
    await go('#/' + r);
    const v = $('#view').innerHTML;
    ok(v.length > 500 && !/Ocorreu um erro/.test(v), 'página ' + r + ' (' + v.length + ' bytes)');
  }
  ok(errors.length === 0, 'sem erros de console: ' + errors.slice(0, 3).join(' | '));

  // calendário: todas as visões
  await go('#/calendario');
  for (const v of ['semana', 'dia', 'lista', 'agenda', 'categoria', 'responsavel', 'mes']) {
    click($('[data-view="' + v + '"]')); await sleep(10);
    ok(!/Ocorreu um erro/.test($('#view').innerHTML) && $('#view').innerHTML.length > 800, 'calendário visão ' + v);
  }
  // modal de nova proposta com validação
  await go('#/propostas');
  click($('[data-act=new]')); await sleep(10);
  ok(!!$('#actform'), 'abre formulário de proposta');
  click(doc.querySelector('[data-foot="1"]')); await sleep(10);
  ok(!!doc.querySelector('.field.invalid'), 'validação bloqueia proposta sem nome');
  const f = $('#actform'); f.elements.name.value = 'Teste automatizado'; f.elements.duration.value = '90';
  const before = PA.Store.plan().activities.length;
  click(doc.querySelector('[data-foot="1"]')); await sleep(200);
  ok(PA.Store.plan().activities.length === before + 1, 'proposta salva');
  ok(!!doc.querySelector('.val-box'), 'detalhe com validação exibido após salvar');
  doc.querySelector('[data-close]').click(); await sleep(10);

  // entrada rápida
  click($('[data-act=quick]')); await sleep(10);
  $('#nl').value = 'Realizar uma reunião com os coordenadores durante a segunda semana de agosto, preferencialmente pela manhã, com duração de duas horas.';
  click(doc.querySelector('[data-foot="1"]')); await sleep(10);
  ok(/Valor interpretado/.test(doc.querySelector('#nl-out').innerHTML), 'entrada rápida interpreta texto');
  click(doc.querySelector('[data-foot="2"]')); await sleep(30);
  ok($('#actform') && $('#actform').elements.duration.value === '120' && $('#actform').elements.preferredPeriod.value === 'manha', 'entrada rápida preenche o formulário para revisão');
  doc.querySelector('[data-close]').click(); await sleep(10);

  // gerador → simulação → aprovação
  await go('#/gerador');
  click($('[data-act=run]')); await sleep(50);
  ok(/Simulação da programação/.test($('#view').innerHTML), 'gerador exibe simulação');
  const nBefore = PA.Store.plan().activities.filter((a) => a.date).length;
  ok(/Qualidade/.test($('#view').innerHTML), 'índice de qualidade exibido');
  click($('[data-act=apply]')); await sleep(20);
  click(doc.querySelector('.modal-f .btn.primary')); await sleep(60);
  const nAfter = PA.Store.plan().activities.filter((a) => a.date).length;
  ok(nAfter > nBefore, 'aprovação efetiva a programação (' + nBefore + ' → ' + nAfter + ')');

  // regenerar / descartar não alteram dados
  await go('#/gerador');
  const snap = JSON.stringify(PA.Store.plan().activities.map((a) => a.date));
  click($('[data-act=run]')); await sleep(40);
  if ($('[data-act=regen]')) { click($('[data-act=regen]')); await sleep(40); }
  ok(snap === JSON.stringify(PA.Store.plan().activities.map((a) => a.date)), 'simulação/regeneração não alteram dados');

  // conflitos
  await go('#/conflitos');
  ok(/Resolver/.test($('#view').innerHTML), 'conflitos exibem ações');
  click($('[data-act=auto]')); await sleep(30);
  ok(!!doc.querySelector('.modal'), 'resolução automática mostra proposta antes de aplicar');
  doc.querySelector('[data-close]').click();

  // persistência
  const saved = JSON.parse(w.localStorage.getItem(PA.Store.KEY));
  ok(saved && saved.plans[0].activities.length === PA.Store.plan().activities.length, 'dados persistidos no localStorage');
  // relatórios
  await go('#/relatorios');
  for (const k of Object.keys(PA.Reports.REPORTS)) { click($('[data-rep="' + k + '"]')); await sleep(5); ok(!/Ocorreu um erro/.test($('#view').innerHTML), 'relatório ' + k); }
  // datas especiais: cria data
  await go('#/datas');
  click($('[data-act=new]')); await sleep(10);
  const sf = $('#spform'); sf.elements.name.value = 'ENEM (teste)'; sf.elements.start.value = PA.Dates.addDays(PA.Dates.today(), 30); sf.elements.category.value = 'ENEM'; sf.elements.impact.value = 'bloqueio';
  const nsp = PA.Store.plan().specials.length; click(doc.querySelector('[data-foot="1"]')); await sleep(30);
  ok(PA.Store.plan().specials.length === nsp + 1, 'cadastro de data especial');
  // planos múltiplos
  const n0 = PA.Store.plans().length; PA.Store.addPlan('Outro', false); await sleep(10);
  ok(PA.Store.plans().length === n0 + 1 && PA.Store.plan().activities.length === 0, 'novo planejamento isolado');
  await go('#/dashboard'); ok(!/Ocorreu um erro/.test($('#view').innerHTML), 'dashboard com planejamento vazio');
  for (const r of routes) { await go('#/' + r); ok(!/Ocorreu um erro/.test($('#view').innerHTML), 'plano vazio: ' + r); }
  ok(errors.length === 0, 'nenhum erro ao final: ' + errors.slice(0, 3).join(' | '));
  console.log(fails ? '\n' + fails + ' FALHA(S)' : '\nTODOS OS TESTES DE UI PASSARAM');
  process.exit(fails ? 1 : 0);
})();
