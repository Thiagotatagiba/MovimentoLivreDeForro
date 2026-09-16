// main.js — orquestra a abertura do projeto e a troca de abas
import { apiDisponivel, abrirPastaDoProjeto, lerJSON } from './fileAccess.js';
import { estado } from './estado.js';
import { renderizarEventos, configurarAbaEventos } from './eventos.js';
import { renderizarMarcas, configurarAbaMarcas } from './marcas.js';
import { renderizarLocais, configurarAbaLocais } from './locais.js';

const avisoNavegadorEl = document.getElementById('aviso-navegador');
const avisoErroEl = document.getElementById('aviso-erro');
const boasVindasEl = document.getElementById('boas-vindas');
const painelEl = document.getElementById('painel-principal');
const statusEl = document.getElementById('status-projeto');
const botaoAbrirEl = document.getElementById('botao-abrir-pasta');

const ABAS = ['eventos', 'marcas', 'locais'];

function mostrarErro(mensagem) {
  avisoErroEl.textContent = mensagem;
  avisoErroEl.hidden = false;
}

function esconderErro() {
  avisoErroEl.hidden = true;
}

async function carregarProjeto() {
  esconderErro();
  botaoAbrirEl.disabled = true;
  botaoAbrirEl.textContent = 'Abrindo...';

  try {
    await abrirPastaDoProjeto();

    const [eventos, marcas, locais] = await Promise.all([
      lerJSON('eventos.json'),
      lerJSON('marcas.json'),
      lerJSON('locais.json'),
    ]);

    estado.eventos = eventos;
    estado.marcas = marcas;
    estado.locais = locais;

    statusEl.textContent = `Projeto aberto — ${eventos.length} eventos, ${marcas.length} marcas, ${locais.length} locais`;
    boasVindasEl.hidden = true;
    painelEl.hidden = false;

    renderizarEventos();
    renderizarMarcas();
    renderizarLocais();
  } catch (erro) {
    console.error(erro);
    if (erro?.name === 'AbortError') {
      // usuário cancelou o seletor de pasta — não é erro de verdade, não precisa avisar
    } else {
      mostrarErro(erro.message ?? 'Não foi possível abrir o projeto.');
    }
  } finally {
    botaoAbrirEl.disabled = false;
    botaoAbrirEl.textContent = 'Abrir pasta do projeto';
  }
}

function configurarAbas() {
  ABAS.forEach((aba) => {
    document.getElementById(`tab-${aba}`).addEventListener('click', () => selecionarAba(aba));
  });
}

function selecionarAba(abaSelecionada) {
  ABAS.forEach((aba) => {
    const ehEssa = aba === abaSelecionada;
    document.getElementById(`tab-${aba}`).setAttribute('aria-selected', String(ehEssa));
    document.getElementById(`secao-${aba}`).hidden = !ehEssa;
  });
}

function iniciar() {
  if (!apiDisponivel()) {
    avisoNavegadorEl.hidden = false;
    botaoAbrirEl.disabled = true;
    return;
  }

  botaoAbrirEl.addEventListener('click', carregarProjeto);
  configurarAbas();
  configurarAbaEventos();
  configurarAbaMarcas();
  configurarAbaLocais();
}

iniciar();
