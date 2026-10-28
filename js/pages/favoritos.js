// js/pages/favoritos.js
// Lista de eventos favoritados e marcas seguidas.
// Revisão 2026-10-28: nomes escapados, estados vazios com CTA e tratamento
// de erro sem deixar a tela em branco.

import { obterUsuarioAtual, aoMudarAutenticacao } from '../../services/authService.js';
import { listarFavoritos, listarSeguindo } from '../../services/interacaoService.js';
import { listarEventosPorIds } from '../services/eventoService.js';
import { listarMarcasPorIds } from '../services/marcaService.js';
import { cardEventoHtml } from '../utils/cardEvento.js';
import { estadoVazioHtml } from '../utils/ui.js';
import { escaparHtml } from '../utils/format.js';
import { abrirModalLogin } from '../../components/loginModal.js';

const secaoBloqueada = document.getElementById('favoritos-bloqueado');
const secaoCarregando = document.getElementById('favoritos-carregando');
const conteudo = document.getElementById('favoritos-conteudo');
const botaoEntrar = document.getElementById('favoritos-botao-entrar');

const listaEventos = document.getElementById('lista-eventos-favoritos');
const vazioEventos = document.getElementById('vazio-eventos-favoritos');
const listaMarcas = document.getElementById('lista-marcas-seguindo');
const vazioMarcas = document.getElementById('vazio-marcas-seguindo');

function mostrarEstado(estado) {
  secaoBloqueada.hidden = estado !== 'bloqueado';
  secaoCarregando.hidden = estado !== 'carregando';
  conteudo.hidden = estado !== 'conteudo';
}

const VAZIO_EVENTOS = estadoVazioHtml({
  icone: '💛',
  titulo: 'Nenhum evento favoritado ainda',
  texto: 'Toca no coração na página de um evento pra guardar aqui.',
  ctaHref: 'agenda.html',
  ctaTexto: 'Ver agenda',
});

const VAZIO_MARCAS = estadoVazioHtml({
  icone: '🪗',
  titulo: 'Você ainda não segue nenhum baile',
  texto: 'Toca em "Seguir" na página de uma Marca pra acompanhar as próximas edições.',
  ctaHref: 'agenda.html',
  ctaTexto: 'Descobrir bailes',
});

async function carregar() {
  mostrarEstado('carregando');
  const usuario = await obterUsuarioAtual();

  if (!usuario) {
    mostrarEstado('bloqueado');
    return;
  }

  try {
    const [idsEventos, idsMarcas] = await Promise.all([
      listarFavoritos(usuario.id),
      listarSeguindo(usuario.id),
    ]);

    const [eventos, marcas] = await Promise.all([
      listarEventosPorIds(idsEventos),
      listarMarcasPorIds(idsMarcas),
    ]);

    renderizarEventos(eventos);
    renderizarMarcas(marcas);
    mostrarEstado('conteudo');
  } catch (erro) {
    console.error('Não foi possível carregar seus favoritos:', erro);
    mostrarEstado('conteudo');
    listaEventos.innerHTML = estadoVazioHtml({
      icone: '⚠️',
      titulo: 'Não foi possível carregar agora',
      texto: 'Recarrega a página em instantes.',
      ctaHref: 'index.html',
      ctaTexto: 'Voltar para a Home',
    });
    vazioEventos.hidden = true;
    listaMarcas.innerHTML = '';
    vazioMarcas.hidden = true;
  }
}

function renderizarEventos(eventos) {
  if (eventos.length === 0) {
    listaEventos.innerHTML = VAZIO_EVENTOS;
    vazioEventos.hidden = true;
    return;
  }
  vazioEventos.hidden = true;
  listaEventos.innerHTML = eventos.map((evento) => cardEventoHtml(evento)).join('');
}

function renderizarMarcas(marcas) {
  if (marcas.length === 0) {
    listaMarcas.innerHTML = VAZIO_MARCAS;
    vazioMarcas.hidden = true;
    return;
  }
  vazioMarcas.hidden = true;
  listaMarcas.innerHTML = marcas
    .map((marca) => `
      <div class="local-mini">
        <div>
          <p style="font-weight: 600;">${escaparHtml(marca.nome)}</p>
        </div>
        <a href="marca.html?slug=${encodeURIComponent(marca.slug)}">Ver Marca</a>
      </div>
    `)
    .join('');
}

botaoEntrar.addEventListener('click', () => abrirModalLogin());

let jaCarregouLogado = false;
aoMudarAutenticacao((usuario) => {
  if (usuario && !jaCarregouLogado) {
    jaCarregouLogado = true;
    carregar();
  }
});

carregar();
