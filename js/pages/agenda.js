// agenda.js
import { listarAgendaOrdenada } from '../services/eventoService.js';
import { formatarDataCurta, formatarDiaSemana, ehHoje, estiloMidia } from '../utils/format.js';

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

  gradeEl.innerHTML = filtrados.map(cardEventoHtml).join('');
}

function cardEventoHtml(evento) {
  const nomeMarca = evento.marca?.nome ?? 'Marca em breve';
  const nomeLocal = evento.local?.nome ?? 'Local em breve';
  const badge = ehHoje(evento.data)
    ? `<span class="badge badge-hoje">Hoje</span>`
    : `<span class="badge">${formatarDataCurta(evento.data)}</span>`;

  return `
    <a class="card-evento" href="evento.html?slug=${encodeURIComponent(evento.slug)}">
      <div class="midia" style="${estiloMidia(evento.imagemUrl)}">
        ${badge}
        <span class="marca-nome">${nomeMarca}</span>
      </div>
      <div class="corpo">
        <p class="titulo-evento">${evento.titulo}</p>
        <p class="meta">${capitalizar(formatarDiaSemana(evento.data))} · ${nomeLocal}</p>
      </div>
    </a>
  `;
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

iniciar().catch((erro) => {
  console.error(erro);
  gradeEl.innerHTML = '<div class="estado-vazio">Não foi possível carregar a agenda.</div>';
});
