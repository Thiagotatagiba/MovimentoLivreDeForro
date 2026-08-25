// home.js — página inicial: fileira de dias + próximos bailes
import { listarAgendaOrdenada } from '../services/eventoService.js';
import { formatarDataCurta, estiloMidia, gerarCardsSemana } from '../utils/format.js';

const cardsSemanaEl = document.getElementById('cards-semana');
const gradeEl = document.getElementById('grade-proximos');
const botaoBusca = document.getElementById('botao-busca');
const buscaContainer = document.getElementById('busca-container');
const setaEsquerda = document.getElementById('seta-esquerda');
const controleDireita = document.getElementById('controle-direita');

configurarToggleBusca();
renderizarCardsSemana();
configurarSetaEsquerda();
configurarControleDireita();

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

function configurarSetaEsquerda() {
  if (!setaEsquerda || !cardsSemanaEl) return;

  const PASSO = 152; // ~2 cards por clique
  const LIMIAR_VISIBILIDADE = 8; // px rolados pra seta começar a aparecer

  setaEsquerda.addEventListener('click', () => {
    cardsSemanaEl.scrollBy({ left: -PASSO, behavior: 'smooth' });
  });

  cardsSemanaEl.addEventListener('scroll', atualizarVisibilidadeSeta);
  atualizarVisibilidadeSeta();

  function atualizarVisibilidadeSeta() {
    const rolouUmPouco = cardsSemanaEl.scrollLeft > LIMIAR_VISIBILIDADE;
    setaEsquerda.hidden = !rolouUmPouco;
  }
}

function configurarControleDireita() {
  if (!controleDireita || !cardsSemanaEl) return;

  const PASSO = 152;
  const MARGEM_FIM = 4; // tolerância de arredondamento de subpixel
  const textoEl = controleDireita.querySelector('.controle-direita-texto');

  function chegouNoFim() {
    return cardsSemanaEl.scrollLeft + cardsSemanaEl.clientWidth >= cardsSemanaEl.scrollWidth - MARGEM_FIM;
  }

  function atualizarEstado() {
    const noFim = chegouNoFim();
    controleDireita.classList.toggle('controle-direita--fim', noFim);
    textoEl.hidden = !noFim;
    controleDireita.setAttribute('aria-label', noFim ? 'Ver agenda completa' : 'Ver próximos dias');
  }

  controleDireita.addEventListener('click', () => {
    if (chegouNoFim()) {
      window.location.href = 'agenda.html';
      return;
    }
    cardsSemanaEl.scrollBy({ left: PASSO, behavior: 'smooth' });
  });

  cardsSemanaEl.addEventListener('scroll', atualizarEstado);
  window.addEventListener('resize', atualizarEstado);
  atualizarEstado();
}

function renderizarCardsSemana() {
  const cards = gerarCardsSemana();
  cardsSemanaEl.innerHTML = cards.map(cardDiaHtml).join('');
}

function cardDiaHtml({ rotulo, diaDoMes, ehHoje }) {
  return `
    <div class="card-dia${ehHoje ? ' ativo' : ''}" role="listitem">
      <div class="cartao-borda">
        <div class="cartao-conteudo">${diaDoMes}</div>
      </div>
      <span class="rotulo-dia">${rotulo}</span>
    </div>
  `;
}

async function iniciar() {
  const proximos = await listarAgendaOrdenada();
  renderizarProximos(proximos.slice(0, 4));
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
  gradeEl.innerHTML = '<div class="estado-vazio">Não foi possível carregar a agenda agora.</div>';
});