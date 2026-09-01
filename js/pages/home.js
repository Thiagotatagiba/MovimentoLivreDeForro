// home.js — página inicial: Tira de Dias abre um visualizador de stories em tela cheia
import { listarAgendaOrdenada, listarEventosPorData, contarEventosPorData } from '../services/eventoService.js';
import { formatarDataCurta, formatarDataCompleta, estiloMidia, gerarCardsSemana } from '../utils/format.js';

const cardsSemanaEl = document.getElementById('cards-semana');
const gradeEl = document.getElementById('grade-proximos');
const botaoBusca = document.getElementById('botao-busca');
const buscaContainer = document.getElementById('busca-container');
const setaEsquerda = document.getElementById('seta-esquerda');
const controleDireita = document.getElementById('controle-direita');

const storyViewerEl = document.getElementById('story-viewer');
const storyProgressoEl = document.getElementById('story-progress');
const storyConteudoEl = document.getElementById('story-conteudo');
const storyFecharEl = document.getElementById('story-fechar');

let cardsSemana = [];
let eventosDoDiaAtual = [];
let indiceAtual = 0;

configurarToggleBusca();
inicializarTiraDias();
configurarSetaEsquerda();
configurarControleDireita();
configurarStoryViewer();
carregarProximosBailes();
carregarContagensDoDia();

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

  const PASSO = 152;
  const LIMIAR_VISIBILIDADE = 8;

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
  const MARGEM_FIM = 4;
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

function inicializarTiraDias() {
  if (!cardsSemanaEl) return;

  cardsSemana = gerarCardsSemana();
  cardsSemanaEl.innerHTML = cardsSemana.map(cardDiaHtml).join('');

  cardsSemanaEl.querySelectorAll('.card-dia').forEach((botao, indice) => {
    botao.addEventListener('click', () => abrirStoryDoDia(cardsSemana[indice]));
  });
}

function cardDiaHtml({ rotulo, diaDoMes, mesAbreviado, data, ehHoje }) {
  return `
    <button type="button" class="card-dia${ehHoje ? ' ativo' : ''}" aria-haspopup="dialog">
      <span class="card-dia-badge" data-badge-para="${data}" hidden></span>
      <span class="cartao-borda">
        <span class="cartao-conteudo">
          <span class="cartao-dia-numero">${diaDoMes}</span>
          <span class="cartao-dia-mes">${mesAbreviado}</span>
        </span>
      </span>
      <span class="rotulo-dia">${rotulo}</span>
    </button>
  `;
}

async function carregarProximosBailes() {
  try {
    const eventos = await listarAgendaOrdenada();
    renderizarProximos(eventos.slice(0, 4));
  } catch (erro) {
    console.error(erro);
    gradeEl.innerHTML = '<div class="estado-vazio">Não foi possível carregar a agenda agora.</div>';
  }
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

async function carregarContagensDoDia() {
  if (!cardsSemanaEl || cardsSemana.length === 0) return;

  try {
    const contagens = await contarEventosPorData(cardsSemana.map((c) => c.data));

    cardsSemanaEl.querySelectorAll('.card-dia-badge').forEach((badge) => {
      const total = contagens[badge.dataset.badgePara] ?? 0;
      if (total === 0) return; // sem badge quando não tem evento — badge com "0" só polui

      badge.textContent = total > 9 ? '9+' : String(total);
      badge.hidden = false;
    });
  } catch (erro) {
    console.error(erro);
    // silencioso de propósito: o badge é um extra informativo, não pode
    // quebrar a Tira de Dias inteira se essa chamada falhar.
  }
}

// ===== Visualizador de Stories =====

async function abrirStoryDoDia(card) {
  const eventos = await listarEventosPorData(card.data);

  // Dia sem evento: não tem o que mostrar, então o card simplesmente não abre nada.
  if (eventos.length === 0) return;

  eventosDoDiaAtual = eventos;
  indiceAtual = 0;
  renderizarProgresso();
  renderizarSlideAtual();
  mostrarViewer();
}

function mostrarViewer() {
  storyViewerEl.hidden = false;
  document.body.style.overflow = 'hidden';
}

function fecharViewer() {
  storyViewerEl.hidden = true;
  document.body.style.overflow = '';
  eventosDoDiaAtual = [];
  indiceAtual = 0;
}

function avancarSlide() {
  indiceAtual += 1;

  if (indiceAtual >= eventosDoDiaAtual.length) {
    fecharViewer();
    return;
  }

  renderizarProgresso();
  renderizarSlideAtual();
}

function renderizarProgresso() {
  storyProgressoEl.innerHTML = eventosDoDiaAtual
    .map((_, indice) => `<div class="story-progress-segmento${indice <= indiceAtual ? ' preenchido' : ''}"></div>`)
    .join('');
}

function renderizarSlideAtual() {
  const evento = eventosDoDiaAtual[indiceAtual];
  const nomeMarca = evento.marca?.nome ?? 'Marca em breve';
  const nomeLocal = evento.local?.nome ?? 'Local em breve';
  const cidadeLocal = evento.local?.endereco?.cidade;

  storyConteudoEl.innerHTML = `
    <div class="story-slide">
      <div class="story-arte" style="${estiloMidia(evento.imagemUrl)}">
        <div class="story-info">
          <p class="story-marca">${nomeMarca}</p>
          <h2 class="story-titulo">${evento.titulo}</h2>
          <p class="story-dado">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/></svg>
            <span style="text-transform: capitalize;">${formatarDataCompleta(evento.data)} · ${evento.horario}</span>
          </p>
          <p class="story-dado">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
            <span>${nomeLocal}${cidadeLocal ? ` — ${cidadeLocal}` : ''}</span>
          </p>
        </div>
      </div>
      <a class="botao botao-primario story-cta" href="evento.html?slug=${encodeURIComponent(evento.slug)}">Ir para evento</a>
    </div>
  `;
}

function configurarStoryViewer() {
  if (!storyViewerEl) return;

  storyViewerEl.addEventListener('click', (evento) => {
    if (evento.target.closest('#story-fechar')) {
      fecharViewer();
      return;
    }
    if (evento.target.closest('.story-cta')) {
      return; // deixa o link navegar normalmente, sem avançar o slide
    }
    avancarSlide();
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && !storyViewerEl.hidden) fecharViewer();
  });
}