// js/pages/perfil.js
// Página de VISUALIZAÇÃO do perfil (somente leitura). A edição em si vive
// em js/pages/perfil-editar.js — cada página com uma responsabilidade só.

import { obterUsuarioAtual, aoMudarAutenticacao } from '../../services/authService.js';
import { obterPerfil } from '../../services/perfilService.js';
import { abrirModalLogin } from '../../components/loginModal.js';

const secaoBloqueada = document.getElementById('perfil-bloqueado');
const secaoCarregando = document.getElementById('perfil-carregando');
const secaoVisualizacao = document.getElementById('perfil-visualizacao');
const botaoEntrar = document.getElementById('perfil-botao-entrar');

const AVATAR_PADRAO = 'assets/icons/avatar-padrao.svg';

const els = {
  avatar: document.getElementById('perfil-avatar'),
  apelido: document.getElementById('perfil-card-apelido'),
  nomeCompleto: document.getElementById('perfil-card-nome-completo'),
  bio: document.getElementById('perfil-card-bio'),

  itemLocalizacao: document.getElementById('item-localizacao'),
  valorLocalizacao: document.getElementById('valor-localizacao'),

  itemInstagram: document.getElementById('item-instagram'),
  valorInstagram: document.getElementById('valor-instagram'),

  itemWhatsapp: document.getElementById('item-whatsapp'),
  valorWhatsapp: document.getElementById('valor-whatsapp'),

  itemNascimento: document.getElementById('item-nascimento'),
  valorNascimento: document.getElementById('valor-nascimento'),

  itemGenero: document.getElementById('item-genero'),
  valorGenero: document.getElementById('valor-genero'),

  valorEmail: document.getElementById('valor-email')
};

const ROTULOS_GENERO = {
  feminino: 'Feminino',
  masculino: 'Masculino',
  'nao-binario': 'Não-binário',
  outro: 'Outro'
};

function mostrarEstado(estado) {
  secaoBloqueada.hidden = estado !== 'bloqueado';
  secaoCarregando.hidden = estado !== 'carregando';
  secaoVisualizacao.hidden = estado !== 'visualizacao';
}

function formatarData(dataIso) {
  if (!dataIso) return '';
  const [ano, mes, dia] = dataIso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function preencherCampoOpcional(itemEl, valorEl, valor, formatador) {
  if (valor) {
    valorEl.textContent = formatador ? formatador(valor) : valor;
    itemEl.hidden = false;
  } else {
    itemEl.hidden = true;
  }
}

function renderizar(usuario, perfil) {
  els.avatar.src = perfil?.avatar_url || AVATAR_PADRAO;
  els.apelido.textContent = perfil?.apelido || perfil?.nome || 'Forrozeiro';

  const nomeCompleto = [perfil?.nome, perfil?.sobrenome].filter(Boolean).join(' ');
  if (nomeCompleto && nomeCompleto !== els.apelido.textContent) {
    els.nomeCompleto.textContent = nomeCompleto;
    els.nomeCompleto.hidden = false;
  } else {
    els.nomeCompleto.hidden = true;
  }

  if (perfil?.bio) {
    els.bio.textContent = perfil.bio;
    els.bio.hidden = false;
  } else {
    els.bio.hidden = true;
  }

  const localizacao = [perfil?.cidade, perfil?.estado, perfil?.pais].filter(Boolean).join(', ');
  preencherCampoOpcional(els.itemLocalizacao, els.valorLocalizacao, localizacao);

  if (perfil?.instagram) {
    const usuarioInsta = perfil.instagram.replace(/^@/, '');
    els.valorInstagram.textContent = `@${usuarioInsta}`;
    els.valorInstagram.href = `https://instagram.com/${usuarioInsta}`;
    els.itemInstagram.hidden = false;
  } else {
    els.itemInstagram.hidden = true;
  }

  preencherCampoOpcional(els.itemWhatsapp, els.valorWhatsapp, perfil?.telefone);
  preencherCampoOpcional(els.itemNascimento, els.valorNascimento, perfil?.data_nascimento, formatarData);
  preencherCampoOpcional(els.itemGenero, els.valorGenero, perfil?.genero, (g) => ROTULOS_GENERO[g] || g);

  els.valorEmail.textContent = usuario.email || '';
}

async function carregar() {
  mostrarEstado('carregando');
  const usuario = await obterUsuarioAtual();

  if (!usuario) {
    mostrarEstado('bloqueado');
    return;
  }

  try {
    const perfil = await obterPerfil(usuario.id);
    renderizar(usuario, perfil);
    mostrarEstado('visualizacao');
  } catch (erro) {
    console.error('Não foi possível carregar o perfil:', erro);
    // Mesmo com erro, mostra o que dá pra mostrar (e-mail da sessão) em vez
    // de travar a pessoa numa tela de carregando pra sempre.
    renderizar(usuario, null);
    mostrarEstado('visualizacao');
  }
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
