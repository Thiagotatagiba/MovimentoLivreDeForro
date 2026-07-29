import { marcasService } from "../services/marcasService.js";
import { locaisService } from "../services/locaisService.js";
import { eventosAdminStorage } from "./eventosAdminStorage.js";
import { validarEvento } from "./eventValidator.js";
import { criarFormulario } from "./formularioGenerico.js";
import { criarSchemaEvento } from "./eventoCampos.js";

let eventos = [];
let marcas = [];
let locais = [];
let eventoSelecionadoId = null;
let slugEditadoManualmente = false;
let sujo = false;
let formulario = null;

const els = {
  inputArquivo: document.querySelector("#admin-input-arquivo"),
  btnCarregar: document.querySelector("#btn-carregar"),
  btnNovo: document.querySelector("#btn-novo"),
  btnDuplicar: document.querySelector("#btn-duplicar"),
  btnExcluir: document.querySelector("#btn-excluir"),
  btnBaixar: document.querySelector("#btn-baixar"),
  status: document.querySelector("#admin-status"),
  mensagem: document.querySelector("#admin-mensagem"),
  busca: document.querySelector("#admin-busca"),
  lista: document.querySelector("#admin-lista-eventos"),
  areaFormulario: document.querySelector("#admin-form-area"),
};

function slugify(texto) {
  return texto
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function eventoEmBranco() {
  let slug = "novo-evento";
  let n = 2;
  while (eventos.some((e) => e.slug === slug)) slug = `novo-evento-${n++}`;
  return {
    id: `evt-${slug}`, slug, titulo: "", descricao: "",
    inicio: "", fim: null, fusoHorario: "America/Sao_Paulo", cidade: "",
    marcaSlug: "", localSlug: "", enderecoTexto: null, tipo: "Baile",
    ingresso: { tipo: "antecipado", precoAPartirDe: null, link: null, plataforma: null },
    imagem: null, origem: "manual", idExterno: null, linkExterno: null,
    coordenadas: { latitude: null, longitude: null },
    status: "rascunho", atualizadoEm: new Date().toISOString(),
  };
}

function mostrarMensagem(texto, tipo = "sucesso") {
  els.mensagem.textContent = texto;
  els.mensagem.className = `admin-message admin-message--${tipo}`;
  els.mensagem.hidden = false;
  clearTimeout(mostrarMensagem._timer);
  mostrarMensagem._timer = setTimeout(() => { els.mensagem.hidden = true; }, 5000);
}

function marcarSujo() {
  sujo = true;
  els.status.hidden = false;
  els.status.textContent = "Alterações não salvas";
  els.status.className = "admin-status admin-status--dirty";
}
function marcarLimpo() {
  sujo = false;
  els.status.hidden = false;
  els.status.textContent = "Tudo baixado";
  els.status.className = "admin-status admin-status--clean";
}

function habilitarAcoes(ligado) {
  els.btnNovo.disabled = !ligado;
  els.btnBaixar.disabled = !ligado;
  els.busca.disabled = !ligado;
}
function habilitarAcoesDoEvento(ligado) {
  els.btnDuplicar.disabled = !ligado;
  els.btnExcluir.disabled = !ligado;
}

function renderLista() {
  const termo = els.busca.value.trim().toLowerCase();
  const marcasPorSlug = new Map(marcas.map((m) => [m.slug, m.nome]));
  els.lista.replaceChildren();

  const filtrados = eventos
    .filter((e) => !termo || e.titulo?.toLowerCase().includes(termo))
    .sort((a, b) => (a.inicio || "").localeCompare(b.inicio || ""));

  if (filtrados.length === 0) {
    const li = document.createElement("li");
    li.className = "admin-event-empty";
    li.textContent = eventos.length === 0 ? "Nenhum evento carregado ainda." : "Nada encontrado.";
    els.lista.appendChild(li);
    return;
  }

  filtrados.forEach((evento) => {
    const li = document.createElement("li");
    li.className = "admin-event-item" + (evento.id === eventoSelecionadoId ? " is-active" : "");
    const btn = document.createElement("button");
    btn.type = "button";
    const dataTxt = evento.inicio ? evento.inicio.replace("T", " ").slice(0, 16) : "(sem data)";
    btn.innerHTML = `
      <span class="admin-event-item-nome">${evento.titulo || "(sem título)"}</span>
      <span class="admin-event-item-meta">${dataTxt} · ${marcasPorSlug.get(evento.marcaSlug) ?? "sem marca"}</span>
    `;
    btn.addEventListener("click", () => selecionarEvento(evento.id));
    li.appendChild(btn);
    els.lista.appendChild(li);
  });
}

function eventosExcetoAtual() {
  return eventos.filter((e) => e.id !== eventoSelecionadoId);
}

function validarEExibir() {
  const atual = eventos.find((e) => e.id === eventoSelecionadoId);
  if (!atual) return { valido: true };
  const resultado = validarEvento(atual, {
    outrosEventos: eventosExcetoAtual(),
    marcasValidas: marcas.map((m) => m.slug),
    locaisValidos: locais.map((l) => l.slug),
  });
  formulario.mostrarErros(resultado.erros);
  return resultado;
}

function aoEditarCampo(nomeCampo) {
  const atual = eventos.find((e) => e.id === eventoSelecionadoId);
  if (!atual) return;

  if (nomeCampo === "slug") slugEditadoManualmente = true;
  if (nomeCampo === "titulo" && !slugEditadoManualmente) {
    const slugCampo = formulario.campoEl("slug");
    slugCampo.value = slugify(formulario.campoEl("titulo").value);
  }
  if (nomeCampo === "localSlug") {
    const local = locais.find((l) => l.slug === formulario.campoEl("localSlug").value);
    if (local) formulario.campoEl("cidade").value = local.endereco?.cidade ?? "";
  }

  const dados = formulario.ler();
  dados.id = `evt-${dados.slug}`;
  dados.fusoHorario = "America/Sao_Paulo";
  dados.origem = atual.origem ?? "manual";
  dados.atualizadoEm = new Date().toISOString();
  formulario.campoEl("id").value = dados.id;

  Object.assign(atual, dados);
  marcarSujo();
  validarEExibir();
  renderLista();
}

function selecionarEvento(id, { novo = false } = {}) {
  eventoSelecionadoId = id;
  slugEditadoManualmente = !novo; // evento existente: não sobrescreve o slug já definido
  habilitarAcoesDoEvento(true);

  els.areaFormulario.replaceChildren();
  const container = document.createElement("div");
  els.areaFormulario.appendChild(container);

  const schema = criarSchemaEvento({ marcas, locais });
  formulario = criarFormulario(container, schema, { onChange: aoEditarCampo });

  const evento = eventos.find((e) => e.id === id);
  formulario.preencher(evento);
  validarEExibir();
  renderLista();
}

function renderFormularioVazio() {
  els.areaFormulario.innerHTML = `<div class="admin-empty"><p>Selecione um evento na lista, ou crie um novo.</p></div>`;
  habilitarAcoesDoEvento(false);
}

async function init() {
  [marcas, locais] = await Promise.all([marcasService.listarTodos(), locaisService.listarTodos()]);

  els.btnCarregar.addEventListener("click", () => els.inputArquivo.click());

  els.inputArquivo.addEventListener("change", async (ev) => {
    const arquivo = ev.target.files[0];
    ev.target.value = ""; // permite recarregar o mesmo arquivo depois, se precisar
    if (!arquivo) return;
    try {
      eventos = await eventosAdminStorage.carregarDeArquivo(arquivo);
      eventoSelecionadoId = null;
      habilitarAcoes(true);
      renderFormularioVazio();
      renderLista();
      marcarLimpo();
      mostrarMensagem(`${eventos.length} eventos carregados de "${arquivo.name}".`, "sucesso");
    } catch (erro) {
      mostrarMensagem(`Não deu pra ler esse arquivo: ${erro.message}`, "erro");
    }
  });

  els.btnNovo.addEventListener("click", () => {
    const novo = eventoEmBranco();
    eventos.push(novo);
    selecionarEvento(novo.id, { novo: true });
    marcarSujo();
  });

  els.btnDuplicar.addEventListener("click", () => {
    const atual = eventos.find((e) => e.id === eventoSelecionadoId);
    if (!atual) return;
    const copia = structuredClone(atual);
    let slug = `${atual.slug}-copia`;
    let n = 2;
    while (eventos.some((e) => e.slug === slug)) slug = `${atual.slug}-copia-${n++}`;
    copia.slug = slug;
    copia.id = `evt-${slug}`;
    copia.titulo = `${atual.titulo} (cópia)`;
    copia.status = "rascunho";
    eventos.push(copia);
    selecionarEvento(copia.id, { novo: true });
    marcarSujo();
    mostrarMensagem("Evento duplicado — revise o slug e a data antes de baixar.", "sucesso");
  });

  els.btnExcluir.addEventListener("click", () => {
    const atual = eventos.find((e) => e.id === eventoSelecionadoId);
    if (!atual) return;
    const confirmado = confirm(
      `Excluir "${atual.titulo || atual.slug}"?\n\nIsso só afeta a cópia em memória desta página — o eventos.json original só muda se você baixar por cima dele.`
    );
    if (!confirmado) return;
    eventos = eventos.filter((e) => e.id !== atual.id);
    eventoSelecionadoId = null;
    renderFormularioVazio();
    renderLista();
    marcarSujo();
  });

  els.btnBaixar.addEventListener("click", () => {
    const problemas = eventos
      .map((e) => ({ e, r: validarEvento(e, { outrosEventos: eventos.filter((x) => x.id !== e.id), marcasValidas: marcas.map((m) => m.slug), locaisValidos: locais.map((l) => l.slug) }) }))
      .filter(({ r }) => !r.valido);

    if (problemas.length > 0) {
      mostrarMensagem(`${problemas.length} evento(s) com campos inválidos — corrija antes de baixar (ex.: "${problemas[0].e.titulo || problemas[0].e.slug}").`, "erro");
      return;
    }

    eventosAdminStorage.exportarParaArquivo(eventos);
    marcarLimpo();
    mostrarMensagem("Arquivo eventos.json baixado.", "sucesso");
  });

  els.busca.addEventListener("input", renderLista);

  window.addEventListener("beforeunload", (ev) => {
    if (sujo) { ev.preventDefault(); ev.returnValue = ""; }
  });
}

init();
