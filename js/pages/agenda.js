// agenda.js — agenda completa, filtro por categoria e agrupamento por dia.
//
// Revisão 2026-10-28: agrupamento por dia (a lista corrida de cards dificultava
// saber onde um dia terminava e outro começava), contagem de resultados,
// esqueletos de carregamento e estado vazio com CTA.

import { listarAgendaOrdenada } from '../services/eventoService.js';
import { capitalizar, formatarDataCompleta, ehHoje, escaparHtml } from '../utils/format.js';
import { cardEventoHtml } from '../utils/cardEvento.js';
import { estadoVazioHtml, esqueletosGradeHtml } from '../utils/ui.js';

const gradeEl = document.getElementById('grade-agenda');
const pillsEl = document.getElementById('pills-categoria');
const statusEl = document.getElementById('agenda-status');

let todosOsEventos = [];
let categoriaAtiva = 'todos';

async function iniciar() {
  gradeEl.innerHTML = esqueletosGradeHtml(4);
  todosOsEventos = await listarAgendaOrdenada();
  const categorias = extrairCategorias(todosOsEventos);
  renderizarPills(categorias);
  renderizarGrade();
}

function extrairCategorias(eventos) {
  const set = new Set();
  eventos.forEach((evento) => (evento.marca?.categorias ?? []).forEach((categoria) => set.add(categoria)));
  return ['todos', ...set];
}

function renderizarPills(categorias) {
  pillsEl.innerHTML = categorias
    .map((categoria) => `
      <button class="pill" data-categoria="${escaparHtml(categoria)}" aria-pressed="${categoria === categoriaAtiva}">
        ${categoria === 'todos' ? 'Todos' : escaparHtml(capitalizar(categoria))}
      </button>
    `)
    .join('');

  pillsEl.querySelectorAll('.pill').forEach((botao) => {
    botao.addEventListener('click', () => {
      categoriaAtiva = botao.dataset.categoria;
      pillsEl.querySelectorAll('.pill').forEach((outro) =>
        outro.setAttribute('aria-pressed', outro === botao ? 'true' : 'false')
      );
      renderizarGrade();
    });
  });
}

function rotuloDoDia(isoData) {
  if (ehHoje(isoData)) return `Hoje · ${capitalizar(formatarDataCompleta(isoData))}`;
  return capitalizar(formatarDataCompleta(isoData));
}

function renderizarGrade() {
  const filtrados = todosOsEventos.filter(
    (evento) => categoriaAtiva === 'todos' || (evento.marca?.categorias ?? []).includes(categoriaAtiva)
  );

  if (statusEl) {
    statusEl.textContent = filtrados.length === 0
      ? 'Nenhum baile encontrado'
      : `${filtrados.length} ${filtrados.length === 1 ? 'baile' : 'bailes'}`;
  }

  if (filtrados.length === 0) {
    gradeEl.innerHTML = estadoVazioHtml({
      icone: '🪗',
      titulo: 'Nenhum baile nesse filtro',
      texto: 'Tenta outra categoria ou volta pra ver todos os bailes.',
      ctaHref: 'index.html',
      ctaTexto: 'Ver a Home',
    });
    return;
  }

  const grupos = new Map();
  filtrados.forEach((evento) => {
    if (!grupos.has(evento.data)) grupos.set(evento.data, []);
    grupos.get(evento.data).push(evento);
  });

  gradeEl.innerHTML = [...grupos.entries()]
    .map(([data, eventos]) => `
      <section class="grupo-dia" aria-label="${escaparHtml(rotuloDoDia(data))}">
        <h2 class="grupo-dia-titulo">${escaparHtml(rotuloDoDia(data))}</h2>
        <div class="grade-eventos">
          ${eventos.map((evento) => cardEventoHtml(evento)).join('')}
        </div>
      </section>
    `)
    .join('');
}

iniciar().catch((erro) => {
  console.error(erro);
  gradeEl.innerHTML = estadoVazioHtml({
    icone: '😕',
    titulo: 'Não foi possível carregar a agenda',
    texto: 'Tenta recarregar a página em instantes.',
    ctaHref: 'index.html',
    ctaTexto: 'Voltar para a Home',
  });
});
