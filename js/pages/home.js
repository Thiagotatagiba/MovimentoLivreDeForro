// home.js — página inicial.
//
// Revisão 2026-10-28 (ver docs/MELHORIAS.md):
// - busca funcional (PRD-01);
// - bloco "Hoje" respondendo à pergunta central do produto (PRD-03);
// - Tira de Dias com contagem acessível e feedback quando o dia não tem baile;
// - "stories" virou carrossel paginado de verdade (contador, setas, swipe,
//   teclado), sem barra de progresso que prometia timer inexistente (UX-09);
// - esqueletos de carregamento (UX-13).

import {
  listarAgendaOrdenada,
  listarEventosDeHoje,
  listarEventosPorData,
  contarEventosPorData,
  obterProximoEvento,
} from '../services/eventoService.js';
import { buscar } from '../services/buscaService.js';
import {
  formatarDataCompleta,
  formatarHora,
  gerarCardsSemana,
  capitalizar,
  escaparHtml,
  estiloMidia,
  imagemDoEvento,
  paraISOLocal,
  inicioDoDia,
} from '../utils/format.js';
import { cardDiaHtml, cardEventoHtml } from '../utils/cardEvento.js';
import { estadoVazioHtml, esqueletosGradeHtml } from '../utils/ui.js';

const cardsSemanaEl = document.getElementById('cards-semana');
const gradeEl = document.getElementById('grade-proximos');
const botaoBusca = document.getElementById('botao-busca');
const buscaContainer = document.getElementById('busca-container');
const campoBusca = document.getElementById('campo-busca');
const buscaResultados = document.getElementById('busca-resultados');
const setaEsquerda = document.getElementById('seta-esquerda');
const setaDireita = document.getElementById('seta-direita');
const blocoHojeEl = document.getElementById('bloco-hoje');
const viewer = document.getElementById('story-viewer');

let cardsSemana = [];
let eventosDoDia = [];
let indiceAtual = 0;
let elementoDeOrigem = null;

configurarToggleBusca();
configurarBusca();
inicializarTiraDias();
configurarSetasTira();
configurarCarrossel();
carregarBlocoHoje();
carregarProximosBailes();
carregarContagensDoDia();

// ---------- Busca ----------

function configurarToggleBusca() {
  if (!botaoBusca || !buscaContainer) return;

  botaoBusca.addEventListener('click', () => {
    const estaAberta = !buscaContainer.hidden;

    if (estaAberta) {
      fecharBusca();
      return;
    }

    buscaContainer.hidden = false;
    botaoBusca.setAttribute('aria-expanded', 'true');
    campoBusca?.focus();
  });
}

function fecharBusca() {
  if (!buscaContainer) return;
  buscaContainer.hidden = true;
  botaoBusca?.setAttribute('aria-expanded', 'false');
  if (buscaResultados) {
    buscaResultados.hidden = true;
    buscaResultados.innerHTML = '';
  }
}

function configurarBusca() {
  if (!campoBusca || !buscaResultados) return;

  let timer = null;
  let sequencia = 0;

  campoBusca.addEventListener('input', () => {
    clearTimeout(timer);
    const termo = campoBusca.value;

    if (termo.trim().length < 2) {
      buscaResultados.hidden = true;
      buscaResultados.innerHTML = '';
      return;
    }

    timer = setTimeout(async () => {
      const minhaSequencia = ++sequencia;
      try {
        const resultados = await buscar(termo);
        if (minhaSequencia !== sequencia) return; // resposta antiga, descarta
        renderizarResultados(termo, resultados);
      } catch (erro) {
        console.error('Falha na busca:', erro);
      }
    }, 200);
  });

  campoBusca.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') {
      fecharBusca();
      botaoBusca?.focus();
    }
    if (evento.key === 'Enter') {
      const primeiro = buscaResultados.querySelector('a');
      if (primeiro) {
        evento.preventDefault();
        primeiro.click();
      }
    }
  });
}

