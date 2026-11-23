/* Camada de dados. Todo acesso ao armazenamento passa pelo adaptador (hoje localStorage),
   o que permite trocar por uma API/banco online e múltiplos usuários no futuro. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  const D = PA.Dates, C = PA.C;
  const KEY = 'planejador-inteligente:v1';

  const LocalAdapter = {
    load() { try { const raw = root.localStorage && root.localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } },
    save(state) { try { root.localStorage && root.localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } },
    clear() { try { root.localStorage && root.localStorage.removeItem(KEY); } catch (e) { /* noop */ } },
  };
  const MemoryAdapter = (function () { let s = null; return { load: () => s && JSON.parse(JSON.stringify(s)), save: (x) => { s = JSON.parse(JSON.stringify(x)); return true; }, clear: () => { s = null; } }; })();

  let adapter = root.localStorage ? LocalAdapter : MemoryAdapter;
  let state = null;
  const listeners = [];

  function newPlan(name, withDemo) {
    const settings = C.defaultSettings();
    if (name) settings.name = name;
    return { id: D.uid('plano'), createdAt: new Date().toISOString(), settings, activities: [], specials: [], disabledBuiltins: [], conflictExceptions: [], history: [], demo: !!withDemo };
  }

  function normalizeActivity(a) {
    return Object.assign({
      id: D.uid('atv'), name: '', description: '', category: 'Outro', responsible: '', sector: '', audience: '', participants: null,
      priority: 'media', preferredDate: '', minDate: '', deadline: '', duration: null, preferredTime: '', preferredPeriod: '',
      needsLocation: false, location: '', resources: '', notes: '', dateFlex: 'flexivel', timeFlex: 'flexivel',
      status: 'proposta', date: '', startTime: '', endTime: '', locked: false, history: [], createdAt: new Date().toISOString(),
    }, a);
  }

  function ensureState() {
    if (state) return state;
    state = adapter.load();
    if (!state || !state.plans || !state.plans.length) {
      const p = PA.Demo ? PA.Demo.build() : newPlan('Meu planejamento');
      state = { version: 1, currentId: p.id, plans: [p] };
      persist();
    }
    let renamed = false;
    state.plans.forEach((p) => { if (p.settings && p.settings.name === 'Planejamento institucional (demonstração)') { p.settings.name = 'Planejamento Institucional'; renamed = true; } });
    if (renamed) persist();
    if (!state.plans.some((p) => p.id === state.currentId)) state.currentId = state.plans[0].id;
    return state;
  }

  function persist() { adapter.save(state); }
  function emit(kind) { listeners.slice().forEach((fn) => { try { fn(kind); } catch (e) { console.error(e); } }); }
  function commit(kind) { persist(); emit(kind || 'data'); }

  const Store = {
    KEY, newPlan, normalizeActivity,
    setAdapter(a) { adapter = a; state = null; },
    reset() { state = null; },
    subscribe(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    state() { return ensureState(); },
    plans() { return ensureState().plans; },
    plan() { const s = ensureState(); return s.plans.find((p) => p.id === s.currentId); },
    setCurrent(id) { ensureState().currentId = id; commit('plan'); },
    addPlan(name, withDemo) { const s = ensureState(); const p = withDemo && PA.Demo ? PA.Demo.build(name) : newPlan(name); s.plans.push(p); s.currentId = p.id; commit('plan'); return p; },
    removePlan(id) {
      const s = ensureState(); if (s.plans.length <= 1) return false;
      s.plans = s.plans.filter((p) => p.id !== id); if (s.currentId === id) s.currentId = s.plans[0].id; commit('plan'); return true;
    },
    resetCurrentToDemo() {
      const s = ensureState(); const cur = Store.plan(); const p = PA.Demo.build(cur.settings.name); p.id = cur.id;
      s.plans = s.plans.map((x) => (x.id === cur.id ? p : x)); commit('plan');
    },
    clearAllData() { adapter.clear(); state = null; ensureState(); emit('plan'); },
    exportJSON() { return JSON.stringify(ensureState(), null, 2); },
    importJSON(text) {
      const obj = JSON.parse(text);
      if (!obj || !Array.isArray(obj.plans) || !obj.plans.length) throw new Error('Arquivo inválido: nenhum planejamento encontrado.');
      state = obj; if (!state.currentId) state.currentId = obj.plans[0].id; commit('plan');
    },

    // ---- Planejamento
    updateSettings(patch) { const p = Store.plan(); p.settings = Object.assign({}, p.settings, patch); commit('settings'); },

    // ---- Atividades
    activity(id) { return Store.plan().activities.find((a) => a.id === id); },
    log(a, action, detail) { a.history = a.history || []; a.history.unshift({ at: new Date().toISOString(), action, detail: detail || '' }); },
    addActivity(data, opts) {
      const a = normalizeActivity(data);
      Store.log(a, 'Criação', (opts && opts.note) || 'Atividade cadastrada.');
      Store.plan().activities.push(a); commit('activity'); return a;
    },
    updateActivity(id, patch, action, silent) {
      const a = Store.activity(id); if (!a) return null;
      const changes = [];
      Object.keys(patch).forEach((k) => {
        if (k === 'history' || k === 'id') return;
        const before = a[k] == null ? '' : a[k], after = patch[k] == null ? '' : patch[k];
        if (JSON.stringify(before) !== JSON.stringify(after)) { changes.push(Store.fieldLabel(k) + ': ' + Store.fmt(k, before) + ' → ' + Store.fmt(k, after)); a[k] = patch[k]; }
      });
      if (changes.length) Store.log(a, action || 'Edição', changes.join('; '));
      if (!silent) commit('activity'); else persist();
      return a;
    },
    removeActivity(id) { const p = Store.plan(); p.activities = p.activities.filter((a) => a.id !== id); commit('activity'); },
    duplicateActivity(id) {
      const a = Store.activity(id); if (!a) return null;
      const c = normalizeActivity(Object.assign({}, JSON.parse(JSON.stringify(a)), { id: D.uid('atv'), name: a.name + ' (cópia)', status: 'proposta', date: '', startTime: '', endTime: '', locked: false, history: [], createdAt: new Date().toISOString() }));
      Store.log(c, 'Duplicação', 'Criada a partir de "' + a.name + '".');
      Store.plan().activities.push(c); commit('activity'); return c;
    },
    addNote(id, text) { const a = Store.activity(id); if (!a) return; Store.log(a, 'Observação', text); commit('activity'); },
    setStatus(id, status, note) {
      const a = Store.activity(id); if (!a) return; const before = a.status; a.status = status;
      Store.log(a, 'Status', C.status(before).label + ' → ' + C.status(status).label + (note ? ' (' + note + ')' : '')); commit('activity');
    },
    unschedule(id, why) {
      const a = Store.activity(id); if (!a) return;
      Store.log(a, 'Remoção da programação', (why || '') + (a.date ? ' Era: ' + D.br(a.date) + (a.startTime ? ' ' + a.startTime : '') : ''));
      a.date = ''; a.startTime = ''; a.endTime = ''; if (['programada', 'confirmada', 'andamento', 'reprogramar'].indexOf(a.status) >= 0) a.status = 'aguardando'; commit('activity');
    },
    // Aplica uma lista [{activityId,date,startTime,endTime,note}] — somente após aprovação do usuário.
    applyAssignments(list, action) {
      list.forEach((x) => {
        const a = Store.activity(x.activityId); if (!a) return;
        const before = a.date ? D.br(a.date) + (a.startTime ? ' ' + a.startTime : '') : 'sem data';
        a.date = x.date; a.startTime = x.startTime || ''; a.endTime = x.endTime || '';
        if (['proposta', 'validacao', 'aprovada', 'aguardando', 'reprogramar'].indexOf(a.status) >= 0) a.status = 'programada';
        Store.log(a, action || 'Programação', before + ' → ' + D.br(x.date) + (x.startTime ? ' ' + x.startTime + '–' + x.endTime : '') + (x.note ? '. ' + x.note : ''));
      });
      commit('activity');
    },

    // ---- Datas especiais
    special(id) { return Store.plan().specials.find((s) => s.id === id); },
    saveSpecial(data) {
      const p = Store.plan();
      if (data.id) { const i = p.specials.findIndex((s) => s.id === data.id); if (i >= 0) p.specials[i] = Object.assign({}, p.specials[i], data); }
      else p.specials.push(Object.assign({ id: D.uid('esp'), confirmed: true, needsReview: false, createdAt: new Date().toISOString() }, data));
      commit('special');
    },
    removeSpecial(id) { const p = Store.plan(); p.specials = p.specials.filter((s) => s.id !== id); commit('special'); },
    toggleBuiltin(key) {
      const p = Store.plan(); const i = p.disabledBuiltins.indexOf(key);
      if (i >= 0) p.disabledBuiltins.splice(i, 1); else p.disabledBuiltins.push(key); commit('special');
    },
    // Marca uma data embutida como confirmada pelo usuário (cria cópia manual editável e desativa a original)
    confirmBuiltin(occ) {
      const p = Store.plan();
      Store.saveSpecial({ name: occ.name, start: occ.start, end: occ.end, category: occ.category, scope: occ.scope, impact: occ.impact, description: occ.description, rule: occ.rule, recurrence: 'anual', confirmed: true, needsReview: false });
      if (p.disabledBuiltins.indexOf(occ.key) < 0) p.disabledBuiltins.push(occ.key);
      commit('special');
    },

    // ---- Exceções de conflito
    setConflictException(key, mode, note) {
      const p = Store.plan(); p.conflictExceptions = (p.conflictExceptions || []).filter((e) => e.key !== key);
      if (mode) p.conflictExceptions.push({ key, mode, note: note || '', at: new Date().toISOString() }); commit('conflict');
    },

    // ---- Rótulos para histórico
    fieldLabel(k) {
      const m = { name: 'Nome', description: 'Descrição', category: 'Categoria', responsible: 'Responsável', sector: 'Setor', audience: 'Público-alvo', participants: 'Participantes', priority: 'Prioridade', preferredDate: 'Data preferencial', minDate: 'Data inicial', deadline: 'Data limite', duration: 'Duração', preferredTime: 'Horário preferencial', preferredPeriod: 'Período', needsLocation: 'Exige local', location: 'Local', resources: 'Recursos', notes: 'Observações', dateFlex: 'Flexibilidade de data', timeFlex: 'Flexibilidade de horário', status: 'Status', date: 'Data', startTime: 'Início', endTime: 'Fim', locked: 'Atividade fixa' };
      return m[k] || k;
    },
    fmt(k, v) {
      if (v === '' || v == null) return '—';
      if (k === 'priority') return C.prio(v).label;
      if (k === 'status') return C.status(v).label;
      if (k === 'duration') return D.durLabel(v);
      if (k === 'date' || k === 'preferredDate' || k === 'minDate' || k === 'deadline') return D.br(v);
      if (typeof v === 'boolean') return v ? 'sim' : 'não';
      return String(v);
    },
  };
  PA.Store = Store;
  if (typeof module !== 'undefined') module.exports = Store;
})(typeof window !== 'undefined' ? window : globalThis);
