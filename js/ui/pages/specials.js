/* Datas especiais: feriados, comemorativas, eventos e restrições. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  PA.Pages = PA.Pages || {};
  const D = PA.Dates, C = PA.C, UI = PA.UI, Store = PA.Store, Sp = PA.Specials;
  const esc = UI.esc, icon = UI.icon;

  const F = { q: '', cat: '', scope: '', impact: '', conf: '', tab: 'lista', year: null };

  PA.Pages.specials = {
    title: 'Datas especiais', subtitle: 'Feriados, eventos e restrições',
    render(view) {
      const plan = Store.plan(), S = plan.settings; if (!F.year) F.year = S.year;
      const y = F.year;
      const occs = Sp.occurrences(plan, y + '-01-01', y + '-12-31').sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
      const disabled = plan.disabledBuiltins || [];
      const disabledOccs = Sp.builtinForYear(y, S.state).filter((o) => disabled.indexOf(o.key) >= 0);
      const rows = occs.filter((o) => {
        if (F.q && !(o.name + ' ' + (o.description || '')).toLowerCase().includes(F.q.toLowerCase())) return false;
        if (F.cat && o.category !== F.cat) return false; if (F.scope && o.scope !== F.scope) return false; if (F.impact && o.eff !== F.impact) return false;
        const review = o.needsReview || o.confirmed === false; if (F.conf === 'rev' && !review) return false; if (F.conf === 'ok' && review) return false;
        return true;
      });
      const nReview = occs.filter((o) => o.needsReview || o.confirmed === false).length;
      const sourceBadge = (o) => (o.builtin ? UI.badge('Calendário padrão', 'b-gray') : UI.badge('Cadastrada por você', 'b-info'));
      const confBadge = (o) => (o.needsReview || o.confirmed === false ? UI.badge('Precisa de revisão', 'b-warn', true) : UI.badge('Confirmada', 'b-ok', true));

      let content;
      if (F.tab === 'lista') {
        content = rows.length ? '<div class="table-wrap"><table class="t"><thead><tr><th>Data</th><th>Nome</th><th>Categoria</th><th>Abrangência</th><th>Impacto</th><th>Situação</th><th></th></tr></thead><tbody>' + rows.map((o) => {
          const d1 = D.parse(o.start);
          return '<tr><td class="nowrap"><b>' + esc(D.rangeLabel(o.start, o.end)) + '</b><div class="small muted">' + esc(D.WEEKDAYS_SHORT[d1.getDay()]) + (o.recurrence && o.recurrence !== 'none' ? ' · ' + esc(C.RECURRENCES[o.recurrence] || '') : '') + '</div></td>' +
            '<td><div class="nm bold">' + esc(o.name) + '</div><div class="small muted" style="max-width:420px">' + esc(o.description || '') + (o.rule ? '<br><b>Regra:</b> ' + esc(o.rule) : '') + '</div></td>' +
            '<td>' + esc(o.category) + '</td><td>' + esc(C.SCOPES[o.scope] || o.scope) + (o.scope === 'estadual' ? ' <span class="small muted">(' + esc(S.state) + ')</span>' : '') + '</td>' +
            '<td>' + UI.impactBadge(o.eff) + (o.eff !== o.impact ? '<div class="small muted">original: ' + esc(C.IMPACTS[o.impact].short) + '</div>' : '') + '</td>' +
            '<td>' + confBadge(o) + '<div style="margin-top:3px">' + sourceBadge(o) + '</div></td>' +
            '<td class="act">' + (o.builtin ? '<button class="btn sm ghost icon" data-confirm-bi="' + esc(o.id) + '" title="Confirmar e personalizar (cria uma cópia editável)">' + icon('checkc') + '</button><button class="btn sm ghost icon" data-hide="' + esc(o.key) + '" title="Desativar esta data">' + icon('eye') + '</button>' : '<button class="btn sm ghost icon" data-edit="' + o.srcId + '" title="Editar">' + icon('edit') + '</button><button class="btn sm ghost icon" data-del="' + o.srcId + '" title="Excluir">' + icon('trash') + '</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div><p class="small muted mt-s">' + rows.length + ' ocorrência(s) em ' + y + '</p>' : '<div class="card">' + UI.empty('calendar', 'Nenhuma data encontrada', 'Ajuste os filtros ou cadastre uma data.') + '</div>';
        if (disabledOccs.length) content += '<div class="card mt"><div class="card-h"><h3>Datas padrão desativadas (' + disabledOccs.length + ')</h3></div><div class="chips">' + disabledOccs.map((o) => '<button class="chip-btn" data-show="' + esc(o.key) + '" title="Reativar">' + esc(o.name) + ' · ' + D.short(o.start) + ' ' + icon('plus') + '</button>').join('') + '</div></div>';
      } else {
        const byDay = {}; occs.forEach((o) => D.range(D.max(o.start, y + '-01-01'), D.min(o.end, y + '-12-31')).forEach((d) => { const p0 = byDay[d]; const rank = { bloqueio: 4, restricao: 3, preferencial: 2, neutro: 1 }; if (!p0 || rank[o.eff] > rank[p0.eff]) byDay[d] = o; }));
        content = '<div class="mini-year">' + D.MONTHS.map((mn, mi) => {
          const first = y + '-' + D.pad(mi + 1) + '-01'; const off = (D.weekday(first) + 6) % 7; const n = D.parse(D.endOfMonth(first)).getDate();
          let cells = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((x) => '<span class="h">' + x + '</span>').join('') + '<span></span>'.repeat(off);
          for (let d = 1; d <= n; d++) { const ds = y + '-' + D.pad(mi + 1) + '-' + D.pad(d); const o = byDay[ds]; cells += '<span class="' + (o ? o.eff : '') + '" title="' + esc(o ? o.name : '') + '">' + d + '</span>'; }
          return '<div class="mini"><h4>' + mn + '</h4><div class="g">' + cells + '</div></div>';
        }).join('') + '</div><div class="legend mt"><span><i class="swatch" style="background:#fecaca"></i>Bloqueio total</span><span><i class="swatch" style="background:#fde68a"></i>Restrição parcial</span><span><i class="swatch" style="background:#bbf7d0"></i>Preferencial</span><span><i class="swatch" style="background:#e2e8f0"></i>Neutro</span></div>';
      }

      view.innerHTML =
        '<div class="page-head"><div><h1>Datas especiais</h1><p>Feriados, datas comemorativas, eventos e restrições que influenciam o cronograma.</p></div><div class="row wrap"><button class="btn primary" data-act="new">' + icon('plus') + 'Nova data / restrição</button></div></div>' +
        '<div class="notice info mb">' + icon('info') + '<div><b>Referência:</b> ' + (S.city ? esc(S.city) + '/' : '') + esc(S.state) + '. O sistema inclui apenas feriados <b>nacionais</b> e móveis de regra conhecida (Carnaval, Páscoa, Corpus Christi). Feriados <b>estaduais</b> e <b>municipais</b>, vestibulares, ENEM e demais eventos <b>não são inventados</b>: cadastre-os manualmente. Datas marcadas como <i>Precisa de revisão</i> devem ser confirmadas por você' + (!S.city ? '. <a href="#/configuracoes">Informe o município</a> para registrar feriados locais.' : '.') + '</div></div>' +
        (nReview ? '<div class="notice warn mb">' + icon('warning') + '<div>' + nReview + ' data(s) de ' + y + ' precisam de revisão. <a href="#" data-filter-rev>Mostrar apenas essas</a></div></div>' : '') +
        '<div class="tabs"><button data-tab="lista" class="' + (F.tab === 'lista' ? 'on' : '') + '">' + icon('list') + 'Lista</button><button data-tab="ano" class="' + (F.tab === 'ano' ? 'on' : '') + '">' + icon('calendar') + 'Visão anual</button></div>' +
        '<div class="toolbar"><div class="row"><button class="btn icon" data-year="-1" aria-label="Ano anterior">' + icon('left') + '</button><b style="min-width:48px;text-align:center">' + y + '</b><button class="btn icon" data-year="1" aria-label="Próximo ano">' + icon('right') + '</button></div>' +
        (F.tab === 'lista' ? '<div class="search">' + icon('search') + '<input type="search" id="f-q" placeholder="Buscar data…" value="' + esc(F.q) + '"></div><select id="f-cat">' + UI.opts(C.SPECIAL_CATEGORIES.map((x) => x.name), F.cat, 'Toda categoria') + '</select><select id="f-scope">' + UI.opts(C.SCOPES, F.scope, 'Toda abrangência') + '</select><select id="f-imp">' + UI.opts(C.IMPACTS, F.impact, 'Todo impacto') + '</select><select id="f-conf"><option value="">Todas as situações</option><option value="rev"' + (F.conf === 'rev' ? ' selected' : '') + '>Precisa de revisão</option><option value="ok"' + (F.conf === 'ok' ? ' selected' : '') + '>Confirmadas</option></select>' : '') + '</div>' + content;

      const rerender = () => PA.App.render();
      const q = view.querySelector('#f-q'); if (q) q.addEventListener('input', UI.debounce((e) => { F.q = e.target.value; rerender(); const el = document.querySelector('#f-q'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 250));
      [['#f-cat', 'cat'], ['#f-scope', 'scope'], ['#f-imp', 'impact'], ['#f-conf', 'conf']].forEach((p) => { const el = view.querySelector(p[0]); if (el) el.onchange = () => { F[p[1]] = el.value; rerender(); }; });
      view.onclick = async (e) => {
        const t = e.target; const g = (s) => { const el = t.closest('[' + s + ']'); return el ? el.getAttribute(s) : null; };
        if (t.closest('[data-filter-rev]')) { e.preventDefault(); F.conf = 'rev'; F.tab = 'lista'; return rerender(); }
        const tab = g('data-tab'); if (tab) { F.tab = tab; return rerender(); }
        const yr = g('data-year'); if (yr) { F.year += Number(yr); return rerender(); }
        if (g('data-act') === 'new') return specialForm();
        const ed = g('data-edit'); if (ed) return specialForm(ed);
        const de = g('data-del'); if (de) { const s = Store.special(de); if (await UI.confirm({ title: 'Excluir data', danger: true, confirmLabel: 'Excluir', message: 'Excluir "' + (s ? s.name : '') + '"? Atividades já programadas nessa data não serão alteradas, mas deixarão de ser sinalizadas.' })) { Store.removeSpecial(de); UI.toast('Data excluída.'); rerender(); } return; }
        const hide = g('data-hide'); if (hide) { Store.toggleBuiltin(hide); UI.toast('Data padrão desativada. Você pode reativá-la abaixo da lista.'); return rerender(); }
        const show = g('data-show'); if (show) { Store.toggleBuiltin(show); UI.toast('Data reativada.'); return rerender(); }
        const cb = g('data-confirm-bi'); if (cb) { const o = occs.find((x) => x.id === cb); if (o) specialForm(null, o); }
      };

      function specialForm(id, fromBuiltin) {
        const s = id ? Store.special(id) : fromBuiltin ? Object.assign({}, fromBuiltin, { id: '' }) : { name: '', start: '', end: '', category: 'Evento institucional', scope: 'personalizada', impact: 'restricao', description: '', rule: '', recurrence: 'none', recurEvery: 1, recurUnit: 'dias', recurUntil: '', confirmed: true };
        if (id && !s) return;
        const inp = (n, t, v, x) => '<input type="' + t + '" name="' + n + '" value="' + esc(v == null ? '' : v) + '" ' + (x || '') + '>';
        const m = UI.modal({
          title: id ? 'Editar data especial' : fromBuiltin ? 'Confirmar e personalizar data' : 'Nova data especial / restrição', size: 'lg',
          body: '<form id="spform" novalidate>' + (fromBuiltin ? '<div class="notice info mb">' + icon('info') + '<div>Será criada uma cópia <b>confirmada</b> e editável desta data, e a data padrão será desativada.</div></div>' : '') +
            '<div class="form-grid">' + UI.field('Nome', inp('name', 'text', s.name, 'maxlength="100"'), { cls: 's3', req: true, name: 'name' }) + UI.field('Categoria', '<select name="category">' + UI.opts(C.SPECIAL_CATEGORIES.map((x) => x.name), s.category) + '</select>', { name: 'category' }) +
            UI.field('Data inicial', inp('start', 'date', s.start), { req: true, name: 'start' }) + UI.field('Data final (opcional)', inp('end', 'date', s.end && s.end !== s.start ? s.end : ''), { name: 'end', hint: 'Para intervalos de datas.' }) +
            UI.field('Abrangência', '<select name="scope">' + UI.opts(C.SCOPES, s.scope) + '</select>', { name: 'scope' }) + UI.field('Nível de impacto', '<select name="impact">' + UI.opts(C.IMPACTS, s.impact) + '</select>', { name: 'impact' }) +
            '<div class="s4 notice info" id="imp-hint"></div>' +
            UI.field('Descrição', '<textarea name="description" rows="2">' + esc(s.description) + '</textarea>', { cls: 's4', name: 'description' }) +
            UI.field('Regra de programação', inp('rule', 'text', s.rule, 'placeholder="Ex.: Não programar eventos abertos ao público"'), { cls: 's4', name: 'rule' }) +
            UI.field('Repetição', '<select name="recurrence">' + UI.opts(C.RECURRENCES, s.recurrence || 'none') + '</select>', { name: 'recurrence' }) +
            '<div class="field rec-c"><label>A cada</label><div class="row">' + inp('recurEvery', 'number', s.recurEvery || 1, 'min="1" style="width:80px"') + '<select name="recurUnit">' + UI.opts({ dias: 'dia(s)', semanas: 'semana(s)', meses: 'mês(es)', anos: 'ano(s)' }, s.recurUnit || 'dias') + '</select></div></div>' +
            UI.field('Repetir até (opcional)', inp('recurUntil', 'date', s.recurUntil), { cls: 'rec-u', name: 'recurUntil' }) +
            '<div class="field"><label>&nbsp;</label><label class="check"><input type="checkbox" name="confirmed" ' + (s.confirmed !== false ? 'checked' : '') + '> Data confirmada em fonte oficial</label></div></div></form>',
          footer: [{ label: 'Cancelar' }, { label: 'Salvar', cls: 'primary', icon: 'check', onClick: (mm) => save(mm) }],
        });
        const sync = () => { const f = m.q('#spform'); const imp = f.elements.impact.value; m.q('#imp-hint').innerHTML = icon('info') + '<div><b>' + C.IMPACTS[imp].label + ':</b> ' + C.IMPACTS[imp].desc + '</div>'; const r = f.elements.recurrence.value; m.q('.rec-c').style.display = r === 'personalizada' ? '' : 'none'; m.q('.rec-u').style.display = r === 'none' ? 'none' : ''; };
        m.q('#spform').addEventListener('change', sync); sync();
        function save(mm) {
          const f = mm.q('#spform'); const v = (n) => (f.elements[n].type === 'checkbox' ? f.elements[n].checked : f.elements[n].value.trim());
          const errs = {}; if (!v('name')) errs.name = 'Informe o nome.'; if (!v('start')) errs.start = 'Informe a data.'; if (v('end') && v('start') && v('end') < v('start')) errs.end = 'A data final deve ser igual ou posterior à inicial.';
          if (v('recurUntil') && v('start') && v('recurUntil') < v('start')) errs.recurUntil = 'Deve ser posterior à data inicial.';
          mm.qa('.field').forEach((x) => x.classList.remove('invalid'));
          const ks = Object.keys(errs); if (ks.length) { ks.forEach((k) => { const el = mm.q('[data-field="' + k + '"]'); if (el) { el.classList.add('invalid'); el.querySelector('.err').textContent = errs[k]; } }); UI.toast('Corrija os campos destacados.', 'warn'); return false; }
          const data = { name: v('name'), category: v('category'), start: v('start'), end: v('end') || v('start'), scope: v('scope'), impact: v('impact'), description: v('description'), rule: v('rule'), recurrence: v('recurrence'), recurEvery: Number(v('recurEvery')) || 1, recurUnit: v('recurUnit'), recurUntil: v('recurUntil'), confirmed: v('confirmed'), needsReview: !v('confirmed') };
          if (id) data.id = id;
          if (fromBuiltin) { Store.confirmBuiltin(Object.assign({}, fromBuiltin, { name: data.name })); const last = Store.plan().specials[Store.plan().specials.length - 1]; Store.saveSpecial(Object.assign({}, data, { id: last.id })); } else Store.saveSpecial(data);
          UI.toast('Data salva.'); rerender(); return true;
        }
      }
    },
  };
})(window);
