// marcas.js — aba de Marcas
import { estado } from './estado.js';
import { salvarJSON } from './fileAccess.js';
import { paraSlug, proximoId, textoParaLista, listaParaTexto } from './util.js';

const listaEl = document.getElementById('lista-marcas');
const modalEl = document.getElementById('modal-marca');
const formEl = document.getElementById('form-marca');
const tituloModalEl = document.getElementById('modal-marca-titulo');
const erroEl = document.getElementById('erro-marca');
const localPadraoSelectEl = document.getElementById('mr-local-padrao');

let editandoId = null;

export function renderizarMarcas() {
  const ordenadas = [...estado.marcas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  listaEl.innerHTML = ordenadas.map((marca) => {
    const local = estado.locais.find((l) => l.id === marca.localPadraoId);
    return `
      <div class="admin-item${marca.ativo ? '' : ' inativo'}">
        <div class="admin-item-info">
          <strong>${marca.nome}</strong>
          <span>${marca.cidadeBase ?? ''} · ${local?.nome ?? 'sem local padrão'}</span>
        </div>
        <div class="admin-item-acoes">
          <span class="admin-badge${marca.ativo ? '' : ' inativo'}">${marca.ativo ? 'Ativa' : 'Inativa'}</span>
          <button type="button" class="admin-botao" data-editar="${marca.id}">Editar</button>
        </div>
      </div>
    `;
  }).join('') || '<p class="admin-campo-ajuda">Nenhuma Marca cadastrada ainda.</p>';

  listaEl.querySelectorAll('[data-editar]').forEach((botao) => {
    botao.addEventListener('click', () => abrirFormulario(botao.dataset.editar));
  });
}

function popularSelectDeLocais(localPadraoIdAtual) {
  const opcoes = estado.locais
    .filter((l) => l.ativo)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((l) => `<option value="${l.id}" ${l.id === localPadraoIdAtual ? 'selected' : ''}>${l.nome}</option>`)
    .join('');

  localPadraoSelectEl.innerHTML = `<option value="">Nenhum ainda</option>${opcoes}`;
}

export function abrirFormulario(id = null) {
  editandoId = id;
  erroEl.hidden = true;
  formEl.reset();

  const marca = id ? estado.marcas.find((m) => m.id === id) : null;
  tituloModalEl.textContent = marca ? `Editar: ${marca.nome}` : 'Nova marca';

  popularSelectDeLocais(marca?.localPadraoId ?? '');

  document.getElementById('mr-nome').value = marca?.nome ?? '';
  document.getElementById('mr-descricao').value = marca?.descricao ?? '';
  document.getElementById('mr-frequencia').value = marca?.frequencia ?? '';
  document.getElementById('mr-cidade').value = marca?.cidadeBase ?? '';
  document.getElementById('mr-categorias').value = listaParaTexto(marca?.categorias);
  document.getElementById('mr-instagram').value = marca?.instagram ?? '';
  document.getElementById('mr-whatsapp').value = marca?.whatsapp ?? '';
  document.getElementById('mr-site').value = marca?.site ?? '';
  document.getElementById('mr-ativo').checked = marca?.ativo ?? true;

  modalEl.hidden = false;
}

function fecharFormulario() {
  modalEl.hidden = true;
  editandoId = null;
}

function textoOuNulo(texto) {
  const limpo = texto.trim();
  return limpo || null;
}

async function salvar(evento) {
  evento.preventDefault();
  erroEl.hidden = true;

  const nome = document.getElementById('mr-nome').value.trim();
  if (!nome) return;

  const existente = editandoId ? estado.marcas.find((m) => m.id === editandoId) : null;

  const marca = {
    id: existente?.id ?? proximoId(estado.marcas, 'mrc'),
    slug: existente?.slug ?? paraSlug(nome),
    nome,
    descricao: document.getElementById('mr-descricao').value.trim(),
    frequencia: textoOuNulo(document.getElementById('mr-frequencia').value),
    categorias: textoParaLista(document.getElementById('mr-categorias').value),
    cidadeBase: textoOuNulo(document.getElementById('mr-cidade').value),
    localPadraoId: textoOuNulo(document.getElementById('mr-local-padrao').value),
    instagram: textoOuNulo(document.getElementById('mr-instagram').value),
    whatsapp: textoOuNulo(document.getElementById('mr-whatsapp').value),
    site: textoOuNulo(document.getElementById('mr-site').value),
    logo: existente?.logo ?? null,
    ativo: document.getElementById('mr-ativo').checked,
  };

  try {
    if (existente) {
      const indice = estado.marcas.findIndex((m) => m.id === existente.id);
      estado.marcas[indice] = marca;
    } else {
      estado.marcas.push(marca);
    }

    await salvarJSON('marcas.json', estado.marcas);
    fecharFormulario();
    renderizarMarcas();
  } catch (erro) {
    console.error(erro);
    erroEl.textContent = `Não foi possível salvar: ${erro.message}`;
    erroEl.hidden = false;
  }
}

export function configurarAbaMarcas() {
  document.getElementById('botao-nova-marca').addEventListener('click', () => abrirFormulario(null));
  document.getElementById('botao-cancelar-marca').addEventListener('click', fecharFormulario);
  formEl.addEventListener('submit', salvar);
}
