// marcas.js — aba de Marcas
import { estado } from './estado.js';
import { salvarJSON } from './fileAccess.js';
import { paraSlug, proximoId, textoParaLista, listaParaTexto } from './util.js';
import { criarCampoImagem } from './campoImagem.js';
import { gravarImagem, limparOutrasVersoes } from './imagensMarca.js';

const listaEl = document.getElementById('lista-marcas');
const modalEl = document.getElementById('modal-marca');
const formEl = document.getElementById('form-marca');
const tituloModalEl = document.getElementById('modal-marca-titulo');
const erroEl = document.getElementById('erro-marca');
const localPadraoSelectEl = document.getElementById('mr-local-padrao');

let editandoId = null;

// Slug da marca em edição; pra uma marca nova, o que vai ser gerado a partir do nome.
function slugAtual() {
  const existente = editandoId ? estado.marcas.find((m) => m.id === editandoId) : null;
  return existente?.slug ?? paraSlug(document.getElementById('mr-nome').value.trim());
}

const campos = {
  logo: criarCampoImagem({ tipo: 'logo', obterSlug: slugAtual }),
  capa: criarCampoImagem({ tipo: 'capa', obterSlug: slugAtual }),
};

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

function marcarDiasSemana(diasSemana) {
  document.querySelectorAll('#mr-dias-semana input[type="checkbox"]').forEach((caixa) => {
    caixa.checked = diasSemana.includes(caixa.value);
  });
}

function diasSemanaMarcados() {
  return [...document.querySelectorAll('#mr-dias-semana input[type="checkbox"]:checked')]
    .map((caixa) => caixa.value);
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
  marcarDiasSemana(marca?.diasSemana ?? []);
  document.getElementById('mr-categorias').value = listaParaTexto(marca?.categorias);
  document.getElementById('mr-instagram').value = marca?.instagram ?? '';
  document.getElementById('mr-whatsapp').value = marca?.whatsapp ?? '';
  document.getElementById('mr-site').value = marca?.site ?? '';
  campos.logo.carregar(marca?.logo);
  campos.capa.carregar(marca?.capa);
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

  const slug = existente?.slug ?? paraSlug(nome);

  const marca = {
    id: existente?.id ?? proximoId(estado.marcas, 'mrc'),
    slug,
    nome,
    descricao: document.getElementById('mr-descricao').value.trim(),
    frequencia: textoOuNulo(document.getElementById('mr-frequencia').value),
    diasSemana: diasSemanaMarcados(),
    categorias: textoParaLista(document.getElementById('mr-categorias').value),
    cidadeBase: textoOuNulo(document.getElementById('mr-cidade').value),
    localPadraoId: textoOuNulo(document.getElementById('mr-local-padrao').value),
    instagram: textoOuNulo(document.getElementById('mr-instagram').value),
    whatsapp: textoOuNulo(document.getElementById('mr-whatsapp').value),
    site: textoOuNulo(document.getElementById('mr-site').value),
    logo: existente?.logo ?? null,
    capa: existente?.capa ?? null,
    ativo: document.getElementById('mr-ativo').checked,
  };

  try {
    // 1) grava as imagens novas (ainda sem apagar nada) e ajusta os caminhos
    const aLimpar = []; // [tipo, nomeAManter] — limpeza só depois do JSON salvo
    for (const tipo of ['logo', 'capa']) {
      const { arquivo, remover } = campos[tipo].pendente();
      if (arquivo) {
        const gravada = await gravarImagem({ slug, tipo, arquivo });
        marca[tipo] = gravada.caminho;
        aLimpar.push([tipo, gravada.nome]);
      } else if (remover) {
        marca[tipo] = null;
        aLimpar.push([tipo, null]);
      }
    }

    if (existente) {
      const indice = estado.marcas.findIndex((m) => m.id === existente.id);
      estado.marcas[indice] = marca;
    } else {
      estado.marcas.push(marca);
    }

    // 2) JSON salvo
    await salvarJSON('marcas.json', estado.marcas);

    // 3) só agora apaga as versões antigas das imagens (ex: logo.jpg trocada
    //    por logo.png). Se falhar, sobra um arquivo sobrando — inofensivo.
    for (const [tipo, manter] of aLimpar) {
      try {
        await limparOutrasVersoes(slug, tipo, manter);
      } catch (erro) {
        console.warn(`Não consegui apagar versões antigas da ${tipo}:`, erro);
      }
    }

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
  document.getElementById('mr-nome').addEventListener('input', () => {
    campos.logo.atualizarInfo();
    campos.capa.atualizarInfo();
  });
}
