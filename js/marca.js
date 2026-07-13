import { marcasService } from "./services/marcasService.js";
import { eventosService } from "./services/eventosService.js";
import { locaisService } from "./services/locaisService.js";
import { criarEventCard, criarEstadoVazio, criarFuturoRecurso, ligarMenuMobile } from "./components.js";
import { formatarDataCurta, ROTULO_FREQUENCIA } from "./utils.js";

/** Banner: imagem própria da marca > imagem do próximo evento > textura ilustrativa. */
function bannerHtml(marca, imagemFallback) {
  const src = marca.banner ?? imagemFallback;
  if (src) {
    return `<img src="${src}" alt="" decoding="async" />`;
  }
  return `
    <svg viewBox="0 0 200 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="passos-marca" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
          <circle cx="6" cy="6" r="3" fill="#ffffff" />
          <circle cx="26" cy="18" r="3" fill="#ffffff" />
        </pattern>
      </defs>
      <rect width="200" height="90" fill="url(#passos-marca)" />
    </svg>`;
}

function logoHtml(marca) {
  if (marca.logo) {
    return `<img src="${marca.logo}" alt="" decoding="async" />`;
  }
  // Fallback: iniciais da marca sobre o verde-pinha, mesma lógica visual do resto do site.
  const iniciais = marca.nome
    .split(" ")
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return `<span class="marca-logo-fallback" aria-hidden="true">${iniciais || marca.nome[0]}</span>`;
}

function renderHistorico(eventosPassados) {
  if (eventosPassados.length === 0) {
    const p = document.createElement("p");
    p.className = "history-empty";
    p.textContent = "Ainda não há eventos anteriores registrados para esta marca.";
    return p;
  }

  const ul = document.createElement("ul");
  ul.className = "history-list";
  eventosPassados.forEach((evento) => {
    const li = document.createElement("li");
    li.className = "history-item";
    li.innerHTML = `
      <span class="history-check" aria-hidden="true">✓</span>
      <a href="evento.html?slug=${encodeURIComponent(evento.slug)}">
        <span class="history-date">${formatarDataCurta(evento.inicio)}</span>
        <span class="history-title">${evento.titulo}</span>
      </a>
    `;
    ul.appendChild(li);
  });
  return ul;
}

async function init() {
  ligarMenuMobile();

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const main = document.querySelector("#marca-conteudo");

  if (!slug) {
    main.innerHTML = `<div class="wrap"><div class="empty-state"><h3>Marca não encontrada</h3><p>Faltou informar qual marca abrir.</p><a class="btn btn-ghost" href="agenda.html">Ver agenda completa</a></div></div>`;
    return;
  }

  const marca = await marcasService.buscarPorSlug(slug);
  if (!marca) {
    main.innerHTML = `<div class="wrap"><div class="empty-state"><h3>Essa marca não existe mais</h3><p>Ela pode ter sido removida ou o link está incorreto.</p><a class="btn btn-ghost" href="agenda.html">Ver agenda completa</a></div></div>`;
    return;
  }

  document.title = `${marca.nome} — Movimento Livre de Forró`;

  // Busca próximos eventos antes de montar o cabeçalho: se a marca ainda não
  // tem banner próprio, usamos a imagem do evento mais próximo automaticamente.
  const [localPrincipal, proximos, locaisPorSlug] = await Promise.all([
    marca.localPrincipalSlug ? locaisService.buscarPorSlug(marca.localPrincipalSlug) : Promise.resolve(null),
    eventosService.listarPorMarca(marca.slug, { dias: 365 }),
    locaisService.mapaPorSlug(),
  ]);

  const rotuloFrequencia = ROTULO_FREQUENCIA[marca.frequencia] ?? marca.frequencia;
  const imagemFallback = proximos.find((e) => e.imagem)?.imagem ?? null;

  const metaPartes = [marca.cidade, rotuloFrequencia];
  if (marca.desde) metaPartes.push(`Desde ${marca.desde}`);
  if (localPrincipal) metaPartes.push(localPrincipal.nome);

  main.innerHTML = `
    <div class="marca-banner">${bannerHtml(marca, imagemFallback)}</div>
    <div class="wrap">
      <div class="marca-header">
        <div class="marca-logo">${logoHtml(marca)}</div>
        <div class="marca-header-info">
          <h1>${marca.nome}</h1>
          <p class="marca-meta">${metaPartes.join(" · ")}</p>
          <div class="marca-links">
            ${marca.instagram ? `<a class="btn btn-ghost btn-sm" href="${marca.instagram}" target="_blank" rel="noopener">Instagram</a>` : ""}
            ${marca.whatsapp ? `<a class="btn btn-ghost btn-sm" href="${marca.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
          </div>
        </div>
      </div>

      ${marca.descricao ? `<p class="marca-descricao">${marca.descricao}</p>` : ""}

      <section class="section" id="secao-proximos">
        <div class="section-head"><h2>Próximos eventos</h2></div>
        <div class="event-grid" id="grid-proximos"></div>
      </section>

      <section class="section" id="secao-historico">
        <div class="section-head"><h2>Últimos eventos</h2></div>
        <div id="lista-historico"></div>
      </section>

      <section class="section" id="secao-futuro">
        <div class="section-head"><h2>Em construção</h2></div>
        <div class="future-feature-grid" id="grid-futuro"></div>
      </section>
    </div>
  `;

  // Próximos eventos — sempre consultado ao vivo em eventos.json, nunca cacheado na marca.
  const gridProximos = document.querySelector("#grid-proximos");
  if (proximos.length === 0) {
    gridProximos.replaceChildren(
      criarEstadoVazio(
        "Nenhum evento agendado no momento",
        "Essa marca não tem eventos futuros cadastrados ainda.",
        [{ href: `agenda.html?marca=${encodeURIComponent(marca.slug)}`, texto: "Ver na Agenda" }]
      )
    );
  } else {
    proximos.forEach((evento) => {
      gridProximos.appendChild(criarEventCard(evento, { local: locaisPorSlug.get(evento.localSlug), marca }));
    });
  }

  // Últimos eventos (histórico) — idem, sempre consultado ao vivo.
  const historico = await eventosService.listarHistoricoPorMarca(marca.slug);
  document.querySelector("#lista-historico").appendChild(renderHistorico(historico));

  // Espaços reservados — sem dado fictício, só o que já está no roadmap.
  const gridFuturo = document.querySelector("#grid-futuro");
  gridFuturo.appendChild(criarFuturoRecurso("Avaliações", "Em breve, a comunidade vai poder avaliar os bailes dessa marca."));
  gridFuturo.appendChild(criarFuturoRecurso("Seguidores", "Em breve, será possível seguir esta marca e ser avisado dos próximos eventos."));
  gridFuturo.appendChild(criarFuturoRecurso("Estatísticas", "Em breve: total de eventos realizados, presença média e mais."));
}

init();
