import { eventosService } from "./services/eventosService.js";
import { locaisService } from "./services/locaisService.js";
import { marcasService } from "./services/marcasService.js";
import { criarEventCard, criarEsqueletos, criarEstadoVazio, ligarMenuMobile } from "./components.js";
import { chaveDia, formatarHorario, hojeLocal } from "./utils.js";

const JANELAS = { hoje: 0, amanha: 1, semana: 6, mes: 31 };
const DIA_SEMANA_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Lê o estado inicial de filtros/visualização a partir da URL, para permitir links compartilháveis. */
function lerEstadoDaURL() {
  const p = new URLSearchParams(window.location.search);
  return {
    janela: p.get("janela") || "semana",
    // "Grade" é o padrão: o objetivo principal do site é descobrir eventos
    // navegando por cards, não consultar um calendário. Semana é a opção
    // secundária, ativada só quando a URL pede explicitamente.
    view: p.get("view") === "semana" ? "semana" : "grade",
    cidade: p.get("cidade") || "",
    tipo: p.get("tipo") || "",
    entrada: p.get("entrada") || "",
    periodo: p.get("periodo") || "",
    musica: p.get("musica") || "",
    marca: p.get("marca") || "",
    busca: p.get("busca") || "",
  };
}

function escreverEstadoNaURL(estado) {
  const p = new URLSearchParams();
  Object.entries(estado).forEach(([chave, valor]) => {
    if (valor) p.set(chave, valor);
  });
  const qs = p.toString();
  const novaURL = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", novaURL);
}

