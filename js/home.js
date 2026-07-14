import { eventosService } from "./services/eventosService.js";
import { locaisService } from "./services/locaisService.js";
import { marcasService } from "./services/marcasService.js";
import { criarEventCard, criarBannerHoje, ligarMenuMobile } from "./components.js";
import { botaoIngresso } from "./ingresso.js";
import { hojeLocal, chaveDia, formatarDataCompleta } from "./utils.js";

// A Home é uma lista ordenada de blocos independentes — cada função aqui
// devolve um elemento pronto, ou `null` quando não tem o que mostrar (ex.
// nenhuma marca ativa cadastrada). Adicionar, remover ou reordenar uma
// seção da Home é editar essa lista, não reescrever a página. É também o
// ponto de entrada natural pra quando existir personalização (login): um
// bloco genérico vira um bloco personalizado trocando só a função da lista,
// sem tocar no restante.
//
// Os blocos vivem neste arquivo por enquanto. Se a lista crescer bastante
// (ex. quando "Festivais em destaque" ou "Bandas em destaque" entrarem),
// vale a pena migrar cada função pra um arquivo próprio em js/home/ — mas
// isso é um refactor mecânico, não uma mudança de arquitetura.

const DIA_SEMANA_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Bloco 1 — Hero: carrossel dos próximos eventos com imagem (ou os mais próximos, se nenhum tiver). */
async function criarBlocoHero(contexto) {
  const eventos = await eventosService.listarPorJanela(60);
  if (eventos.length === 0) return null;

  const comImagem = eventos.filter((e) => e.imagem);
  const slides = (comImagem.length > 0 ? comImagem : eventos).slice(0, 5);

  const secao = document.createElement("section");
  secao.className = "section";
  secao.innerHTML = `
    <div class="wrap">
      <div class="hero-carousel" id="hero-carousel">
        ${slides
          .map((evento, indice) => {
            const marca = contexto.marcasPorSlug.get(evento.marcaSlug);
            const ingresso = botaoIngresso(evento);
            const imgTag = evento.imagem
              ? `<img src="${evento.imagem}" alt="" loading="${indice === 0 ? "eager" : "lazy"}" decoding="async" />`
              : `<svg viewBox="0 0 200 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><pattern id="hp${indice}" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(12)"><circle cx="6" cy="6" r="3" fill="#fff"/><circle cx="26" cy="18" r="3" fill="#fff"/></pattern></defs><rect width="200" height="90" fill="url(#hp${indice})"/></svg>`;
            return `
              <div class="hero-slide${indice === 0 ? " is-active" : ""}">
                ${imgTag}
                <div class="hero-slide-overlay">
                  <div class="hero-slide-content">
                    <p class="eyebrow">${marca ? marca.nome : evento.tipo}</p>
                    <h2>${evento.titulo}</h2>
                    <p class="hero-slide-meta">📅 ${formatarDataCompleta(evento.inicio)} · 📍 ${evento.cidade}</p>
                    <div class="hero-slide-actions">
                      <a class="btn btn-ghost-light" href="evento.html?slug=${encodeURIComponent(evento.slug)}">Ver evento</a>
                      ${ingresso ? `<a class="btn btn-primary" href="${ingresso.url}" target="_blank" rel="noopener">${ingresso.rotulo}</a>` : ""}
                    </div>
                  </div>
                </div>
              </div>
            `;
          })
          .join("")}
        ${
          slides.length > 1
            ? `
              <button type="button" class="hero-nav hero-prev" aria-label="Evento anterior">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button type="button" class="hero-nav hero-next" aria-label="Próximo evento">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
              <div class="hero-dots">
                ${slides.map((_, i) => `<button type="button" class="hero-dot${i === 0 ? " is-active" : ""}" aria-label="Ir para o destaque ${i + 1}"></button>`).join("")}
              </div>
            `
            : ""
        }
      </div>
    </div>
  `;

  if (slides.length > 1) iniciarCarrosselHero(secao.querySelector("#hero-carousel"));
  return secao;
}

/** Autoplay com pausa em interação (mouse, toque ou clique manual) — controle sempre com o usuário. */
function iniciarCarrosselHero(root) {
  const slides = [...root.querySelectorAll(".hero-slide")];
  const dots = [...root.querySelectorAll(".hero-dot")];
  let indice = 0;
  let timer = null;

  function irPara(novoIndice) {
    slides[indice].classList.remove("is-active");
    dots[indice]?.classList.remove("is-active");
    indice = (novoIndice + slides.length) % slides.length;
    slides[indice].classList.add("is-active");
    dots[indice]?.classList.add("is-active");
  }

  function iniciarAuto() {
    pararAuto();
    timer = setInterval(() => irPara(indice + 1), 6000);
  }
  function pararAuto() {
    if (timer) clearInterval(timer);
  }

  root.querySelector(".hero-prev")?.addEventListener("click", () => { irPara(indice - 1); iniciarAuto(); });
  root.querySelector(".hero-next")?.addEventListener("click", () => { irPara(indice + 1); iniciarAuto(); });
  dots.forEach((dot, i) => dot.addEventListener("click", () => { irPara(i); iniciarAuto(); }));

  root.addEventListener("mouseenter", pararAuto);
  root.addEventListener("mouseleave", iniciarAuto);
  root.addEventListener("touchstart", pararAuto, { passive: true });

  iniciarAuto();
}

