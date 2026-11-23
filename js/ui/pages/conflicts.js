/* Conflitos e validações: conflitos detectados, ações rápidas e reprogramação inteligente. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  PA.Pages = PA.Pages || {};
  const D = PA.Dates, C = PA.C, UI = PA.UI, Store = PA.Store, Cf = PA.Conflicts, V = PA.Validator, Sch = PA.Scheduler;
  const esc = UI.esc, icon = UI.icon;

  const F = { tab: 'conflitos', sev: '', type: '', show: 'abertos' };

  PA.Pages.conflicts = {
    title: 'Conflitos e validações', subtitle: 'Detecte e resolva problemas',
    render(view) {
      const plan = Store.plan(); const all = Cf.detect(plan);
      const open = Cf.active(all);
      const list = all.filter((c) => (F.show === 'todos' ? true : F.show === 'abertos' ? !c.exception : !!c.exception) && (!F.sev || c.severity === F.sev) && (!F.type || c.type === F.type));
      const vals = V.validateAll(plan);
      const problems = Object.keys(vals).filter((id) => vals[id].status !== 'viavel').map((id) => Store.activity(id));
      const counts = { alta: open.filter((c) => c.severity === 'alta').length, media: open.filter((c) => c.severity === 'media').length, baixa: open.filter((c) => c.severity === 'baixa').length };

      view.innerHTML =
        '<div class="page-head"><div><h1>Conflitos e validações</h1><p>Detectamos conflitos de horário, responsável, local, datas bloqueadas, excesso de carga e mais. Nenhuma correção é aplicada sem a sua aprovação.</p></div><div class="row wrap"><button class="btn primary" data-act="auto">' + icon('wand') + 'Resolver automaticamente</button></div></div>' +
        '<div class="grid g4 mb"><div class="card kpi"><span class="lbl">Conflitos abertos</span><span class="val" style="color:' + (open.length ? 'var(--danger)' : 'var(--ok)') + '">' + open.length + '</span></div><div class="card kpi"><span class="lbl">Gravidade alta</span><span class="val">' + counts.alta + '</span></div><div class="card kpi"><span class="lbl">Gravidade média / baixa</span><span class="val">' + counts.media + ' / ' + counts.baixa + '</span></div><div class="card kpi"><span class="lbl">Ignorados / exceções</span><span class="val">' + (all.length - open.length) + '</span></div></div>' +
        '<div class="tabs"><button data-tab="conflitos" class="' + (F.tab === 'conflitos' ? 'on' : '') + '">' + icon('warning') + 'Conflitos <span class="n">' + open.length + '</span></button><button data-tab="validacoes" class="' + (F.tab === 'validacoes' ? 'on' : '') + '">' + icon('checkc') + 'Validação das propostas <span class="n">' + problems.length + '</span></button></div>' +
        (F.tab === 'conflitos' ? conflictsHTML(list) : validationsHTML(plan, vals));

      function conflictsHTML(items) {
        return '<div class="toolbar"><select id="f-show">' + UI.opts({ abertos: 'Somente abertos', ignorados: 'Ignorados / exceções', todos: 'Todos' }, F.show) + '</select><select id="f-sev">' + UI.opts(Cf.SEV_LABEL, F.sev, 'Toda gravidade') + '</select><select id="f-type">' + UI.opts(Object.keys(Cf.TYPES).reduce((m, k) => { m[k] = Cf.TYPES[k].label; return m; }, {}), F.type, 'Todo tipo') + '</select></div>' +
          (items.length ? '<div class="col" style="gap:12px">' + items.map((c, i) => {
            const names = UI.names(c.activityIds);
            return '<div class="card" style="border-left:4px solid ' + (c.severity === 'alta' ? 'var(--danger)' : c.severity === 'media' ? 'var(--warn)' : 'var(--info)') + '"><div class="row between wrap top"><div class="grow"><div class="row wrap gap-s">' + UI.sevBadge(c.severity) + UI.badge(c.typeLabel, 'b-gray') + (c.exception ? UI.badge(c.exception.mode === 'ignorado' ? 'Ignorado' : 'Mantido como exceção', 'b-purple') : '') + '</div>' +
              '<h3 style="margin-top:7px">' + c.activityIds.map((id, k) => '<a href="#" data-open="' + id + '" style="color:inherit">' + esc(names[k]) + '</a>').join(' <span class="muted">×</span> ') + '</h3>' +
              '<div class="small muted" style="margin-top:3px">' + icon('calendar') + ' ' + esc(c.type === 'excesso_semana' ? 'Semana de ' + D.br(c.date) : D.long(c.date)) + (c.time ? ' · ' + icon('clock') + ' ' + esc(c.time) : '') + '</div>' +
              '<p style="margin-top:7px">' + esc(c.description) + '</p><div class="notice info mt-s">' + icon('star') + '<div><b>Sugestão:</b> ' + esc(c.suggestion) + (c.exception && c.exception.note ? '<br><b>Justificativa registrada:</b> ' + esc(c.exception.note) : '') + '</div></div></div></div>' +
              '<div class="row wrap mt-s">' + (c.exception ? '<button class="btn sm" data-reopen="' + i + '">Reabrir conflito</button>' :
                '<button class="btn sm primary" data-resolve="' + i + '">' + icon('wand') + 'Resolver</button><button class="btn sm" data-chtime="' + i + '">' + icon('clock') + 'Alterar horário</button><button class="btn sm" data-chdate="' + i + '">' + icon('calendar') + 'Alterar data</button><button class="btn sm" data-ignore="' + i + '">' + icon('eye') + 'Ignorar</button><button class="btn sm" data-exc="' + i + '">' + icon('lock') + 'Manter como exceção</button>') + '<button class="btn sm ghost" data-editacts="' + i + '">' + icon('edit') + 'Abrir para edição</button></div></div>';
          }).join('') + '</div>' : '<div class="card">' + UI.empty('checkc', F.show === 'abertos' ? 'Nenhum conflito aberto' : 'Nada para exibir', F.show === 'abertos' ? 'A programação atual está livre de conflitos. 🎉'.replace(' 🎉', '') : 'Ajuste os filtros.') + '</div>');
      }
      function validationsHTML(pl, vs) {
        const rows = Object.keys(vs).map((id) => ({ a: Store.activity(id), v: vs[id] })).sort((x, y) => V.STATUS[y.v.status].rank - V.STATUS[x.v.status].rank);
        return rows.length ? '<div class="col" style="gap:10px">' + rows.map((r) => '<div class="card flat"><div class="row between wrap top"><div class="grow"><b>' + esc(r.a.name) + '</b> ' + UI.prioBadge(r.a.priority) + ' ' + UI.statusBadge(r.a.status) + '<div class="small muted">' + esc(UI.dateTimeLabel(r.a)) + '</div></div><div class="row">' + UI.valBadge(r.v.status) + '<button class="btn sm" data-open="' + r.a.id + '">Detalhes</button></div></div><p class="small" style="margin-top:7px">' + esc(r.v.summary) + '</p></div>').join('') + '</div>' : '<div class="card">' + UI.empty('checkc', 'Nada a validar', 'Cadastre propostas para validar.') + '</div>';
      }

      const rerender = () => PA.App.render();
      [['#f-show', 'show'], ['#f-sev', 'sev'], ['#f-type', 'type']].forEach((p) => { const el = view.querySelector(p[0]); if (el) el.onchange = () => { F[p[1]] = el.value; rerender(); }; });
      view.onclick = async (e) => {
        const t = e.target; const g = (s) => { const el = t.closest('[' + s + ']'); return el ? el.getAttribute(s) : null; };
        const tab = g('data-tab'); if (tab) { F.tab = tab; return rerender(); }
        const op = g('data-open'); if (op) { e.preventDefault(); return PA.Forms.detail(op); }
        if (g('data-act') === 'auto') return autoResolve();
        const pick = (a) => { const i = g(a); return i == null ? null : list[Number(i)]; };
        let c;
        if ((c = pick('data-resolve'))) return resolveOne(c);
        if ((c = pick('data-chtime'))) return changeTime(c);
        if ((c = pick('data-chdate'))) return changeDate(c);
        if ((c = pick('data-ignore'))) { Store.setConflictException(c.key, 'ignorado', ''); UI.toast('Conflito ignorado. Você pode reabri-lo quando quiser.', 'ok'); return rerender(); }
        if ((c = pick('data-exc'))) { const note = await UI.promptText({ title: 'Manter como exceção', label: 'Justificativa para manter este conflito', multiline: true, required: true, okLabel: 'Registrar exceção' }); if (note) { Store.setConflictException(c.key, 'excecao', note); UI.toast('Exceção registrada.'); rerender(); } return; }
        if ((c = pick('data-reopen'))) { Store.setConflictException(c.key, null); UI.toast('Conflito reaberto.'); return rerender(); }
        if ((c = pick('data-editacts'))) { return c.activityIds.length === 1 ? PA.Forms.activityForm(c.activityIds[0], null, { onSaved: rerender }) : choose(c); }
      };

      function choose(c) {
        const names = UI.names(c.activityIds);
        UI.modal({ title: 'Abrir atividades para edição', size: 'sm', body: '<div class="col">' + c.activityIds.map((id, k) => '<button class="btn" data-ed="' + id + '" style="justify-content:flex-start">' + icon('edit') + esc(names[k]) + '</button>').join('') + '</div>', footer: [{ label: 'Fechar' }], onMount: (m) => m.el.addEventListener('click', (e) => { const b = e.target.closest('[data-ed]'); if (b) { m.close(); setTimeout(() => PA.Forms.activityForm(b.dataset.ed, null, { onSaved: rerender }), 60); } }) });
      }
      // Escolhe qual atividade do conflito pode ser movida (nunca fixas)
      function movable(c) { return c.activityIds.map((id) => Store.activity(id)).filter((a) => a && !a.locked && !PA.Planner.isDateFixed(a)); }
      function pickMovable(c, cb) {
        const mv = movable(c);
        if (!mv.length) return UI.toast('Todas as atividades deste conflito são fixas e não podem ser movidas automaticamente. Abra uma delas para editar manualmente ou registre uma exceção.', 'warn');
        if (mv.length === 1) return cb(mv[0]);
        UI.modal({ title: 'Qual atividade deseja alterar?', size: 'sm', body: '<div class="col">' + mv.map((a) => '<button class="btn" data-pk="' + a.id + '" style="justify-content:flex-start">' + esc(a.name) + ' <span class="muted small">(' + esc(C.prio(a.priority).label) + ')</span></button>').join('') + '</div>', footer: [{ label: 'Cancelar' }], onMount: (m) => m.el.addEventListener('click', (e) => { const b = e.target.closest('[data-pk]'); if (b) { m.close(); cb(Store.activity(b.dataset.pk)); } }) });
      }
      function changeDate(c) { pickMovable(c, (a) => PA.Forms.moveActivity(a.id, { onDone: rerender })); }
      function changeTime(c) {
        pickMovable(c, (a) => {
          if (!a.date) return UI.toast('A atividade não possui data.', 'warn');
          const ctx = PA.Planner.createContext(plan, { from: a.date, to: a.date, exclude: [a.id] }); const dur = a.duration || plan.settings.defaultDuration;
          const slots = []; for (let s = D.toMin(ctx.windows[0].start ? D.fromMin(ctx.windows[0].start) : '08:00'); s + dur <= ctx.windows[ctx.windows.length - 1].end; s += 15) { const f = ctx.findSlot(Object.assign({}, a, { preferredTime: D.fromMin(s), timeFlex: 'fixa' }), a.date); if (!f.fail) slots.push(s); }
          UI.modal({ title: 'Alterar horário: ' + a.name, size: 'sm', body: slots.length ? '<p class="muted mb">Horários livres em ' + esc(D.br(a.date)) + ' para ' + esc(D.durLabel(dur)) + ':</p><div class="chips">' + slots.filter((s, i) => i % 2 === 0).map((s) => '<button class="chip-btn" data-slot="' + s + '">' + D.fromMin(s) + '</button>').join('') + '</div>' : '<div class="notice warn">' + icon('warning') + '<div>Não há horários livres neste dia. Use "Alterar data".</div></div>', footer: [{ label: 'Fechar' }],
            onMount: (m) => m.el.addEventListener('click', (e) => { const b = e.target.closest('[data-slot]'); if (!b) return; const s = Number(b.dataset.slot); Store.applyAssignments([{ activityId: a.id, date: a.date, startTime: D.fromMin(s), endTime: D.fromMin(s + dur), note: 'Horário alterado a partir de conflito.' }], 'Alteração de horário'); UI.toast('Horário alterado para ' + D.fromMin(s) + '.'); m.close(); rerender(); }) });
        });
      }
      function resolveOne(c) {
        const mv = movable(c); if (!mv.length) return UI.toast('Todas as atividades deste conflito são fixas. Não serão alteradas automaticamente: edite manualmente ou registre uma exceção.', 'warn');
        const ids = c.activityIds; const r = Sch.reschedule(plan, { onlyIds: ids });
        const mine = { changes: r.changes.filter((x) => ids.indexOf(x.activityId) >= 0), unresolved: r.unresolved.filter((x) => ids.indexOf(x.activityId) >= 0), locked: r.locked };
        showProposal(mine);
      }
      function autoResolve() {
        const r = Sch.reschedule(plan, {}); if (!r.changes.length && !r.unresolved.length && !r.locked.length) return UI.toast('Não há nada a reprogramar automaticamente.', 'ok');
        showProposal(r);
      }
      function showProposal(r) {
        const byId = {}; plan.activities.forEach((a) => { byId[a.id] = a; });
        const chosen = {}; r.changes.forEach((x) => { chosen[x.activityId] = true; });
        const fmt = (o) => (o.date ? esc(D.WEEKDAYS_SHORT[D.weekday(o.date)] + ' ' + D.br(o.date)) + (o.startTime ? ' · ' + esc(o.startTime) + '–' + esc(o.endTime) : '') : 'sem data');
        const body = '<div class="notice info mb">' + icon('info') + '<div>A reprogramação tenta alterar o <b>menor número possível</b> de atividades, preserva atividades fixas, respeita prioridades e escolhe as datas mais próximas das originais. Revise e aprove abaixo.</div></div>' +
          (r.changes.length ? '<div class="col" style="gap:10px">' + r.changes.map((x) => { const a = byId[x.activityId]; return '<label class="card flat" style="display:block;cursor:pointer"><div class="row top"><input type="checkbox" data-chg="' + a.id + '" checked style="margin-top:4px"><div class="grow"><b>' + esc(a.name) + '</b> ' + UI.prioBadge(a.priority) + '<div class="diff mt-s"><div class="alert danger" style="padding:7px 10px"><div class="txt small">De: <b>' + fmt(x.from) + '</b></div></div><span>' + icon('arrow') + '</span><div class="alert ok" style="padding:7px 10px"><div class="txt small">Para: <b>' + fmt(x.to) + '</b></div></div></div>' + (x.extended ? '<div class="notice warn mt-s">' + icon('warning') + '<div>Exige ultrapassar a data limite original.</div></div>' : '') +
            '<details class="expl mt-s"><summary>Por que mudar e por que esta data?</summary><ul>' + (x.reasons || []).map((t) => '<li>' + esc(t) + '</li>').join('') + x.why.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul></details></div></div></label>'; }).join('') + '</div>' : '') +
          (r.unresolved.length ? '<h3 class="mt mb">Sem solução automática</h3>' + r.unresolved.map((u) => '<div class="alert danger"><div class="txt"><b>' + esc(byId[u.activityId].name) + '</b><div class="small">' + esc(u.reason) + '</div></div></div>').join('') : '') +
          (r.locked && r.locked.length ? '<h3 class="mt mb">Atividades fixas afetadas (não serão alteradas)</h3>' + r.locked.map((u) => '<div class="alert warn">' + icon('lock') + '<div class="txt"><b>' + esc(byId[u.activityId].name) + '</b><div class="small">' + esc(u.reasons[0]) + '</div></div></div>').join('') : '');
        if (!r.changes.length) { UI.modal({ title: 'Reprogramação inteligente', size: 'lg', body, footer: [{ label: 'Fechar' }] }); return; }
        UI.modal({
          title: 'Reprogramação inteligente: ' + r.changes.length + ' alteração(ões) proposta(s)', size: 'lg', body,
          footer: [{ label: 'Descartar' }, { label: 'Aprovar alterações marcadas', cls: 'primary', icon: 'check', onClick: (m) => {
            const sel = m.qa('[data-chg]').filter((x) => x.checked).map((x) => x.dataset.chg); if (!sel.length) { UI.toast('Nenhuma alteração marcada.', 'warn'); return false; }
            Store.applyAssignments(r.changes.filter((x) => sel.indexOf(x.activityId) >= 0).map((x) => ({ activityId: x.activityId, date: x.to.date, startTime: x.to.startTime, endTime: x.to.endTime, note: 'Reprogramação inteligente aprovada pelo usuário.' })), 'Reprogramação');
            UI.toast(sel.length + ' atividade(s) reprogramada(s).'); rerender(); return true;
          } }],
        });
      }
    },
  };
})(window);
