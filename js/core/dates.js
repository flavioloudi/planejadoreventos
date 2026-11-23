/* Utilitários de data e hora (strings ISO "AAAA-MM-DD" e "HH:MM"). Sem dependência de DOM. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  const pad = (n) => String(n).padStart(2, '0');

  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const D = {
    pad, MONTHS, WEEKDAYS, WEEKDAYS_SHORT,
    iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
    parse(s) { if (!s) return null; const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); },
    today() { return D.iso(new Date()); },
    addDays(s, n) { const d = D.parse(s); d.setDate(d.getDate() + n); return D.iso(d); },
    addMonths(s, n) {
      const d = D.parse(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return D.iso(d);
    },
    diffDays(a, b) { // b - a
      const A = D.parse(a), B = D.parse(b);
      return Math.round((Date.UTC(B.getFullYear(), B.getMonth(), B.getDate()) - Date.UTC(A.getFullYear(), A.getMonth(), A.getDate())) / 864e5);
    },
    range(a, b) { const out = []; if (!a || !b) return out; let c = a, i = 0; while (c <= b && i < 3700) { out.push(c); c = D.addDays(c, 1); i++; } return out; },
    weekday(s) { return D.parse(s).getDay(); },
    startOfWeek(s) { return D.addDays(s, -((D.weekday(s) + 6) % 7)); }, // semana começa na segunda-feira
    startOfWeekMon(s) { return D.addDays(s, -((D.weekday(s) + 6) % 7)); },
    nextMonday(s) { return D.addDays(D.startOfWeekMon(s), 7); },
    // n-ésima semana do mês (seg–dom, recortada no mês). Semana 1 = primeira semana com dia útil. n=-1: última.
    weekOfMonth(y, month1, n) {
      const first = y + '-' + pad(month1) + '-01', last = D.endOfMonth(first);
      const wd = D.weekday(first); const firstMon = wd === 0 ? D.addDays(first, 1) : wd === 6 ? D.addDays(first, 2) : D.startOfWeekMon(first);
      const mon = n === -1 ? D.startOfWeekMon(last) : D.addDays(firstMon, 7 * (n - 1));
      return { from: D.max(mon, first), to: D.min(D.addDays(mon, 6), last), valid: mon <= last };
    },
    startOfMonth(s) { return s.slice(0, 8) + '01'; },
    endOfMonth(s) { const d = D.parse(s); return D.iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)); },
    max(a, b) { return a > b ? a : b; },
    min(a, b) { return a < b ? a : b; },
    br(s) { if (!s) return '—'; const p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; },
    short(s) { if (!s) return '—'; const p = s.split('-'); return p[2] + '/' + p[1]; },
    long(s) { const d = D.parse(s); return D.WEEKDAYS[d.getDay()] + ', ' + d.getDate() + ' de ' + MONTHS[d.getMonth()] + ' de ' + d.getFullYear(); },
    monthLabel(s) { const d = D.parse(s); return MONTHS[d.getMonth()].charAt(0).toUpperCase() + MONTHS[d.getMonth()].slice(1) + ' de ' + d.getFullYear(); },
    rangeLabel(a, b) { return !b || a === b ? D.br(a) : D.br(a) + ' a ' + D.br(b); },
    weekKey(s) { return D.startOfWeek(s); },
    // horas
    toMin(t) { if (!t) return null; const p = t.split(':'); return Number(p[0]) * 60 + Number(p[1] || 0); },
    fromMin(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); },
    durLabel(min) {
      if (!min) return '—'; const h = Math.floor(min / 60), m = min % 60;
      if (h && m) return h + 'h' + pad(m); if (h) return h + 'h'; return m + 'min';
    },
    overlap(a1, a2, b1, b2) { return a1 < b2 && b1 < a2; },
    // Páscoa (algoritmo gregoriano anônimo)
    easter(y) {
      const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
      const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
      const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
      const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
      return y + '-' + pad(month) + '-' + pad(day);
    },
    nthWeekday(y, month1, weekday, n) { // n-ésimo dia da semana do mês
      let d = y + '-' + pad(month1) + '-01'; while (D.weekday(d) !== weekday) d = D.addDays(d, 1); return D.addDays(d, 7 * (n - 1));
    },
    uid(prefix) { return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
  };
  PA.Dates = D;
  if (typeof module !== 'undefined') module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
