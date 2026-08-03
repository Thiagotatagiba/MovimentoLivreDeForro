import { carregarArrayDeArquivo, exportarArrayParaArquivo } from "./arquivoStorage.js";
import { validarEvento } from "./eventValidator.js";
import { criarFormulario } from "./formularioGenerico.js";
import { criarSchemaEvento } from "./eventoCampos.js";
import { validarMarca } from "./marcaValidator.js";
import { criarSchemaMarca } from "./marcaCampos.js";

// Estado em memória — populado inteiro na importação da pasta, nunca lido
// de fetch. É isso que torna o painel autossuficiente: Evento enxerga
// Marca e Local da MESMA importação, sem depender de um servidor rodando
// com dados "de verdade" por trás.
let eventos = [];
let marcas = [];
let locais = [];
let sujo = false;

let eventoSelecionadoId = null;
let marcaSelecionadaId = null;
let localSelecionadoId = null;
let formularioEvento = null;
let formularioMarca = null;
let slugEditadoManualmente = false;

const els = {
  inputPasta: document.querySelector("#admin-input-pasta"),
  btnImportar: document.querySelector("#btn-importar"),
  btnBaixarTudo: document.querySelector("#btn-baixar-tudo"),
  status: document.querySelector("#admin-status"),
  mensagem: document.querySelector("#admin-mensagem"),
  tabs: document.querySelector("#admin-tabs"),
  estadoVazio: document.querySelector("#admin-empty-state"),
  contagemEventos: document.querySelector("#contagem-eventos"),
  contagemMarcas: document.querySelector("#contagem-marcas"),
  contagemLocais: document.querySelector("#contagem-locais"),
};

