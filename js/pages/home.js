// home.js — página inicial: responde "onde tem forró hoje?"
import { listarEventosDeHoje, listarAgendaOrdenada } from '../services/eventoService.js';
import { formatarDataCurta, estiloMidia } from '../utils/format.js';

const respostaEl = document.getElementById('resposta-hoje');
const gradeEl = document.getElementById('grade-proximos');
const botaoBusca = document.getElementById('botao-busca');
const buscaContainer = document.getElementById('busca-container');

configurarToggleBusca();

function configurarToggleBusca() {
  if (!botaoBusca || !buscaContainer) return;

  botaoBusca.addEventListener('click', () => {
    const estaAberta = !buscaContainer.hidden;

    if (estaAberta) {
      buscaContainer.hidden = true;
      botaoBusca.setAttribute('aria-expanded', 'false');
      return;
    }

    buscaContainer.hidden = false;
    botaoBusca.setAttribute('aria-expanded', 'true');
    buscaContainer.querySelector('input')?.focus();
  });
}

async function iniciar() {
  const [hoje, proximos] = await Promise.all([
    listarEventosDeHoje(),
    listarAgendaOrdenada(),
  ]);

  renderizarResposta(hoje);
  renderizarProximos(proximos.slice(0, 4));
}

function renderizarResposta(eventosHoje) {
  if (eventosHoje.length === 0) {
    respostaEl.innerHTML = `
      <h2>Hoje não tem forró marcado</h2>
      <p>Mas a agenda dos próximos dias já tá recheada. Dá uma olhada aqui embaixo.</p>
    `;
    return;
  }

  const lista = eventosHoje
    .map((e) => `${e.marca?.nome ?? 'Marca'} · ${e.local?.nome ?? 'local em breve'}`)
    .join(' · ');

  respostaEl.innerHTML = `
    <h2>Vai ter forró hoje!</h2>
    <p>${lista}</p>
  `;
}

function renderizarProximos(eventos) {
  if (eventos.length === 0) {
    gradeEl.innerHTML = '<div class="estado-vazio">Nenhum evento cadastrado no momento.</div>';
    return;
  }

  gradeEl.innerHTML = eventos.map(cardEventoHtml).join('');
}

function cardEventoHtml(evento) {
  const nomeMarca = evento.marca?.nome ?? 'Marca em breve';
  const nomeLocal = evento.local?.nome ?? 'Local em breve';
  return `
    <a class="card-evento" href="evento.html?slug=${encodeURIComponent(evento.slug)}">
      <div class="midia" style="${estiloMidia(evento.imagemUrl)}">
        <span class="badge">${formatarDataCurta(evento.data)}</span>
        <span class="marca-nome">${nomeMarca}</span>
      </div>
      <div class="corpo">
        <p class="titulo-evento">${evento.titulo}</p>
        <p class="meta">${nomeLocal}</p>
      </div>
    </a>
  `;
}

iniciar().catch((erro) => {
  console.error(erro);
  respostaEl.innerHTML = '<p>Não foi possível carregar a agenda agora.</p>';
});