/** Bloco 2 — Mini calendário semanal: intensidade da programação, dia a dia, de relance. */
async function criarBlocoMiniCalendario() {
  const eventos = await eventosService.listarSemana();
  const hoje = hojeLocal();
  const porChave = new Map();
  eventos.forEach((e) => {
    const chave = chaveDia(e.inicio);
    porChave.set(chave, (porChave.get(chave) ?? 0) + 1);
  });

  const secao = document.createElement("section");
  secao.className = "section";
  const dias = [];
  for (let i = 0; i <= 6; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i);
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
    const n = porChave.get(chave) ?? 0;
    const nivel = n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : 3;
    dias.push({ label: DIA_SEMANA_ABREV[data.getDay()], n, nivel, hoje: i === 0 });
  }

  secao.innerHTML = `
    <div class="wrap">
      <div class="section-head"><h2>🎵 Esta semana no forró</h2></div>
      <a class="mini-week" href="agenda.html?view=semana" aria-label="Ver a semana completa na Agenda" style="display:grid; text-decoration:none; color:inherit;">
        ${dias
          .map(
            (d) => `
              <div class="mini-week-day${d.hoje ? " is-today" : ""}">
                <span class="mini-week-day-label">${d.label}</span>
                <span class="mini-week-dot${d.nivel > 0 ? ` nivel-${d.nivel}` : ""}"></span>
                <span class="mini-week-count">${d.n > 0 ? (d.n === 1 ? "1 evento" : `${d.n} eventos`) : ""}</span>
              </div>
            `
          )
          .join("")}
      </a>
    </div>
  `;
  return secao;
}

/** Bloco 3 — "Hoje tem forró?": resposta direta, com marcas do dia e CTA pra ver todos. */
async function criarBlocoHojeTemForro(contexto) {
  const eventosHoje = await eventosService.listarPorJanela(0);
  const secao = document.createElement("section");
  secao.className = "section";
  secao.innerHTML = `<div class="wrap"></div>`;
  secao.querySelector(".wrap").appendChild(criarBannerHoje(eventosHoje, hojeLocal().toISOString(), contexto.marcasPorSlug));
  return secao;
}

/** Bloco 4 — Próximos eventos, em carrossel horizontal. Reaproveita o EventCard sem nenhuma variação nova. */
async function criarBlocoProximosEventos(contexto) {
  const eventos = (await eventosService.listarPorJanela(60)).slice(0, 10);
  if (eventos.length === 0) return null;

  const secao = document.createElement("section");
  secao.className = "section";
  secao.innerHTML = `
    <div class="wrap">
      <div class="section-head"><h2>Próximos eventos</h2></div>
      <div class="event-row" id="proximos-eventos-row"></div>
    </div>
  `;
  const row = secao.querySelector("#proximos-eventos-row");
  eventos.forEach((evento) => {
    row.appendChild(
      criarEventCard(evento, { local: contexto.locaisPorSlug.get(evento.localSlug), marca: contexto.marcasPorSlug.get(evento.marcaSlug) })
    );
  });
  return secao;
}

/** Bloco 5 — Descubra uma Marca: uma marca só, em destaque, sorteada entre as ativas. Reaproveita .about-band e .marca-logo. */
async function criarBlocoDescubraMarca() {
  const marcas = (await marcasService.listarTodos()).filter((m) => m.ativo);
  if (marcas.length === 0) return null;

  const marca = marcas[Math.floor(Math.random() * marcas.length)];
  const iniciais = marca.nome.split(" ").filter((p) => p.length > 2).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const logoHtml = marca.logo
    ? `<img src="${marca.logo}" alt="" decoding="async" />`
    : `<span class="marca-logo-fallback" aria-hidden="true">${iniciais || marca.nome[0]}</span>`;

  const tagline = [marca.cidade, marca.desde ? `Desde ${marca.desde}` : null].filter(Boolean).join(" · ");

  const secao = document.createElement("section");
  secao.className = "section";
  secao.innerHTML = `
    <div class="wrap">
      <div class="about-band">
        <p class="eyebrow">❤️ Descubra uma marca</p>
        <div class="discover-marca-body">
          <div class="marca-logo">${logoHtml}</div>
          <div class="discover-marca-info">
            <h2>${marca.nome}</h2>
            <p class="discover-marca-tagline">${tagline}</p>
            ${marca.descricao ? `<p class="discover-marca-desc">${marca.descricao}</p>` : ""}
            <a class="btn btn-primary" href="marca.html?slug=${encodeURIComponent(marca.slug)}">Conhecer</a>
          </div>
        </div>
      </div>
    </div>
  `;
  return secao;
}

/** Bloco 6 — Sobre o Movimento: institucional, por isso fica perto do rodapé, não no topo. */
function criarBlocoSobre() {
  const secao = document.createElement("section");
  secao.className = "section";
  secao.innerHTML = `
    <div class="wrap">
      <div class="about-band">
        <h2>Sobre o Movimento</h2>
        <p>O Movimento Livre de Forró é uma iniciativa independente para fortalecer, divulgar e fomentar o forró pé de serra na Grande Vitória — conectando dançarinos, professores, bandas, organizadores e casas de eventos em um só lugar.</p>
      </div>
    </div>
  `;
  return secao;
}

async function init() {
  ligarMenuMobile();

  const container = document.querySelector("#home-blocos");
  const contexto = {
    locaisPorSlug: await locaisService.mapaPorSlug(),
    marcasPorSlug: await marcasService.mapaPorSlug(),
  };

  const blocos = [
    () => criarBlocoHero(contexto),
    () => criarBlocoMiniCalendario(),
    () => criarBlocoHojeTemForro(contexto),
    () => criarBlocoProximosEventos(contexto),
    () => criarBlocoDescubraMarca(),
    () => criarBlocoSobre(),
  ];

  for (const criarBloco of blocos) {
    try {
      const elemento = await criarBloco();
      if (elemento) container.appendChild(elemento);
    } catch (erro) {
      // Um bloco falhando não pode derrubar a Home inteira.
      console.error("Falha ao renderizar bloco da Home:", erro);
    }
  }
}

init();
