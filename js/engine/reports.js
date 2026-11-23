/* Relatórios: geram tabelas (colunas + linhas) e exportam para CSV, Excel (SpreadsheetML) e PDF (via impressão). */
(function (root) {
  const PA = (root.PA = root.PA || {});
  const D = PA.Dates, C = PA.C, P = PA.Planner, Cf = PA.Conflicts;

  const timeTxt = (a) => (a.startTime ? a.startTime + (a.endTime ? '–' + a.endTime : '') : '');
  const actRow = (a) => [D.br(a.date), timeTxt(a), a.name, a.category, a.responsible || '—', a.sector || '', a.location || '', C.prio(a.priority).label, C.status(a.status).label];
  const ACT_COLS = ['Data', 'Horário', 'Atividade', 'Categoria', 'Responsável', 'Setor', 'Local', 'Prioridade', 'Status'];
  const byDateTime = (a, b) => ((a.date || '9999') + (a.startTime || '99')) < ((b.date || '9999') + (b.startTime || '99')) ? -1 : 1;

  const REPORTS = {
    geral: { label: 'Cronograma geral', desc: 'Todas as atividades programadas em ordem cronológica.', needs: [] },
    mensal: { label: 'Programação mensal', desc: 'Atividades de um mês específico.', needs: ['month'] },
    semanal: { label: 'Programação semanal', desc: 'Atividades de uma semana específica.', needs: ['week'] },
    responsavel: { label: 'Atividades por responsável', desc: 'Atividades agrupadas por responsável.', needs: [] },
    categoria: { label: 'Atividades por categoria', desc: 'Atividades agrupadas por categoria.', needs: [] },
    naoProgramadas: { label: 'Propostas não programadas', desc: 'Propostas ainda sem data, com a análise de viabilidade.', needs: [] },
    conflitos: { label: 'Conflitos encontrados', desc: 'Conflitos detectados na programação atual.', needs: [] },
    datas: { label: 'Datas especiais', desc: 'Feriados, restrições e eventos do ano de referência.', needs: [] },
    resumo: { label: 'Resumo de compromissos', desc: 'Totais por status, prioridade e categoria.', needs: [] },
  };

  function build(plan, key, opts) {
    opts = opts || {};
    const acts = plan.activities, sched = acts.filter(P.isScheduled).sort(byDateTime);
    const t = { title: REPORTS[key].label, subtitle: plan.settings.name + (plan.settings.city ? ' — ' + plan.settings.city + '/' + plan.settings.state : ''), columns: [], rows: [], groups: null, summary: [] };
    if (key === 'geral') { t.columns = ACT_COLS; t.rows = sched.map(actRow); t.summary = [['Atividades programadas', sched.length]]; }
    else if (key === 'mensal') {
      const m = (opts.month || D.today().slice(0, 7));
      const list = sched.filter((a) => a.date.slice(0, 7) === m); t.title += ' — ' + D.monthLabel(m + '-01'); t.columns = ACT_COLS; t.rows = list.map(actRow); t.summary = [['Atividades no mês', list.length]];
    } else if (key === 'semanal') {
      const w = D.startOfWeek(opts.week || D.today()); const e = D.addDays(w, 6);
      const list = sched.filter((a) => a.date >= w && a.date <= e); t.title += ' — ' + D.br(w) + ' a ' + D.br(e); t.columns = ACT_COLS; t.rows = list.map(actRow); t.summary = [['Atividades na semana', list.length]];
    } else if (key === 'responsavel' || key === 'categoria') {
      const f = key === 'responsavel' ? (a) => a.responsible || 'Sem responsável' : (a) => a.category || 'Sem categoria';
      const groups = {}; acts.filter((a) => a.status !== 'cancelada').forEach((a) => { (groups[f(a)] = groups[f(a)] || []).push(a); });
      t.columns = [key === 'responsavel' ? 'Responsável' : 'Categoria', 'Data', 'Horário', 'Atividade', key === 'responsavel' ? 'Categoria' : 'Responsável', 'Duração', 'Prioridade', 'Status'];
      Object.keys(groups).sort().forEach((g) => {
        groups[g].sort(byDateTime).forEach((a) => t.rows.push([g, a.date ? D.br(a.date) : 'Sem data', timeTxt(a), a.name, key === 'responsavel' ? a.category : (a.responsible || '—'), D.durLabel(a.duration), C.prio(a.priority).label, C.status(a.status).label]));
      });
      t.summary = Object.keys(groups).sort().map((g) => [g, groups[g].length]);
    } else if (key === 'naoProgramadas') {
      const list = acts.filter((a) => !a.date && a.status !== 'cancelada' && a.status !== 'concluida');
      t.columns = ['Atividade', 'Prioridade', 'Responsável', 'Duração', 'Período permitido', 'Viabilidade', 'Justificativa'];
      list.forEach((a) => { const v = PA.Validator.validate(plan, a); t.rows.push([a.name, C.prio(a.priority).label, a.responsible || '—', D.durLabel(a.duration), a.minDate || a.deadline ? D.rangeLabel(a.minDate || '…', a.deadline || '…') : 'Livre', PA.Validator.STATUS[v.status].label, v.summary]); });
      t.summary = [['Propostas sem data', list.length]];
    } else if (key === 'conflitos') {
      const list = Cf.detect(plan); t.columns = ['Gravidade', 'Tipo', 'Data', 'Horário', 'Atividades', 'Descrição', 'Sugestão', 'Situação'];
      list.forEach((c) => t.rows.push([Cf.SEV_LABEL[c.severity], c.typeLabel, D.br(c.date), c.time, c.activityIds.map((id) => (plan.activities.find((a) => a.id === id) || {}).name).join(' / '), c.description, c.suggestion, c.exception ? (c.exception.mode === 'ignorado' ? 'Ignorado' : 'Exceção mantida') : 'Aberto']));
      t.summary = [['Conflitos', list.length], ['Abertos', Cf.active(list).length]];
    } else if (key === 'datas') {
      const y = plan.settings.year; const occs = PA.Specials.occurrences(plan, y + '-01-01', y + '-12-31').sort((a, b) => (a.start < b.start ? -1 : 1));
      t.columns = ['Data', 'Nome', 'Categoria', 'Abrangência', 'Impacto', 'Situação', 'Regra de programação'];
      occs.forEach((o) => t.rows.push([D.rangeLabel(o.start, o.end), o.name, o.category, C.SCOPES[o.scope] || o.scope, C.IMPACTS[o.eff].label, o.confirmed === false || o.needsReview ? 'Precisa de revisão' : 'Confirmada', o.rule || '']));
      t.summary = [['Datas no ano ' + y, occs.length]];
    } else if (key === 'resumo') {
      const st = PA.Insights.stats(plan);
      t.columns = ['Indicador', 'Valor'];
      t.rows = [['Total de atividades', st.total], ['Aprovadas', st.approved], ['Pendentes de validação', st.pending], ['Programadas', st.scheduled], ['Com conflito', st.withConflict], ['Sem data', st.unscheduled], ['Concluídas', st.completed], ['Canceladas', st.canceled], ['% organizado', st.organizedPct + '%']];
      Object.keys(C.STATUSES).forEach((k) => { if (st.byStatus[k]) t.rows.push(['Status: ' + C.STATUSES[k].label, st.byStatus[k]]); });
      Object.keys(C.PRIORITIES).forEach((k) => { if (st.byPriority[k]) t.rows.push(['Prioridade: ' + C.PRIORITIES[k].label, st.byPriority[k]]); });
      Object.keys(st.byCategory).sort().forEach((k) => t.rows.push(['Categoria: ' + k, st.byCategory[k]]));
    }
    return t;
  }

  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function toCSV(t) {
    const q = (v) => { const s = String(v == null ? '' : v); return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const lines = [t.title, t.subtitle, ''].map(q);
    lines.push(t.columns.map(q).join(';'));
    t.rows.forEach((r) => lines.push(r.map(q).join(';')));
    return '\uFEFF' + lines.join('\r\n'); // BOM para o Excel reconhecer UTF-8; separador ";" (padrão pt-BR)
  }

  function toExcel(t) {
    const cell = (v, bold) => { const isNum = typeof v === 'number'; return '<Cell' + (bold ? ' ss:StyleID="h"' : '') + '><Data ss:Type="' + (isNum ? 'Number' : 'String') + '">' + esc(v) + '</Data></Cell>'; };
    const rows = [[t.title], [t.subtitle], []].map((r, i) => '<Row>' + r.map((v) => cell(v, i === 0)).join('') + '</Row>');
    rows.push('<Row>' + t.columns.map((c) => cell(c, true)).join('') + '</Row>');
    t.rows.forEach((r) => rows.push('<Row>' + r.map((v) => cell(v)).join('') + '</Row>'));
    return '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#E8EEF7" ss:Pattern="Solid"/></Style></Styles><Worksheet ss:Name="' + esc(t.title.slice(0, 30).replace(/[\\/?*[\]:]/g, '')) + '"><Table>' + rows.join('') + '</Table></Worksheet></Workbook>';
  }

  function toHTML(t, standalone) {
    const body = '<h1>' + esc(t.title) + '</h1><p class="sub">' + esc(t.subtitle) + ' · Gerado em ' + D.br(D.today()) + '</p>' +
      (t.summary && t.summary.length ? '<p class="sum">' + t.summary.map((s) => '<b>' + esc(s[0]) + ':</b> ' + esc(s[1])).join(' &nbsp;·&nbsp; ') + '</p>' : '') +
      '<table><thead><tr>' + t.columns.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
      (t.rows.length ? t.rows.map((r) => '<tr>' + r.map((v) => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('') : '<tr><td colspan="' + t.columns.length + '">Sem registros para este relatório.</td></tr>') + '</tbody></table>';
    if (!standalone) return body;
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + esc(t.title) + '</title><style>body{font-family:Segoe UI,Arial,sans-serif;color:#1e293b;margin:24px}h1{font-size:20px;margin:0}.sub{color:#64748b;margin:4px 0 12px;font-size:12px}.sum{font-size:12px}table{border-collapse:collapse;width:100%;font-size:11px}th{background:#eef2f7;text-align:left}th,td{border:1px solid #cbd5e1;padding:5px 7px;vertical-align:top}tr{page-break-inside:avoid}@media print{body{margin:8mm}}</style></head><body>' + body + '</body></html>';
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
  }
  const fileBase = (t) => t.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function exportAs(t, fmt) {
    if (fmt === 'csv') download(fileBase(t) + '.csv', toCSV(t), 'text/csv;charset=utf-8');
    else if (fmt === 'excel') download(fileBase(t) + '.xls', toExcel(t), 'application/vnd.ms-excel');
    else if (fmt === 'pdf') printHTML(toHTML(t, true));
  }
  function printHTML(html) {
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f); const d = f.contentWindow.document; d.open(); d.write(html); d.close();
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } finally { setTimeout(() => document.body.removeChild(f), 1500); } }, 250);
  }

  PA.Reports = { REPORTS, build, toCSV, toExcel, toHTML, exportAs, printHTML };
  if (typeof module !== 'undefined') module.exports = PA.Reports;
})(typeof window !== 'undefined' ? window : globalThis);
