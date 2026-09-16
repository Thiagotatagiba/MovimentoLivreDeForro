// locais.js — aba de Locais
import { estado } from './estado.js';
import { salvarJSON } from './fileAccess.js';
import { paraSlug, proximoId } from './util.js';

const listaEl = document.getElementById('lista-locais');
const modalEl = document.getElementById('modal-local');
const formEl = document.getElementById('form-local');
const tituloModalEl = document.getElementById('modal-local-titulo');
const erroEl = document.getElementById('erro-local');

let editandoId = null;

export function renderizarLocais() {
  const ordenados = [...estado.locais].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  listaEl.innerHTML = ordenados.map((local) => `
    <div class="admin-item${local.ativo ? '' : ' inativo'}">
      <div class="admin-item-info">
        <strong>${local.nome}</strong>
        <span>${local.tipo ?? ''} · ${local.endereco?.bairro ?? ''}, ${local.endereco?.cidade ?? ''}</span>
      </div>
      <div class="admin-item-acoes">
        <span class="admin-badge${local.ativo ? '' : ' inativo'}">${local.ativo ? 'Ativo' : 'Inativo'}</span>
        <button type="button" class="admin-botao" data-editar="${local.id}">Editar</button>
      </div>
    </div>
  `).join('') || '<p class="admin-campo-ajuda">Nenhum Local cadastrado ainda.</p>';

  listaEl.querySelectorAll('[data-editar]').forEach((botao) => {
    botao.addEventListener('click', () => abrirFormulario(botao.dataset.editar));
  });
}

export function abrirFormulario(id = null) {
  editandoId = id;
  erroEl.hidden = true;
  formEl.reset();

  const local = id ? estado.locais.find((l) => l.id === id) : null;
  tituloModalEl.textContent = local ? `Editar: ${local.nome}` : 'Novo local';

  document.getElementById('lc-nome').value = local?.nome ?? '';
  document.getElementById('lc-tipo').value = local?.tipo ?? '';
  document.getElementById('lc-logradouro').value = local?.endereco?.logradouro ?? '';
  document.getElementById('lc-numero').value = local?.endereco?.numero ?? '';
  document.getElementById('lc-bairro').value = local?.endereco?.bairro ?? '';
  document.getElementById('lc-cidade').value = local?.endereco?.cidade ?? '';
  document.getElementById('lc-estado').value = local?.endereco?.estado ?? '';
  document.getElementById('lc-cep').value = local?.endereco?.cep ?? '';
  document.getElementById('lc-complemento').value = local?.endereco?.complemento ?? '';
  document.getElementById('lc-latitude').value = local?.latitude ?? '';
  document.getElementById('lc-longitude').value = local?.longitude ?? '';
  document.getElementById('lc-maps-link').value = local?.mapsLink ?? '';
  document.getElementById('lc-descricao').value = local?.descricao ?? '';
  document.getElementById('lc-instagram').value = local?.instagram ?? '';
  document.getElementById('lc-telefone').value = local?.telefone ?? '';
  document.getElementById('lc-site').value = local?.site ?? '';
  document.getElementById('lc-ativo').checked = local?.ativo ?? true;

  modalEl.hidden = false;
}

function fecharFormulario() {
  modalEl.hidden = true;
  editandoId = null;
}

function numeroOuNulo(texto) {
  const limpo = texto.trim();
  if (!limpo) return null;
  const numero = Number(limpo);
  return Number.isNaN(numero) ? null : numero;
}

function textoOuNulo(texto) {
  const limpo = texto.trim();
  return limpo || null;
}

async function salvar(evento) {
  evento.preventDefault();
  erroEl.hidden = true;

  const nome = document.getElementById('lc-nome').value.trim();
  if (!nome) return;

  const existente = editandoId ? estado.locais.find((l) => l.id === editandoId) : null;

  const local = {
    id: existente?.id ?? proximoId(estado.locais, 'loc'),
    slug: existente?.slug ?? paraSlug(nome),
    nome,
    tipo: textoOuNulo(document.getElementById('lc-tipo').value),
    endereco: {
      cep: textoOuNulo(document.getElementById('lc-cep').value),
      logradouro: textoOuNulo(document.getElementById('lc-logradouro').value),
      numero: textoOuNulo(document.getElementById('lc-numero').value),
      complemento: textoOuNulo(document.getElementById('lc-complemento').value),
      bairro: textoOuNulo(document.getElementById('lc-bairro').value),
      cidade: textoOuNulo(document.getElementById('lc-cidade').value),
      estado: textoOuNulo(document.getElementById('lc-estado').value)?.toUpperCase() ?? null,
    },
    latitude: numeroOuNulo(document.getElementById('lc-latitude').value),
    longitude: numeroOuNulo(document.getElementById('lc-longitude').value),
    mapsLink: textoOuNulo(document.getElementById('lc-maps-link').value),
    fotoCapa: existente?.fotoCapa ?? null,
    fotoPerfil: existente?.fotoPerfil ?? null,
    instagram: textoOuNulo(document.getElementById('lc-instagram').value),
    site: textoOuNulo(document.getElementById('lc-site').value),
    telefone: textoOuNulo(document.getElementById('lc-telefone').value),
    descricao: textoOuNulo(document.getElementById('lc-descricao').value),
    ativo: document.getElementById('lc-ativo').checked,
    origem: existente?.origem ?? 'manual',
    criadoEm: existente?.criadoEm ?? new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };

  try {
    if (existente) {
      const indice = estado.locais.findIndex((l) => l.id === existente.id);
      estado.locais[indice] = local;
    } else {
      estado.locais.push(local);
    }

    await salvarJSON('locais.json', estado.locais);
    fecharFormulario();
    renderizarLocais();
  } catch (erro) {
    console.error(erro);
    erroEl.textContent = `Não foi possível salvar: ${erro.message}`;
    erroEl.hidden = false;
  }
}

export function configurarAbaLocais() {
  document.getElementById('botao-novo-local').addEventListener('click', () => abrirFormulario(null));
  document.getElementById('botao-cancelar-local').addEventListener('click', fecharFormulario);
  formEl.addEventListener('submit', salvar);
}
