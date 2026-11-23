/* Central de Compromissos: controle de status, histórico e ações por compromisso. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  PA.Pages = PA.Pages || {};
  const D = PA.Dates, C = PA.C, UI = PA.UI, Store = PA.Store, Cf = PA.Conflicts;
  const esc = UI.esc, icon = UI.icon;

  const F = { q: '', status: '', priority: '', resp: '', period: 'todos' };
  const GROUPS = { todos: 'Todos', ativos: 'Ativos', pendente: 'Em análise', programados: 'Programados', finalizados: 'Finalizados' };
  const groupOf = { proposta: 'pendente', validacao: 'pendente', aprovada: 'pendente', aguardando: 'pendente', programada: 'programados', confirmada: 'programados', andamento: 'programados', reprogramar: 'programados', concluida: 'finalizados', cancelada: 'finalizados' };

  PA.Pages.center = {
    title: 'Central de compromissos', subtitle: 'Controle toda a programação',
    render(view, params) {
      const plan = Store.plan(); if (params && params.status) { F.status = params.status; F.period = 'todos'; }
      const confs = Cf.active(Cf.detect(plan)); const confIds = {}; confs.forEach((c) => c.activityIds.forEach((id) => { confIds[id] = true; }));
      const resps = Array.from(new Set(plan.activities.map((a) => a.responsible).filter(Boolean))).sort();
      const counts = { todos: plan.activities.length }; plan.activities.forEach((a) => { const g = groupOf[a.status]; counts[g] = (counts[g] || 0) + 1; });
      counts.ativos = plan.activities.filter((a) => a.status !== 'cancelada' && a.status !== 'concluida').length;
      const rows = plan.activities.filter((a) => {
        if (F.period === 'ativos' ? (a.status === 'cancelada' || a.status === 'concluida') : F.period !== 'todos' && groupOf[a.status] !== F.period) return false;
        if (F.status && a.status !== F.status) return false;
        if (F.priority && a.priority !== F.priority) return false;
        if (F.resp && a.responsible !== F.resp) return false;
        if (F.q && !(a.name + ' ' + a.responsible + ' ' + a.location + ' ' + a.notes).toLowerCase().includes(F.q.toLowerCase())) return false;
        return true;
      }).sort((a, b) => ((a.date || '9999') + (a.startTime || '')) < ((b.date || '9999') + (b.startTime || '')) ? -1 : 1);

      view.innerHTML =
        '<div class="page-head"><div><h1>Central de Compromissos</h1><p>Altere status, registre observações, confirme realização, reprograme ou cancele. Todo ajuste fica registrado no histórico.</p></div><div class="row"><button class="btn primary" data-act="new">' + icon('plus') + 'Novo compromisso</button></div></div>' +
        '<div class="tabs">' + Object.keys(GROUPS).map((k) => '<button data-period="' + k + '" class="' + (F.period === k ? 'on' : '') + '">' + GROUPS[k] + ' <span class="n">' + (counts[k] || 0) + '</span></button>').join('') + '</div>' +
        '<div class="toolbar"><div class="search">' + icon('search') + '<input type="search" id="f-q" placeholder="Buscar compromisso…" value="' + esc(F.q) + '"></div><select id="f-status">' + UI.opts(C.STATUSES, F.status, 'Todos os status') + '</select><select id="f-prio">' + UI.opts(C.PRIORITIES, F.priority, 'Toda prioridade') + '</select><select id="f-resp">' + UI.opts(resps, F.resp, 'Todo responsável') + '</select><button class="btn ghost" data-act="clear">Limpar</button></div>' +
        (rows.length ? '<div class="table-wrap"><table class="t"><thead><tr><th>Compromisso</th><th>Data / horário</th><th>Responsável</th><th>Prioridade</th><th style="min-width:190px">Status</th><th></th></tr></thead><tbody>' + rows.map((a) =>
          '<tr><td><div class="title-cell"><span class="swatch" style="background:' + UI.catColor(a.category) + '"></span><div><div class="nm"><a href="#" data-detail="' + a.id + '" style="color:inherit">' + esc(a.name) + '</a> ' + (a.locked ? '<span title="Atividade fixa">' + icon('lock') + '</span>' : '') + '</div><div class="sm">' + esc([a.category, a.location].filter(Boolean).join(' · ')) + '</div></div></div>' + (confIds[a.id] ? UI.badge('Conflito', 'b-danger', true) : '') + '</td>' +
          '<td class="nowrap">' + (a.date ? '<b>' + esc(D.WEEKDAYS_SHORT[D.weekday(a.date)] + ' ' + D.br(a.date)) + '</b><div class="small muted">' + (a.startTime ? esc(UI.timeRange(a)) : 'dia todo') + '</div>' : '<span class="muted">Sem data</span>') + '</td>' +
          '<td>' + esc(a.responsible || '—') + '</td><td>' + UI.prioBadge(a.priority) + '</td>' +
          '<td><select data-status="' + a.id + '" aria-label="Alterar status" style="min-height:32px;padding:4px 8px">' + UI.opts(C.STATUSES, a.status) + '</select></td>' +
          '<td class="act">' + (a.status !== 'concluida' && a.status !== 'cancelada' ? '<button class="btn sm ghost icon" data-done="' + a.id + '" title="Confirmar realização">' + icon('checkc') + '</button>' : '') + '<button class="btn sm ghost icon" data-note="' + a.id + '" title="Registrar observação">' + icon('file') + '</button><button class="btn sm ghost icon" data-move="' + a.id + '" title="Reprogramar">' + icon('refresh') + '</button><button class="btn sm ghost icon" data-edit="' + a.id + '" title="Editar">' + icon('edit') + '</button><button class="btn sm ghost icon" data-dup="' + a.id + '" title="Duplicar">' + icon('copy') + '</button><button class="btn sm ghost icon" data-hist="' + a.id + '" title="Histórico">' + icon('history') + '</button><button class="btn sm ghost icon" data-cancel="' + a.id + '" title="Cancelar">' + icon('ban') + '</button><button class="btn sm ghost icon" data-del="' + a.id + '" title="Excluir">' + icon('trash') + '</button></td></tr>').join('') + '</tbody></table></div><p class="small muted mt-s">' + rows.length + ' compromisso(s)</p>'
          : '<div class="card">' + UI.empty('checksq', 'Nenhum compromisso encontrado', 'Ajuste os filtros ou cadastre um novo compromisso.') + '</div>');

      const rerender = () => PA.App.render();
      view.querySelector('#f-q').addEventListener('input', UI.debounce((e) => { F.q = e.target.value; rerender(); const el = document.querySelector('#f-q'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 250));
      [['#f-status', 'status'], ['#f-prio', 'priority'], ['#f-resp', 'resp']].forEach((p) => { view.querySelector(p[0]).onchange = (e) => { F[p[1]] = e.target.value; rerender(); }; });

      view.onchange = async (e) => {
        const t = e.target; if (!t.dataset.status) return;
        const a = Store.activity(t.dataset.status); const ns = t.value; if (!a || ns === a.status) return;
        if (['programada', 'confirmada', 'andamento'].indexOf(ns) >= 0 && !a.date) { UI.toast('Defina uma data antes: use "Reprogramar" ou o Gerador.', 'warn'); return rerender(); }
        if (ns === 'cancelada' && !(await UI.confirm({ title: 'Cancelar compromisso', confirmLabel: 'Cancelar compromisso', message: 'Marcar "' + a.name + '" como cancelada? Ela deixará de ocupar o calendário.' }))) return rerender();
        Store.setStatus(a.id, ns); UI.toast('Status alterado para "' + C.status(ns).label + '".'); rerender();
      };
      view.onclick = async (e) => {
        const t = e.target; const g = (s) => { const el = t.closest('[' + s + ']'); return el ? el.getAttribute(s) : null; };
        const per = g('data-period'); if (per) { F.period = per; F.status = ''; return rerender(); }
        const act = g('data-act'); if (act === 'new') return PA.Forms.activityForm(null, null, { onSaved: rerender }); if (act === 'clear') { Object.assign(F, { q: '', status: '', priority: '', resp: '', period: 'todos' }); return rerender(); }
        const det = g('data-detail'); if (det) { e.preventDefault(); return PA.Forms.detail(det); }
        const ed = g('data-edit'); if (ed) return PA.Forms.activityForm(ed, null, { onSaved: rerender });
        const du = g('data-dup'); if (du) { Store.duplicateActivity(du); UI.toast('Atividade duplicada como nova proposta.'); return rerender(); }
        const de = g('data-del'); if (de) return PA.Forms.remove(de);
        const mv = g('data-move'); if (mv) return PA.Forms.moveActivity(mv, { onDone: rerender });
        const dn = g('data-done'); if (dn) {
          const a = Store.activity(dn); const note = await UI.promptText({ title: 'Confirmar realização', label: 'Observação sobre a realização (opcional)', okLabel: 'Marcar como concluída', multiline: true }); if (note == null) return;
          Store.setStatus(dn, 'concluida', note || 'realização confirmada'); UI.toast('"' + a.name + '" concluída.'); return rerender();
        }
        const nt = g('data-note'); if (nt) { const text = await UI.promptText({ title: 'Registrar observação', label: 'Observação', multiline: true, required: true }); if (text) { Store.addNote(nt, text); UI.toast('Observação registrada no histórico.'); rerender(); } return; }
        const ca = g('data-cancel'); if (ca) {
          const a = Store.activity(ca); if (a.status === 'cancelada') return UI.toast('Já está cancelada.', 'warn');
          const why = await UI.promptText({ title: 'Cancelar compromisso', label: 'Motivo do cancelamento', multiline: true, okLabel: 'Cancelar compromisso' }); if (why == null) return;
          Store.setStatus(ca, 'cancelada', why || 'sem motivo informado'); UI.toast('Compromisso cancelado. Deseja reprogramar outros? Veja Conflitos.', 'warn', { label: 'Ver conflitos', fn: () => UI.go('#/conflitos') }); return rerender();
        }
        const hi = g('data-hist'); if (hi) { const a = Store.activity(hi); UI.modal({ title: 'Histórico: ' + a.name, size: 'lg', body: '<div class="hist">' + (a.history || []).map((h) => '<div><span class="muted">' + esc(new Date(h.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })) + '</span><b>' + esc(h.action) + '</b><span>' + esc(h.detail) + '</span></div>').join('') + '</div>', footer: [{ label: 'Fechar' }] }); }
      };
    },
  };
})(window);
