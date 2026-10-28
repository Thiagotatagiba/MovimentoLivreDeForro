// js/pages/carteira.js
// Carteira de ingressos: lista (próximos + arquivados), adicionar, abrir um
// ingresso (usado / desfazer / excluir). Os textos dos ingressos são digitados
// pela pessoa, então tudo é montado com textContent (ver utils/dom.js).

import { obterUsuarioAtual, aoMudarAutenticacao } from '../../services/authService.js';
import {
  listarIngressos, adicionarIngresso, marcarUsado, excluirIngresso, urlDaImagem,
} from '../../services/ingressoService.js';
import { listarEventosParaSugestao } from '../services/eventoService.js';
import { separarIngressos, dadosParaExibir, formatarDataBR } from '../utils/ingressos.js';
import { criar } from '../utils/dom.js';
import { abrirModalAdicionarIngresso } from '../../components/modalIngresso.js';
import { abrirDetalheIngresso } from '../../components/detalheIngresso.js';
import { abrirModalLogin } from '../../components/loginModal.js';

const $ = (id) => document.getElementById(id);
const secoes = {
  bloqueado: $('carteira-bloqueado'),
  carregando: $('carteira-carregando'),
  erro: $('carteira-erro'),
  conteudo: $('carteira-conteudo'),
};
const listaEl = $('lista-ingressos');
const vazioEl = $('vazio-ingressos');
const arquivadosEl = $('arquivados');
const listaArquivadosEl = $('lista-arquivados');
const arquivadosResumoEl = $('arquivados-resumo');

let usuario = null;
let ingressos = [];
let eventos = [];
let eventosPorId = new Map();

function mostrarEstado(estado) {
  for (const [nome, el] of Object.entries(secoes)) el.hidden = nome !== estado;
}

// Junta cada ingresso com o que deve aparecer na tela (catálogo ou cópia).
function montarItens() {
  return ingressos.map((ingresso) => {
    const doCatalogo = ingresso.eventoId ? eventosPorId.get(ingresso.eventoId) : null;
    const exibir = dadosParaExibir(ingresso, doCatalogo);
    // separarIngressos olha dataEvento/usadoEm — aqui vale a data exibida (a da
    // agenda, se o evento foi remarcado), não a cópia antiga.
    return { ingresso, exibir, dataEvento: exibir.dataEvento, usadoEm: ingresso.usadoEm };
  });
}

function cartao(item, arquivado) {
  const { ingresso, exibir } = item;
  const classes = ['ingresso-cartao'];
  if (ingresso.usadoEm) classes.push('usado');
  if (arquivado) classes.push('arquivado');
  return criar('button', {
    classe: classes.join(' '),
    attrs: { type: 'button' },
    aoClicar: () => abrirDetalhe(item),
    filhos: [
      criar('span', { classe: 'ingresso-cartao-titulo', texto: exibir.titulo }),
      criar('span', { classe: 'ingresso-cartao-data', texto: formatarDataBR(exibir.dataEvento) }),
      ingresso.usadoEm ? criar('span', { classe: 'ingresso-selo', texto: 'Usado' }) : null,
    ],
  });
}

function renderizar() {
  const { ativos, arquivados } = separarIngressos(montarItens());

  listaEl.replaceChildren(...ativos.map((item) => cartao(item, false)));
  if (ativos.length === 0) {
    vazioEl.textContent = ingressos.length === 0
      ? 'Sua carteira está vazia. Tire um print do ingresso (com o QR code), toque em "Adicionar ingresso" e anexe o print.'
      : 'Nenhum ingresso para os próximos eventos.';
    vazioEl.hidden = false;
  } else {
    vazioEl.hidden = true;
  }

  listaArquivadosEl.replaceChildren(...arquivados.map((item) => cartao(item, true)));
  arquivadosEl.hidden = arquivados.length === 0;
  arquivadosResumoEl.textContent = `Ingressos arquivados (${arquivados.length})`;
}

function atualizarIngresso(novo) {
  ingressos = ingressos.map((i) => (i.id === novo.id ? novo : i));
  renderizar();
  return novo;
}

function abrirDetalhe(item) {
  abrirDetalheIngresso({
    ingresso: item.ingresso,
    exibir: item.exibir,
    carregarImagem: urlDaImagem,
    acoes: {
      marcarUsado: async (ing) => atualizarIngresso(await marcarUsado(ing.id, true)),
      desfazerUsado: async (ing) => atualizarIngresso(await marcarUsado(ing.id, false)),
      excluir: async (ing) => {
        await excluirIngresso(ing);
        ingressos = ingressos.filter((i) => i.id !== ing.id);
        renderizar();
      },
    },
  });
}

function abrirAdicionar() {
  abrirModalAdicionarIngresso({
    eventos,
    aoSalvar: async (dados) => {
      const novo = await adicionarIngresso({ usuarioId: usuario.id, ...dados });
      ingressos = [...ingressos, novo];
      renderizar();
    },
  });
}

async function carregar() {
  mostrarEstado('carregando');
  usuario = await obterUsuarioAtual();
  if (!usuario) return mostrarEstado('bloqueado');

  try {
    const [lista, catalogo] = await Promise.all([
      listarIngressos(usuario.id),
      // sem o catálogo a carteira funciona igual; só perde a sugestão de eventos
      listarEventosParaSugestao().catch((erro) => {
        console.warn('Não foi possível carregar a agenda pras sugestões:', erro);
        return [];
      }),
    ]);
    ingressos = lista;
    eventos = catalogo;
    eventosPorId = new Map(catalogo.map((e) => [e.id, e]));
    renderizar();
    mostrarEstado('conteudo');
  } catch (erro) {
    console.error('Não foi possível carregar a carteira:', erro);
    mostrarEstado('erro');
  }
}

$('carteira-botao-entrar').addEventListener('click', () => abrirModalLogin());
$('carteira-tentar-de-novo').addEventListener('click', () => carregar());
$('carteira-adicionar').addEventListener('click', () => abrirAdicionar());

let jaCarregouLogado = false;
aoMudarAutenticacao((novoUsuario) => {
  if (novoUsuario && !jaCarregouLogado) {
    jaCarregouLogado = true;
    carregar();
  } else if (!novoUsuario) {
    // saiu da conta: não deixa os ingressos na tela
    jaCarregouLogado = false;
    usuario = null;
    ingressos = [];
    listaEl.replaceChildren();
    listaArquivadosEl.replaceChildren();
    mostrarEstado('bloqueado');
  }
});

carregar();
