import { carregarEventos, carregarLocais } from "./data.js";
import { criarEventCard, criarEsqueletos, criarEstadoVazio, ligarMenuMobile } from "./components.js";
import { dentroDaJanela, formatarDataLonga } from "./utils.js";

const JANELAS = { hoje: 0, amanha: 1, semana: 6, mes: 31 };

async function init() {
  ligarMenuMobile();

  const container = document.querySelector("#agenda-lista");
  const tabs = document.querySelectorAll("#date-tabs button");
  const filtroCidade = document.querySelector("#filtro-cidade");
  const filtroTipo = document.querySelector("#filtro-tipo");
  const filtroEntrada = document.querySelector("#filtro-entrada");

  container.replaceChildren(criarEsqueletos(4));

  let eventos, locais;
  try {
    [eventos, locais] = await Promise.all([carregarEventos(), carregarLocais()]);
  } catch (erro) {
    container.replaceChildren(criarEstadoVazio("Não deu pra carregar a agenda agora", "Verifique sua conexão e tente novamente."));
    return;
  }

  const locaisPorSlug = new Map(locais.map((l) => [l.slug, l]));
  let janelaAtual = "semana";

  function eventosFiltrados() {
    return eventos.filter((e) => {
      if (!dentroDaJanela(e, JANELAS[janelaAtual])) return false;
      if (filtroCidade.value && e.cidade !== filtroCidade.value) return false;
      if (filtroTipo.value && e.tipo !== filtroTipo.value) return false;
      if (filtroEntrada.value && e.entrada !== filtroEntrada.value) return false;
      return true;
    });
  }

  function render() {
    const lista = eventosFiltrados();
    container.replaceChildren();

    if (lista.length === 0) {
      container.replaceChildren(
        criarEstadoVazio(
          "Nenhum evento com esses filtros",
          "Tente ampliar o período ou remover algum filtro para ver mais opções.",
        )
      );
      return;
    }

    const porDia = new Map();
    lista.forEach((evento) => {
      if (!porDia.has(evento.data)) porDia.set(evento.data, []);
      porDia.get(evento.data).push(evento);
    });

    const frag = document.createDocumentFragment();
    [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([data, eventosNoDia]) => {
      const grupo = document.createElement("section");
      grupo.className = "day-group";
      const titulo = document.createElement("h2");
      titulo.textContent = formatarDataLonga(data);
      grupo.appendChild(titulo);

      const grid = document.createElement("div");
      grid.className = "event-grid is-list";
      eventosNoDia.forEach((evento) => grid.appendChild(criarEventCard(evento, locaisPorSlug.get(evento.localSlug))));
      grupo.appendChild(grid);

      frag.appendChild(grupo);
    });
    container.appendChild(frag);
  }

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.setAttribute("aria-selected", "false"));
      btn.setAttribute("aria-selected", "true");
      janelaAtual = btn.dataset.janela;
      render();
    });
  });

  [filtroCidade, filtroTipo, filtroEntrada].forEach((select) => select.addEventListener("change", render));

  render();
}

init();
