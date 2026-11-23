/* Formulários e diálogos compartilhados: proposta, entrada rápida, lote, detalhes, validação e reprogramação individual. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  const D = PA.Dates, C = PA.C, UI = PA.UI, Store = PA.Store, P = PA.Planner, V = PA.Validator, Cf = PA.Conflicts;
  const esc = UI.esc, icon = UI.icon;

  const computeEnd = (start, dur, def) => (start ? D.fromMin(D.toMin(start) + (dur || def || 60)) : '');

  // ------------------------------------------------------------------ Validação (HTML)
  function validationHTML(res, o) {
    o = o || {};
    const st = V.STATUS[res.status];
    const lvlIcon = { error: 'ban', warn: 'warning', info: 'info' };
    let h = '<div class="val-box ' + res.status + '"><div class="row between wrap"><b>' + UI.valBadge(res.status) + '</b>' +
      (res.window ? '<span class="small muted">Período analisado: ' + D.rangeLabel(res.window.from, res.window.to) + '</span>' : '') + '</div>' +
      '<p style="margin-top:7px">' + esc(res.summary) + '</p>';
    if (res.reasons.length) h += '<ul class="reasons">' + res.reasons.map((r) => '<li class="' + r.level + '">' + icon(lvlIcon[r.level]) + '<span>' + esc(r.text) + '</span></li>').join('') + '</ul>';
    if (res.alternatives && res.alternatives.length) {
      h += '<div class="small bold" style="margin-top:10px">' + (res.availableDates ? 'Melhores datas sugeridas:' : 'Alternativas se o período for ampliado:') + '</div><div class="alt-list">' +
        res.alternatives.map((a, i) => '<div class="alt"><b>' + esc(D.WEEKDAYS_SHORT[D.weekday(a.date)] + ', ' + D.br(a.date)) + (a.startTime ? ' · ' + a.startTime + '–' + a.endTime : '') + '</b><span class="muted">' + esc(a.note || '') + '</span>' +
          (o.canApply ? '<div style="margin-top:5px"><button type="button" class="btn sm primary" data-apply-alt="' + i + '">Usar esta data</button></div>' : '') + '</div>').join('') + '</div>';
    }
    void st;
    return h + '</div>';
  }

  // ------------------------------------------------------------------ Formulário de proposta
  function activityForm(id, prefill, opts) {
    opts = opts || {};
    const plan = Store.plan(), S = plan.settings;
    const base = id ? Store.activity(id) : Store.normalizeActivity(Object.assign({}, prefill || {}));
    if (id && !base) return;
    const a = base;
    const cats = (S.categories || C.CATEGORIES).map((c) => c.name);
    const inp = (name, type, val, extra) => '<input type="' + type + '" name="' + name + '" value="' + esc(val == null ? '' : val) + '" ' + (extra || '') + '>';
    const body = '<form id="actform" novalidate autocomplete="off">' +
      (opts.banner ? '<div class="notice info mb">' + icon('wand') + '<div>' + opts.banner + '</div></div>' : '') +
      '<fieldset class="fieldset"><legend>Identificação</legend><div class="form-grid">' +
      UI.field('Nome da atividade', inp('name', 'text', a.name, 'maxlength="120" placeholder="Ex.: Reunião de planejamento"'), { cls: 's3', req: true, name: 'name' }) +
      UI.field('Categoria', '<select name="category">' + UI.opts(cats, a.category) + '</select>', { name: 'category' }) +
      UI.field('Descrição', '<textarea name="description" rows="2">' + esc(a.description) + '</textarea>', { cls: 's4', name: 'description' }) +
      UI.field('Responsável', inp('responsible', 'text', a.responsible, 'list="dl-resp"'), { name: 'responsible', hint: 'Usado para detectar conflitos de agenda.' }) +
      UI.field('Setor ou grupo envolvido', inp('sector', 'text', a.sector), { name: 'sector' }) +
      UI.field('Público-alvo', inp('audience', 'text', a.audience), { name: 'audience' }) +
      UI.field('Nº estimado de participantes', inp('participants', 'number', a.participants, 'min="0" step="1"'), { name: 'participants' }) +
      UI.field('Prioridade', '<select name="priority">' + UI.opts(C.PRIORITIES, a.priority) + '</select>', { name: 'priority' }) +
      '</div></fieldset>' +
      '<fieldset class="fieldset"><legend>Período e duração</legend><div class="form-grid">' +
      UI.field('Data inicial permitida', inp('minDate', 'date', a.minDate), { name: 'minDate', hint: 'Não programar antes desta data.' }) +
      UI.field('Data limite para realização', inp('deadline', 'date', a.deadline), { name: 'deadline' }) +
      UI.field('Data preferencial', inp('preferredDate', 'date', a.preferredDate), { name: 'preferredDate' }) +
      UI.field('Flexibilidade de data', '<select name="dateFlex">' + UI.opts(C.FLEX, a.dateFlex) + '</select>', { name: 'dateFlex', hint: '"Fixa" exige exatamente a data preferencial.' }) +
      UI.field('Duração estimada (minutos)', inp('duration', 'number', a.duration, 'min="5" step="5" placeholder="Ex.: 120"'), { name: 'duration', hint: 'Ex.: 60 = 1h; 120 = 2h.' }) +
      UI.field('Período preferencial', '<select name="preferredPeriod">' + UI.opts(C.PERIODS, a.preferredPeriod, 'Sem preferência') + '</select>', { name: 'preferredPeriod' }) +
      UI.field('Horário preferencial', inp('preferredTime', 'time', a.preferredTime), { name: 'preferredTime' }) +
      UI.field('Flexibilidade de horário', '<select name="timeFlex">' + UI.opts(C.FLEX, a.timeFlex) + '</select>', { name: 'timeFlex' }) +
      '</div></fieldset>' +
      '<fieldset class="fieldset"><legend>Local e recursos</legend><div class="form-grid">' +
      '<div class="field"><label>&nbsp;</label><label class="check"><input type="checkbox" name="needsLocation" ' + (a.needsLocation ? 'checked' : '') + '> Necessita de local</label></div>' +
      UI.field('Local sugerido', inp('location', 'text', a.location, 'list="dl-loc"'), { cls: 's2', name: 'location', hint: 'Dois compromissos no mesmo local e horário geram conflito.' }) +
      UI.field('Recursos necessários', inp('resources', 'text', a.resources, 'placeholder="Projetor, som, buffet…"'), { name: 'resources' }) +
      UI.field('Observações', '<textarea name="notes" rows="2">' + esc(a.notes) + '</textarea>', { cls: 's4', name: 'notes' }) +
      '</div></fieldset>' +
      '<fieldset class="fieldset"><legend>Programação e status</legend><div class="form-grid">' +
      UI.field('Status', '<select name="status">' + UI.opts(C.STATUSES, a.status) + '</select>', { name: 'status' }) +
      UI.field('Data programada', inp('date', 'date', a.date), { name: 'date', hint: 'Deixe vazio para programar depois.' }) +
      UI.field('Horário de início', inp('startTime', 'time', a.startTime), { name: 'startTime' }) +
      '<div class="field"><label>&nbsp;</label><label class="check" title="Atividades fixas nunca são alteradas pelo gerador ou pela reprogramação sem sua autorização."><input type="checkbox" name="locked" ' + (a.locked ? 'checked' : '') + '> Atividade fixa (não mover automaticamente)</label></div>' +
      '</div></fieldset>' +
      '<datalist id="dl-resp">' + uniq(plan.activities.map((x) => x.responsible)).map((v) => '<option value="' + esc(v) + '">').join('') + '</datalist>' +
      '<datalist id="dl-loc">' + uniq(plan.activities.map((x) => x.location)).map((v) => '<option value="' + esc(v) + '">').join('') + '</datalist>' +
      '</form>';

    UI.modal({
      title: id ? 'Editar atividade' : 'Nova proposta de atividade', size: 'lg', body,
      footer: [
        { label: 'Cancelar' },
        { label: id ? 'Salvar alterações' : 'Salvar proposta', cls: 'primary', icon: 'check', onClick: (m) => save(m) },
      ],
    });

    function save(m) {
      const form = m.q('#actform'); const fd = (n) => { const el = form.elements[n]; return el.type === 'checkbox' ? el.checked : el.value.trim(); };
      const errs = {};
      const v = { name: fd('name'), category: fd('category'), description: fd('description'), responsible: fd('responsible'), sector: fd('sector'), audience: fd('audience'), priority: fd('priority'), minDate: fd('minDate'), deadline: fd('deadline'), preferredDate: fd('preferredDate'), dateFlex: fd('dateFlex'), preferredPeriod: fd('preferredPeriod'), preferredTime: fd('preferredTime'), timeFlex: fd('timeFlex'), needsLocation: fd('needsLocation'), location: fd('location'), resources: fd('resources'), notes: fd('notes'), status: fd('status'), date: fd('date'), startTime: fd('startTime'), locked: fd('locked') };
      v.participants = fd('participants') === '' ? null : Number(fd('participants'));
      v.duration = fd('duration') === '' ? null : Number(fd('duration'));
      if (!v.name) errs.name = 'Informe o nome da atividade.';
      if (v.duration != null && (!(v.duration >= 5) || v.duration > 1440)) errs.duration = 'Informe uma duração entre 5 e 1440 minutos.';
      if (v.participants != null && !(v.participants >= 0)) errs.participants = 'Valor inválido.';
      if (v.minDate && v.deadline && v.minDate > v.deadline) errs.deadline = 'A data limite deve ser igual ou posterior à data inicial.';
      if (v.preferredDate && v.minDate && v.preferredDate < v.minDate) errs.preferredDate = 'A data preferencial está antes da data inicial permitida.';
      if (v.preferredDate && v.deadline && v.preferredDate > v.deadline) errs.preferredDate = 'A data preferencial está depois da data limite.';
      if (v.dateFlex === 'fixa' && !v.preferredDate) errs.preferredDate = 'Para data fixa, informe a data preferencial.';
      if (v.timeFlex === 'fixa' && !v.preferredTime) errs.preferredTime = 'Para horário fixo, informe o horário preferencial.';
      if (v.needsLocation && !v.location) errs.location = 'A atividade exige local: informe um local sugerido (ou desmarque a opção).';
      if (v.startTime && !v.date) errs.date = 'Informe a data para definir um horário de início.';
      if (['programada', 'confirmada', 'andamento'].indexOf(v.status) >= 0 && !v.date) errs.date = 'O status "' + C.status(v.status).label + '" exige data programada.';
      m.qa('.field').forEach((f) => { f.classList.remove('invalid'); });
      const keys = Object.keys(errs);
      if (keys.length) {
        keys.forEach((k) => { const f = m.q('[data-field="' + k + '"]'); if (f) { f.classList.add('invalid'); f.querySelector('.err').textContent = errs[k]; } });
        const f0 = m.q('[data-field="' + keys[0] + '"]'); if (f0) { f0.scrollIntoView({ block: 'center' }); const i0 = f0.querySelector('input,select,textarea'); if (i0) i0.focus(); }
        UI.toast('Corrija os campos destacados.', 'warn'); return false;
      }
      if (!v.date) { v.startTime = ''; v.endTime = ''; if (['programada', 'confirmada', 'andamento'].indexOf(v.status) >= 0) v.status = 'aguardando'; }
      else v.endTime = v.startTime ? computeEnd(v.startTime, v.duration, S.defaultDuration) : '';
      if (!v.date && id && Store.activity(id).date) v.endTime = '';
      let saved;
      if (id) { saved = Store.updateActivity(id, v, 'Edição'); UI.toast('Atividade atualizada.'); }
      else {
        if (v.date && v.status === 'proposta') v.status = 'programada';
        saved = Store.addActivity(v, { note: opts.note || 'Proposta cadastrada.' }); UI.toast('Proposta cadastrada. Veja a análise de viabilidade.');
        setTimeout(() => detail(saved.id), 120);
      }
      if (opts.onSaved) opts.onSaved(saved);
      return true;
    }
  }
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean))).sort();

  // ------------------------------------------------------------------ Entrada rápida (linguagem natural)
  const EXAMPLES = [
    'Realizar uma reunião com os coordenadores durante a segunda semana de agosto, preferencialmente pela manhã, com duração de duas horas.',
    'Workshop de liderança com os gestores na próxima semana, à tarde, por 4 horas, prioridade alta, no auditório.',
    'Palestra sobre saúde no dia 15 de outubro às 14h, duração de 1h30.',
  ];
  const FIELD_LABELS = { name: 'Nome', category: 'Categoria', audience: 'Público-alvo', duration: 'Duração', preferredPeriod: 'Período', preferredTime: 'Horário', priority: 'Prioridade', minDate: 'Data inicial', deadline: 'Data limite', preferredDate: 'Data preferencial', dateFlex: 'Flexibilidade de data', location: 'Local', needsLocation: 'Exige local', participants: 'Participantes', responsible: 'Responsável' };
  const fmtField = (k, v) => k === 'duration' ? D.durLabel(v) : /Date|deadline|minDate/.test(k) ? D.br(v) : k === 'preferredPeriod' ? C.PERIODS[v] : k === 'priority' ? C.prio(v).label : k === 'dateFlex' ? C.FLEX[v] : typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : String(v);

  function quickEntry() {
    let parsed = null;
    const m = UI.modal({
      title: 'Entrada rápida em linguagem natural', size: 'lg',
      body: '<p class="muted mb">Descreva a atividade como falaria normalmente. O sistema interpreta e preenche os campos para você revisar antes de confirmar.</p>' +
        '<div class="field"><label>Descreva a proposta</label><textarea id="nl" rows="3" placeholder="Ex.: Reunião com os coordenadores na segunda semana de agosto, pela manhã, por duas horas"></textarea></div>' +
        '<div class="chips mt-s">' + EXAMPLES.map((e, i) => '<button type="button" class="chip-btn" data-ex="' + i + '">Exemplo ' + (i + 1) + '</button>').join('') + '</div><div id="nl-out" class="mt"></div>',
      footer: [{ label: 'Cancelar' }, { label: 'Interpretar', icon: 'wand', onClick: () => { run(); return false; } }, { label: 'Revisar e continuar', cls: 'primary', icon: 'arrow', onClick: (mm) => { if (!parsed) { run(); if (!parsed) return false; } const f = Object.assign({}, parsed.fields); mm.close(); activityForm(null, f, { banner: 'Campos preenchidos automaticamente. <b>Revise</b> as informações antes de salvar.', note: 'Criada por entrada rápida (linguagem natural).' }); return false; } }],
    });
    const run = () => {
      const txt = m.q('#nl').value.trim(); if (!txt) { m.q('#nl').focus(); UI.toast('Digite a descrição da atividade.', 'warn'); return; }
      parsed = PA.NLP.parse(txt);
      const rows = Object.keys(parsed.fields).map((k) => '<tr><td class="bold">' + esc(FIELD_LABELS[k] || k) + '</td><td>' + esc(fmtField(k, parsed.fields[k])) + '</td><td class="muted small">' + esc(parsed.confidence[k] || '') + '</td></tr>').join('');
      m.q('#nl-out').innerHTML = rows ? '<div class="table-wrap"><table class="t"><thead><tr><th>Campo</th><th>Valor interpretado</th><th>Como foi entendido</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + parsed.notes.map((n) => '<div class="notice warn mt-s">' + icon('info') + '<div>' + esc(n) + '</div></div>').join('') : '<div class="notice warn">' + icon('info') + '<div>Não foi possível identificar campos. Reescreva incluindo nome, período e duração.</div></div>';
      if (parsed.fields.name) parsed.fields.description = txt;
    };
    m.el.addEventListener('click', (e) => { const b = e.target.closest('[data-ex]'); if (b) { m.q('#nl').value = EXAMPLES[Number(b.dataset.ex)]; run(); } });
  }

  // ------------------------------------------------------------------ Cadastro em lote
  function batchEntry() {
    let items = [];
    const m = UI.modal({
      title: 'Cadastro de propostas em lote', size: 'lg',
      body: '<p class="muted mb">Digite <b>uma proposta por linha</b>, em linguagem natural, ou cole linhas CSV no formato <code>nome;categoria;responsável;prioridade;duração(min);data limite (AAAA-MM-DD)</code>.</p>' +
        '<div class="field"><textarea id="bt" rows="7" placeholder="Reunião com a diretoria na próxima semana, pela manhã, 1h30&#10;Treinamento de brigada até 30/10, 4 horas, prioridade alta&#10;Palestra institucional;Evento;Ana Souza;alta;90;2026-11-20"></textarea></div><div id="bt-out" class="mt"></div>',
      footer: [{ label: 'Cancelar' }, { label: 'Interpretar linhas', icon: 'wand', onClick: () => { run(); return false; } }, { label: 'Cadastrar propostas', cls: 'primary', icon: 'check', onClick: () => { if (!items.length) { run(); if (!items.length) return false; } items.forEach((it) => Store.addActivity(it, { note: 'Cadastrada em lote.' })); UI.toast(items.length + ' proposta(s) cadastrada(s).'); if (PA.App) PA.App.render(); return true; } }],
    });
    function run() {
      const lines = m.q('#bt').value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      items = lines.map((l) => {
        if (l.indexOf(';') >= 0) {
          const c = l.split(';').map((x) => x.trim()); const pr = ({ baixa: 'baixa', media: 'media', média: 'media', alta: 'alta', critica: 'critica', crítica: 'critica' })[(c[3] || '').toLowerCase()] || 'media';
          const catOk = (Store.plan().settings.categories || C.CATEGORIES).some((x) => x.name === c[1]);
          return { name: c[0], category: catOk ? c[1] : 'Outro', responsible: c[2] || '', priority: pr, duration: Number(c[4]) || null, deadline: /^\d{4}-\d{2}-\d{2}$/.test(c[5] || '') ? c[5] : '', status: 'proposta' };
        }
        const r = PA.NLP.parse(l); const f = r.fields; f.description = l; f.status = 'proposta'; if (!f.name) f.name = l.slice(0, 80); return f;
      }).filter((x) => x.name);
      m.q('#bt-out').innerHTML = items.length ? '<div class="table-wrap"><table class="t"><thead><tr><th>Nome</th><th>Categoria</th><th>Duração</th><th>Período</th><th>Prioridade</th></tr></thead><tbody>' + items.map((x) => '<tr><td class="bold">' + esc(x.name) + '</td><td>' + esc(x.category || 'Outro') + '</td><td>' + esc(D.durLabel(x.duration)) + '</td><td>' + esc(x.preferredDate ? D.br(x.preferredDate) : x.minDate || x.deadline ? D.rangeLabel(x.minDate || '…', x.deadline || '…') : '—') + (x.preferredPeriod ? ' · ' + C.PERIODS[x.preferredPeriod].toLowerCase() : '') + '</td><td>' + UI.prioBadge(x.priority || 'media') + '</td></tr>').join('') + '</tbody></table></div><p class="small muted mt-s">' + items.length + ' proposta(s) serão criadas com status "Proposta" e passarão pela validação.</p>' : '<div class="notice warn">' + icon('info') + '<div>Nenhuma linha válida.</div></div>';
    }
  }

  // ------------------------------------------------------------------ Detalhe da atividade
  function detail(id) {
    const plan = Store.plan(); const a = Store.activity(id); if (!a) return;
    const S = plan.settings;
    const val = a.status === 'cancelada' || a.status === 'concluida' ? null : V.validate(plan, a);
    const confs = Cf.forActivity(Cf.detect(plan), a.id).filter((c) => !c.exception);
    const row = (k, v) => v ? '<div><div class="small muted">' + esc(k) + '</div><div>' + v + '</div></div>' : '';
    const body = '<div class="row wrap gap-s mb">' + UI.statusBadge(a.status) + UI.prioBadge(a.priority) + UI.badge(a.category, 'b-gray') + (a.locked ? UI.badge('Fixa', 'b-purple') : '') + '</div>' +
      '<div class="grid g3 mb" style="gap:12px">' +
      row('Data e horário', esc(UI.dateTimeLabel(a))) + row('Duração', esc(D.durLabel(a.duration || null)) + (a.duration ? '' : '')) + row('Responsável', esc(a.responsible)) +
      row('Setor', esc(a.sector)) + row('Público-alvo', esc(a.audience) + (a.participants ? ' (' + a.participants + ')' : '')) + row('Local', esc(a.location) + (a.needsLocation && !a.location ? '<span class="muted">necessário, não definido</span>' : '')) +
      row('Período permitido', a.minDate || a.deadline ? esc(D.rangeLabel(a.minDate || '…', a.deadline || '…')) : '') + row('Data preferencial', a.preferredDate ? esc(D.br(a.preferredDate)) + ' <span class="muted small">(' + esc(C.FLEX[a.dateFlex]) + ')</span>' : '') +
      row('Preferência de horário', esc([a.preferredPeriod ? C.PERIODS[a.preferredPeriod] : '', a.preferredTime].filter(Boolean).join(' · '))) + row('Recursos', esc(a.resources)) + '</div>' +
      (a.description ? '<p class="mb">' + esc(a.description) + '</p>' : '') + (a.notes ? '<div class="notice info mb">' + icon('info') + '<div>' + esc(a.notes) + '</div></div>' : '') +
      (val ? '<h3 class="mb" style="margin-top:6px">Análise de viabilidade</h3><div id="val-slot">' + validationHTML(val, { canApply: true }) + '</div>' : '') +
      (confs.length ? '<h3 class="mt mb">Conflitos desta atividade</h3><div class="col">' + confs.map((c) => '<div class="alert danger">' + icon('warning') + '<div class="txt"><b>' + esc(c.typeLabel) + '</b> · ' + esc(D.br(c.date)) + '<div class="small">' + esc(c.description) + '</div></div></div>').join('') + '</div>' : '') +
      '<h3 class="mt mb">Histórico</h3><div class="hist">' + (a.history || []).slice(0, 25).map((h) => '<div><span class="muted">' + esc(new Date(h.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })) + '</span><b>' + esc(h.action) + '</b><span>' + esc(h.detail) + '</span></div>').join('') + '</div>';

    const m = UI.modal({
      titleHTML: esc(a.name), size: 'lg', body,
      footer: [
        { label: 'Excluir', cls: 'ghost', icon: 'trash', onClick: async (mm) => { mm.close(); await remove(a.id); return false; }, keepOpen: true },
        { label: 'Duplicar', icon: 'copy', onClick: () => { const c = Store.duplicateActivity(a.id); UI.toast('Atividade duplicada.', 'ok'); refresh(); setTimeout(() => detail(c.id), 100); } },
        { label: 'Reprogramar', icon: 'refresh', onClick: () => { setTimeout(() => moveActivity(a.id), 80); } },
        { label: 'Editar', icon: 'edit', cls: 'primary', onClick: () => { setTimeout(() => activityForm(a.id, null, { onSaved: refresh }), 80); } },
      ],
    });
    m.el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-apply-alt]'); if (!b || !val) return;
      const alt = val.alternatives[Number(b.dataset.applyAlt)];
      if (a.locked && !(await UI.confirm({ title: 'Atividade fixa', message: 'Esta atividade está marcada como fixa. Deseja realmente alterar sua data?', confirmLabel: 'Alterar' }))) return;
      Store.applyAssignments([{ activityId: a.id, date: alt.date, startTime: alt.startTime, endTime: alt.endTime, note: 'Data sugerida pela validação, aprovada pelo usuário.' }], 'Programação');
      UI.toast('Atividade programada para ' + D.br(alt.date) + '.'); m.close(); refresh(); setTimeout(() => detail(a.id), 80);
    });
  }
  function refresh() { if (PA.App) PA.App.render(); }

  async function remove(id) {
    const a = Store.activity(id); if (!a) return false;
    const ok = await UI.confirm({ title: 'Excluir atividade', danger: true, confirmLabel: 'Excluir definitivamente', html: '<p>Excluir <b>' + esc(a.name) + '</b>? O histórico desta atividade também será removido. Esta ação não pode ser desfeita.</p><p class="small muted">Se deseja apenas desistir da atividade, prefira o status "Cancelada".</p>' });
    if (!ok) return false;
    Store.removeActivity(id); UI.toast('Atividade excluída.'); refresh(); return true;
  }

  // ------------------------------------------------------------------ Reprogramação individual
  function moveActivity(id, opts) {
    opts = opts || {};
    const plan = Store.plan(); const a = Store.activity(id); if (!a) return;
    const today = D.today(); let extra = 0;
    const m = UI.modal({
      title: 'Reprogramar: ' + a.name, size: 'lg', body: '<div id="mv"></div>',
      footer: [{ label: 'Cancelar' }, { label: 'Ampliar busca (+30 dias)', icon: 'plus', onClick: () => { extra += 30; draw(); return false; } },
        { label: 'Aplicar nova data', cls: 'primary', icon: 'check', onClick: async (mm) => {
          const sel = mm.q('input[name=cand]:checked'); if (!sel) { UI.toast('Selecione uma das opções.', 'warn'); return false; }
          const c = cands[Number(sel.value)];
          if (a.locked && !(await UI.confirm({ title: 'Atividade fixa', message: 'Esta atividade é fixa. Confirma a alteração de data?', confirmLabel: 'Alterar' }))) return false;
          Store.applyAssignments([{ activityId: a.id, date: c.date, startTime: c.slot.start != null ? D.fromMin(c.slot.start) : '', endTime: c.slot.end != null ? D.fromMin(c.slot.end) : '', note: 'Reprogramação aprovada pelo usuário.' }], 'Reprogramação');
          UI.toast('Atividade reprogramada para ' + D.br(c.date) + '.'); if (opts.onDone) opts.onDone(); refresh(); return true;
        } }],
    });
    let cands = [];
    function draw() {
      const from = D.max(a.minDate || today, today), to = D.addDays(a.deadline ? D.max(a.deadline, from) : D.addDays(from, 45), extra);
      const ctx = P.createContext(plan, { from, to, exclude: [a.id] });
      const r = ctx.candidates(a, { from, to }, { balance: true, avoidConsecutive: true, considerPreferred: true, anchorDate: a.date || a.preferredDate || '', noTime: !a.startTime && !!a.date });
      cands = r.list.slice(0, 8);
      m.q('#mv').innerHTML = '<p class="muted mb">Atual: <b>' + esc(UI.dateTimeLabel(a)) + '</b>. Período analisado: ' + esc(D.rangeLabel(from, to)) + '. As opções abaixo respeitam bloqueios, feriados, conflitos e limites configurados.</p>' +
        (cands.length ? '<div class="col">' + cands.map((c, i) => '<label class="pick" style="border:1px solid var(--line);border-radius:10px"><input type="radio" name="cand" value="' + i + '"' + (i === 0 ? ' checked' : '') + '><div class="grow"><b>' + esc(D.long(c.date)) + (c.slot.start != null ? ' · ' + D.fromMin(c.slot.start) + '–' + D.fromMin(c.slot.end) : '') + '</b><div class="why">' + esc(c.why.join(' · ') || 'Disponível') + '</div></div>' + (i === 0 ? UI.badge('Melhor opção', 'b-ok') : '') + '</label>').join('') + '</div>' : '<div class="notice warn">' + icon('warning') + '<div>Nenhuma data disponível. ' + esc(P.rejectionText(r.rej)) + ' Use "Ampliar busca".</div></div>');
    }
    draw();
  }

  PA.Forms = { activityForm, quickEntry, batchEntry, detail, validationHTML, moveActivity, remove, computeEnd };
})(window);