async function init() {
  ligarMenuMobile();

  const container = document.querySelector("#agenda-lista");
  const tabsWrap = document.querySelector("#date-tabs");
  const tabs = document.querySelectorAll("#date-tabs button");
  const viewButtons = document.querySelectorAll("#view-toggle button");
  const filtroCidade = document.querySelector("#filtro-cidade");
  const filtroTipo = document.querySelector("#filtro-tipo");
  const filtroEntrada = document.querySelector("#filtro-entrada");
  const filtroPeriodo = document.querySelector("#filtro-periodo");
  const filtroMusica = document.querySelector("#filtro-musica");
  const filtroMarca = document.querySelector("#filtro-marca");
  const campoBusca = document.querySelector("#campo-busca");
  const filtrosToggle = document.querySelector("#filtros-toggle");
  const filtrosPanelWrap = document.querySelector("#filters-panel-wrap");
  const filtrosCount = document.querySelector("#filtros-count");

  container.replaceChildren(criarEsqueletos(8));

  let locaisPorSlug, marcasPorSlug;
  try {
    [locaisPorSlug, marcasPorSlug] = await Promise.all([locaisService.mapaPorSlug(), marcasService.mapaPorSlug()]);
  } catch (erro) {
    container.replaceChildren(criarEstadoVazio("Não deu pra carregar a agenda agora", "Verifique sua conexão e tente novamente."));
    return;
  }

  // Popula o filtro de marca dinamicamente — a lista de marcas cresce com o tempo,
  // então não faz sentido hardcodar <option> no HTML como fizemos com cidade/tipo.
  [...marcasPorSlug.values()]
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .forEach((marca) => {
      const opt = document.createElement("option");
      opt.value = marca.slug;
      opt.textContent = marca.nome;
      filtroMarca.appendChild(opt);
    });

  const estado = lerEstadoDaURL();

  filtroCidade.value = estado.cidade;
  filtroTipo.value = estado.tipo;
  filtroEntrada.value = estado.entrada;
  filtroPeriodo.value = estado.periodo;
  filtroMusica.value = estado.musica;
  filtroMarca.value = estado.marca;
  campoBusca.value = estado.busca;
  tabs.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.janela === estado.janela)));
  viewButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === estado.view)));
  tabsWrap.hidden = estado.view === "semana";

  function filtrosAtuais() {
    return {
      cidade: filtroCidade.value,
      tipo: filtroTipo.value,
      entrada: filtroEntrada.value,
      periodo: filtroPeriodo.value,
      musica: filtroMusica.value,
      marca: filtroMarca.value,
      busca: campoBusca.value,
    };
  }

  function temFiltrosAtivos() {
    return Object.values(filtrosAtuais()).some(Boolean);
  }

  // Só os filtros que moram dentro do painel recolhível contam pro badge —
  // a busca fica sempre visível, então não faz parte dessa contagem.
  function contarFiltrosAtivos() {
    const f = filtrosAtuais();
    return ["cidade", "tipo", "entrada", "periodo", "musica", "marca"].filter((chave) => f[chave]).length;
  }

  function atualizarContadorFiltros() {
    const n = contarFiltrosAtivos();
    filtrosCount.hidden = n === 0;
    filtrosCount.textContent = String(n);
  }

  const filtrosPanelInner = document.querySelector(".filters-panel-inner");

  function abrirPainelFiltros(aberto) {
    filtrosPanelWrap.classList.toggle("is-open", aberto);
    filtrosToggle.setAttribute("aria-expanded", String(aberto));
    // Painel fechado tem altura zero, mas sem isso os <select> continuariam
    // alcançáveis por Tab e por leitor de tela mesmo invisíveis.
    filtrosPanelInner.inert = !aberto;
  }

  filtrosToggle.addEventListener("click", () => {
    abrirPainelFiltros(!filtrosPanelWrap.classList.contains("is-open"));
  });

  // Se a URL já chega com algum filtro avançado (link compartilhado, por
  // exemplo), abre o painel de cara — nunca deixa um filtro ativo escondido
  // sem o usuário saber que ele está lá.
  abrirPainelFiltros(contarFiltrosAtivos() > 0);
  atualizarContadorFiltros();

  function limparFiltros() {
    filtroCidade.value = "";
    filtroTipo.value = "";
    filtroEntrada.value = "";
    filtroPeriodo.value = "";
    filtroMusica.value = "";
    filtroMarca.value = "";
    campoBusca.value = "";
    render();
  }

  function irParaJanela(chave) {
    tabs.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.janela === chave)));
    render();
  }

  function janelaAtual() {
    return [...tabs].find((b) => b.getAttribute("aria-selected") === "true")?.dataset.janela || "semana";
  }

  function viewAtual() {
    return [...viewButtons].find((b) => b.getAttribute("aria-pressed") === "true")?.dataset.view || "grade";
  }

  function contextoDoEvento(evento) {
    return { local: locaisPorSlug.get(evento.localSlug), marca: marcasPorSlug.get(evento.marcaSlug) };
  }

  /**
   * Grade de descoberta (estilo Sympla/Shotgun/Fever) — a visualização
   * padrão da Agenda. Sem agrupamento por dia: os cards já mostram a data,
   * e uma vitrine contínua favorece a navegação por comparação, não por
   * consulta de calendário.
   */
  async function renderGrade() {
    const janela = janelaAtual();
    const lista = await eventosService.listarComFiltros({ dias: JANELAS[janela], ...filtrosAtuais() });
    container.replaceChildren();

    if (lista.length === 0) {
      const ativos = temFiltrosAtivos();
      const acoes = [];
      if (ativos) acoes.push({ texto: "Limpar filtros", onClick: limparFiltros });
      if (janela !== "mes") acoes.push({ texto: "Ver o mês inteiro", onClick: () => irParaJanela("mes") });

      container.replaceChildren(
        criarEstadoVazio(
          ativos ? "Nenhum evento com esses filtros" : "Nenhum evento neste período",
          ativos
            ? "Tente remover algum filtro — a comunidade cresce toda semana, pode ser que apareça algo em breve."
            : "Experimente ampliar o período para encontrar mais opções.",
          acoes
        )
      );
      return;
    }

    const grid = document.createElement("div");
    grid.className = "event-grid is-grade";
    lista.forEach((evento) => grid.appendChild(criarEventCard(evento, contextoDoEvento(evento))));
    container.appendChild(grid);
  }

  async function renderSemana() {
    const lista = await eventosService.listarSemana(filtrosAtuais());
    container.replaceChildren();

    const hoje = hojeLocal();
    const porChave = new Map();
    lista.forEach((evento) => {
      const chave = chaveDia(evento.inicio);
      if (!porChave.has(chave)) porChave.set(chave, []);
      porChave.get(chave).push(evento);
    });

    const grid = document.createElement("div");
    grid.className = "week-grid";

    for (let i = 0; i <= 6; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i);
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
      const eventosNoDia = (porChave.get(chave) || []).sort((a, b) => a.inicio.localeCompare(b.inicio));

      const col = document.createElement("div");
      col.className = "week-day" + (i === 0 ? " is-today" : "");

      const titulo = document.createElement("h3");
      const rotulo = `${DIA_SEMANA_ABREV[data.getDay()]} ${data.getDate()}`;
      titulo.innerHTML = eventosNoDia.length > 0 ? `${rotulo} <span class="day-count">${eventosNoDia.length}</span>` : rotulo;
      col.appendChild(titulo);

      if (eventosNoDia.length === 0) {
        const nota = document.createElement("p");
        nota.className = "empty-note";
        nota.textContent = "Nenhum evento programado";
        col.appendChild(nota);
      } else {
        eventosNoDia.forEach((evento) => {
          const a = document.createElement("a");
          a.className = "week-event";
          a.href = `evento.html?slug=${encodeURIComponent(evento.slug)}`;
          a.innerHTML = `<span class="time">${formatarHorario(evento.inicio)}</span>${evento.titulo}`;
          col.appendChild(a);
        });
      }
      grid.appendChild(col);
    }

    container.appendChild(grid);

    if (lista.length === 0 && temFiltrosAtivos()) {
      container.appendChild(
        criarEstadoVazio(
          "Nenhum evento nesta semana com esses filtros",
          "Tente remover algum filtro para ver mais opções.",
          [{ texto: "Limpar filtros", onClick: limparFiltros }]
        )
      );
    }
  }

  async function render() {
    atualizarContadorFiltros();
    escreverEstadoNaURL({ janela: janelaAtual(), view: viewAtual(), ...filtrosAtuais() });
    if (viewAtual() === "semana") {
      await renderSemana();
    } else {
      await renderGrade();
    }
  }

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.setAttribute("aria-selected", "false"));
      btn.setAttribute("aria-selected", "true");
      render();
    });
  });

  viewButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      viewButtons.forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      tabsWrap.hidden = btn.dataset.view === "semana";
      render();
    });
  });

  [filtroCidade, filtroTipo, filtroEntrada, filtroPeriodo, filtroMusica, filtroMarca].forEach((select) =>
    select.addEventListener("change", render)
  );

  let debounceBusca;
  campoBusca.addEventListener("input", () => {
    clearTimeout(debounceBusca);
    debounceBusca = setTimeout(render, 250);
  });

  render();
}

init();
