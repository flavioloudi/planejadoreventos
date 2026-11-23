/* Dados de demonstração. Datas relativas à data atual para que o exemplo sempre fique útil. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  const D = PA.Dates;

  function build(name) {
    const p = PA.Store.newPlan(name || 'Planejamento Institucional', true);
    p.settings.city = 'São Paulo';
    p.settings.state = 'SP';
    p.settings.maxPerDay = 3;
    const today = D.today();
    // segunda-feira da próxima semana (ou a seguinte se hoje já for segunda)
    let mon = D.nextMonday(today);
    const w = (week, dow) => D.addDays(mon, week * 7 + (dow - 1)); // dow 1=seg ... 5=sex

    p.specials = [
      { id: 'esp_demo1', name: 'Recesso institucional', start: w(1, 4), end: w(1, 5), category: 'Indisponibilidade', scope: 'personalizada', impact: 'bloqueio', description: 'Instituição fechada para atividades externas.', rule: 'Não programar nada nesses dias.', recurrence: 'none', confirmed: true, needsReview: false },
      { id: 'esp_demo2', name: 'Semana de provas', start: w(2, 1), end: w(2, 5), category: 'Semana de provas', scope: 'personalizada', impact: 'restricao', description: 'Público-alvo envolvido com avaliações.', rule: 'Evitar atividades abertas ao público-alvo; permitir reuniões internas com alerta.', recurrence: 'none', confirmed: true, needsReview: false },
      { id: 'esp_demo3', name: 'Vestibular regional (data de exemplo)', start: w(3, 3), end: w(3, 3), category: 'Vestibular', scope: 'estadual', impact: 'restricao', description: 'Data ilustrativa. Substitua pela data oficial divulgada pela instituição organizadora.', rule: 'Evitar eventos com grande público.', recurrence: 'none', confirmed: false, needsReview: true },
      { id: 'esp_demo4', name: 'Aniversário da instituição', start: w(3, 5), end: w(3, 5), category: 'Data institucional', scope: 'personalizada', impact: 'preferencial', description: 'Boa data para ações institucionais e comemorativas.', rule: 'Priorizar eventos institucionais.', recurrence: 'anual', confirmed: true, needsReview: false },
      { id: 'esp_demo5', name: 'Congresso setorial (data de exemplo)', start: w(0, 3), end: w(0, 3), category: 'Congresso', scope: 'personalizada', impact: 'restricao', description: 'Parte da equipe estará fora.', rule: 'Programar apenas com alerta.', recurrence: 'none', confirmed: false, needsReview: true },
    ];

    const A = (o) => PA.Store.normalizeActivity(o);
    const h = (a) => { a.history = [{ at: new Date().toISOString(), action: 'Criação', detail: 'Dados de demonstração.' }]; return a; };
    const list = [
      // Atividades já programadas (algumas com conflitos propositais)
      { name: 'Reunião de alinhamento da diretoria', category: 'Reunião', responsible: 'Ana Souza', sector: 'Diretoria', priority: 'alta', duration: 90, status: 'confirmada', date: w(0, 1), startTime: '09:00', endTime: '10:30', locked: true, location: 'Sala de reuniões A', needsLocation: true, audience: 'Diretores', participants: 8 },
      { name: 'Treinamento de atendimento', category: 'Treinamento', responsible: 'Carlos Lima', sector: 'Operações', priority: 'media', duration: 180, status: 'programada', date: w(0, 2), startTime: '14:00', endTime: '17:00', location: 'Auditório', needsLocation: true, audience: 'Equipe de atendimento', participants: 40 },
      { name: 'Planejamento do semestre', category: 'Projeto', responsible: 'Carlos Lima', sector: 'Diretoria', priority: 'alta', duration: 120, status: 'programada', date: w(0, 2), startTime: '15:00', endTime: '17:00', location: 'Sala de reuniões A', needsLocation: true, notes: 'Mesmo responsável do treinamento, em horário sobreposto (conflito de demonstração).' },
      { name: 'Visita técnica ao parceiro', category: 'Projeto', responsible: 'Bruno Alves', sector: 'Comercial', priority: 'media', duration: 120, status: 'programada', date: w(0, 3), startTime: '09:00', endTime: '11:00' },
      { name: 'Oficina com coordenadores', category: 'Treinamento', responsible: 'Marina Costa', sector: 'Pedagógico', priority: 'media', duration: 120, status: 'programada', date: w(1, 4), startTime: '09:00', endTime: '11:00', location: 'Auditório', needsLocation: true, notes: 'Marcada em data bloqueada (recesso): use "Resolver" para ver alternativas.' },
      { name: 'Campanha de doação de alimentos', category: 'Ação social', responsible: 'Paula Mendes', sector: 'Responsabilidade social', priority: 'media', duration: 240, status: 'programada', date: w(1, 2), startTime: '08:30', endTime: '12:30', audience: 'Comunidade', participants: 120, location: 'Pátio central', needsLocation: true },
      { name: 'Reunião de acompanhamento', category: 'Reunião', responsible: 'Carlos Lima', sector: 'Operações', priority: 'baixa', duration: 60, status: 'programada', date: w(1, 2), startTime: '09:00', endTime: '10:00', location: 'Pátio central', needsLocation: true, notes: 'Mesmo local da campanha, em horário sobreposto (conflito de demonstração).' },
      // Propostas aguardando programação
      { name: 'Reunião com os coordenadores', category: 'Reunião', responsible: 'Marina Costa', sector: 'Pedagógico', priority: 'alta', duration: 120, status: 'aprovada', preferredPeriod: 'manha', minDate: w(1, 1), deadline: w(1, 5), audience: 'Coordenadores', participants: 12, location: 'Sala de reuniões A', needsLocation: true },
      { name: 'Workshop de liderança', category: 'Treinamento', responsible: 'Carlos Lima', sector: 'Recursos humanos', priority: 'alta', duration: 240, status: 'aprovada', preferredPeriod: 'tarde', minDate: w(1, 1), deadline: w(3, 5), audience: 'Gestores', participants: 25, location: 'Auditório', needsLocation: true, resources: 'Projetor, apostilas' },
      { name: 'Cerimônia de premiação', category: 'Evento', responsible: 'Ana Souza', sector: 'Diretoria', priority: 'critica', duration: 150, status: 'aprovada', preferredDate: w(3, 5), dateFlex: 'fixa', minDate: w(3, 1), deadline: w(3, 5), audience: 'Todos os colaboradores', participants: 200, location: 'Auditório', needsLocation: true, preferredPeriod: 'tarde', resources: 'Som, palco, buffet' },
      { name: 'Feira de profissões', category: 'Evento', responsible: 'Paula Mendes', sector: 'Orientação', priority: 'alta', duration: 300, status: 'aprovada', preferredDate: w(2, 3), minDate: w(2, 1), deadline: w(4, 5), audience: 'Estudantes', participants: 300, preferredPeriod: 'manha', location: 'Pátio central', needsLocation: true },
      { name: 'Apresentação de resultados trimestrais', category: 'Institucional', responsible: 'Bruno Alves', sector: 'Comercial', priority: 'alta', duration: 90, status: 'aguardando', preferredDate: w(2, 2), deadline: w(3, 5), preferredTime: '10:00', timeFlex: 'fixa', audience: 'Diretoria', participants: 15 },
      { name: 'Treinamento de segurança da informação', category: 'Treinamento', responsible: 'Rafael Dias', sector: 'TI', priority: 'media', duration: 120, status: 'aprovada', minDate: w(1, 1), deadline: w(4, 5), audience: 'Todos os setores', participants: 60, location: 'Auditório', needsLocation: true },
      { name: 'Revisão do plano de comunicação', category: 'Projeto', responsible: 'Marina Costa', sector: 'Comunicação', priority: 'media', duration: 60, status: 'proposta', minDate: w(1, 1), deadline: w(3, 5) },
      { name: 'Confraternização de fim de ciclo', category: 'Comemoração', responsible: 'Paula Mendes', sector: 'Recursos humanos', priority: 'baixa', duration: 180, status: 'proposta', preferredDate: w(4, 5), minDate: w(3, 1), deadline: w(4, 5), preferredPeriod: 'tarde', participants: 80 },
      { name: 'Mutirão de manutenção dos laboratórios', category: 'Projeto', responsible: 'Rafael Dias', sector: 'TI', priority: 'media', status: 'proposta', notes: 'Duração ainda não definida.' },
      { name: 'Palestra sobre saúde e bem-estar', category: 'Evento', responsible: 'Paula Mendes', sector: 'Recursos humanos', priority: 'baixa', duration: 90, status: 'validacao', preferredDate: w(1, 5), minDate: w(1, 1), deadline: w(1, 5), audience: 'Colaboradores', participants: 50, preferredPeriod: 'manha' },
      { name: 'Reunião extraordinária urgente', category: 'Reunião', responsible: 'Ana Souza', sector: 'Diretoria', priority: 'critica', duration: 60, status: 'aprovada', minDate: w(0, 1), deadline: w(0, 3), preferredPeriod: 'manha', dateFlex: 'flexivel' },
    ];
    p.activities = list.map((o) => h(A(o)));
    p.activities.forEach((a, i) => { a.id = 'atv_demo' + (i + 1); });
    return p;
  }
  PA.Demo = { build };
  if (typeof module !== 'undefined') module.exports = PA.Demo;
})(typeof window !== 'undefined' ? window : globalThis);