function renderizarResultados(termo, resultados) {
  buscaResultados.hidden = false;

  if (resultados.length === 0) {
    buscaResultados.innerHTML = `
      <p class="busca-status" role="status">Nada encontrado para "${escaparHtml(termo)}". Tenta "deck", "wine" ou "marina".</p>
    `;
    return;
  }

  buscaResultados.innerHTML = `
    <p class="busca-status" role="status">${resultados.length} ${resultados.length === 1 ? 'resultado' : 'resultados'}</p>
    ${resultados.map((resultado) => `
      <a class="busca-item" href="${escaparHtml(resultado.url)}">
        <span class="busca-tipo">${escaparHtml(resultado.tipo)}</span>
        <span class="busca-nome">${escaparHtml(resultado.nome)}${resultado.detalhe ? ` · ${escaparHtml(resultado.detalhe)}` : ''}</span>
      </a>
    `).join('')}
  `;
}

// ---------- Bloco "Hoje" ----------

async function carregarBlocoHoje() {
  if (!blocoHojeEl) return;
  blocoHojeEl.innerHTML = '<div class="esqueleto esqueleto-hoje"></div>';

  try {
    const eventosHoje = await listarEventosDeHoje();
    const proximo = eventosHoje.length ? null : await obterProximoEvento();
    renderizarBlocoHoje(eventosHoje, proximo);
  } catch (erro) {
    console.error(erro);
    blocoHojeEl.innerHTML = `
      <div class="bloco-hoje">
        <p class="rotulo-eyebrow">Hoje</p>
        <h2>Não deu pra carregar a agenda</h2>
        <p class="bloco-hoje-texto">Tenta recarregar a página.</p>
      </div>
    `;
  }
}

function renderizarBlocoHoje(eventosHoje, proximo) {
  const hojeIso = paraISOLocal(inicioDoDia());
  const rotuloHoje = capitalizar(formatarDataCompleta(hojeIso));

  if (eventosHoje.length > 0) {
    blocoHojeEl.innerHTML = `
      <div class="bloco-hoje bloco-hoje--tem">
        <p class="rotulo-eyebrow rotulo-eyebrow--claro">Hoje · ${escaparHtml(rotuloHoje)}</p>
        <h2>${eventosHoje.length === 1 ? 'Tem forró hoje' : `Tem ${eventosHoje.length} bailes hoje`}</h2>
        <ul class="hoje-lista">
          ${eventosHoje.slice(0, 3).map((evento) => `
            <li>
              <a href="${escaparHtml(urlDoEvento(evento))}">
                <strong>${escaparHtml(evento.marca?.nome ?? evento.titulo)}</strong>
                <span>${escaparHtml(formatarHora(evento.horario))}${evento.local?.nome ? ` · ${escaparHtml(evento.local.nome)}` : ''}</span>
              </a>
            </li>
          `).join('')}
        </ul>
        <a class="botao botao-claro" href="agenda.html">Ver a agenda completa</a>
      </div>
    `;
    return;
  }

  if (proximo) {
    blocoHojeEl.innerHTML = `
      <div class="bloco-hoje">
        <p class="rotulo-eyebrow">Hoje · ${escaparHtml(rotuloHoje)}</p>
        <h2>Hoje não tem baile</h2>
        <p class="bloco-hoje-texto">
          O próximo é <span class="bloco-hoje-destaque">${escaparHtml(capitalizar(formatarDataCompleta(proximo.data)))}</span>
          — <a href="${escaparHtml(urlDoEvento(proximo))}"><strong>${escaparHtml(proximo.marca?.nome ?? proximo.titulo)}</strong></a>
          ${proximo.horario ? `, às ${escaparHtml(formatarHora(proximo.horario))}` : ''}.
        </p>
        <a class="botao botao-primario" href="agenda.html">Ver a agenda</a>
      </div>
    `;
    return;
  }

  blocoHojeEl.innerHTML = `
    <div class="bloco-hoje">
      <p class="rotulo-eyebrow">Hoje · ${escaparHtml(rotuloHoje)}</p>
      <h2>Nenhum baile cadastrado</h2>
      <p class="bloco-hoje-texto">Assim que a agenda for atualizada, os próximos bailes aparecem aqui.</p>
    </div>
  `;
}

function urlDoEvento(evento) {
  return `evento.html?slug=${encodeURIComponent(evento.slug ?? '')}`;
}

// ---------- Tira de Dias ----------

