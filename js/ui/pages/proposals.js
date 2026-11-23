/* Propostas de atividades: lista, filtros, validação e ações em massa. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  PA.Pages = PA.Pages || {};
  const D = PA.Dates, C = PA.C, UI = PA.UI, Store = PA.Store, V = PA.Validator;
  const esc = UI.esc, icon = UI.icon;

  const F = { q: '', status: '', priority: '', category: '', resp: '', val: '', sort: 'prio' };
  const selected = {};

  PA.Pages.proposals = {
    title: 'Propostas de atividades', subtitle: 'Cadastre, valide e acompanhe propostas',
    render(view, params) {
      const plan = Store.plan();
      if (params && params.status) { F.status = params.status; }
      const vals = V.validateAll(plan);
      const cats = Array.from(new Set(plan.activities.map((a) => a.category))).sort();
      const resps = Array.from(new Set(plan.activities.map((a) => a.responsible).filter(Boolean))).sort();
      const sorters = {
        prio: (a, b) => (C.prio(b.priority).rank - C.prio(a.priority).rank) || (a.name < b.name ? -1 : 1),
        name: (a, b) => (a.name < b.name ? -1 : 1),
        date: (a, b) => ((a.date || '9999') < (b.date || '9999') ? -1 : 1),
        recent: (a, b) => (a.createdAt < b.createdAt ? 1 : -1),
        viab: (a, b) => (((vals[b.id] || { status: 'viavel' }).status === 'viavel' ? 0 : 1) - ((vals[a.id] || { status: 'viavel' }).status === 'viavel' ? 0 : 1)),
      };
      const list = () => plan.activities.filter((a) => {
        if (F.q && !(a.name + ' ' + a.description + ' ' + a.responsible + ' ' + a.sector + ' ' + a.location + ' ' + a.audience).toLowerCase().includes(F.q.toLowerCase())) return false;
        if (F.status === 'pendente' ? !(a.status === 'proposta' || a.status === 'validacao') : F.status === 'semdata' ? (a.date || a.status === 'cancelada' || a.status === 'concluida') : F.status && a.status !== F.status) return false;
        if (F.priority && a.priority !== F.priority) return false;
        if (F.category && a.category !== F.category) return false;
        if (F.resp && a.responsible !== F.resp) return false;
        if (F.val && (!vals[a.id] || vals[a.id].status !== F.val)) return false;
        return true;
      }).sort(sorters[F.sort]);

      view.innerHTML =
        '<div class="page-head"><div><h1>Propostas de atividades</h1><p>Registre ideias e compromissos ainda sem data. Cada proposta passa por uma análise automática de viabilidade.</p></div>' +
        '<div class="row wrap"><button class="btn" data-act="batch">' + icon('layers') + 'Cadastro em lote</button><button class="btn" data-act="quick">' + icon('wand') + 'Entrada rápida</button><button class="btn primary" data-act="new">' + icon('plus') + 'Nova proposta</button></div></div>' +
        '<div class="toolbar"><div class="search">' + icon('search') + '<input type="search" id="f-q" placeholder="Buscar por nome, responsável, local…" value="' + esc(F.q) + '"></div>' +
        '<select id="f-status"><option value="">Todos os status</option><option value="pendente"' + (F.status === 'pendente' ? ' selected' : '') + '>Pendentes de validação</option><option value="semdata"' + (F.status === 'semdata' ? ' selected' : '') + '>Sem data definida</option>' + UI.opts(C.STATUSES, F.status) + '</select>' +
        '<select id="f-prio">' + UI.opts(C.PRIORITIES, F.priority, 'Toda prioridade') + '</select>' +
        '<select id="f-cat">' + UI.opts(cats, F.category, 'Toda categoria') + '</select>' +
        '<select id="f-resp">' + UI.opts(resps, F.resp, 'Todo responsável') + '</select>' +
        '<select id="f-val">' + UI.opts({ viavel: 'Viável', ressalvas: 'Viável com ressalvas', ajustes: 'Necessita ajustes', inviavel: 'Inviável' }, F.val, 'Toda viabilidade') + '</select>' +
        '<select id="f-sort">' + UI.opts({ prio: 'Ordenar: prioridade', name: 'Ordenar: nome', date: 'Ordenar: data', recent: 'Ordenar: mais recentes', viab: 'Ordenar: problemas primeiro' }, F.sort) + '</select>' +
        '<button class="btn ghost" data-act="clear">Limpar filtros</button></div>' +
        '<div id="bulk" class="row wrap mb"></div><div id="tbl"></div>';

      const drawBulk = () => {
        const ids = Object.keys(selected).filter((k) => selected[k] && Store.activity(k));
        view.querySelector('#bulk').innerHTML = ids.length ? '<div class="notice info" style="width:100%;align-items:center;flex-wrap:wrap">' + icon('checkc') + '<b>' + ids.length + ' selecionada(s)</b><span class="grow"></span>' +
          '<button class="btn sm" data-bulk="approve">Aprovar</button><button class="btn sm" data-bulk="validate">Enviar para validação</button><button class="btn sm primary" data-bulk="gen">' + icon('zap') + 'Programar selecionadas</button><button class="btn sm" data-bulk="cancel">Cancelar</button><button class="btn sm danger" data-bulk="delete">Excluir</button></div>' : '';
      };
      const drawTable = () => {
        const rows = list();
        view.querySelector('#tbl').innerHTML = rows.length ?
          '<div class="table-wrap"><table class="t"><thead><tr><th style="width:34px"><input type="checkbox" id="all" aria-label="Selecionar todas"></th><th>Atividade</th><th>Prioridade</th><th>Período / data</th><th>Duração</th><th>Status</th><th>Viabilidade</th><th></th></tr></thead><tbody>' +
          rows.map((a) => { const v = vals[a.id]; return '<tr><td><input type="checkbox" data-sel="' + a.id + '"' + (selected[a.id] ? ' checked' : '') + ' aria-label="Selecionar"></td>' +
            '<td><div class="title-cell"><span class="swatch" style="background:' + UI.catColor(a.category) + '"></span><div><div class="nm"><a href="#" data-detail="' + a.id + '" style="color:inherit">' + esc(a.name) + '</a></div><div class="sm">' + esc([a.category, a.responsible, a.location].filter(Boolean).join(' · ')) + '</div></div></div></td>' +
            '<td>' + UI.prioBadge(a.priority) + '</td>' +
            '<td class="small">' + (a.date ? '<b>' + esc(D.br(a.date)) + '</b>' + (a.startTime ? '<br>' + esc(UI.timeRange(a)) : '') : a.minDate || a.deadline ? esc(D.rangeLabel(a.minDate || '…', a.deadline || '…')) : '<span class="muted">livre</span>') + (a.preferredDate && !a.date ? '<br><span class="muted">pref. ' + esc(D.br(a.preferredDate)) + '</span>' : '') + '</td>' +
            '<td>' + (a.duration ? esc(D.durLabel(a.duration)) : '<span class="badge b-warn">não definida</span>') + '</td>' +
            '<td>' + UI.statusBadge(a.status) + '</td>' +
            '<td>' + (v ? '<button class="btn sm ghost" style="padding:0" data-val="' + a.id + '" title="Ver justificativa">' + UI.valBadge(v.status) + '</button>' : '<span class="muted small">—</span>') + '</td>' +
            '<td class="act"><button class="btn sm ghost icon" data-detail="' + a.id + '" title="Abrir">' + icon('eye') + '</button><button class="btn sm ghost icon" data-edit="' + a.id + '" title="Editar">' + icon('edit') + '</button><button class="btn sm ghost icon" data-dup="' + a.id + '" title="Duplicar">' + icon('copy') + '</button><button class="btn sm ghost icon" data-del="' + a.id + '" title="Excluir">' + icon('trash') + '</button></td></tr>'; }).join('') + '</tbody></table></div><p class="small muted mt-s">' + rows.length + ' de ' + plan.activities.length + ' proposta(s)</p>'
          : '<div class="card">' + UI.empty('list', plan.activities.length ? 'Nenhuma proposta encontrada' : 'Nenhuma proposta cadastrada', plan.activities.length ? 'Ajuste os filtros para ver outras propostas.' : 'Cadastre a primeira proposta ou use a entrada rápida em linguagem natural.', '<button class="btn primary" data-act="new">' + icon('plus') + 'Nova proposta</button>') + '</div>';
        drawBulk();
      };
      drawTable();

      const bind = (id, key, ev) => { const el = view.querySelector(id); el.addEventListener(ev || 'change', () => { F[key] = el.value; drawTable(); }); };
      view.querySelector('#f-q').addEventListener('input', UI.debounce((e) => { F.q = e.target.value; drawTable(); }, 150));
      bind('#f-status', 'status'); bind('#f-prio', 'priority'); bind('#f-cat', 'category'); bind('#f-resp', 'resp'); bind('#f-val', 'val'); bind('#f-sort', 'sort');
      const rerender = () => PA.App.render();

      view.onclick = async (e) => {
        const t = e.target;
        const g = (a) => { const el = t.closest('[' + a + ']'); return el ? el.getAttribute(a) : null; };
        if (t.id === 'all') { list().forEach((a) => { selected[a.id] = t.checked; }); drawTable(); return; }
        if (t.dataset && t.dataset.sel) { selected[t.dataset.sel] = t.checked; drawBulk(); return; }
        const act = g('data-act');
        if (act === 'new') return PA.Forms.activityForm(null, null, { onSaved: rerender });
        if (act === 'quick') return PA.Forms.quickEntry();
        if (act === 'batch') return PA.Forms.batchEntry();
        if (act === 'clear') { Object.assign(F, { q: '', status: '', priority: '', category: '', resp: '', val: '' }); return rerender(); }
        const det = g('data-detail'); if (det) { e.preventDefault(); return PA.Forms.detail(det); }
        const val = g('data-val'); if (val) return showVal(val);
        const ed = g('data-edit'); if (ed) return PA.Forms.activityForm(ed, null, { onSaved: rerender });
        const du = g('data-dup'); if (du) { Store.duplicateActivity(du); UI.toast('Atividade duplicada.'); return rerender(); }
        const de = g('data-del'); if (de) { if (await PA.Forms.remove(de)) delete selected[de]; return; }
        const bulk = g('data-bulk'); if (bulk) return doBulk(bulk);
      };

      function showVal(id) {
        const a = Store.activity(id); const res = V.validate(Store.plan(), a);
        UI.modal({ title: 'Viabilidade: ' + a.name, size: 'lg', body: PA.Forms.validationHTML(res), footer: [{ label: 'Fechar' }, { label: 'Abrir atividade', cls: 'primary', onClick: () => setTimeout(() => PA.Forms.detail(id), 80) }] });
      }
      async function doBulk(kind) {
        const ids = Object.keys(selected).filter((k) => selected[k] && Store.activity(k));
        if (!ids.length) return;
        if (kind === 'gen') { PA.Pages.generator.preselect(ids); return UI.go('#/gerador'); }
        if (kind === 'delete') { if (!(await UI.confirm({ title: 'Excluir propostas', danger: true, confirmLabel: 'Excluir', message: 'Excluir ' + ids.length + ' atividade(s) definitivamente?' }))) return; ids.forEach((id) => Store.removeActivity(id)); ids.forEach((id) => delete selected[id]); UI.toast(ids.length + ' atividade(s) excluída(s).'); return rerender(); }
        if (kind === 'cancel') { if (!(await UI.confirm({ title: 'Cancelar atividades', confirmLabel: 'Cancelar atividades', message: 'Marcar ' + ids.length + ' atividade(s) como canceladas? Elas deixam de ocupar o calendário.' }))) return; ids.forEach((id) => { Store.setStatus(id, 'cancelada'); }); UI.toast('Atividades canceladas.'); return rerender(); }
        const st = kind === 'approve' ? 'aprovada' : 'validacao';
        ids.forEach((id) => { const a = Store.activity(id); if (a.date && st === 'aprovada') Store.setStatus(id, 'programada'); else Store.setStatus(id, st); });
        UI.toast(ids.length + ' atividade(s) atualizada(s).'); rerender();
      }

      if (params && params.validar && Store.activity(params.validar)) setTimeout(() => showVal(params.validar), 60);
    },
  };
})(window);
