import { carregarArrayDeArquivo, exportarArrayParaArquivo } from "./arquivoStorage.js";

let locais = [];
let idSelecionado = null;
let sujo = false;

const els = {
  inputArquivo: document.querySelector("#admin-input-arquivo"),
  btnCarregar: document.querySelector("#btn-carregar"),
  btnNovo: document.querySelector("#btn-novo"),
  btnBaixar: document.querySelector("#btn-baixar"),
  status: document.querySelector("#admin-status"),
  mensagem: document.querySelector("#admin-mensagem"),
  estadoVazio: document.querySelector("#admin-empty-state"),
  tabelaWrap: document.querySelector("#admin-table-wrap"),
  tabelaCorpo: document.querySelector("#admin-tabela-corpo"),
  overlay: document.querySelector("#admin-modal-overlay"),
  modalTitulo: document.querySelector("#admin-modal-titulo"),
  btnCancelarModal: document.querySelector("#btn-cancelar-modal"),
  btnSalvarModal: document.querySelector("#btn-salvar-modal"),
};

function slugify(texto) {
  return texto
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function urlValida(valor) {
  return !valor || /^https?:\/\//.test(valor);
}

function enderecoIncompleto(endereco) {
  return !endereco?.cep && !endereco?.numero && !endereco?.bairro;
}

/**
 * Migra um local no formato antigo (endereco como string única, cidade no
 * nível raiz) pro schema atual, sem inventar dado — o texto antigo inteiro
 * vira `logradouro`, os campos novos ficam vazios/nulos até alguém
 * completar pela interface.
 */
function normalizarLocalAntigo(bruto) {
  if (bruto.endereco && typeof bruto.endereco === "object") return bruto; // já no formato novo
  const agora = new Date().toISOString();
  return {
    id: bruto.id,
    slug: bruto.slug,
    nome: bruto.nome,
    tipo: bruto.tipo || "Outro",
    endereco: {
      cep: "",
      logradouro: bruto.endereco || "",
      numero: "",
      complemento: null,
      bairro: "",
      cidade: bruto.cidade || "",
      estado: "ES",
    },
    latitude: bruto.latitude ?? null,
    longitude: bruto.longitude ?? null,
    mapsLink: bruto.mapsLink ?? null,
    fotoCapa: bruto.fotoCapa ?? null,
    fotoPerfil: bruto.fotoPerfil ?? null,
    instagram: bruto.instagram ?? null,
    site: bruto.site ?? null,
    telefone: bruto.telefone ?? null,
    descricao: bruto.descricao ?? null,
    ativo: bruto.ativo ?? true,
    origem: bruto.origem || "manual",
    criadoEm: bruto.criadoEm || agora,
    atualizadoEm: agora,
  };
}

function localEmBranco() {
  return {
    id: null, slug: "", nome: "", tipo: "Outro",
    endereco: { cep: "", logradouro: "", numero: "", complemento: null, bairro: "", cidade: "", estado: "ES" },
    latitude: null, longitude: null, mapsLink: null,
    fotoCapa: null, fotoPerfil: null, instagram: null, site: null, telefone: null, descricao: null,
    ativo: true, origem: "manual", criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(),
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

function renderTabela() {
  const temLocais = locais.length > 0;
  els.estadoVazio.hidden = temLocais;
  els.tabelaWrap.hidden = !temLocais;
  els.btnBaixar.disabled = !temLocais;
  if (!temLocais) return;

  els.tabelaCorpo.replaceChildren();
  locais.forEach((local) => {
    const tr = document.createElement("tr");
    const incompleto = enderecoIncompleto(local.endereco);
    tr.innerHTML = `
      <td>
        <span class="admin-table-nome">${local.nome || "(sem nome)"}</span>
        ${incompleto ? `<br><span class="admin-tag-incompleto">Endereço incompleto</span>` : ""}
      </td>
      <td>${local.tipo || "—"}</td>
      <td>${[local.endereco?.cidade, local.endereco?.estado].filter(Boolean).join("/") || "—"}</td>
      <td>
        <button type="button" class="admin-pill ${local.ativo ? "admin-pill--ativo" : "admin-pill--inativo"}" data-acao="alternar-ativo" data-id="${local.id}">
          ${local.ativo ? "Ativo" : "Inativo"}
        </button>
      </td>
      <td style="white-space:nowrap;">
        <button type="button" class="btn btn-ghost btn-sm" data-acao="editar" data-id="${local.id}">Editar</button>
        <button type="button" class="btn btn-ghost btn-sm" data-acao="excluir" data-id="${local.id}">Excluir</button>
      </td>
    `;
    els.tabelaCorpo.appendChild(tr);
  });
}

function preencherFormulario(local) {
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

function limparErros() {
  document.querySelectorAll("#admin-modal-overlay .admin-field").forEach((wrap) => {
    wrap.classList.remove("has-error");
    const erroEl = wrap.querySelector(".admin-field-error");
    if (erroEl) { erroEl.hidden = true; erroEl.textContent = ""; }
  });
}

function marcarErro(nomeCampo, mensagem) {
  const wrap = document.querySelector(`#admin-modal-overlay .admin-field[data-campo="${nomeCampo}"]`);
  if (!wrap) return;
  wrap.classList.add("has-error");
  const erroEl = wrap.querySelector(".admin-field-error");
  if (erroEl) { erroEl.hidden = false; erroEl.textContent = mensagem; }
}

function validarFormulario({ outrosLocais }) {
  limparErros();
  let valido = true;
  const nome = document.querySelector("#f-nome").value.trim();
  const logradouro = document.querySelector("#f-logradouro").value.trim();
  const cidade = document.querySelector("#f-cidade").value.trim();
  const slug = document.querySelector("#f-slug").value.trim();
  const mapsLink = document.querySelector("#f-mapsLink").value.trim();
  const instagram = document.querySelector("#f-instagram").value.trim();
  const site = document.querySelector("#f-site").value.trim();
  const cep = document.querySelector("#f-cep").value.trim();

  if (!nome) { marcarErro("nome", "Nome é obrigatório."); valido = false; }
  if (!logradouro) { marcarErro("logradouro", "Logradouro é obrigatório."); valido = false; }
  if (!cidade) { marcarErro("cidade", "Cidade é obrigatória."); valido = false; }
  if (slug && outrosLocais.some((l) => l.slug === slug)) { marcarErro("slug", "Já existe outro local com esse slug."); valido = false; }
  if (!urlValida(mapsLink)) { marcarErro("mapsLink", "Use um link começando com http(s)://"); valido = false; }
  if (!urlValida(instagram)) { marcarErro("instagram", "Use um link começando com http(s)://"); valido = false; }
  if (!urlValida(site)) { marcarErro("site", "Use um link começando com http(s)://"); valido = false; }
  if (cep && !/^\d{5}-?\d{3}$/.test(cep)) { marcarErro("cep", "CEP inválido — use o formato 29000-000."); valido = false; }

  return valido;
}

function lerFormulario(localOriginal) {
  const nome = document.querySelector("#f-nome").value.trim();
  const slugAtual = document.querySelector("#f-slug").value.trim() || slugify(nome);
  const lat = document.querySelector("#f-latitude").value.trim();
  const lng = document.querySelector("#f-longitude").value.trim();

  return {
    id: localOriginal.id || `loc-${slugAtual}`,
    slug: slugAtual,
    nome,
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
    latitude: lat === "" ? null : Number(lat),
    longitude: lng === "" ? null : Number(lng),
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

function abrirModal(local) {
  idSelecionado = local.id;
  els.modalTitulo.textContent = local.id ? "Editar local" : "Novo local";
  preencherFormulario(local);
  limparErros();
  els.overlay.hidden = false;

  const nomeInput = document.querySelector("#f-nome");
  const slugInput = document.querySelector("#f-slug");
  let slugEditadoManualmente = Boolean(local.id);
  slugInput.oninput = () => { slugEditadoManualmente = true; };
  nomeInput.oninput = () => {
    if (!slugEditadoManualmente) slugInput.value = slugify(nomeInput.value);
  };
}

function fecharModal() {
  els.overlay.hidden = true;
  idSelecionado = null;
}

function init() {
  els.btnCarregar.addEventListener("click", () => els.inputArquivo.click());

  els.inputArquivo.addEventListener("change", async (ev) => {
    const arquivo = ev.target.files[0];
    ev.target.value = "";
    if (!arquivo) return;
    try {
      const brutos = await carregarArrayDeArquivo(arquivo);
      locais = brutos.map(normalizarLocalAntigo);
      renderTabela();
      marcarLimpo();
      mostrarMensagem(`${locais.length} locais carregados de "${arquivo.name}".`, "sucesso");
    } catch (erro) {
      mostrarMensagem(`Não deu pra ler esse arquivo: ${erro.message}`, "erro");
    }
  });

  els.btnNovo.addEventListener("click", () => abrirModal(localEmBranco()));
  els.btnCancelarModal.addEventListener("click", fecharModal);
  els.overlay.addEventListener("click", (ev) => { if (ev.target === els.overlay) fecharModal(); });

  els.btnSalvarModal.addEventListener("click", () => {
    const localOriginal = locais.find((l) => l.id === idSelecionado) || localEmBranco();
    const outros = locais.filter((l) => l.id !== idSelecionado);
    if (!validarFormulario({ outrosLocais: outros })) {
      mostrarMensagem("Corrija os campos destacados antes de salvar.", "erro");
      return;
    }
    const atualizado = lerFormulario(localOriginal);
    const existeIndice = locais.findIndex((l) => l.id === localOriginal.id);
    if (existeIndice >= 0) locais[existeIndice] = atualizado;
    else locais.push(atualizado);

    fecharModal();
    renderTabela();
    marcarSujo();
    mostrarMensagem("Local salvo (ainda só em memória — baixe o arquivo pra confirmar).", "sucesso");
  });

  els.tabelaCorpo.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-acao]");
    if (!btn) return;
    const local = locais.find((l) => l.id === btn.dataset.id);
    if (!local) return;

    if (btn.dataset.acao === "editar") {
      abrirModal(local);
    } else if (btn.dataset.acao === "excluir") {
      const confirmado = confirm(`Excluir "${local.nome}"?\n\nIsso só afeta a cópia em memória — o locais.json original só muda se você baixar por cima dele.`);
      if (!confirmado) return;
      locais = locais.filter((l) => l.id !== local.id);
      renderTabela();
      marcarSujo();
    } else if (btn.dataset.acao === "alternar-ativo") {
      local.ativo = !local.ativo;
      local.atualizadoEm = new Date().toISOString();
      renderTabela();
      marcarSujo();
    }
  });

  els.btnBaixar.addEventListener("click", () => {
    exportarArrayParaArquivo(locais, "locais.json");
    marcarLimpo();
    mostrarMensagem("Arquivo locais.json baixado.", "sucesso");
  });

  window.addEventListener("beforeunload", (ev) => {
    if (sujo) { ev.preventDefault(); ev.returnValue = ""; }
  });
}

init();
