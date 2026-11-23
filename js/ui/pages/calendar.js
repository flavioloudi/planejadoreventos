/* Calendário visual: mensal, semanal, diário, lista, agenda, por categoria e por responsável. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  PA.Pages = PA.Pages || {};
  const D = PA.Dates, C = PA.C, UI = PA.UI, Store = PA.Store, P = PA.Planner, Cf = PA.Conflicts;
  const esc = UI.esc, icon = UI.icon;

  const S = { view: 'mes', cursor: D.today(), prio: '', cat: '', status: '', resp: '', showHol: true, showSpec: true, onlyConf: false, onlyPend: false, colorBy: 'category' };
  const VIEWS = { mes: 'Mês', semana: 'Semana', dia: 'Dia', lista: 'Lista', agenda: 'Agenda', categoria: 'Categorias', responsavel: 'Responsáveis' };
  const PPM = 0.9; // pixels por minuto (grade semanal/diária)

  PA.Pages.calendar = {
    title: 'Calendário', subtitle: 'Visualize e ajuste a programação',
    render(view, params) {
      const plan = Store.plan();
      if (params && params.date) { S.cursor = params.date; if (params.view) S.view = params.view; }
      UI.colorBy = S.colorBy;
      const conflicts = Cf.active(Cf.detect(plan)); const confIds = {}; conflicts.forEach((c) => c.activityIds.forEach((id) => { confIds[id] = true; }));
      const cats = Array.from(new Set(plan.activities.map((a) => a.category))).sort(), resps = Array.from(new Set(plan.activities.map((a) => a.responsible).filter(Boolean))).sort();
      const passes = (a) => (!S.prio || a.priority === S.prio) && (!S.cat || a.category === S.cat) && (!S.status || a.status === S.status) && (!S.resp || a.responsible === S.resp) && (!S.onlyConf || confIds[a.id]);
      const scheduled = () => plan.activities.filter((a) => a.date && passes(a) && (!S.onlyPend || ['proposta', 'validacao', 'aguardando', 'reprogramar'].indexOf(a.status) >= 0));
      const pending = plan.activities.filter((a) => !a.date && a.status !== 'cancelada' && a.status !== 'concluida' && passes(a));

      // Intervalo exibido
      let from, to, title;
      const cur = S.cursor;
      if (S.view === 'mes' || S.view === 'lista' || S.view === 'categoria' || S.view === 'responsavel') { from = D.startOfMonth(cur); to = D.endOfMonth(cur); title = D.monthLabel(cur); }
      else if (S.view === 'semana' || S.view === 'agenda') { from = D.startOfWeek(cur); to = D.addDays(from, 6); title = D.short(from) + ' – ' + D.br(to); }
      else { from = to = cur; title = D.long(cur); }
      const gridFrom = S.view === 'mes' ? D.startOfWeek(from) : from, gridTo = S.view === 'mes' ? D.addDays(D.startOfWeek(to), 6) : to;
      const idx = PA.Specials.index(plan, gridFrom, gridTo);
      const acts = scheduled();
      const byDate = {}; acts.forEach((a) => { (byDate[a.date] = byDate[a.date] || []).push(a); });
      Object.keys(byDate).forEach((d) => byDate[d].sort((x, y) => ((x.startTime || '') < (y.startTime || '') ? -1 : 1)));

      const evHTML = (a, compact) => {
        const cls = ['ev', confIds[a.id] ? 'conf' : '', ['proposta', 'validacao', 'aguardando', 'reprogramar'].indexOf(a.status) >= 0 ? 'pend' : '', a.status === 'concluida' ? 'done' : '', a.status === 'cancelada' ? 'canc' : ''].join(' ');
        return '<div class="' + cls + '" style="--c:' + UI.actColor(a, S.colorBy) + '" draggable="' + (a.locked ? 'false' : 'true') + '" data-ev="' + a.id + '" title="' + esc(UI.tooltipLines(a)) + '" tabindex="0">' + (a.locked ? icon('lock') : '') + (a.startTime && !compact ? '<span class="t">' + a.startTime + '</span>' : '') + '<span class="n">' + esc(a.name) + '</span></div>';
      };
      const spHTML = (d) => {
        const e = idx.get(d); let items = e.occs.filter((o) => (o.isHoliday ? S.showHol : S.showSpec));
        return items.map((o) => '<span class="sp ' + o.eff + (o.needsReview || o.confirmed === false ? ' rev' : '') + '" title="' + esc(o.name + ' — ' + C.IMPACTS[o.eff].label + (o.rule ? '. ' + o.rule : '') + (o.needsReview || o.confirmed === false ? ' (precisa de revisão)' : '')) + '">' + esc(o.name) + '</span>').join('');
      };
      const dayClass = (d) => { const e = idx.get(d); return [e.blocked.length && (S.showHol || S.showSpec) ? 'blocked' : e.restricted.length ? 'restricted' : e.preferred.length ? 'preferred' : '', plan.settings.workDays.indexOf(D.weekday(d)) < 0 ? 'off' : '', d === D.today() ? 'today' : ''].join(' '); };

      // ---------------- Conteúdos por visão
      let body = '';
      if (S.view === 'mes') {
        let cells = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => '<div class="dow">' + d + '</div>').join('');
        D.range(gridFrom, gridTo).forEach((d) => {
          const list = byDate[d] || []; const show = list.slice(0, 3);
          cells += '<div class="day ' + dayClass(d) + (d.slice(0, 7) === from.slice(0, 7) ? '' : ' out') + '" data-day="' + d + '"><div class="dn"><b data-goday="' + d + '">' + D.parse(d).getDate() + '</b><button class="add" data-add="' + d + '" title="Nova atividade neste dia" aria-label="Adicionar">' + icon('plus') + '</button></div>' + spHTML(d) + show.map((a) => evHTML(a)).join('') + (list.length > 3 ? '<button class="more" data-goday="' + d + '">+' + (list.length - 3) + ' mais</button>' : '') + '</div>';
        });
        body = '<div class="month">' + cells + '</div>';
      } else if (S.view === 'semana' || S.view === 'dia') {
        const days = D.range(from, to); const cols = days.length;
        const wins = P.dayWindows(plan.settings); let minT = Math.min.apply(null, wins.map((w) => w.start)), maxT = Math.max.apply(null, wins.map((w) => w.end));
        acts.forEach((a) => { if (a.startTime) { minT = Math.min(minT, D.toMin(a.startTime)); maxT = Math.max(maxT, D.toMin(a.endTime || a.startTime) + 30); } });
        minT = Math.floor(minT / 60) * 60 - 0; maxT = Math.ceil(maxT / 60) * 60;
        const H = (maxT - minT) * PPM; const tpl = '56px repeat(' + cols + ',minmax(' + (cols > 1 ? 110 : 200) + 'px,1fr))';
        const head = '<div class="tg-head" style="grid-template-columns:' + tpl + '"><div style="border:0"></div>' + days.map((d) => '<div class="' + (d === D.today() ? 'today' : '') + '"><span class="small muted">' + D.WEEKDAYS_SHORT[D.weekday(d)] + '</span><b data-goday="' + d + '" style="cursor:pointer;' + (d === D.today() ? 'color:var(--primary)' : '') + '">' + D.parse(d).getDate() + '</b>' + spHTML(d) + '</div>').join('') + '</div>';
        const allday = '<div class="tg-allday" style="grid-template-columns:' + tpl + '"><div class="small muted" style="padding:8px 4px;border:0">Sem horário</div>' + days.map((d) => '<div data-day="' + d + '">' + (byDate[d] || []).filter((a) => !a.startTime).map((a) => evHTML(a, true)).join('') + '</div>').join('') + '</div>';
        let hours = ''; for (let m = minT; m <= maxT; m += 60) hours += '<span style="top:' + ((m - minT) * PPM) + 'px">' + D.fromMin(m) + '</span>';
        const colsHTML = days.map((d) => {
          const info = idx.get(d);
          const evs = (byDate[d] || []).filter((a) => a.startTime).map((a) => { const s = D.toMin(a.startTime), e = a.endTime ? D.toMin(a.endTime) : s + (a.duration || plan.settings.defaultDuration); return '<div class="tg-ev ' + (confIds[a.id] ? 'conf' : '') + '" style="--c:' + UI.actColor(a, S.colorBy) + ';top:' + ((s - minT) * PPM) + 'px;height:' + Math.max(22, (e - s) * PPM - 2) + 'px" draggable="' + (a.locked ? 'false' : 'true') + '" data-ev="' + a.id + '" title="' + esc(UI.tooltipLines(a)) + '"><b>' + a.startTime + '–' + (a.endTime || D.fromMin(e)) + '</b>' + esc(a.name) + (a.location ? '<br><span class="muted">' + esc(a.location) + '</span>' : '') + '</div>'; }).join('');
          return '<div class="tg-col ' + (info.blocked.length ? 'blocked' : '') + ' ' + (plan.settings.workDays.indexOf(D.weekday(d)) < 0 ? 'off' : '') + '" data-day="' + d + '" data-min="' + minT + '" style="height:' + H + 'px">' + evs + '</div>';
        }).join('');
        body = '<div class="tg" style="--ppm:' + PPM + 'px">' + head + allday + '<div class="tg-body" style="grid-template-columns:' + tpl + '"><div class="tg-times" style="height:' + H + 'px">' + hours + '</div>' + colsHTML + '</div></div><p class="small muted mt-s">Arraste uma atividade para outro dia ou horário. Atividades fixas (cadeado) não podem ser arrastadas.</p>';
      } else if (S.view === 'lista') {
        const list = acts.filter((a) => a.date >= from && a.date <= to).sort((a, b) => ((a.date + (a.startTime || '')) < (b.date + (b.startTime || '')) ? -1 : 1));
        const groups = {}; list.forEach((a) => { (groups[a.date] = groups[a.date] || []).push(a); });
        body = list.length ? '<div class="card">' + Object.keys(groups).sort().map((d) => '<h3 style="margin:10px 0 4px;text-transform:capitalize">' + esc(D.long(d)) + '</h3><div>' + spHTML(d) + '</div>' + groups[d].map((a) => '<div class="list-item"><span class="swatch" style="background:' + UI.actColor(a, S.colorBy) + '"></span><div class="grow" style="cursor:pointer" data-ev="' + a.id + '"><b>' + esc(a.name) + '</b>' + (confIds[a.id] ? ' ' + UI.badge('Conflito', 'b-danger') : '') + '<div class="small muted">' + esc([a.startTime ? UI.timeRange(a) : 'dia todo', a.responsible, a.location].filter(Boolean).join(' · ')) + '</div></div>' + UI.prioBadge(a.priority) + UI.statusBadge(a.status) + '</div>').join('')).join('') + '</div>' : '<div class="card">' + UI.empty('calendar', 'Nada neste período', 'Nenhuma atividade programada com os filtros atuais.') + '</div>';
      } else if (S.view === 'agenda') {
        body = '<div class="card">' + D.range(from, to).map((d) => { const list = byDate[d] || []; const info = idx.get(d); return '<div class="agenda-row"><div><b>' + D.WEEKDAYS_SHORT[D.weekday(d)] + ' ' + D.short(d) + '</b></div><div>' + spHTML(d) + (list.length ? list.map((a) => '<div class="row" style="padding:3px 0"><span class="nowrap bold" style="min-width:96px">' + (a.startTime ? esc(UI.timeRange(a)) : 'dia todo') + '</span><div class="grow" style="cursor:pointer" data-ev="' + a.id + '"><span class="swatch" style="background:' + UI.actColor(a, S.colorBy) + '"></span> ' + esc(a.name) + (a.location ? ' <span class="muted">· ' + esc(a.location) + '</span>' : '') + (confIds[a.id] ? ' ' + UI.badge('Conflito', 'b-danger') : '') + '</div></div>').join('') : '<span class="muted small">' + (info.hard ? 'Dia bloqueado' : 'Livre') + '</span>') + '</div></div>'; }).join('') + '</div>';
      } else {
        const keyOf = S.view === 'categoria' ? (a) => a.category : (a) => a.responsible || 'Sem responsável';
        const list = acts.filter((a) => a.date >= from && a.date <= to).sort((a, b) => ((a.date + (a.startTime || '')) < (b.date + (b.startTime || '')) ? -1 : 1));
        const groups = {}; list.forEach((a) => { (groups[keyOf(a)] = groups[keyOf(a)] || []).push(a); });
        const keys = Object.keys(groups).sort();
        body = keys.length ? '<div class="lane-wrap">' + keys.map((k) => '<div class="lane"><h3><span>' + (S.view === 'categoria' ? '<i class="swatch" style="background:' + UI.catColor(k) + '"></i> ' : icon('user') + ' ') + esc(k) + '</span><span class="badge b-gray">' + groups[k].length + '</span></h3>' + groups[k].map((a) => '<div class="ev ' + (confIds[a.id] ? 'conf' : '') + '" style="--c:' + UI.actColor(a, S.colorBy) + '" data-ev="' + a.id + '"><span class="t">' + D.short(a.date) + '</span><span class="n">' + esc(a.name) + '</span></div>').join('') + '</div>').join('') + '</div>' : '<div class="card">' + UI.empty('calendar', 'Nada neste mês', 'Nenhuma atividade programada com os filtros atuais.') + '</div>';
      }

      const legend = S.colorBy === 'priority' ? Object.keys(C.PRIORITIES).map((k) => '<span><i class="swatch" style="background:' + C.PRIORITIES[k].color + '"></i>' + C.PRIORITIES[k].label + '</span>').join('') : (plan.settings.categories || C.CATEGORIES).map((c) => '<span><i class="swatch" style="background:' + c.color + '"></i>' + esc(c.name) + '</span>').join('');

      view.innerHTML =
        '<div class="page-head"><div><h1>Calendário</h1><p>Clique em uma atividade para editar. Arraste para mudar a data ou o horário.</p></div><div class="row wrap no-print"><button class="btn" data-act="print">' + icon('printer') + 'Imprimir</button><button class="btn primary" data-act="new">' + icon('plus') + 'Nova atividade</button></div></div>' +
        '<div class="cal-head no-print"><div class="seg">' + Object.keys(VIEWS).map((k) => '<button data-view="' + k + '" class="' + (S.view === k ? 'on' : '') + '">' + VIEWS[k] + '</button>').join('') + '</div><span class="grow"></span>' +
        '<button class="btn icon" data-nav="-1" aria-label="Anterior">' + icon('left') + '</button><div class="cal-title">' + esc(title) + '</div><button class="btn icon" data-nav="1" aria-label="Próximo">' + icon('right') + '</button><button class="btn" data-nav="0">Hoje</button></div>' +
        '<div class="toolbar no-print"><select id="c-prio">' + UI.opts(C.PRIORITIES, S.prio, 'Toda prioridade') + '</select><select id="c-cat">' + UI.opts(cats, S.cat, 'Toda categoria') + '</select><select id="c-status">' + UI.opts(C.STATUSES, S.status, 'Todo status') + '</select><select id="c-resp">' + UI.opts(resps, S.resp, 'Todo responsável') + '</select>' +
        '<label class="check"><input type="checkbox" id="c-hol" ' + (S.showHol ? 'checked' : '') + '> Feriados</label><label class="check"><input type="checkbox" id="c-spec" ' + (S.showSpec ? 'checked' : '') + '> Datas especiais</label><label class="check"><input type="checkbox" id="c-conf" ' + (S.onlyConf ? 'checked' : '') + '> Só conflitos</label><label class="check"><input type="checkbox" id="c-pend" ' + (S.onlyPend ? 'checked' : '') + '> Só pendentes</label>' +
        '<select id="c-color"><option value="category"' + (S.colorBy === 'category' ? ' selected' : '') + '>Cor por categoria</option><option value="priority"' + (S.colorBy === 'priority' ? ' selected' : '') + '>Cor por prioridade</option></select></div>' +
        '<div class="cal-layout"><div>' + body + '<div class="legend mt-s">' + legend + '<span><i class="swatch" style="background:#fff;border:2px solid var(--danger)"></i>Conflito</span><span><i class="sp bloqueio" style="padding:0 6px">&nbsp;</i>Bloqueio</span><span><i class="sp restricao" style="padding:0 6px">&nbsp;</i>Restrição</span><span><i class="sp preferencial" style="padding:0 6px">&nbsp;</i>Preferencial</span></div></div>' +
        '<aside class="side-panel no-print"><div class="card"><div class="card-h"><h3>' + icon('clock') + 'Pendentes de programação <span class="badge b-warn">' + pending.length + '</span></h3></div>' +
        (pending.length ? '<div class="col" style="gap:7px;max-height:360px;overflow:auto">' + pending.slice(0, 30).map((a) => '<div class="pend-item" style="--c:' + UI.actColor(a, S.colorBy) + '" draggable="true" data-ev="' + a.id + '" title="Arraste para um dia do calendário para programar"><b>' + esc(a.name) + '</b><span class="small muted">' + UI.prioBadge(a.priority) + ' ' + esc(a.duration ? D.durLabel(a.duration) : 'sem duração') + '</span></div>').join('') + '</div><p class="small muted mt-s">Arraste para um dia para programar. Para geração automática, use o <a href="#/gerador">Gerador</a>.</p>' : '<p class="muted small">Todas as atividades filtradas possuem data.</p>') + '</div>' +
        '<div class="card"><div class="card-h"><h3>Resumo do período</h3></div><div class="small col" style="gap:5px"><div class="row between"><span>Atividades</span><b>' + acts.filter((a) => a.date >= from && a.date <= to).length + '</b></div><div class="row between"><span>Com conflito</span><b style="color:var(--danger)">' + acts.filter((a) => a.date >= from && a.date <= to && confIds[a.id]).length + '</b></div><div class="row between"><span>Dias bloqueados</span><b>' + D.range(from, to).filter((d) => idx.get(d).blocked.length).length + '</b></div></div></div></aside></div>';

      // ---------------- Eventos
      const rerender = () => PA.App.render();
      view.onclick = (e) => {
        const t = e.target; const g = (s) => t.closest(s);
        const v = g('[data-view]'); if (v) { S.view = v.dataset.view; return rerender(); }
        const nav = g('[data-nav]'); if (nav) { const n = Number(nav.dataset.nav); S.cursor = n === 0 ? D.today() : S.view === 'mes' || S.view === 'lista' || S.view === 'categoria' || S.view === 'responsavel' ? D.addMonths(D.startOfMonth(S.cursor), n) : S.view === 'dia' ? D.addDays(S.cursor, n) : D.addDays(S.cursor, 7 * n); return rerender(); }
        const gd = g('[data-goday]'); if (gd) { S.cursor = gd.dataset.goday; S.view = 'dia'; return rerender(); }
        const ad = g('[data-add]'); if (ad) return PA.Forms.activityForm(null, { date: ad.dataset.add, status: 'programada' }, { onSaved: rerender });
        const ev = g('[data-ev]'); if (ev) return PA.Forms.detail(ev.dataset.ev);
        const act = g('[data-act]'); if (act) { if (act.dataset.act === 'new') return PA.Forms.activityForm(null, null, { onSaved: rerender }); if (act.dataset.act === 'print') return window.print(); }
      };
      view.onkeydown = (e) => { if (e.key === 'Enter') { const ev = e.target.closest && e.target.closest('[data-ev]'); if (ev) PA.Forms.detail(ev.dataset.ev); } };
      const sel = (id, key) => { const el = view.querySelector(id); if (el) el.onchange = () => { S[key] = el.type === 'checkbox' ? el.checked : el.value; rerender(); }; };
      sel('#c-prio', 'prio'); sel('#c-cat', 'cat'); sel('#c-status', 'status'); sel('#c-resp', 'resp'); sel('#c-hol', 'showHol'); sel('#c-spec', 'showSpec'); sel('#c-conf', 'onlyConf'); sel('#c-pend', 'onlyPend'); sel('#c-color', 'colorBy');

      // ---------------- Arrastar e soltar
      let dragId = null;
      view.ondragstart = (e) => { const el = e.target.closest && e.target.closest('[data-ev]'); if (!el || el.getAttribute('draggable') !== 'true') return; dragId = el.dataset.ev; e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; };
      view.ondragend = () => { dragId = null; view.querySelectorAll('.over').forEach((x) => x.classList.remove('over')); };
      view.ondragover = (e) => { const tgt = e.target.closest && e.target.closest('[data-day]'); if (tgt && dragId) { e.preventDefault(); view.querySelectorAll('.over').forEach((x) => x.classList.remove('over')); tgt.classList.add('over'); } };
      view.ondrop = (e) => {
        const tgt = e.target.closest && e.target.closest('[data-day]'); if (!tgt || !dragId) return; e.preventDefault();
        const id = dragId; dragId = null; const date = tgt.dataset.day; let time = '';
        if (tgt.classList.contains('tg-col')) { const rect = tgt.getBoundingClientRect(); const min = Number(tgt.dataset.min) + Math.round((e.clientY - rect.top) / PPM / 15) * 15; time = D.fromMin(Math.max(0, Math.min(24 * 60 - 15, min))); }
        dropOn(id, date, time);
      };
      function dropOn(id, date, time) {
        const a = Store.activity(id); if (!a) return;
        const keepTime = time || a.startTime; const dur = a.duration || plan.settings.defaultDuration;
        const patch = { activityId: id, date, startTime: keepTime || '', endTime: keepTime ? D.fromMin(D.toMin(keepTime) + dur) : '', note: 'Movida no calendário.' };
        const sim = plan.activities.map((x) => (x.id === id ? Object.assign({}, x, { date, startTime: patch.startTime, endTime: patch.endTime }) : x));
        const after = Cf.detect(plan, { activities: sim }).filter((c) => c.activityIds.indexOf(id) >= 0 && !c.exception);
        const before = Cf.detect(plan).filter((c) => c.activityIds.indexOf(id) >= 0 && !c.exception).map((c) => c.key);
        const fresh = after.filter((c) => before.indexOf(c.key) < 0);
        const apply = () => { Store.applyAssignments([patch], a.date ? 'Reprogramação manual' : 'Programação'); UI.toast('"' + a.name + '" ' + (a.date ? 'movida' : 'programada') + ' para ' + D.br(date) + (keepTime ? ' às ' + keepTime : '') + '.'); rerender(); };
        if (a.locked || fresh.length) {
          UI.confirm({ title: a.locked ? 'Alterar atividade fixa?' : 'Esta mudança gera conflitos', confirmLabel: 'Mover mesmo assim', danger: !!fresh.length, html: (a.locked ? '<div class="notice warn">' + icon('lock') + '<div>Esta atividade está marcada como <b>fixa</b>.</div></div>' : '') + (fresh.length ? '<p class="mt-s">Novos conflitos em ' + D.br(date) + ':</p><ul>' + fresh.slice(0, 5).map((c) => '<li>' + esc(c.description) + '</li>').join('') + '</ul>' : '') }).then((ok) => { if (ok) apply(); });
        } else apply();
      }
    },
  };
})(window);
