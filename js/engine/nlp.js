/* Entrada rápida: interpreta uma proposta em linguagem natural (pt-BR) e devolve campos para revisão. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  const D = PA.Dates, C = PA.C;

  const strip = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const NUMS = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, meia: 0.5, meio: 0.5 };
  const MONTHS = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const DOWS = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
  const ORD = { primeira: 1, segunda: 2, terceira: 3, quarta: 4, quinta: 5, ultima: -1 };

  function num(w) { if (w == null) return null; if (/^\d+([.,]\d+)?$/.test(w)) return parseFloat(w.replace(',', '.')); return NUMS[w] != null ? NUMS[w] : null; }

  function parse(text, ref) {
    const today = ref || D.today();
    const t = strip(text || '');
    const found = []; const out = { fields: {}, notes: [], confidence: {} };
    const set = (k, v, why) => { out.fields[k] = v; out.confidence[k] = why; };

    // Duração
    let m = t.match(/(\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito)\s*(?:horas?|h)\s*e\s*(meia|\d+\s*min\w*)/);
    if (m) { const h = num(m[1]); const mm = m[2] === 'meia' ? 30 : parseInt(m[2], 10); set('duration', Math.round(h * 60 + mm), 'Duração: "' + m[0] + '"'); }
    if (!out.fields.duration) { m = t.match(/(\d+(?:[.,]\d+)?|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|meia|meio)\s*(?:horas?|hrs?|h)\b(?:\s*e\s*meia)?/); if (m) { let h = num(m[1]); if (/e meia/.test(m[0])) h += 0.5; if (h) set('duration', Math.round(h * 60), 'Duração: "' + m[0].trim() + '"'); } }
    if (!out.fields.duration) { m = t.match(/(\d+)\s*(?:min|minutos)/); if (m) set('duration', parseInt(m[1], 10), 'Duração: "' + m[0] + '"'); }
    if (!out.fields.duration) { m = t.match(/(?:o\s+)?dia\s+inteiro|dia todo/); if (m) set('duration', 480, 'Duração: dia inteiro (8h)'); }
    if (!out.fields.duration) { m = t.match(/meio\s+periodo|meio\s+turno/); if (m) set('duration', 240, 'Duração: meio período (4h)'); }

    // Período
    if (/\bpela manha\b|\bde manha\b|\bmanha\b/.test(t)) set('preferredPeriod', 'manha', 'Período: manhã');
    else if (/\bpela tarde\b|\bde tarde\b|\btarde\b/.test(t)) set('preferredPeriod', 'tarde', 'Período: tarde');
    else if (/\bpela noite\b|\bnoite\b|\bnoturno\b/.test(t)) set('preferredPeriod', 'noite', 'Período: noite');

    // Horário
    m = t.match(/\bas\s*(\d{1,2})\s*(?:h|:)\s*(\d{2})?\b/) || t.match(/\b(\d{1,2})[h:](\d{2})?\b(?!\s*(?:min|horas))/);
    if (m && !/\b(\d+)\s*horas?\b/.test(m[0])) { const hh = parseInt(m[1], 10); if (hh >= 5 && hh <= 23) set('preferredTime', D.pad(hh) + ':' + (m[2] || '00'), 'Horário: "' + m[0].trim() + '"'); }

    // Prioridade
    if (/\bcritic[ao]\b|\burgentissim|\bimprescind/.test(t)) set('priority', 'critica', 'Prioridade: crítica');
    else if (/\balta prioridade\b|\bprioridade alta\b|\bimportante\b|\burgente\b/.test(t)) set('priority', 'alta', 'Prioridade: alta');
    else if (/\bbaixa prioridade\b|\bprioridade baixa\b/.test(t)) set('priority', 'baixa', 'Prioridade: baixa');
    else if (/\bmedia prioridade\b|\bprioridade media\b/.test(t)) set('priority', 'media', 'Prioridade: média');

    // Flexibilidade
    if (/\bdata fixa\b|\bnao pode mudar\b|\bsem flexibilidade\b|\bobrigatoriamente\b/.test(t)) set('dateFlex', 'fixa', 'Data fixa');
    else if (/\bflexivel\b|\bqualquer dia\b/.test(t)) set('dateFlex', 'flexivel', 'Data flexível');

    // Datas
    const yearOf = (mi, d) => { const y = Number(today.slice(0, 4)); const c = y + '-' + D.pad(mi + 1) + '-' + D.pad(d); return c < D.addDays(today, -30) ? (y + 1) + '-' + D.pad(mi + 1) + '-' + D.pad(d) : c; };
    const dateRe = new RegExp('(?:dia\\s+)?(\\d{1,2})\\s*(?:de\\s+)?(' + MONTHS.join('|') + ')(?:\\s*(?:de\\s+)?(\\d{4}))?');
    const numeric = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);

    const weekM = t.match(new RegExp('\\b(primeira|segunda|terceira|quarta|quinta|ultima)\\s+semana\\s+(?:de|do mes de)\\s+(' + MONTHS.join('|') + ')'));
    const ordWeek = t.match(/\bproxima semana\b/), thisWeek = t.match(/\best[ae] semana\b/);
    const dow = t.match(new RegExp('\\b(?:na\\s+|no\\s+|em\\s+|proxim[ao]\\s+|uma\\s+)?(' + Object.keys(DOWS).join('|') + ')(?:-feira)?\\b(?!\\s+semana)'));
    const inDays = t.match(/\b(?:em|daqui a)\s+(\d+)\s+(dias?|semanas?)\b/);
    const ate = t.match(new RegExp('\\b(?:ate|antes d[eo])\\s+(?:o\\s+dia\\s+)?(?:dia\\s+)?(\\d{1,2})\\s*(?:de\\s+)?(' + MONTHS.join('|') + ')'));
    const ateNum = t.match(/\b(?:ate|antes d[eo])\s+(?:o\s+dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    const monthOnly = t.match(new RegExp('\\b(?:durante|em|no mes de|ao longo de|ate o fim de|ate o final de)\\s+(' + MONTHS.join('|') + ')\\b'));
    const between = t.match(new RegExp('\\bentre\\s+(?:os\\s+dias\\s+)?(?:dia\\s+)?(\\d{1,2})\\s*(?:de\\s+' + '(' + MONTHS.join('|') + ')\\s*)?(?:e|a)\\s+(?:dia\\s+)?(\\d{1,2})\\s*(?:de\\s+)?(' + MONTHS.join('|') + ')'));

    if (weekM) {
      const mi = MONTHS.indexOf(weekM[2]); const n = ORD[weekM[1]]; const y = Number(yearOf(mi, 1).slice(0, 4));
      const wk = D.weekOfMonth(y, mi + 1, n); const from = wk.from, to = wk.to;
      set('minDate', from, 'Período: ' + weekM[1] + ' semana de ' + weekM[2]); set('deadline', to, 'Período: ' + weekM[1] + ' semana de ' + weekM[2]);
    } else if (between) {
      const mi2 = MONTHS.indexOf(between[4]), mi1 = between[2] ? MONTHS.indexOf(between[2]) : mi2;
      set('minDate', yearOf(mi1, parseInt(between[1], 10)), 'Período: "' + between[0] + '"'); set('deadline', yearOf(mi2, parseInt(between[3], 10)), 'Período: "' + between[0] + '"');
    } else if (ate || ateNum) {
      let dl;
      if (ate) dl = yearOf(MONTHS.indexOf(ate[2]), parseInt(ate[1], 10)); else { const y = ateNum[3] ? (ateNum[3].length === 2 ? '20' + ateNum[3] : ateNum[3]) : null; dl = y ? y + '-' + D.pad(ateNum[2]) + '-' + D.pad(ateNum[1]) : yearOf(parseInt(ateNum[2], 10) - 1, parseInt(ateNum[1], 10)); }
      set('deadline', dl, 'Data limite: "' + (ate || ateNum)[0] + '"');
    } else if (dateRe.test(t) || numeric) {
      let d;
      const dm = t.match(dateRe);
      if (dm) d = dm[3] ? dm[3] + '-' + D.pad(MONTHS.indexOf(dm[2]) + 1) + '-' + D.pad(dm[1]) : yearOf(MONTHS.indexOf(dm[2]), parseInt(dm[1], 10));
      else { const y = numeric[3] ? (numeric[3].length === 2 ? '20' + numeric[3] : numeric[3]) : null; d = y ? y + '-' + D.pad(numeric[2]) + '-' + D.pad(numeric[1]) : yearOf(parseInt(numeric[2], 10) - 1, parseInt(numeric[1], 10)); }
      set('preferredDate', d, 'Data preferencial: ' + D.br(d)); set('minDate', d, 'Data inicial'); set('deadline', d, 'Data limite');
      if (!out.fields.dateFlex) set('dateFlex', 'fixa', 'Data única informada: tratada como fixa (altere se for flexível)');
    } else if (monthOnly) {
      const mi = MONTHS.indexOf(monthOnly[1]); const first = yearOf(mi, 1); set('minDate', first, 'Período: ' + monthOnly[1]); set('deadline', D.endOfMonth(first), 'Período: ' + monthOnly[1]);
    } else if (ordWeek) {
      const mon = D.nextMonday(today); set('minDate', mon, 'Período: próxima semana'); set('deadline', D.addDays(mon, 6), 'Período: próxima semana');
    } else if (thisWeek) {
      set('minDate', today, 'Período: esta semana'); set('deadline', D.addDays(D.startOfWeek(today), 6), 'Período: esta semana');
    } else if (inDays) {
      const n = parseInt(inDays[1], 10) * (/semana/.test(inDays[2]) ? 7 : 1); const d = D.addDays(today, n); set('preferredDate', d, 'Em ' + inDays[1] + ' ' + inDays[2]); set('minDate', D.addDays(d, -3), 'Janela de ±3 dias'); set('deadline', D.addDays(d, 3), 'Janela de ±3 dias');
    } else if (dow) {
      let d = D.addDays(today, 1); while (D.weekday(d) !== DOWS[dow[1]]) d = D.addDays(d, 1);
      set('preferredDate', d, 'Próxima ' + dow[1] + ': ' + D.br(d)); set('minDate', d, 'Data inicial'); set('deadline', d, 'Data limite');
    }

    // Categoria
    const catRules = [['Reunião', /reuniao|alinhamento|encontro/], ['Treinamento', /treinamento|capacitacao|workshop|oficina|curso|formacao/], ['Evento', /evento|palestra|feira|cerimonia|seminario|congresso|show|festival/], ['Projeto', /projeto|planejamento|visita tecnica|mutirao/], ['Ação social', /doacao|campanha|solidari|acao social|voluntar/], ['Comemoração', /confraternizacao|festa|comemoracao|aniversario/], ['Institucional', /institucional|resultados|apresentacao|prestacao de contas/]];
    for (let i = 0; i < catRules.length; i++) if (catRules[i][1].test(t)) { set('category', catRules[i][0], 'Categoria inferida pelo termo "' + (t.match(catRules[i][1]) || [''])[0] + '"'); break; }

    // Participantes
    m = t.match(/(\d{1,5})\s*(?:participantes|pessoas|convidados|alunos|colaboradores|inscritos)/); if (m) set('participants', parseInt(m[1], 10), 'Participantes: ' + m[1]);

    // Público-alvo
    m = text.match(/\bcom\s+(?:os|as|todos os|todas as)\s+([\wÀ-ÿ ]{3,40}?)(?=[,.;]|\s+(?:durante|na|no|em|pela|pelo|com|para|ate|de manh|de tard|entre)|$)/i);
    if (m) set('audience', m[1].trim().replace(/^./, (c) => c.toUpperCase()), 'Público-alvo: "' + m[0].trim() + '"');
    m = text.match(/\bpara\s+(?:os|as|todos os|todas as)\s+([\wÀ-ÿ ]{3,40}?)(?=[,.;]|\s+(?:durante|na|no|em|pela|pelo|com|ate|de manh|de tard|entre)|$)/i);
    if (m && !out.fields.audience) set('audience', m[1].trim().replace(/^./, (c) => c.toUpperCase()), 'Público-alvo: "' + m[0].trim() + '"');

    // Local
    m = text.match(/\b(?:no|na|em)\s+(auditorio|auditório|sala\s+[\wÀ-ÿ]+|pat[ií]o\s*[\wÀ-ÿ]*|laborat[óo]rio\s*[\wÀ-ÿ]*|biblioteca|quadra|refeit[óo]rio)\b/i);
    if (m) { set('location', m[1].replace(/^./, (c) => c.toUpperCase()), 'Local: "' + m[0] + '"'); set('needsLocation', true, 'Local mencionado'); }

    // Responsável
    m = text.match(/\b(?:respons[áa]vel(?:\s+(?:sera|é|e))?|coordenad[oa] por|organizad[oa] por|a cargo d[eao])\s*:?\s+([A-ZÀ-Ý][\wÀ-ÿ]+(?:\s+[A-ZÀ-Ý][\wÀ-ÿ]+)?)/);
    if (m) set('responsible', m[1], 'Responsável: "' + m[0].trim() + '"');

    // Nome: remove o verbo inicial e corta no primeiro complemento temporal
    let name = (text || '').trim().replace(/^["“]|["”]$/g, '');
    name = name.replace(/^(?:preciso|precisamos|quero|queremos|gostaria de|vamos|devemos|e preciso|é preciso)\s+/i, '').replace(/^(?:de\s+)?(?:realizar|fazer|organizar|promover|agendar|marcar|programar|criar|planejar)\s+(?:uma|um|a|o)?\s*/i, '');
    name = name.split(/\s+(?:durante|na\s+\w+\s+semana|em\s+(?:\d|\w+\s+de\s+\w+|janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)|entre|ate|até|pela\s+(?:manh|tard|noit)|de\s+manh|de\s+tard|com\s+dura|por\s+\d|no\s+dia|dia\s+\d|na\s+(?:segunda|terca|terça|quarta|quinta|sexta)|na\s+pr[óo]xima|nesta|nesse|prefer)/i)[0];
    name = name.replace(/[,.;:\s]+$/, '').trim();
    if (name) { name = name.replace(/^./, (c) => c.toUpperCase()); set('name', name.length > 80 ? name.slice(0, 80) : name, 'Nome extraído do início da frase'); }

    if (!out.fields.category && out.fields.name) { const s2 = strip(out.fields.name); for (let i = 0; i < catRules.length; i++) if (catRules[i][1].test(s2)) { set('category', catRules[i][0], 'Categoria inferida do nome'); break; } }
    if (!out.fields.duration) out.notes.push('Duração não identificada: será usada a duração padrão se você não informar.');
    if (!out.fields.minDate && !out.fields.preferredDate && !out.fields.deadline) out.notes.push('Nenhum período identificado: informe datas para melhorar a programação.');
    out.found = Object.keys(out.fields).length;
    void found;
    return out;
  }

  PA.NLP = { parse };
  if (typeof module !== 'undefined') module.exports = PA.NLP;
})(typeof window !== 'undefined' ? window : globalThis);
