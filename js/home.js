import { carregarEventos, carregarLocais } from "./data.js";
import { criarEventCard, criarEsqueletos, criarEstadoVazio, ligarMenuMobile } from "./components.js";
import { dentroDaJanela } from "./utils.js";

const JANELAS = { hoje: 0, amanha: 1, semana: 6 };

async function init() {
  ligarMenuMobile();

  const grid = document.querySelector("#home-event-grid");
  const tabs = document.querySelectorAll("#date-tabs button");
  grid.replaceChildren(criarEsqueletos(3));

  let eventos, locais;
  try {
    [eventos, locais] = await Promise.all([carregarEventos(), carregarLocais()]);
  } catch (erro) {
    grid.replaceChildren(criarEstadoVazio("Não deu pra carregar a agenda agora", "Verifique sua conexão e tente novamente."));
    return;
  }

  const locaisPorSlug = new Map(locais.map((l) => [l.slug, l]));

  function render(janelaChave) {
    const dias = JANELAS[janelaChave];
    const filtrados = eventos.filter((e) => dentroDaJanela(e, dias));
    grid.replaceChildren();

    if (filtrados.length === 0) {
      grid.replaceChildren(
        criarEstadoVazio(
          "Nenhum forró encontrado por aqui ainda",
          "Que tal dar uma olhada na agenda completa da semana?",
          { href: "agenda.html", texto: "Ver agenda completa" }
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