function configurarSetasTira() {
  if (!cardsSemanaEl) return;

  const PASSO = 152;
  const LIMIAR_INICIO = 8;
  const MARGEM_FIM = 4;

  function noInicio() {
    return cardsSemanaEl.scrollLeft <= LIMIAR_INICIO;
  }

  function noFim() {
    return cardsSemanaEl.scrollLeft + cardsSemanaEl.clientWidth
      >= cardsSemanaEl.scrollWidth - MARGEM_FIM;
  }

  function atualizar() {
    // Setas flutuantes: uma some quando não há mais para onde rolar. Se os 7
    // dias couberem na tela (desktop), as duas ficam escondidas.
    if (setaEsquerda) setaEsquerda.hidden = noInicio();
    if (setaDireita) setaDireita.hidden = noFim();
  }

  setaEsquerda?.addEventListener('click', () => {
    cardsSemanaEl.scrollBy({ left: -PASSO, behavior: 'smooth' });
  });

  setaDireita?.addEventListener('click', () => {
    cardsSemanaEl.scrollBy({ left: PASSO, behavior: 'smooth' });
  });

  cardsSemanaEl.addEventListener('scroll', atualizar, { passive: true });
  window.addEventListener('resize', atualizar);
  atualizar();
}

function inicializarTiraDias() {
  if (!cardsSemanaEl) return;

  cardsSemana = gerarCardsSemana();
  cardsSemanaEl.innerHTML = cardsSemana.map(cardDiaHtml).join('');

  cardsSemanaEl.querySelectorAll('.card-dia').forEach((botao, indice) => {
    botao.addEventListener('click', () => abrirCarrossel(cardsSemana[indice]));
  });
}

async function carregarContagensDoDia() {
  if (!cardsSemanaEl || cardsSemana.length === 0) return;

  try {
    const contagens = await contarEventosPorData(cardsSemana.map((card) => card.data));

    cardsSemanaEl.querySelectorAll('.card-dia').forEach((botao, indice) => {
      const card = cardsSemana[indice];
      const total = contagens[card.data] ?? 0;
      const badge = botao.querySelector('.card-dia-badge');

      if (badge) {
        badge.textContent = total > 9 ? '9+' : String(total);
        badge.hidden = total === 0;
      }

      botao.setAttribute('aria-label', total === 0
        ? `${card.rotulo}, ${card.diaDoMes} de ${card.mesAbreviado}: sem baile`
        : `${card.rotulo}, ${card.diaDoMes} de ${card.mesAbreviado}: ${total} ${total === 1 ? 'baile' : 'bailes'}`);
    });
  } catch (erro) {
    // silencioso de propósito: o badge é extra, não pode quebrar a Tira de Dias
    console.error(erro);
  }
}

// ---------- Próximos bailes ----------

async function carregarProximosBailes() {
  if (!gradeEl) return;
  gradeEl.innerHTML = esqueletosGradeHtml(4);

  try {
    const eventos = await listarAgendaOrdenada();
    renderizarProximos(eventos.slice(0, 4));
  } catch (erro) {
    console.error(erro);
    gradeEl.innerHTML = estadoVazioHtml({
      icone: '⚠️',
      titulo: 'Não foi possível carregar a agenda agora',
      texto: 'Tenta recarregar a página em instantes.',
      ctaHref: 'agenda.html',
      ctaTexto: 'Tentar pela agenda',
    });
  }
}

function renderizarProximos(eventos) {
  if (eventos.length === 0) {
    gradeEl.innerHTML = estadoVazioHtml({
      icone: '🪗',
      titulo: 'Nenhum baile cadastrado ainda',
      texto: 'A agenda é atualizada toda semana.',
    });
    return;
  }

  gradeEl.innerHTML = eventos.map((evento) => cardEventoHtml(evento)).join('');
}

// ---------- Carrossel de eventos do dia ----------

async function abrirCarrossel(card) {
  const eventos = await listarEventosPorData(card.data);

  if (eventos.length === 0) {
    avisar('Nenhum baile nesse dia');
    return;
  }

  eventosDoDia = eventos;
  indiceAtual = 0;
  elementoDeOrigem = document.activeElement;

  renderizarCarrossel();
  viewer.hidden = false;
  document.body.style.overflow = 'hidden';
  viewer.querySelector('.story-fechar')?.focus();
}