function slugify(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function urlValida(valor) {
  if (!valor) return true;
  return /^https?:\/\//.test(valor) || valor.startsWith("assets/");
}
function enderecoIncompleto(endereco) {
  return !endereco?.cep && !endereco?.numero && !endereco?.bairro;
}
function normalizarLocalAntigo(bruto) {
  if (bruto.endereco && typeof bruto.endereco === "object") return bruto;
  const agora = new Date().toISOString();
  return {
    id: bruto.id, slug: bruto.slug, nome: bruto.nome, tipo: bruto.tipo || "Outro",
    endereco: { cep: "", logradouro: bruto.endereco || "", numero: "", complemento: null, bairro: "", cidade: bruto.cidade || "", estado: "ES" },
    latitude: bruto.latitude ?? null, longitude: bruto.longitude ?? null,
    mapsLink: bruto.mapsLink ?? null, fotoCapa: bruto.fotoCapa ?? null, fotoPerfil: bruto.fotoPerfil ?? null,
    instagram: bruto.instagram ?? null, site: bruto.site ?? null, telefone: bruto.telefone ?? null, descricao: bruto.descricao ?? null,
    ativo: bruto.ativo ?? true, origem: bruto.origem || "manual", criadoEm: bruto.criadoEm || agora, atualizadoEm: agora,
  };
}

function mostrarMensagem(texto, tipo = "sucesso") {
  els.mensagem.textContent = texto;
  els.mensagem.className = `admin-message admin-message--${tipo}`;
  els.mensagem.hidden = false;
  clearTimeout(mostrarMensagem._timer);
  mostrarMensagem._timer = setTimeout(() => { els.mensagem.hidden = true; }, 6000);
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

/* ==================== IMPORTAÇÃO DA PASTA ==================== */

async function importarPasta(fileList) {
  const arquivos = [...fileList];
  const achar = (nome) => arquivos.find((f) => f.name === nome && f.webkitRelativePath?.endsWith(nome));
  const fEventos = achar("eventos.json");
  const fMarcas = achar("marcas.json");
  const fLocais = achar("locais.json");

  if (!fEventos || !fMarcas || !fLocais) {
    const faltando = [!fEventos && "eventos.json", !fMarcas && "marcas.json", !fLocais && "locais.json"].filter(Boolean).join(", ");
    throw new Error(`a pasta selecionada não tem ${faltando}. Selecione a pasta "data" do projeto.`);
  }

  eventos = await carregarArrayDeArquivo(fEventos);
  marcas = await carregarArrayDeArquivo(fMarcas);
  locais = (await carregarArrayDeArquivo(fLocais)).map(normalizarLocalAntigo);
}

function atualizarContagens() {
  els.contagemEventos.textContent = eventos.length || "";
  els.contagemMarcas.textContent = marcas.length || "";
  els.contagemLocais.textContent = locais.length || "";
}

/* ==================== ABA EVENTOS ==================== */

function eventoEmBranco() {
  let slug = "novo-evento", n = 2;
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

function renderListaEventos() {
  const termo = document.querySelector("#busca-eventos").value.trim().toLowerCase();
  const lista = document.querySelector("#lista-eventos");
  const marcasPorSlug = new Map(marcas.map((m) => [m.slug, m.nome]));
  lista.replaceChildren();

  const filtrados = eventos
    .filter((e) => !termo || e.titulo?.toLowerCase().includes(termo))
    .sort((a, b) => (a.inicio || "").localeCompare(b.inicio || ""));

  if (filtrados.length === 0) {
    const li = document.createElement("li");
    li.className = "admin-event-empty";
    li.textContent = eventos.length === 0 ? "Nenhum evento importado." : "Nada encontrado.";
    lista.appendChild(li);
    return;
  }

  filtrados.forEach((evento) => {
    const li = document.createElement("li");
    li.className = "admin-event-item" + (evento.id === eventoSelecionadoId ? " is-active" : "");
    const btn = document.createElement("button");
    btn.type = "button";
    const dataTxt = evento.inicio ? evento.inicio.replace("T", " ").slice(0, 16) : "(sem data)";
    btn.innerHTML = `<span class="admin-event-item-nome">${evento.titulo || "(sem título)"}</span><span class="admin-event-item-meta">${dataTxt} · ${marcasPorSlug.get(evento.marcaSlug) ?? "sem marca"}</span>`;
    btn.addEventListener("click", () => selecionarEvento(evento.id));
    li.appendChild(btn);
    lista.appendChild(li);
  });
}

function validarEExibirEvento() {
  const atual = eventos.find((e) => e.id === eventoSelecionadoId);
  if (!atual) return;
  const resultado = validarEvento(atual, {
    outrosEventos: eventos.filter((e) => e.id !== eventoSelecionadoId),
    marcasValidas: marcas.map((m) => m.slug),
    locaisValidos: locais.map((l) => l.slug),
  });
  formularioEvento.mostrarErros(resultado.erros);
}

function aoEditarCampoEvento(nomeCampo) {
  const atual = eventos.find((e) => e.id === eventoSelecionadoId);
  if (!atual) return;

  if (nomeCampo === "slug") slugEditadoManualmente = true;
  if (nomeCampo === "titulo" && !slugEditadoManualmente) {
    formularioEvento.campoEl("slug").value = slugify(formularioEvento.campoEl("titulo").value);
  }
  if (nomeCampo === "localSlug") {
    const local = locais.find((l) => l.slug === formularioEvento.campoEl("localSlug").value);
    if (local) formularioEvento.campoEl("cidade").value = local.endereco?.cidade ?? "";
  }

  const dados = formularioEvento.ler();
  dados.id = `evt-${dados.slug}`;
  dados.fusoHorario = "America/Sao_Paulo";
  dados.origem = atual.origem ?? "manual";
  dados.atualizadoEm = new Date().toISOString();
  formularioEvento.campoEl("id").value = dados.id;

  Object.assign(atual, dados);
  marcarSujo();
  validarEExibirEvento();
  renderListaEventos();
}

function selecionarEvento(id, { novo = false } = {}) {
  eventoSelecionadoId = id;
  slugEditadoManualmente = !novo;
  document.querySelector("#btn-duplicar-evento").disabled = false;
  document.querySelector("#btn-excluir-evento").disabled = false;

  const container = document.querySelector("#form-area-eventos");
  container.replaceChildren();
  const wrap = document.createElement("div");
  container.appendChild(wrap);

  formularioEvento = criarFormulario(wrap, criarSchemaEvento({ marcas, locais }), { onChange: aoEditarCampoEvento });
  formularioEvento.preencher(eventos.find((e) => e.id === id));
  validarEExibirEvento();
  renderListaEventos();
}

function iniciarPainelEventos() {
  document.querySelector("#btn-novo-evento").addEventListener("click", () => {
    const novo = eventoEmBranco();
    eventos.push(novo);
    selecionarEvento(novo.id, { novo: true });
    marcarSujo();
  });

  document.querySelector("#btn-duplicar-evento").addEventListener("click", () => {
    const atual = eventos.find((e) => e.id === eventoSelecionadoId);
    if (!atual) return;
    const copia = structuredClone(atual);
    let slug = `${atual.slug}-copia`, n = 2;
    while (eventos.some((e) => e.slug === slug)) slug = `${atual.slug}-copia-${n++}`;
    copia.slug = slug; copia.id = `evt-${slug}`; copia.titulo = `${atual.titulo} (cópia)`; copia.status = "rascunho";
    eventos.push(copia);
    selecionarEvento(copia.id, { novo: true });
    marcarSujo();
  });

  document.querySelector("#btn-excluir-evento").addEventListener("click", () => {
    const atual = eventos.find((e) => e.id === eventoSelecionadoId);
    if (!atual) return;
    if (!confirm(`Excluir "${atual.titulo || atual.slug}"?\n\nSó afeta a cópia em memória.`)) return;
    eventos = eventos.filter((e) => e.id !== atual.id);
    eventoSelecionadoId = null;
    document.querySelector("#form-area-eventos").innerHTML = `<div class="admin-empty"><p>Selecione um evento, ou crie um novo.</p></div>`;
    document.querySelector("#btn-duplicar-evento").disabled = true;
    document.querySelector("#btn-excluir-evento").disabled = true;
    renderListaEventos();
    marcarSujo();
  });

  document.querySelector("#busca-eventos").addEventListener("input", renderListaEventos);
}

/* ==================== ABA MARCAS ==================== */

function marcaEmBranco() {
  let slug = "nova-marca", n = 2;
  while (marcas.some((m) => m.slug === slug)) slug = `nova-marca-${n++}`;
  return {
    id: `marca-${slug}`, slug, nome: "", descricao: null, cidade: "",
    frequencia: "mensal", desde: null, localPrincipalSlug: "",
    instagram: null, whatsapp: null, logo: null, banner: null,
    ativo: true, origem: "manual", status: "rascunho", atualizadoEm: new Date().toISOString(),
  };
}

function renderListaMarcas() {
  const termo = document.querySelector("#busca-marcas").value.trim().toLowerCase();
  const lista = document.querySelector("#lista-marcas");
  lista.replaceChildren();

  const filtradas = marcas
    .filter((m) => !termo || m.nome?.toLowerCase().includes(termo))
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

  if (filtradas.length === 0) {
    const li = document.createElement("li");
    li.className = "admin-event-empty";
    li.textContent = marcas.length === 0 ? "Nenhuma marca importada." : "Nada encontrado.";
    lista.appendChild(li);
    return;
  }

  filtradas.forEach((marca) => {
    const li = document.createElement("li");
    li.className = "admin-event-item" + (marca.id === marcaSelecionadaId ? " is-active" : "");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = `<span class="admin-event-item-nome">${marca.nome || "(sem nome)"}</span><span class="admin-event-item-meta">${marca.cidade || "—"} · ${marca.ativo ? "Ativa" : "Inativa"}</span>`;
    btn.addEventListener("click", () => selecionarMarca(marca.id));
    li.appendChild(btn);
    lista.appendChild(li);
  });
}

function validarEExibirMarca() {
  const atual = marcas.find((m) => m.id === marcaSelecionadaId);
  if (!atual) return;
  const resultado = validarMarca(atual, {
    outrasMarcas: marcas.filter((m) => m.id !== marcaSelecionadaId),
    locaisValidos: locais.map((l) => l.slug),
  });
  formularioMarca.mostrarErros(resultado.erros);
}

function aoEditarCampoMarca(nomeCampo) {
  const atual = marcas.find((m) => m.id === marcaSelecionadaId);
  if (!atual) return;

  if (nomeCampo === "slug") slugEditadoManualmente = true;
  if (nomeCampo === "nome" && !slugEditadoManualmente) {
    formularioMarca.campoEl("slug").value = slugify(formularioMarca.campoEl("nome").value);
  }

  const dados = formularioMarca.ler();
  dados.id = `marca-${dados.slug}`;
  dados.origem = atual.origem ?? "manual";
  dados.atualizadoEm = new Date().toISOString();
  formularioMarca.campoEl("id").value = dados.id;

  Object.assign(atual, dados);
  marcarSujo();
  validarEExibirMarca();
  renderListaMarcas();
}

function selecionarMarca(id, { nova = false } = {}) {
  marcaSelecionadaId = id;
  slugEditadoManualmente = !nova;
  document.querySelector("#btn-excluir-marca").disabled = false;

  const container = document.querySelector("#form-area-marcas");
  container.replaceChildren();
  const wrap = document.createElement("div");
  container.appendChild(wrap);

  formularioMarca = criarFormulario(wrap, criarSchemaMarca({ locais }), { onChange: aoEditarCampoMarca });
  formularioMarca.preencher(marcas.find((m) => m.id === id));
  validarEExibirMarca();
  renderListaMarcas();
}

function iniciarPainelMarcas() {
  document.querySelector("#btn-nova-marca").addEventListener("click", () => {
    const nova = marcaEmBranco();
    marcas.push(nova);
    selecionarMarca(nova.id, { nova: true });
    marcarSujo();
  });

  document.querySelector("#btn-excluir-marca").addEventListener("click", () => {
    const atual = marcas.find((m) => m.id === marcaSelecionadaId);
    if (!atual) return;
    const usadaPorEvento = eventos.some((e) => e.marcaSlug === atual.slug);
    const aviso = usadaPorEvento ? "\n\n⚠ Existem eventos usando essa marca — eles ficarão com uma referência quebrada." : "";
    if (!confirm(`Excluir "${atual.nome || atual.slug}"?${aviso}`)) return;
    marcas = marcas.filter((m) => m.id !== atual.id);
    marcaSelecionadaId = null;
    document.querySelector("#form-area-marcas").innerHTML = `<div class="admin-empty"><p>Selecione uma marca, ou crie uma nova.</p></div>`;
    document.querySelector("#btn-excluir-marca").disabled = true;
    renderListaMarcas();
    marcarSujo();
  });

  document.querySelector("#busca-marcas").addEventListener("input", renderListaMarcas);
}

/* ==================== ABA LOCAIS ==================== */

function localEmBranco() {
  return {
    id: null, slug: "", nome: "", tipo: "Outro",
    endereco: { cep: "", logradouro: "", numero: "", complemento: null, bairro: "", cidade: "", estado: "ES" },
    latitude: null, longitude: null, mapsLink: null,
    fotoCapa: null, fotoPerfil: null, instagram: null, site: null, telefone: null, descricao: null,
    ativo: true, origem: "manual", criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(),
  };
}

function renderTabelaLocais() {
  const corpo = document.querySelector("#tabela-locais");
  corpo.replaceChildren();
  locais.forEach((local) => {
    const tr = document.createElement("tr");
    const incompleto = enderecoIncompleto(local.endereco);
    tr.innerHTML = `
      <td><span class="admin-table-nome">${local.nome || "(sem nome)"}</span>${incompleto ? `<br><span class="admin-tag-incompleto">Endereço incompleto</span>` : ""}</td>
      <td>${local.tipo || "—"}</td>
      <td>${[local.endereco?.cidade, local.endereco?.estado].filter(Boolean).join("/") || "—"}</td>
      <td><button type="button" class="admin-pill ${local.ativo ? "admin-pill--ativo" : "admin-pill--inativo"}" data-acao="alternar-ativo-local" data-id="${local.id}">${local.ativo ? "Ativo" : "Inativo"}</button></td>
      <td style="white-space:nowrap;">
        <button type="button" class="btn btn-ghost btn-sm" data-acao="editar-local" data-id="${local.id}">Editar</button>
        <button type="button" class="btn btn-ghost btn-sm" data-acao="excluir-local" data-id="${local.id}">Excluir</button>
      </td>
    `;
    corpo.appendChild(tr);
  });
}

function preencherFormularioLocal(local) {
  document.querySelector("#f-nome").value = local.nome || "";
  document.querySelector("#f-tipo").value = local.tipo || "Outro";
  document.querySelector("#f-slug").value = local.slug || "";
  document.querySelector("#f-cep").value = local.endereco?.cep || "";
  document.querySelector("#f-numero").value = local.endereco?.numero || "";
  document.querySelector("#f-logradouro").value = local.endereco?.logradouro || "";
  document.querySelector("#f-complemento").value = local.endereco?.complemento || "";
  document.querySelector("#f-bairro").value = local.endereco?.bairro || "";
  document.querySelector("#f-cidade").value = local.endereco?.cidade || "";
  document.querySelector("#f-estado").value = local.endereco?.estado || "ES";
  document.querySelector("#f-latitude").value = local.latitude ?? "";
  document.querySelector("#f-longitude").value = local.longitude ?? "";
  document.querySelector("#f-mapsLink").value = local.mapsLink || "";
  document.querySelector("#f-instagram").value = local.instagram || "";
  document.querySelector("#f-site").value = local.site || "";
  document.querySelector("#f-telefone").value = local.telefone || "";
  document.querySelector("#f-descricao").value = local.descricao || "";
  document.querySelector("#f-fotoCapa").value = local.fotoCapa || "";
  document.querySelector("#f-fotoPerfil").value = local.fotoPerfil || "";
  document.querySelector("#f-ativo").checked = local.ativo ?? true;
}
function limparErrosLocal() {
  document.querySelectorAll("#admin-modal-overlay .admin-field").forEach((wrap) => {
    wrap.classList.remove("has-error");
    const erroEl = wrap.querySelector(".admin-field-error");
    if (erroEl) { erroEl.hidden = true; erroEl.textContent = ""; }
  });
}
function marcarErroLocal(nomeCampo, mensagem) {
  const wrap = document.querySelector(`#admin-modal-overlay .admin-field[data-campo="${nomeCampo}"]`);
  if (!wrap) return;
  wrap.classList.add("has-error");
  const erroEl = wrap.querySelector(".admin-field-error");
  if (erroEl) { erroEl.hidden = false; erroEl.textContent = mensagem; }
}
function validarFormularioLocal(outrosLocais) {
  limparErrosLocal();
  let valido = true;
  const nome = document.querySelector("#f-nome").value.trim();
  const logradouro = document.querySelector("#f-logradouro").value.trim();
  const cidade = document.querySelector("#f-cidade").value.trim();
  const slug = document.querySelector("#f-slug").value.trim();
  const mapsLink = document.querySelector("#f-mapsLink").value.trim();
  const instagram = document.querySelector("#f-instagram").value.trim();
  const site = document.querySelector("#f-site").value.trim();
  const cep = document.querySelector("#f-cep").value.trim();

  if (!nome) { marcarErroLocal("nome", "Nome é obrigatório."); valido = false; }
  if (!logradouro) { marcarErroLocal("logradouro", "Logradouro é obrigatório."); valido = false; }
  if (!cidade) { marcarErroLocal("cidade", "Cidade é obrigatória."); valido = false; }
  if (slug && outrosLocais.some((l) => l.slug === slug)) { marcarErroLocal("slug", "Já existe outro local com esse slug."); valido = false; }
  if (!urlValida(mapsLink)) { marcarErroLocal("mapsLink", "Use um link começando com http(s)://"); valido = false; }
  if (!urlValida(instagram)) { marcarErroLocal("instagram", "Use um link começando com http(s)://"); valido = false; }
  if (!urlValida(site)) { marcarErroLocal("site", "Use um link começando com http(s)://"); valido = false; }
  if (cep && !/^\d{5}-?\d{3}$/.test(cep)) { marcarErroLocal("cep", "CEP inválido — use o formato 29000-000."); valido = false; }
  return valido;
}
function lerFormularioLocal(localOriginal) {
  const nome = document.querySelector("#f-nome").value.trim();
  const slugAtual = document.querySelector("#f-slug").value.trim() || slugify(nome);
  const lat = document.querySelector("#f-latitude").value.trim();
  const lng = document.querySelector("#f-longitude").value.trim();
  return {
    id: localOriginal.id || `loc-${slugAtual}`, slug: slugAtual, nome,
    tipo: document.querySelector("#f-tipo").value,
    endereco: {
      cep: document.querySelector("#f-cep").value.trim(),
      logradouro: document.querySelector("#f-logradouro").value.trim(),
      numero: document.querySelector("#f-numero").value.trim(),
      complemento: document.querySelector("#f-complemento").value.trim() || null,
      bairro: document.querySelector("#f-bairro").value.trim(),
      cidade: document.querySelector("#f-cidade").value.trim(),
      estado: document.querySelector("#f-estado").value.trim().toUpperCase() || "ES",
    },
    latitude: lat === "" ? null : Number(lat), longitude: lng === "" ? null : Number(lng),
    mapsLink: document.querySelector("#f-mapsLink").value.trim() || null,
    fotoCapa: document.querySelector("#f-fotoCapa").value.trim() || null,
    fotoPerfil: document.querySelector("#f-fotoPerfil").value.trim() || null,
    instagram: document.querySelector("#f-instagram").value.trim() || null,
    site: document.querySelector("#f-site").value.trim() || null,
    telefone: document.querySelector("#f-telefone").value.trim() || null,
    descricao: document.querySelector("#f-descricao").value.trim() || null,
    ativo: document.querySelector("#f-ativo").checked,
    origem: localOriginal.origem || "manual",
    criadoEm: localOriginal.criadoEm || new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
}
function abrirModalLocal(local) {
  localSelecionadoId = local.id;
  document.querySelector("#admin-modal-titulo").textContent = local.id ? "Editar local" : "Novo local";
  preencherFormularioLocal(local);
  limparErrosLocal();
  document.querySelector("#admin-modal-overlay").hidden = false;

  const nomeInput = document.querySelector("#f-nome");
  const slugInput = document.querySelector("#f-slug");
  let slugEditado = Boolean(local.id);
  slugInput.oninput = () => { slugEditado = true; };
  nomeInput.oninput = () => { if (!slugEditado) slugInput.value = slugify(nomeInput.value); };
}
function fecharModalLocal() {
  document.querySelector("#admin-modal-overlay").hidden = true;
  localSelecionadoId = null;
}

function iniciarPainelLocais() {
  document.querySelector("#btn-novo-local").addEventListener("click", () => abrirModalLocal(localEmBranco()));
  document.querySelector("#btn-cancelar-modal").addEventListener("click", fecharModalLocal);
  document.querySelector("#admin-modal-overlay").addEventListener("click", (ev) => {
    if (ev.target.id === "admin-modal-overlay") fecharModalLocal();
  });

  document.querySelector("#btn-salvar-modal").addEventListener("click", () => {
    const localOriginal = locais.find((l) => l.id === localSelecionadoId) || localEmBranco();
    const outros = locais.filter((l) => l.id !== localSelecionadoId);
    if (!validarFormularioLocal(outros)) {
      mostrarMensagem("Corrija os campos destacados antes de salvar.", "erro");
      return;
    }
    const atualizado = lerFormularioLocal(localOriginal);
    const indice = locais.findIndex((l) => l.id === localOriginal.id);
    if (indice >= 0) locais[indice] = atualizado;
    else locais.push(atualizado);
    fecharModalLocal();
    renderTabelaLocais();
    marcarSujo();
    mostrarMensagem("Local salvo (só em memória — baixe tudo pra confirmar).", "sucesso");
  });

  document.querySelector("#tabela-locais").addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-acao]");
    if (!btn) return;
    const local = locais.find((l) => l.id === btn.dataset.id);
    if (!local) return;

    if (btn.dataset.acao === "editar-local") {
      abrirModalLocal(local);
    } else if (btn.dataset.acao === "excluir-local") {
      const usadoPorEvento = eventos.some((e) => e.localSlug === local.slug);
      const aviso = usadoPorEvento ? "\n\n⚠ Existem eventos usando esse local — eles ficarão com uma referência quebrada." : "";
      if (!confirm(`Excluir "${local.nome}"?${aviso}`)) return;
      locais = locais.filter((l) => l.id !== local.id);
      renderTabelaLocais();
      marcarSujo();
    } else if (btn.dataset.acao === "alternar-ativo-local") {
      local.ativo = !local.ativo;
      local.atualizadoEm = new Date().toISOString();
      renderTabelaLocais();
      marcarSujo();
    }
  });
}

/* ==================== ABAS E INICIALIZAÇÃO ==================== */

function irParaAba(nomeAba) {
  document.querySelectorAll(".admin-tab").forEach((t) => t.classList.toggle("is-active", t.dataset.aba === nomeAba));
  document.querySelectorAll(".admin-painel-aba").forEach((p) => { p.hidden = p.id !== `painel-${nomeAba}`; });
}

function init() {
  els.btnImportar.addEventListener("click", () => els.inputPasta.click());

  els.inputPasta.addEventListener("change", async (ev) => {
    const arquivos = ev.target.files;
    ev.target.value = "";
    if (!arquivos || arquivos.length === 0) return;
    try {
      await importarPasta(arquivos);
      els.estadoVazio.hidden = true;
      els.tabs.hidden = false;
      els.btnBaixarTudo.disabled = false;
      atualizarContagens();
      renderListaEventos();
      renderListaMarcas();
      renderTabelaLocais();
      irParaAba("eventos");
      document.querySelector("#painel-eventos").hidden = false;
      marcarLimpo();
      mostrarMensagem(`Importado: ${eventos.length} eventos, ${marcas.length} marcas, ${locais.length} locais.`, "sucesso");
    } catch (erro) {
      mostrarMensagem(`Não deu pra importar: ${erro.message}`, "erro");
    }
  });

  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => irParaAba(tab.dataset.aba));
  });

  els.btnBaixarTudo.addEventListener("click", () => {
    exportarArrayParaArquivo(eventos, "eventos.json");
    setTimeout(() => exportarArrayParaArquivo(marcas, "marcas.json"), 300);
    setTimeout(() => exportarArrayParaArquivo(locais, "locais.json"), 600);
    marcarLimpo();
    mostrarMensagem("3 arquivos baixados (eventos.json, marcas.json, locais.json) — o navegador pode pedir confirmação pra permitir múltiplos downloads.", "sucesso");
  });

  window.addEventListener("beforeunload", (ev) => {
    if (sujo) { ev.preventDefault(); ev.returnValue = ""; }
  });

  iniciarPainelEventos();
  iniciarPainelMarcas();
  iniciarPainelLocais();
}

init();
