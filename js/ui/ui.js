/* Utilitários de interface: ícones, escape, toasts, modais, componentes pequenos. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  const D = PA.Dates, C = PA.C;

  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    checksq: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
    warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    left: '<polyline points="15 18 9 12 15 6"/>',
    right: '<polyline points="9 18 15 12 9 6"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    history: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/><polyline points="12 7 12 12 15 14"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    checkc: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    play: '<polygon points="5 3 19 12 5 21 5 3"/>',
    arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    ban: '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    wand: '<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 6.2L11 5"/><path d="M15 9l-12 12 3 0 12-12z" transform="translate(0 0)"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
    bolt: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  };
  const icon = (n, extra) => '<svg class="i' + (extra ? ' ' + extra : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || ICONS.info) + '</svg>';

  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const UI = {
    esc, icon, ICONS,
    $: (sel, root0) => (root0 || document).querySelector(sel),
    $$: (sel, root0) => Array.from((root0 || document).querySelectorAll(sel)),
    go(hash) { if (location.hash === hash) root.dispatchEvent(new Event('hashchange')); else location.hash = hash; },

    // ---- Toasts
    toast(msg, type, action) {
      const box = document.getElementById('toasts'); if (!box) return;
      const el = document.createElement('div'); el.className = 'toast ' + (type || 'ok');
      el.innerHTML = icon(type === 'err' ? 'alert' : type === 'warn' ? 'warning' : 'checkc') + '<span>' + esc(msg) + '</span>' + (action ? '<button type="button">' + esc(action.label) + '</button>' : '');
      if (action) el.querySelector('button').onclick = () => { action.fn(); el.remove(); };
      box.appendChild(el); setTimeout(() => el.remove(), action ? 7000 : 3800);
    },

    // ---- Modais
    modal(o) {
      const host = document.getElementById('modals');
      const back = document.createElement('div'); back.className = 'modal-back'; back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true');
      const foot = (o.footer || []).map((b, i) => '<button type="button" class="btn ' + (b.cls || '') + '" data-foot="' + i + '">' + (b.icon ? icon(b.icon) : '') + esc(b.label) + '</button>').join('');
      back.innerHTML = '<div class="modal ' + (o.size || '') + '"><div class="modal-h"><h2>' + (o.titleHTML || esc(o.title || '')) + '</h2><button type="button" class="btn ghost icon" data-close aria-label="Fechar">' + icon('x') + '</button></div><div class="modal-b">' + (o.body || '') + '</div>' + (foot ? '<div class="modal-f">' + foot + '</div>' : '') + '</div>';
      host.appendChild(back);
      const prevFocus = document.activeElement;
      const m = {
        el: back, q: (s) => back.querySelector(s), qa: (s) => Array.from(back.querySelectorAll(s)),
        close() { if (!back.parentNode) return; back.remove(); document.removeEventListener('keydown', onKey, true); if (o.onClose) o.onClose(); if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) { /* noop */ } },
        setBody(html) { back.querySelector('.modal-b').innerHTML = html; },
        setFooter(i, patch) { const b = back.querySelector('[data-foot="' + i + '"]'); if (b && patch.disabled != null) b.disabled = patch.disabled; if (b && patch.label) b.textContent = patch.label; },
      };
      function onKey(e) { if (e.key === 'Escape' && host.lastElementChild === back) { e.stopPropagation(); m.close(); } }
      document.addEventListener('keydown', onKey, true);
      back.addEventListener('click', async (e) => {
        if (e.target.closest('[data-close]')) return m.close();
        const fb = e.target.closest('[data-foot]');
        if (fb) { const b = o.footer[Number(fb.dataset.foot)]; const r = b.onClick ? await b.onClick(m, fb) : undefined; if (r !== false && !b.keepOpen) m.close(); }
      });
      if (o.onMount) o.onMount(m);
      const first = back.querySelector('[autofocus],input:not([type=hidden]),select,textarea'); if (first && !o.noFocus) setTimeout(() => first.focus(), 30);
      return m;
    },
    confirm(o) {
      return new Promise((resolve) => {
        let done = false; const fin = (v) => { if (!done) { done = true; resolve(v); } };
        UI.modal({
          title: o.title || 'Confirmar', size: 'sm', body: '<div class="col">' + (o.html || '<p>' + esc(o.message) + '</p>') + '</div>', onClose: () => fin(false),
          footer: [{ label: o.cancelLabel || 'Cancelar', onClick: () => fin(false) }, { label: o.confirmLabel || 'Confirmar', cls: o.danger ? 'danger' : 'primary', onClick: () => { fin(true); } }],
        });
      });
    },
    promptText(o) {
      return new Promise((resolve) => {
        let done = false; const fin = (v) => { if (!done) { done = true; resolve(v); } };
        UI.modal({
          title: o.title, size: 'sm', body: '<div class="field"><label>' + esc(o.label || '') + '</label>' + (o.multiline ? '<textarea id="pt">' + esc(o.value || '') + '</textarea>' : '<input type="text" id="pt" value="' + esc(o.value || '') + '">') + '</div>', onClose: () => fin(null),
          footer: [{ label: 'Cancelar', onClick: () => fin(null) }, { label: o.okLabel || 'Salvar', cls: 'primary', onClick: (m) => { const v = m.q('#pt').value.trim(); if (o.required && !v) { m.q('#pt').focus(); return false; } fin(v); } }],
        });
      });
    },

    // ---- Componentes
    badge(text, cls, dot) { return '<span class="badge ' + (cls || '') + (dot ? ' dot' : '') + '">' + esc(text) + '</span>'; },
    prioBadge(p) { const x = C.prio(p); const cls = { critica: 'b-danger', alta: 'b-warn', media: 'b-info', baixa: 'b-gray' }[p] || 'b-gray'; return UI.badge(x.label, cls, true); },
    statusBadge(s) {
      const cls = { proposta: 'b-gray', validacao: 'b-purple', aprovada: 'b-info', aguardando: 'b-info', programada: 'b-info', confirmada: 'b-ok', andamento: 'b-warn', concluida: 'b-gray', cancelada: 'b-gray', reprogramar: 'b-danger' }[s] || 'b-gray';
      return UI.badge(C.status(s).label, cls);
    },
    valBadge(st) { const cls = { viavel: 'b-ok', ressalvas: 'b-warn', ajustes: 'b-purple', inviavel: 'b-danger' }[st]; return UI.badge(PA.Validator.STATUS[st].label, cls, true); },
    sevBadge(s) { const cls = { alta: 'b-danger', media: 'b-warn', baixa: 'b-info' }[s]; return UI.badge('Gravidade ' + PA.Conflicts.SEV_LABEL[s].toLowerCase(), cls, true); },
    impactBadge(i) { const x = C.IMPACTS[i]; const cls = { bloqueio: 'b-danger', restricao: 'b-warn', preferencial: 'b-ok', neutro: 'b-gray' }[i]; return UI.badge(x.label, cls, true); },
    empty(ic, title, text, actions) { return '<div class="empty">' + icon(ic) + '<b>' + esc(title) + '</b><p>' + esc(text || '') + '</p>' + (actions ? '<div class="row" style="justify-content:center;margin-top:12px">' + actions + '</div>' : '') + '</div>'; },
    field(label, input, o) { o = o || {}; return '<div class="field ' + (o.cls || '') + '" data-field="' + (o.name || '') + '"><label>' + esc(label) + (o.req ? ' <span class="req">*</span>' : '') + '</label>' + input + (o.hint ? '<div class="hint">' + esc(o.hint) + '</div>' : '') + '<div class="err"></div></div>'; },
    opts(map, sel, blank) {
      let h = blank != null ? '<option value="">' + esc(blank) + '</option>' : '';
      const entries = Array.isArray(map) ? map.map((x) => [x, x]) : Object.keys(map).map((k) => [k, typeof map[k] === 'object' ? map[k].label : map[k]]);
      return h + entries.map((e) => '<option value="' + esc(e[0]) + '"' + (String(e[0]) === String(sel) ? ' selected' : '') + '>' + esc(e[1]) + '</option>').join('');
    },
    catColor(name) {
      const p = PA.Store.plan(); const c = (p.settings.categories || C.CATEGORIES).find((x) => x.name === name);
      return c ? c.color : '#64748b';
    },
    actColor(a, by) { return (by || UI.colorBy) === 'priority' ? C.prio(a.priority).color : UI.catColor(a.category); },
    colorBy: 'category',
    timeRange(a) { return a.startTime ? a.startTime + (a.endTime ? '–' + a.endTime : '') : ''; },
    dateTimeLabel(a) { return a.date ? D.br(a.date) + (a.startTime ? ' · ' + UI.timeRange(a) : '') : 'Sem data'; },
    actDays(a) { return a.date ? D.WEEKDAYS_SHORT[D.weekday(a.date)] + ', ' + D.br(a.date) : 'Sem data'; },
    pct(n, t) { return t ? Math.round((100 * n) / t) : 0; },
    barRows(rows, total, color) {
      const max = Math.max(1, total || Math.max.apply(null, rows.map((r) => r.n)));
      return '<div class="bars">' + rows.map((r) => '<div class="bar-row"><span class="lab" title="' + esc(r.label) + '">' + (r.color ? '<i class="swatch" style="background:' + r.color + '"></i> ' : '') + esc(r.label) + '</span><div class="progress"><i style="width:' + Math.round((100 * r.n) / max) + '%;background:' + (r.color || color || 'var(--primary)') + '"></i></div><span class="num">' + r.n + '</span></div>').join('') + '</div>';
    },
    scoreColor(s) { return s >= 85 ? '#16a34a' : s >= 70 ? '#65a30d' : s >= 50 ? '#d97706' : '#dc2626'; },
    tooltipLines(a) { return [a.name, UI.dateTimeLabel(a), a.responsible ? 'Resp.: ' + a.responsible : '', a.location ? 'Local: ' + a.location : '', C.status(a.status).label].filter(Boolean).join('\n'); },
    // Resolve nomes de atividade a partir de ids
    names(ids) { const p = PA.Store.plan(); return ids.map((id) => (p.activities.find((a) => a.id === id) || { name: '(removida)' }).name); },
    debounce(fn, ms) { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms); }; },
  };
  PA.UI = UI;
})(window);
