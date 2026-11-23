/* Configurações do planejamento atual e gestão de múltiplos planejamentos. */
(function (root) {
  const PA = (root.PA = root.PA || {});
  PA.Pages = PA.Pages || {};
  const C = PA.C, UI = PA.UI, Store = PA.Store;
  const D = PA.Dates, esc = UI.esc, icon = UI.icon;

  PA.Pages.settings = {
    title: 'Configurações', subtitle: 'Planejamento, calendário e regras',
    render(view) {
      const plan = Store.plan(), S = plan.settings;
      const inp = (n, t, v, x) => '<input type="' + t + '" name="' + n + '" value="' + esc(v == null ? '' : v) + '" ' + (x || '') + '>';
      const shift = (k) => '<div class="row wrap"><label class="check" style="min-width:90px"><input type="checkbox" name="sh_' + k + '" ' + (S.shifts[k].enabled ? 'checked' : '') + '> ' + C.PERIODS[k] + '</label><input type="time" name="sh_' + k + '_s" value="' + S.shifts[k].start + '" style="width:120px"><span>às</span><input type="time" name="sh_' + k + '_e" value="' + S.shifts[k].end + '" style="width:120px"></div>';
      view.innerHTML =
        '<div class="page-head"><div><h1>Configurações</h1><p>Ajustes do planejamento atual: <b>' + esc(S.name) + '</b>.</p></div></div>' +
        '<form id="setform" novalidate><div class="grid g2" style="align-items:start"><div class="col" style="gap:16px">' +
        '<div class="card"><div class="card-h"><h2>Planejamento e localização</h2></div><div class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">' +
        UI.field('Nome do planejamento', inp('name', 'text', S.name, 'maxlength="80"'), { cls: 's2', req: true, name: 'name' }) +
        UI.field('Município', inp('city', 'text', S.city, 'placeholder="Ex.: Campinas"'), { name: 'city', hint: 'Usado para identificar feriados locais.' }) +
        UI.field('Estado', '<select name="state">' + UI.opts(Object.keys(C.UFS).reduce((m, k) => { m[k] = k + ' — ' + C.UFS[k]; return m; }, {}), S.state) + '</select>', { name: 'state' }) +
        UI.field('Ano de referência', inp('year', 'number', S.year, 'min="2000" max="2100"'), { name: 'year' }) + '</div>' +
        '<div class="notice info mt">' + icon('info') + '<div>Feriados municipais não possuem base confiável embutida. Cadastre-os em <a href="#/datas">Datas especiais</a> com abrangência "Municipal".</div></div></div>' +
        '<div class="card"><div class="card-h"><h2>Funcionamento</h2></div><div class="col"><div><div class="lbl-txt" style="margin-bottom:6px">Dias de funcionamento</div><div class="chips">' + [1, 2, 3, 4, 5, 6, 0].map((d) => '<label class="chip-btn ' + (S.workDays.indexOf(d) >= 0 ? 'on' : '') + '" style="cursor:pointer"><input type="checkbox" name="wd" value="' + d + '" ' + (S.workDays.indexOf(d) >= 0 ? 'checked' : '') + ' style="display:none">' + D.WEEKDAYS_SHORT[d] + '</label>').join('') + '</div></div>' +
        '<div class="grid g2" style="gap:10px">' + UI.field('Horário padrão: início', inp('startTime', 'time', S.startTime), { name: 'startTime' }) + UI.field('Horário padrão: fim', inp('endTime', 'time', S.endTime), { name: 'endTime' }) + '</div>' +
        '<div><div class="lbl-txt" style="margin-bottom:6px">Turnos</div><div class="col" style="gap:6px">' + shift('manha') + shift('tarde') + shift('noite') + '</div><div class="err small" id="shift-err" style="color:var(--danger);display:none"></div></div></div></div>' +
        '</div><div class="col" style="gap:16px">' +
        '<div class="card"><div class="card-h"><h2>Regras de programação</h2></div><div class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">' +
        UI.field('Duração padrão (min)', inp('defaultDuration', 'number', S.defaultDuration, 'min="5" step="5"'), { name: 'defaultDuration' }) + UI.field('Intervalo mínimo (min)', inp('minGap', 'number', S.minGap, 'min="0" step="5"'), { name: 'minGap' }) +
        UI.field('Limite de atividades por dia', inp('maxPerDay', 'number', S.maxPerDay, 'min="1"'), { name: 'maxPerDay' }) + UI.field('Alerta de carga por semana', inp('overloadWeek', 'number', S.overloadWeek, 'min="1"'), { name: 'overloadWeek', hint: 'Acima disso a semana é considerada sobrecarregada.' }) +
        UI.field('Regra para feriados', '<select name="holidayPolicy">' + UI.opts({ bloqueio: 'Bloquear programação', restricao: 'Permitir com alerta', ignorar: 'Ignorar feriados' }, S.holidayPolicy) + '</select>', { name: 'holidayPolicy' }) +
        UI.field('Regra para datas especiais', '<select name="specialPolicy">' + UI.opts({ respeitar: 'Respeitar o impacto de cada data', alertar: 'Bloqueios viram alertas', ignorar: 'Ignorar datas especiais' }, S.specialPolicy) + '</select>', { name: 'specialPolicy' }) +
        '<div class="s2 col" style="gap:8px"><label class="check"><input type="checkbox" name="balance" ' + (S.preferences.balance ? 'checked' : '') + '> Preferir distribuição equilibrada</label><label class="check"><input type="checkbox" name="avoidConsecutive" ' + (S.preferences.avoidConsecutive ? 'checked' : '') + '> Evitar atividades consecutivas</label><label class="check"><input type="checkbox" name="considerPreferred" ' + (S.preferences.considerPreferred ? 'checked' : '') + '> Considerar datas preferenciais</label><label class="check"><input type="checkbox" name="allowParallel" ' + (S.allowParallel ? 'checked' : '') + '> Permitir atividades simultâneas (com responsáveis/locais diferentes)</label></div></div></div>' +
        '<div class="card"><div class="card-h"><h2>Categorias e cores</h2></div><div class="col" style="gap:8px" id="cats">' + (S.categories || C.CATEGORIES).map((c, i) => '<div class="row" data-cat="' + i + '"><input type="color" data-ccolor value="' + c.color + '"><input type="text" data-cname value="' + esc(c.name) + '" maxlength="40"><button type="button" class="btn ghost icon" data-delcat="' + i + '" title="Remover">' + icon('trash') + '</button></div>').join('') + '</div><button type="button" class="btn sm mt-s" data-addcat>' + icon('plus') + 'Adicionar categoria</button></div>' +
        '</div></div><div class="row mt" style="justify-content:flex-end"><button class="btn primary" type="submit">' + icon('check') + 'Salvar configurações</button></div></form>' +
        '<div class="card mt"><div class="card-h"><h2>' + icon('layers') + 'Planejamentos</h2><button class="btn primary sm" data-act="newplan">' + icon('plus') + 'Novo planejamento</button></div><p class="muted small mb">Cada planejamento possui atividades, datas especiais e configurações próprias, sem misturar dados.</p>' +
        '<div class="table-wrap"><table class="t"><thead><tr><th>Nome</th><th>Local</th><th>Atividades</th><th></th></tr></thead><tbody>' + Store.plans().map((p) => '<tr><td><b>' + esc(p.settings.name) + '</b> ' + (p.id === plan.id ? UI.badge('Atual', 'b-ok') : '') + '</td><td>' + esc((p.settings.city ? p.settings.city + '/' : '') + p.settings.state) + '</td><td>' + p.activities.length + '</td><td class="act">' + (p.id !== plan.id ? '<button class="btn sm" data-use="' + p.id + '">Abrir</button> ' : '') + '<button class="btn sm ghost danger-t" data-delplan="' + p.id + '" ' + (Store.plans().length <= 1 ? 'disabled' : '') + '>' + icon('trash') + 'Excluir</button></td></tr>').join('') + '</tbody></table></div></div>' +
        '<div class="card mt"><div class="card-h"><h2>' + icon('download') + 'Dados e backup</h2></div><p class="muted small mb">Os dados ficam salvos neste navegador (armazenamento local). Faça backups regulares.</p><div class="row wrap"><button class="btn" data-act="export">' + icon('download') + 'Exportar backup (JSON)</button><button class="btn" data-act="import">' + icon('upload') + 'Importar backup</button><button class="btn" data-act="demo">' + icon('refresh') + 'Restaurar dados de demonstração neste planejamento</button><button class="btn danger" data-act="clear">' + icon('trash') + 'Apagar todos os dados</button></div><input type="file" id="imp" accept="application/json,.json" class="hidden"></div>';

      const rerender = () => PA.App.render();
      const form = view.querySelector('#setform');
      form.addEventListener('change', (e) => { if (e.target.name === 'wd') e.target.closest('label').classList.toggle('on', e.target.checked); });
      form.addEventListener('submit', (e) => {
        e.preventDefault(); const f = form.elements; const num = (n) => Number(f[n].value);
        form.querySelectorAll('.field').forEach((x) => x.classList.remove('invalid'));
        const errs = {}; if (!f.name.value.trim()) errs.name = 'Informe o nome.';
        if (!(num('defaultDuration') >= 5)) errs.defaultDuration = 'Mínimo 5 minutos.'; if (!(num('minGap') >= 0)) errs.minGap = 'Valor inválido.'; if (!(num('maxPerDay') >= 1)) errs.maxPerDay = 'Mínimo 1.'; if (!(num('overloadWeek') >= 1)) errs.overloadWeek = 'Mínimo 1.';
        if (!(num('year') >= 2000)) errs.year = 'Ano inválido.';
        if (f.startTime.value >= f.endTime.value) errs.endTime = 'O fim deve ser após o início.';
        const wd = Array.from(form.querySelectorAll('[name=wd]:checked')).map((x) => Number(x.value)); const shifts = {};
        ['manha', 'tarde', 'noite'].forEach((k) => { shifts[k] = { enabled: f['sh_' + k].checked, start: f['sh_' + k + '_s'].value, end: f['sh_' + k + '_e'].value }; });
        const se = view.querySelector('#shift-err'); se.style.display = 'none';
        if (!Object.keys(shifts).some((k) => shifts[k].enabled)) { se.textContent = 'Habilite ao menos um turno.'; se.style.display = 'block'; errs._s = 1; }
        Object.keys(shifts).forEach((k) => { if (shifts[k].enabled && shifts[k].start >= shifts[k].end) { se.textContent = 'O turno ' + C.PERIODS[k].toLowerCase() + ' possui fim anterior ao início.'; se.style.display = 'block'; errs._s = 1; } });
        if (!wd.length) { UI.toast('Selecione ao menos um dia de funcionamento.', 'warn'); return; }
        const ks = Object.keys(errs); if (ks.length) { ks.forEach((k) => { const el = view.querySelector('[data-field="' + k + '"]'); if (el) { el.classList.add('invalid'); el.querySelector('.err').textContent = errs[k]; } }); UI.toast('Corrija os campos destacados.', 'warn'); return; }
        const cats = Array.from(view.querySelectorAll('[data-cat]')).map((r) => ({ name: r.querySelector('[data-cname]').value.trim(), color: r.querySelector('[data-ccolor]').value })).filter((c) => c.name);
        Store.updateSettings({ name: f.name.value.trim(), city: f.city.value.trim(), state: f.state.value, year: num('year'), workDays: wd, startTime: f.startTime.value, endTime: f.endTime.value, shifts, defaultDuration: num('defaultDuration'), minGap: num('minGap'), maxPerDay: num('maxPerDay'), overloadWeek: num('overloadWeek'), holidayPolicy: f.holidayPolicy.value, specialPolicy: f.specialPolicy.value, allowParallel: f.allowParallel.checked, preferences: { balance: f.balance.checked, avoidConsecutive: f.avoidConsecutive.checked, considerPreferred: f.considerPreferred.checked }, categories: cats.length ? cats : C.CATEGORIES.map((c) => ({ ...c })) });
        UI.toast('Configurações salvas.'); rerender();
      });
      view.onclick = async (e) => {
        const t = e.target; const g = (s) => { const el = t.closest('[' + s + ']'); return el ? el.getAttribute(s) : null; };
        if (t.closest('[data-addcat]')) { const box = view.querySelector('#cats'); const d = document.createElement('div'); d.className = 'row'; d.setAttribute('data-cat', box.children.length); d.innerHTML = '<input type="color" data-ccolor value="#6366f1"><input type="text" data-cname value="" maxlength="40" placeholder="Nova categoria"><button type="button" class="btn ghost icon" data-delcat title="Remover">' + icon('trash') + '</button>'; box.appendChild(d); d.querySelector('[data-cname]').focus(); return; }
        if (t.closest('[data-delcat]')) { const row = t.closest('[data-cat]'); if (view.querySelectorAll('[data-cat]').length > 1) row.remove(); return UI.toast('Clique em "Salvar" para aplicar. Atividades existentes mantêm o nome da categoria.', 'ok'); }
        const use = g('data-use'); if (use) { Store.setCurrent(use); UI.toast('Planejamento aberto.'); return; }
        const dp = g('data-delplan'); if (dp) { const p = Store.plans().find((x) => x.id === dp); if (await UI.confirm({ title: 'Excluir planejamento', danger: true, confirmLabel: 'Excluir planejamento', message: 'Excluir "' + p.settings.name + '" com todas as suas ' + p.activities.length + ' atividades? Esta ação não pode ser desfeita.' })) { Store.removePlan(dp); UI.toast('Planejamento excluído.'); } return; }
        const act = g('data-act'); if (!act) return;
        if (act === 'newplan') {
          const m = UI.modal({ title: 'Novo planejamento', size: 'sm', body: '<div class="col">' + UI.field('Nome', '<input type="text" id="np-name" maxlength="80" placeholder="Ex.: Calendário 2027">', { req: true }) + '<label class="check"><input type="checkbox" id="np-demo"> Incluir dados de demonstração</label></div>', footer: [{ label: 'Cancelar' }, { label: 'Criar', cls: 'primary', onClick: (mm) => { const n = mm.q('#np-name').value.trim(); if (!n) { mm.q('#np-name').focus(); UI.toast('Informe o nome.', 'warn'); return false; } Store.addPlan(n, mm.q('#np-demo').checked); UI.toast('Planejamento criado. Configure o município e o estado.'); return true; } }] }); void m; return;
        }
        if (act === 'export') { const blob = new Blob([Store.exportJSON()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'planejador-backup-' + D.today() + '.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400); return UI.toast('Backup exportado.'); }
        if (act === 'import') return view.querySelector('#imp').click();
        if (act === 'demo') { if (await UI.confirm({ title: 'Restaurar demonstração', danger: true, confirmLabel: 'Restaurar', message: 'Substituir TODOS os dados do planejamento atual pelos dados de demonstração?' })) { Store.resetCurrentToDemo(); UI.toast('Dados de demonstração restaurados.'); } return; }
        if (act === 'clear') { if (await UI.confirm({ title: 'Apagar todos os dados', danger: true, confirmLabel: 'Apagar tudo', html: '<p>Isto apaga <b>todos os planejamentos</b> deste navegador e recria o exemplo inicial. Considere exportar um backup antes.</p>' })) { Store.clearAllData(); UI.toast('Dados apagados.'); } }
      };
      view.querySelector('#imp').onchange = (e) => {
        const file = e.target.files[0]; if (!file) return; const rd = new FileReader();
        rd.onload = () => { try { Store.importJSON(String(rd.result)); UI.toast('Backup importado com sucesso.'); } catch (err) { UI.toast('Não foi possível importar: ' + err.message, 'err'); } };
        rd.readAsText(file);
      };
    },
  };
})(window);