function renderizarCarrossel() {
  const total = eventosDoDia.length;
  const evento = eventosDoDia[indiceAtual];
  const nomeMarca = evento.marca?.nome ?? 'Marca em breve';
  const nomeLocal = evento.local?.nome ?? 'Local em breve';
  const cidade = evento.local?.endereco?.cidade;

  viewer.innerHTML = `
    <div class="story-topo">
      <span class="story-contador" aria-live="polite">${indiceAtual + 1} de ${total}</span>
      <button type="button" class="story-fechar" aria-label="Fechar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>

    <div class="story-conteudo">
      <div class="story-slide" role="group" aria-roledescription="slide" aria-label="Evento ${indiceAtual + 1} de ${total}">
        <div class="story-arte" style="${estiloMidia(imagemDoEvento(evento))}">
          <div class="story-info">
            <p class="story-marca">${escaparHtml(nomeMarca)}</p>
            <h2 class="story-titulo">${escaparHtml(evento.titulo)}</h2>
            <p class="story-dado">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/></svg>
              <span>${escaparHtml(capitalizar(formatarDataCompleta(evento.data)))} · ${escaparHtml(formatarHora(evento.horario))}</span>
            </p>
            <p class="story-dado">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
              <span>${escaparHtml(nomeLocal)}${cidade ? ` — ${escaparHtml(cidade)}` : ''}</span>
            </p>
          </div>
        </div>

        <div class="story-nav">
          <a class="botao botao-primario story-cta" href="${escaparHtml(urlDoEvento(evento))}">
            Ver o evento
          </a>
        </div>
      </div>

      <button type="button" class="story-seta story-seta--esq" data-nav="anterior" aria-label="Evento anterior" ${indiceAtual === 0 ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button type="button" class="story-seta story-seta--dir" data-nav="proximo" aria-label="Próximo evento" ${indiceAtual === total - 1 ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  `;
}

function mudarSlide(delta) {
  const novo = indiceAtual + delta;
  if (novo < 0 || novo >= eventosDoDia.length) return;
  indiceAtual = novo;
  renderizarCarrossel();
  const seta = viewer.querySelector(delta > 0 ? '.story-seta--dir' : '.story-seta--esq');
  if (seta && !seta.disabled) seta.focus();
}

function fecharCarrossel() {
  viewer.hidden = true;
  viewer.innerHTML = '';
  document.body.style.overflow = '';
  eventosDoDia = [];
  indiceAtual = 0;
  elementoDeOrigem?.focus?.();
  elementoDeOrigem = null;
}

function configurarCarrossel() {
  if (!viewer) return;

  viewer.addEventListener('click', (evento) => {
    if (evento.target.closest('.story-fechar')) {
      fecharCarrossel();
      return;
    }
    const nav = evento.target.closest('[data-nav]');
    if (nav) {
      mudarSlide(nav.dataset.nav === 'proximo' ? 1 : -1);
    }
  });

  // Swipe horizontal (mobile): 40px de limiar pra não competir com o scroll.
  let inicioX = null;
  viewer.addEventListener('pointerdown', (evento) => {
    inicioX = evento.clientX;
  });
  viewer.addEventListener('pointerup', (evento) => {
    if (inicioX === null) return;
    const deslocamento = evento.clientX - inicioX;
    inicioX = null;
    if (Math.abs(deslocamento) < 40) return;
    mudarSlide(deslocamento < 0 ? 1 : -1);
  });
  viewer.addEventListener('pointercancel', () => { inicioX = null; });

  document.addEventListener('keydown', (evento) => {
    if (viewer.hidden) return;
    if (evento.key === 'Escape') fecharCarrossel();
    if (evento.key === 'ArrowRight') mudarSlide(1);
    if (evento.key === 'ArrowLeft') mudarSlide(-1);
  });
}

// ---------- Aviso rápido ----------

function avisar(mensagem) {
  const aviso = document.createElement('div');
  aviso.className = 'aviso-flutuante';
  aviso.setAttribute('role', 'status');
  aviso.textContent = mensagem;
  document.body.appendChild(aviso);

  requestAnimationFrame(() => requestAnimationFrame(() => aviso.classList.add('visivel')));
  setTimeout(() => {
    aviso.classList.remove('visivel');
    setTimeout(() => aviso.remove(), 250);
  }, 2000);
}
