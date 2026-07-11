import { eventosService } from "./services/eventosService.js";
import { locaisService } from "./services/locaisService.js";
import { criarEventCard, criarEsqueletos, criarEstadoVazio, criarResumoSemana, criarBannerHoje, ligarMenuMobile } from "./components.js";
import { hojeLocal } from "./utils.js";

const JANELAS = { hoje: 0, amanha: 1, semana: 6 };

async function init() {
  ligarMenuMobile();

  const grid = document.querySelector("#home-event-grid");
  const bannerEl = document.querySelector("#today-banner");
  const resumoEl = document.querySelector("#week-summary");
  const tabs = document.querySelectorAll("#date-tabs button");
  grid.replaceChildren(criarEsqueletos(3));

  let locaisPorSlug;
  try {
    locaisPorSlug = await locaisService.mapaPorSlug();
    const [eventosHoje, resumo] = await Promise.all([
      eventosService.listarPorJanela(JANELAS.hoje),
      eventosService.resumoDaSemana(),
    ]);
    bannerEl.replaceChildren(criarBannerHoje(eventosHoje, hojeLocal().toISOString()));
    resumoEl.replaceChildren(criarResumoSemana(resumo));
  } catch (erro) {
    grid.replaceChildren(criarEstadoVazio("Não deu pra carregar a agenda agora", "Verifique sua conexão e tente novamente."));
    return;
  }

  async function render(janelaChave) {
    const filtrados = await eventosService.listarPorJanela(JANELAS[janelaChave]);
    grid.replaceChildren();

    if (filtrados.length === 0) {
      grid.replaceChildren(
        criarEstadoVazio(
          "Nenhum forró encontrado por aqui ainda",
          "Que tal dar uma olhada na agenda completa da semana?",
          [{ href: "agenda.html", texto: "Ver agenda completa" }]
        )
      );
      return;
    }

    const frag = document.createDocumentFragment();
    filtrados.slice(0, 6).forEach((evento) => {
      frag.appendChild(criarEventCard(evento, locaisPorSlug.get(evento.localSlug)));
    });
    grid.appendChild(frag);
  }

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.setAttribute("aria-selected", "false"));
      btn.setAttribute("aria-selected", "true");
      render(btn.dataset.janela);
    });
  });

  render("hoje");
}

init();
