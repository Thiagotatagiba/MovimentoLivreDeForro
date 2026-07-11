import { eventosService } from "./services/eventosService.js";
import { locaisService } from "./services/locaisService.js";
import { criarEventCard, criarEsqueletos, criarEstadoVazio, ligarMenuMobile } from "./components.js";
import { chaveDia, formatarDataLonga, formatarHorario, hojeLocal } from "./utils.js";

const JANELAS = { hoje: 0, amanha: 1, semana: 6, mes: 31 };
const DIA_SEMANA_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Lê o estado inicial de filtros/visualização a partir da URL, para permitir links compartilháveis. */
function lerEstadoDaURL() {
  const p = new URLSearchParams(window.location.search);
  return {
    janela: p.get("janela") || "semana",
    // A visualização "Semana" é o destaque da Agenda — é o padrão, a menos
    // que a URL diga explicitamente o contrário.
    view: p.get("view") === "lista" ? "lista" : "semana",
    cidade: p.get("cidade") || "",
    tipo: p.get("tipo") || "",
    entrada: p.get("entrada") || "",
    periodo: p.get("periodo") || "",
    musica: p.get("musica") || "",
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
  const campoBusca = document.querySelector("#campo-busca");

  container.replaceChildren(criarEsqueletos(4));

  let locaisPorSlug;
  try {
    locaisPorSlug = await locaisService.mapaPorSlug();
  } catch (erro) {
    container.replaceChildren(criarEstadoVazio("Não deu pra carregar a agenda agora", "Verifique sua conexão e tente novamente."));
    return;
  }

  const estado = lerEstadoDaURL();

  filtroCidade.value = estado.cidade;
  filtroTipo.value = estado.tipo;
  filtroEntrada.value = estado.entrada;
  filtroPeriodo.value = estado.periodo;
  filtroMusica.value = estado.musica;
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
      busca: campoBusca.value,
    };
  }

  function temFiltrosAtivos() {
    return Object.values(filtrosAtuais()).some(Boolean);
  }

  function limparFiltros() {
    filtroCidade.value = "";
    filtroTipo.value = "";
    filtroEntrada.value = "";
    filtroPeriodo.value = "";
    filtroMusica.value = "";
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
    return [...viewButtons].find((b) => b.getAttribute("aria-pressed") === "true")?.dataset.view || "semana";
  }

  async function renderLista() {
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

    const porDia = new Map();
    lista.forEach((evento) => {
      const chave = chaveDia(evento.inicio);
      if (!porDia.has(chave)) porDia.set(chave, { inicio: evento.inicio, eventos: [] });
      porDia.get(chave).eventos.push(evento);
    });

    const frag = document.createDocumentFragment();
    [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([, grupo]) => {
      const secao = document.createElement("section");
      secao.className = "day-group";
      const titulo = document.createElement("h2");
      titulo.textContent = formatarDataLonga(grupo.inicio);
      secao.appendChild(titulo);

      const grid = document.createElement("div");
      grid.className = "event-grid is-list";
      grupo.eventos.forEach((evento) => grid.appendChild(criarEventCard(evento, locaisPorSlug.get(evento.localSlug))));
      secao.appendChild(grid);

      frag.appendChild(secao);
    });
    container.appendChild(frag);
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
    escreverEstadoNaURL({ janela: janelaAtual(), view: viewAtual(), ...filtrosAtuais() });
    if (viewAtual() === "semana") {
      await renderSemana();
    } else {
      await renderLista();
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

  [filtroCidade, filtroTipo, filtroEntrada, filtroPeriodo, filtroMusica].forEach((select) =>
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
