/* Planejador: contexto de calendário (ocupação, bloqueios) e busca/pontuação de candidatos de data e horário.
   Usado pelo gerador, validador e reprogramação. Sem dependência de DOM. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  const D = PA.Dates, C = PA.C, Sp = PA.Specials;

  const norm = (s) => (s || '').toString().trim().toLowerCase();
  const isScheduled = (a) => !!a.date && a.status !== 'cancelada' && a.status !== 'concluida';
  const isDateFixed = (a) => a.dateFlex === 'fixa' && !!a.preferredDate;
  const isTimeFixed = (a) => a.timeFlex === 'fixa' && !!a.preferredTime;

  function dayWindows(settings, shifts) {
    const sh = shifts || settings.shifts || {};
    const out = [];
    ['manha', 'tarde', 'noite'].forEach((k) => {
      const s = sh[k];
      if (s && s.enabled && D.toMin(s.end) > D.toMin(s.start)) out.push({ key: k, start: D.toMin(s.start), end: D.toMin(s.end) });
    });
    if (!out.length) out.push({ key: 'dia', start: D.toMin(settings.startTime || '08:00'), end: D.toMin(settings.endTime || '18:00') });
    return out;
  }

  function entryOf(a, defDur) {
    const start = a.startTime ? D.toMin(a.startTime) : null;
    let end = null;
    if (start != null) end = a.endTime ? D.toMin(a.endTime) : start + (a.duration || defDur || 60);
    return { id: a.id, date: a.date, start, end, responsible: norm(a.responsible), location: norm(a.location), priority: a.priority, locked: !!a.locked, name: a.name, dateFixed: isDateFixed(a) };
  }

  function createContext(plan, o) {
    const S = plan.settings;
    const today = D.today();
    const p = Object.assign({
      from: today, to: D.addDays(today, 90), allowedDays: S.workDays, shifts: S.shifts, maxPerDay: S.maxPerDay, minGap: S.minGap,
      defaultDuration: S.defaultDuration, respectHolidays: true, respectBlocked: true, allowParallel: !!S.allowParallel,
      considerResources: true, exclude: [], extraBlocked: [], step: 15, activities: null,
    }, o || {});
    let idx = Sp.index(plan, p.from, p.to);
    const windows = dayWindows(S, p.shifts);
    const busy = {};
    const addBusy = (e) => { (busy[e.date] = busy[e.date] || []).push(e); };
    (p.activities || plan.activities).forEach((a) => { if (isScheduled(a) && p.exclude.indexOf(a.id) < 0) addBusy(entryOf(a, p.defaultDuration)); });

    function occsFor(date) {
      if (date < idx.from || date > idx.to) idx = Sp.index(plan, D.min(idx.from, D.addDays(date, -30)), D.max(idx.to, D.addDays(date, 30)));
      return idx.get(date);
    }
    function dayInfo(date) {
      const e = occsFor(date);
      const extra = p.extraBlocked.filter((r) => date >= r.from && date <= r.to).map((r) => ({ name: r.name || 'Indisponível', isHoliday: false, eff: 'bloqueio', virtual: true, category: 'Indisponibilidade' }));
      const blocked = e.blocked.concat(extra);
      const hard = blocked.some((o) => (o.isHoliday ? p.respectHolidays : p.respectBlocked));
      const list = busy[date] || [];
      return {
        date, weekday: D.weekday(date), allowedDay: p.allowedDays.indexOf(D.weekday(date)) >= 0, blocked, restricted: e.restricted, preferred: e.preferred,
        holidays: e.holidays, hard, count: list.length, items: list,
      };
    }
    function weekCount(date) {
      const s = D.startOfWeek(date); let n = 0;
      for (let i = 0; i < 7; i++) n += (busy[D.addDays(s, i)] || []).length;
      return n;
    }
    function orderedWindows(a) {
      const w = windows.slice();
      if (a.preferredPeriod) { const first = w.filter((x) => x.key === a.preferredPeriod), rest = w.filter((x) => x.key !== a.preferredPeriod); return first.concat(rest); }
      return w;
    }
    function fits(a, date, start, end) {
      const list = busy[date] || [];
      const resp = norm(a.responsible), loc = norm(a.location);
      for (let i = 0; i < list.length; i++) {
        const b = list[i]; if (b.start == null || b.id === a.id) continue;
        const sameResp = p.considerResources && resp && b.responsible === resp;
        const sameLoc = p.considerResources && loc && b.location === loc;
        const strict = D.overlap(start, end, b.start, b.end);
        if (strict && (!p.allowParallel || sameResp || sameLoc)) return { ok: false, why: sameResp ? 'responsavel' : sameLoc ? 'local' : 'ocupado' };
        if (!strict && (!p.allowParallel || sameResp) && p.minGap > 0 && start < b.end + p.minGap && b.start < end + p.minGap) return { ok: false, why: 'intervalo' };
      }
      return { ok: true };
    }
    // Retorna { start, end, period, spans } ou { fail: motivo }
    function findSlot(a, date) {
      const dur = a.duration || p.defaultDuration;
      let lastFail = 'semHorario';
      if (isTimeFixed(a)) {
        const s = D.toMin(a.preferredTime), e = s + dur; const f = fits(a, date, s, e);
        return f.ok ? { start: s, end: e, period: periodOf(s), exact: true } : { fail: f.why };
      }
      const prefMin = a.preferredTime ? D.toMin(a.preferredTime) : null;
      let best = null;
      const ws = orderedWindows(a);
      const only = a.preferredPeriod && a.timeFlex === 'fixa' ? ws.filter((w) => w.key === a.preferredPeriod) : ws;
      const tryWindows = (arr) => {
        for (let i = 0; i < arr.length; i++) {
          const w = arr[i];
          for (let s = w.start; s + dur <= w.end; s += p.step) {
            const f = fits(a, date, s, s + dur);
            if (!f.ok) { lastFail = f.why; continue; }
            const cand = { start: s, end: s + dur, period: w.key };
            if (prefMin == null) return cand;
            if (!best || Math.abs(s - prefMin) < Math.abs(best.start - prefMin)) best = cand;
          }
          if (prefMin == null && best) return best;
          if (prefMin == null && a.preferredPeriod && w.key === a.preferredPeriod && best) return best;
        }
        return best;
      };
      let r = tryWindows(only);
      if (r) return r;
      if (!windows.some((w) => w.end - w.start >= dur) && windows.length) { // duração maior que qualquer turno: usa o dia inteiro
        const span = { key: 'dia', start: windows[0].start, end: windows[windows.length - 1].end };
        for (let s = span.start; s + dur <= span.end; s += p.step) { const f = fits(a, date, s, s + dur); if (f.ok) return { start: s, end: s + dur, period: periodOf(s), spans: true }; lastFail = f.why; }
      }
      return { fail: lastFail };
    }
    function periodOf(min) { return min < 12 * 60 ? 'manha' : min < 18 * 60 ? 'tarde' : 'noite'; }

    function score(a, info, slot, so, win) {
      let s = 0; const why = []; const pw = C.prio(a.priority);
      if (so.considerPreferred !== false && a.preferredDate) {
        const d = Math.abs(D.diffDays(a.preferredDate, info.date));
        if (d === 0) { s += 120; why.push('Data preferencial atendida'); } else { s -= Math.min(d, 30) * 2.5; if (d <= 3) why.push('Próxima da data preferencial (' + d + ' dia' + (d > 1 ? 's' : '') + ' de diferença)'); }
      }
      if (so.anchorDate) {
        const d = Math.abs(D.diffDays(so.anchorDate, info.date)); s -= Math.min(d, 60) * 3;
        if (D.weekday(so.anchorDate) === info.weekday) s += 4;
        if (d <= 7) why.push('Próxima da data original (' + d + ' dia' + (d === 1 ? '' : 's') + ')');
      }
      const off = Math.max(0, D.diffDays(win.from, info.date));
      s -= off * (so.earliest ? 2 : pw.rank >= 3 ? 0.8 : 0.15);
      if (so.earliest && off === 0) why.push('Primeira data disponível (prioridade ' + pw.label.toLowerCase() + ')');
      if (so.balance) {
        s -= info.count * 14 + weekCount(info.date) * 3;
        if (info.count === 0) why.push('Dia livre: melhora a distribuição');
        else if (info.count === 1) why.push('Dia com baixa carga');
      }
      if (so.avoidConsecutive && slot && slot.start != null) {
        for (let i = 0; i < info.items.length; i++) {
          const b = info.items[i]; if (b.start == null) continue;
          const gap = Math.min(Math.abs(slot.start - b.end), Math.abs(b.start - slot.end));
          if (gap < p.minGap + 30) { s -= 8; break; }
        }
      }
      if (info.restricted.length) { const hol = info.restricted.some((o) => o.isHoliday); s -= hol ? 50 : 35; why.push('Atenção: ' + info.restricted.map((o) => o.name).join(', ') + ' (restrição parcial)'); }
      if (info.preferred.length) { s += 15; why.push('Data preferencial para programação: ' + info.preferred.map((o) => o.name).join(', ')); }
      if (a.preferredPeriod && slot && slot.period) {
        if (slot.period === a.preferredPeriod) { s += 6; why.push('Período preferido (' + C.PERIODS[a.preferredPeriod].toLowerCase() + ') respeitado'); } else s -= 6;
      }
      if (slot && slot.exact) why.push('Horário fixo mantido (' + D.fromMin(slot.start) + ')');
      const loc = norm(a.location);
      if (loc && info.items.some((b) => b.location === loc)) { s += 5; why.push('Mesmo local de outra atividade no dia (otimiza a agenda)'); }
      const resp = norm(a.responsible);
      if (resp) { const n = info.items.filter((b) => b.responsible === resp).length; if (n >= 2) s -= 6; if (n >= 1 && (!slot || slot.start == null)) s -= 20; }
      return { score: s, why };
    }

    // Lista candidatos (ordenados) e resumo das rejeições.
    function candidates(a, win, so) {
      so = so || {};
      const rej = { days: 0, weekday: 0, blocked: {}, full: 0, noSlot: 0, resp: 0, loc: 0, gap: 0, busy: 0 };
      const list = [];
      const lo = win.from, hi = win.to;
      D.range(lo, hi).forEach((date) => {
        rej.days++;
        const info = dayInfo(date);
        if (!info.allowedDay && !so.ignoreWeekday) { rej.weekday++; return; }
        if (info.hard) { info.blocked.forEach((o) => { rej.blocked[o.name] = (rej.blocked[o.name] || 0) + 1; }); return; }
        if (info.count >= p.maxPerDay) { rej.full++; return; }
        const slot = so.noTime ? { start: null, end: null, period: a.preferredPeriod || '' } : findSlot(a, date);
        if (slot.fail) { const f = slot.fail; if (f === 'responsavel') rej.resp++; else if (f === 'local') rej.loc++; else if (f === 'intervalo') rej.gap++; else if (f === 'ocupado') rej.busy++; else rej.noSlot++; return; }
        const sc = score(a, info, slot, so, win);
        list.push({ date, slot, score: sc.score + (so.jitter ? so.jitter(a.id + date) : 0), why: sc.why, info });
      });
      list.sort((x, y) => (y.score - x.score) || (x.date < y.date ? -1 : 1));
      return { list, rej };
    }
    function place(a, cand) {
      addBusy({ id: a.id, date: cand.date, start: cand.slot.start, end: cand.slot.end, responsible: norm(a.responsible), location: norm(a.location), priority: a.priority, locked: !!a.locked, name: a.name, dateFixed: isDateFixed(a) });
    }
    function unplace(id) { Object.keys(busy).forEach((d) => { busy[d] = busy[d].filter((b) => b.id !== id); }); }
    return { params: p, windows, dayInfo, weekCount, findSlot, candidates, place, unplace, busy: () => busy, score };
  }

  function rejectionText(rej, win) {
    const parts = [];
    if (!rej || !rej.days) return 'O período informado não possui datas.';
    if (rej.weekday) parts.push(rej.weekday + ' dia(s) fora dos dias da semana permitidos');
    const b = Object.keys(rej.blocked);
    if (b.length) parts.push('datas bloqueadas (' + b.slice(0, 4).join(', ') + (b.length > 4 ? '…' : '') + ')');
    if (rej.full) parts.push(rej.full + ' dia(s) com o limite diário de atividades atingido');
    if (rej.resp) parts.push(rej.resp + ' dia(s) em que o responsável já está ocupado');
    if (rej.loc) parts.push(rej.loc + ' dia(s) em que o local já está ocupado');
    if (rej.busy) parts.push(rej.busy + ' dia(s) com horário ocupado');
    if (rej.gap) parts.push(rej.gap + ' dia(s) sem o intervalo mínimo entre atividades');
    if (rej.noSlot) parts.push(rej.noSlot + ' dia(s) sem horário livre para a duração');
    return parts.length ? 'Descartadas: ' + parts.join('; ') + '.' : 'Nenhuma data disponível.';
  }

  PA.Planner = { createContext, dayWindows, entryOf, isScheduled, isDateFixed, isTimeFixed, rejectionText, norm };
  if (typeof module !== 'undefined') module.exports = PA.Planner;
})(typeof window !== 'undefined' ? window : globalThis);
