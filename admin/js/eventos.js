// eventos.js — aba de Eventos
import { estado } from './estado.js';
import { salvarJSON } from './fileAccess.js';
import { paraSlug, proximoId, textoParaLista } from './util.js';
import { validarLocalDoEvento } from '../../js/services/eventValidator.js';

const listaEl = document.getElementById('lista-eventos');
const modalEl = document.getElementById('modal-evento');
const formEl = document.getElementById('form-evento');
const tituloModalEl = document.getElementById('modal-evento-titulo');
const erroEl = document.getElementById('erro-evento');

const marcaSelectEl = document.getElementById('ev-marca');
const grupoLocalFixoEl = document.getElementById('grupo-local-fixo');
const localFixoEl = document.getElementById('ev-local-fixo');
const grupoLocalLivreEl = document.getElementById('grupo-local-livre');
const localSelectEl = document.getElementById('ev-local-select');
const slugEl = document.getElementById('ev-slug');
const dataEl = document.getElementById('ev-data');

let editandoId = null;
let slugEditadoManualmente = false;

export function renderizarEventos() {
  const ordenados = [...estado.eventos].sort((a, b) => a.data.localeCompare(b.data));

  listaEl.innerHTML = ordenados.map((evt) => {
    const marca = estado.marcas.find((m) => m.id === evt.marcaId);
    const local = estado.locais.find((l) => l.id === evt.localId);
    return `
      <div class="admin-item${evt.ativo ? '' : ' inativo'}">
        <div class="admin-item-info">
          <strong>${evt.titulo}</strong>
          <span>${evt.data} · ${evt.horario} · ${marca?.nome ?? 'Marca?'} · ${local?.nome ?? 'Local?'}</span>
        </div>
        <div class="admin-item-acoes">
          <span class="admin-badge${evt.ativo ? '' : ' inativo'}">${evt.ativo ? 'Ativo' : 'Inativo'}</span>
          <button type="button" class="admin-botao" data-editar="${evt.id}">Editar</button>
        </div>
      </div>
    `;
  }).join('') || '<p class="admin-campo-ajuda">Nenhum evento cadastrado ainda.</p>';

  listaEl.querySelectorAll('[data-editar]').forEach((botao) => {
    botao.addEventListener('click', () => abrirFormulario(botao.dataset.editar));
  });
}

function popularSelectDeMarcas(marcaIdAtual) {
  const opcoes = [...estado.marcas]
    .filter((m) => m.ativo)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((m) => `<option value="${m.id}" ${m.id === marcaIdAtual ? 'selected' : ''}>${m.nome}</option>`)
    .join('');

  marcaSelectEl.innerHTML = opcoes;
}

function popularSelectDeLocaisLivre(localIdAtual) {
  const opcoes = [...estado.locais]
    .filter((l) => l.ativo)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((l) => `<option value="${l.id}" ${l.id === localIdAtual ? 'selected' : ''}>${l.nome}</option>`)
    .join('');

  localSelectEl.innerHTML = opcoes;
}

// O Local do Evento respeita o(s) Local(is) da Marca (ver DECISOES_DE_ARQUITETURA.md,
// 2026-08-26). Hoje uma Marca só tem 1 Local possível — então em vez de deixar
// escolher livremente e só avisar depois se bateu errado, a UI já trava o campo
// no Local certo sempre que a Marca tiver um localPadraoId definido.
function atualizarCampoDeLocal(localIdParaManter) {
  const marca = estado.marcas.find((m) => m.id === marcaSelectEl.value);

  if (marca?.localPadraoId) {
    const local = estado.locais.find((l) => l.id === marca.localPadraoId);
    localFixoEl.value = local ? local.nome : '(Local não encontrado — confira o localPadraoId da Marca)';
    grupoLocalFixoEl.hidden = false;
    grupoLocalLivreEl.hidden = true;
  } else {
    popularSelectDeLocaisLivre(localIdParaManter);
    grupoLocalFixoEl.hidden = true;
    grupoLocalLivreEl.hidden = false;
  }
}

function localIdSelecionadoAtualmente() {
  const marca = estado.marcas.find((m) => m.id === marcaSelectEl.value);
  return marca?.localPadraoId || localSelectEl.value || null;
}

function sugerirSlug() {
  if (slugEditadoManualmente) return;
  const marca = estado.marcas.find((m) => m.id === marcaSelectEl.value);
  if (!marca || !dataEl.value) return;
  slugEl.value = `${marca.slug}-${dataEl.value}`;
}

