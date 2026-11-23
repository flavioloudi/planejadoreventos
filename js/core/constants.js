/* Constantes de domínio: prioridades, status, categorias, impactos, etc. */
(function (root) {
  const PA = (root.PA = root.PA || {});

  const PRIORITIES = {
    baixa: { key: 'baixa', label: 'Baixa', rank: 1, weight: 1, color: '#64748b' },
    media: { key: 'media', label: 'Média', rank: 2, weight: 2, color: '#2563eb' },
    alta: { key: 'alta', label: 'Alta', rank: 3, weight: 4, color: '#d97706' },
    critica: { key: 'critica', label: 'Crítica', rank: 4, weight: 8, color: '#dc2626' },
  };

  const STATUSES = {
    proposta: { key: 'proposta', label: 'Proposta', color: '#64748b', group: 'pendente' },
    validacao: { key: 'validacao', label: 'Em validação', color: '#7c3aed', group: 'pendente' },
    aprovada: { key: 'aprovada', label: 'Aprovada', color: '#0891b2', group: 'aprovada' },
    aguardando: { key: 'aguardando', label: 'Aguardando programação', color: '#0d9488', group: 'aprovada' },
    programada: { key: 'programada', label: 'Programada', color: '#2563eb', group: 'ativa' },
    confirmada: { key: 'confirmada', label: 'Confirmada', color: '#16a34a', group: 'ativa' },
    andamento: { key: 'andamento', label: 'Em andamento', color: '#d97706', group: 'ativa' },
    concluida: { key: 'concluida', label: 'Concluída', color: '#475569', group: 'final' },
    cancelada: { key: 'cancelada', label: 'Cancelada', color: '#9ca3af', group: 'final' },
    reprogramar: { key: 'reprogramar', label: 'Reprogramação necessária', color: '#dc2626', group: 'ativa' },
  };
  // Status que ocupam agenda quando possuem data
  const ACTIVE_STATUSES = ['aprovada', 'aguardando', 'programada', 'confirmada', 'andamento', 'reprogramar', 'proposta', 'validacao'];
  const APPROVED_STATUSES = ['aprovada', 'aguardando', 'programada', 'confirmada', 'andamento', 'concluida'];

  const CATEGORIES = [
    { name: 'Reunião', color: '#2563eb' },
    { name: 'Treinamento', color: '#7c3aed' },
    { name: 'Evento', color: '#db2777' },
    { name: 'Projeto', color: '#0891b2' },
    { name: 'Institucional', color: '#0d9488' },
    { name: 'Ação social', color: '#16a34a' },
    { name: 'Comemoração', color: '#d97706' },
    { name: 'Outro', color: '#64748b' },
  ];

  const IMPACTS = {
    bloqueio: { key: 'bloqueio', label: 'Bloqueio total', short: 'Bloqueio', color: '#dc2626', desc: 'Não permite programação.' },
    restricao: { key: 'restricao', label: 'Restrição parcial', short: 'Restrição', color: '#d97706', desc: 'Permite programação com alerta.' },
    preferencial: { key: 'preferencial', label: 'Preferencial', short: 'Preferencial', color: '#16a34a', desc: 'Incentiva a programação nesta data.' },
    neutro: { key: 'neutro', label: 'Neutro', short: 'Neutro', color: '#64748b', desc: 'Apenas exibe no calendário.' },
  };

  const SCOPES = { nacional: 'Nacional', estadual: 'Estadual', municipal: 'Municipal', personalizada: 'Personalizada' };

  // Categorias de datas especiais; "holiday: true" => tratadas pela política de feriados.
  const SPECIAL_CATEGORIES = [
    { name: 'Feriado', holiday: true }, { name: 'Ponto facultativo', holiday: true }, { name: 'Feriado religioso', holiday: true },
    { name: 'Data comemorativa' }, { name: 'Data institucional' }, { name: 'Data temática' },
    { name: 'Vestibular' }, { name: 'ENEM' }, { name: 'Concurso público' }, { name: 'Semana de provas' },
    { name: 'Período de férias' }, { name: 'Congresso' }, { name: 'Evento institucional' }, { name: 'Festa local' },
    { name: 'Evento religioso' }, { name: 'Viagem' }, { name: 'Indisponibilidade' }, { name: 'Data que exige atenção' },
    { name: 'Evento que impacta o público-alvo' }, { name: 'Outro' },
  ];
  const isHolidayCategory = (c) => SPECIAL_CATEGORIES.some((x) => x.name === c && x.holiday);

  const RECURRENCES = { none: 'Não se repete', anual: 'Todo ano', mensal: 'Todo mês', semanal: 'Toda semana', personalizada: 'Personalizada' };
  const FLEX = { fixa: 'Fixa (sem flexibilidade)', flexivel: 'Flexível', muito_flexivel: 'Muito flexível' };
  const PERIODS = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };
  const MODES = {
    dia: { label: 'Por dia', desc: 'Organiza as atividades nos dias disponíveis, sem definir horário exato.' },
    horario: { label: 'Por horário', desc: 'Distribui as atividades ao longo do dia considerando duração e disponibilidade.' },
    hibrido: { label: 'Híbrida', desc: 'Atividades com horário fixo mantêm o horário; as demais são distribuídas apenas por dia.' },
    prioridade: { label: 'Por prioridade', desc: 'Distribui primeiro as críticas e de alta prioridade e preenche o restante com as flexíveis.' },
  };

  const UFS = {
    AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
    MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco',
    PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
    SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
  };

  function defaultSettings() {
    return {
      name: 'Meu planejamento',
      city: '',
      state: 'SP',
      year: new Date().getFullYear(),
      workDays: [1, 2, 3, 4, 5],
      startTime: '08:00',
      endTime: '18:00',
      shifts: {
        manha: { enabled: true, start: '08:00', end: '12:00' },
        tarde: { enabled: true, start: '13:30', end: '18:00' },
        noite: { enabled: false, start: '19:00', end: '22:00' },
      },
      defaultDuration: 60,
      minGap: 30,
      maxPerDay: 4,
      overloadWeek: 10,
      holidayPolicy: 'bloqueio', // bloqueio | restricao | ignorar
      specialPolicy: 'respeitar', // respeitar | alertar | ignorar
      allowParallel: false,
      preferences: { balance: true, avoidConsecutive: true, considerPreferred: true },
      categories: CATEGORIES.map((c) => ({ ...c })),
    };
  }

  PA.C = {
    PRIORITIES, STATUSES, ACTIVE_STATUSES, APPROVED_STATUSES, CATEGORIES, IMPACTS, SCOPES, SPECIAL_CATEGORIES, isHolidayCategory,
    RECURRENCES, FLEX, PERIODS, MODES, UFS, defaultSettings,
    prio: (k) => PRIORITIES[k] || PRIORITIES.media,
    status: (k) => STATUSES[k] || STATUSES.proposta,
  };
  if (typeof module !== 'undefined') module.exports = PA.C;
})(typeof window !== 'undefined' ? window : globalThis);
