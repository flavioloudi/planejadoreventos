# Planejador Inteligente de Atividades

Aplicação web (HTML + CSS + JavaScript puro, sem build) para validar propostas, detectar conflitos e gerar cronogramas.

## Como usar
Abra `index.html` no navegador. Os dados ficam no `localStorage`; na primeira abertura é carregado um planejamento de demonstração (Configurações → Planejamentos permite criar planos vazios, isolados entre si, e exportar/importar backup JSON).

## Estrutura
- `js/core` – datas, constantes, armazenamento (`Store`) e dados de demonstração.
- `js/engine` – lógica pura, sem DOM (feriados, planejador, conflitos, validador, gerador/reprogramação, NLP, insights, relatórios). Também roda em Node.
- `js/ui` – interface (shell, formulários, páginas).
- `tests` – testes automatizados.

Para migrar para banco online/multiusuário, substitua o adaptador de armazenamento com `PA.Store.setAdapter({...})`; o motor não depende da interface.

## Feriados e datas especiais
Somente feriados nacionais fixos e móveis calculados (marcados como *Confirmada*) vêm embutidos. Carnaval, Corpus Christi e datas estaduais ficam como *Precisa de revisão*. Não há feriados municipais embutidos: cadastre-os em "Datas especiais".

## Testes
```
node tests/engine.test.js
npm install --prefix .tmp-jsdom jsdom
node tests/ui.test.js
```