export function abrirFormulario(id = null) {
  editandoId = id;
  erroEl.hidden = true;
  slugEditadoManualmente = false;
  formEl.reset();

  const evt = id ? estado.eventos.find((e) => e.id === id) : null;
  tituloModalEl.textContent = evt ? `Editar: ${evt.titulo}` : 'Novo evento';

  popularSelectDeMarcas(evt?.marcaId ?? estado.marcas[0]?.id ?? '');

  document.getElementById('ev-titulo').value = evt?.titulo ?? '';
  dataEl.value = evt?.data ?? '';
  document.getElementById('ev-horario').value = evt?.horario ?? '';
  document.getElementById('ev-descricao').value = evt?.descricao ?? '';
  document.getElementById('ev-preco').value = evt?.ingresso?.precoAPartirDe ?? 0;
  document.getElementById('ev-plataforma').value = evt?.ingresso?.plataforma ?? '';
  document.getElementById('ev-link').value = evt?.ingresso?.link ?? '';
  document.getElementById('ev-bandas').value = (evt?.lineup?.bandas ?? []).join(', ');
  document.getElementById('ev-djs').value = (evt?.lineup?.djs ?? []).join(', ');
  document.getElementById('ev-imagem').value = evt?.imagemUrl ?? 'em breve';
  document.getElementById('ev-ativo').checked = evt?.ativo ?? true;
  slugEl.value = evt?.slug ?? '';
  slugEditadoManualmente = !!evt; // editando um evento existente, não mexe no slug sozinho

  atualizarCampoDeLocal(evt?.localId ?? null);

  modalEl.hidden = false;
}

function fecharFormulario() {
  modalEl.hidden = true;
  editandoId = null;
}

async function salvar(eventoSubmit) {
  eventoSubmit.preventDefault();
  erroEl.hidden = true;

  const titulo = document.getElementById('ev-titulo').value.trim();
  const marcaId = marcaSelectEl.value;
  const localId = localIdSelecionadoAtualmente();
  const data = dataEl.value;

  if (!titulo || !marcaId || !localId || !data) {
    erroEl.textContent = 'Preencha ao menos Título, Marca, Local e Data.';
    erroEl.hidden = false;
    return;
  }

  const existente = editandoId ? estado.eventos.find((e) => e.id === editandoId) : null;

  const novoEvento = {
    id: existente?.id ?? proximoId(estado.eventos, 'evt'),
    slug: slugEl.value.trim() || paraSlug(`${titulo}-${data}`),
    marcaId,
    localId,
    titulo,
    data,
    horario: document.getElementById('ev-horario').value,
    descricao: document.getElementById('ev-descricao').value.trim(),
    ingresso: {
      precoAPartirDe: Number(document.getElementById('ev-preco').value) || 0,
      link: document.getElementById('ev-link').value.trim() || 'em breve',
      plataforma: document.getElementById('ev-plataforma').value.trim() || 'Na porta',
    },
    lineup: {
      bandas: textoParaLista(document.getElementById('ev-bandas').value),
      djs: textoParaLista(document.getElementById('ev-djs').value),
    },
    imagemUrl: document.getElementById('ev-imagem').value.trim() || 'em breve',
    ativo: document.getElementById('ev-ativo').checked,
  };

  // Camada extra de segurança: mesmo a UI já travando o Local certo, roda a
  // mesma checagem que o site público usa antes de gravar no disco.
  const marca = estado.marcas.find((m) => m.id === marcaId);
  const validacao = validarLocalDoEvento(novoEvento, marca);
  if (!validacao.valido) {
    erroEl.textContent = validacao.motivo;
    erroEl.hidden = false;
    return;
  }

  try {
    if (existente) {
      const indice = estado.eventos.findIndex((e) => e.id === existente.id);
      estado.eventos[indice] = novoEvento;
    } else {
      estado.eventos.push(novoEvento);
    }

    await salvarJSON('eventos.json', estado.eventos);
    fecharFormulario();
    renderizarEventos();
  } catch (erro) {
    console.error(erro);
    erroEl.textContent = `Não foi possível salvar: ${erro.message}`;
    erroEl.hidden = false;
  }
}

export function configurarAbaEventos() {
  document.getElementById('botao-novo-evento').addEventListener('click', () => abrirFormulario(null));
  document.getElementById('botao-cancelar-evento').addEventListener('click', fecharFormulario);
  formEl.addEventListener('submit', salvar);

  marcaSelectEl.addEventListener('change', () => {
    atualizarCampoDeLocal(null);
    sugerirSlug();
  });
  dataEl.addEventListener('change', sugerirSlug);
  slugEl.addEventListener('input', () => { slugEditadoManualmente = true; });
}
