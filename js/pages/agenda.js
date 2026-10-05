// agenda.js
import { listarAgendaOrdenada } from '../services/eventoService.js';
import { capitalizar } from '../utils/format.js';
import { cardEventoHtml } from '../utils/cardEvento.js';

const gradeEl = document.getElementById('grade-agenda');
const pillsEl = document.getElementById('pills-categoria');

let todosOsEventos = [];
let categoriaAtiva = 'todos';

async function iniciar() {
  todosOsEventos = await listarAgendaOrdenada();
  const categorias = extrairCategorias(todosOsEventos);
  renderizarPills(categorias);
  renderizarGrade();
}

function extrairCategorias(eventos) {
  const set = new Set();
  eventos.forEach((e) => (e.marca?.categorias ?? []).forEach((c) => set.add(c)));
  return ['todos', ...set];
}

function renderizarPills(categorias) {
  pillsEl.innerHTML = categorias
    .map((cat) => `
      <button class="pill" data-categoria="${cat}" aria-pressed="${cat === categoriaAtiva}">
        ${cat === 'todos' ? 'Todos' : capitalizar(cat)}
      </button>
    `)
    .join('');

  pillsEl.querySelectorAll('.pill').forEach((botao) => {
    botao.addEventListener('click', () => {
      categoriaAtiva = botao.dataset.categoria;
      pillsEl.querySelectorAll('.pill').forEach((b) =>
        b.setAttribute('aria-pressed', b === botao ? 'true' : 'false')
      );
      renderizarGrade();
    });
  });
}

function renderizarGrade() {
  const filtrados = todosOsEventos.filter(
    (e) => categoriaAtiva === 'todos' || (e.marca?.categorias ?? []).includes(categoriaAtiva)
  );

  if (filtrados.length === 0) {
    gradeEl.innerHTML = '<div class="estado-vazio">Nenhum evento encontrado para esse filtro.</div>';
    return;
  }

  gradeEl.innerHTML = filtrados
    .map((evento) => cardEventoHtml(evento, { badgeHojeEspecial: true }))
    .join('');
}

iniciar().catch((erro) => {
  console.error(erro);
  gradeEl.innerHTML = '<div class="estado-vazio">Não foi possível carregar a agenda.</div>';
});
