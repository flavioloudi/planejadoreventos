/* Relatórios e exportação. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  PA.Pages = PA.Pages || {};
  const D = PA.Dates, UI = PA.UI, Store = PA.Store, R = PA.Reports;
  const esc = UI.esc, icon = UI.icon;

  const S = { key: 'geral', month: D.today().slice(0, 7), week: D.today() };

  PA.Pages.reports = {
    title: 'Relatórios', subtitle: 'Exporte e imprima',
    render(view) {
      const plan = Store.plan();
      const info = R.REPORTS[S.key];
      const t = R.build(plan, S.key, { month: S.month, week: S.week });
      view.innerHTML =
        '<div class="page-head"><div><h1>Relatórios e exportação</h1><p>Gere relatórios do planejamento e exporte em Excel, PDF ou CSV.</p></div></div>' +
        '<div class="grid" style="grid-template-columns:260px minmax(0,1fr);align-items:start">' +
        '<div class="card pad0"><div class="col" style="gap:0">' + Object.keys(R.REPORTS).map((k) => '<button class="btn ghost" data-rep="' + k + '" style="justify-content:flex-start;border-radius:0;padding:12px 16px;' + (S.key === k ? 'background:var(--primary-l);color:var(--primary);font-weight:600' : '') + '">' + icon('file') + esc(R.REPORTS[k].label) + '</button>').join('') + '</div></div>' +
        '<div class="col" style="gap:14px"><div class="card"><div class="row between wrap"><div><h2>' + esc(t.title) + '</h2><p class="muted small">' + esc(info.desc) + '</p></div>' +
        '<div class="row wrap no-print">' + (info.needs.indexOf('month') >= 0 ? '<input type="month" id="r-month" value="' + S.month + '" style="width:auto">' : '') + (info.needs.indexOf('week') >= 0 ? '<input type="date" id="r-week" value="' + S.week + '" style="width:auto" title="Qualquer dia da semana desejada">' : '') +
        '<button class="btn" data-exp="excel">' + icon('download') + 'Excel</button><button class="btn" data-exp="pdf">' + icon('download') + 'PDF</button><button class="btn" data-exp="csv">' + icon('download') + 'CSV</button><button class="btn" data-exp="print">' + icon('printer') + 'Imprimir</button></div></div>' +
        (t.summary && t.summary.length ? '<div class="row wrap mt">' + t.summary.map((s) => '<span class="badge b-info">' + esc(s[0]) + ': ' + esc(s[1]) + '</span>').join('') + '</div>' : '') + '</div>' +
        '<div class="table-wrap"><table class="t"><thead><tr>' + t.columns.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' + (t.rows.length ? t.rows.map((r) => '<tr>' + r.map((v) => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('') : '<tr><td colspan="' + t.columns.length + '">' + UI.empty('file', 'Sem registros', 'Não há dados para este relatório.') + '</td></tr>') + '</tbody></table></div>' +
        '<p class="small muted">O PDF é gerado pela janela de impressão do navegador (escolha "Salvar como PDF"). O Excel é exportado em formato compatível (.xls).</p></div></div>';
      view.onclick = (e) => {
        const r = e.target.closest('[data-rep]'); if (r) { S.key = r.dataset.rep; return PA.App.render(); }
        const x = e.target.closest('[data-exp]'); if (!x) return;
        if (x.dataset.exp === 'print') return R.printHTML(R.toHTML(t, true));
        R.exportAs(t, x.dataset.exp); UI.toast('Relatório exportado (' + x.dataset.exp.toUpperCase() + ').');
      };
      const m = view.querySelector('#r-month'); if (m) m.onchange = () => { S.month = m.value || S.month; PA.App.render(); };
      const w = view.querySelector('#r-week'); if (w) w.onchange = () => { S.week = w.value || S.week; PA.App.render(); };
    },
  };
})(window);
