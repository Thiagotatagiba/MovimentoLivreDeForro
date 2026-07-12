import { eventosService } from "./services/eventosService.js";
import { locaisService } from "./services/locaisService.js";
import { marcasService } from "./services/marcasService.js";
import { criarEventCard, ligarMenuMobile } from "./components.js";
import { formatarDataLonga, formatarHorario } from "./utils.js";
import { botaoAcesso, badgeAcesso } from "./access.js";
import { linkGoogleMaps } from "./maps.js";

function heroHtml(evento) {
  if (evento.imagem) {
    return `<img src="${evento.imagem}" alt="" decoding="async" />`;
  }
  return `
    <svg viewBox="0 0 200 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="passos-hero" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
          <circle cx="6" cy="6" r="3" fill="#ffffff" />
          <circle cx="26" cy="18" r="3" fill="#ffffff" />
        </pattern>
      </defs>
      <rect width="200" height="90" fill="url(#passos-hero)" />
    </svg>`;
}

async function init() {
  ligarMenuMobile();

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const main = document.querySelector("#evento-conteudo");

  if (!slug) {
    main.innerHTML = `<div class="empty-state"><h3>Evento não encontrado</h3><p>Faltou informar qual evento abrir.</p><a class="btn btn-ghost" href="agenda.html">Ver agenda completa</a></div>`;
    return;
  }

  const evento = await eventosService.buscarPorSlug(slug);
  if (!evento) {
    main.innerHTML = `<div class="empty-state"><h3>Esse evento não existe mais</h3><p>Ele pode ter sido removido ou o link está incorreto.</p><a class="btn btn-ghost" href="agenda.html">Ver agenda completa</a></div>`;
    return;
  }

  const local = await locaisService.buscarPorSlug(evento.localSlug);
  const marca = await marcasService.buscarPorSlug(evento.marcaSlug);
  document.title = `${evento.titulo} — Movimento Livre de Forró`;

  const gratuito = evento.entrada === "gratuito";
  const acesso = botaoAcesso(evento);
  const badgeInfoAcesso = badgeAcesso(evento);
  const mapaHref = linkGoogleMaps(evento, local);

  main.innerHTML = `
    <nav class="breadcrumb wrap" aria-label="Trilha de navegação">
      <a href="agenda.html">Agenda</a> / <span>${evento.titulo}</span>
    </nav>
    <div class="wrap">
      <div class="event-hero">
        ${heroHtml(evento)}
      </div>

      <div class="event-detail-grid">
        <div>
          <p class="eyebrow" style="margin-top:1.5rem">${marca ? `<a href="marca.html?slug=${encodeURIComponent(marca.slug)}">${marca.nome}</a>` : evento.tipo}</p>
          <h1 style="font-family:var(--font-display); font-size:var(--text-2xl); font-weight:600;">${evento.titulo}</h1>
          <p style="margin-top:0.75rem; color:var(--ink-soft); max-width:60ch;">${evento.descricao}</p>

          <div class="badges-row" style="margin-top:1.5rem;">
            <span class="badge badge--type">${evento.tipo}</span>
            ${badgeInfoAcesso ? `<span class="badge ${badgeInfoAcesso.modificador}">${badgeInfoAcesso.rotulo}</span>` : ""}
            <span class="badge ${evento.musica === "Música ao vivo" ? "badge--live" : "badge--dj"}">${evento.musica === "Música ao vivo" ? "🎵 Ao vivo" : "🎧 DJ"}</span>
          </div>

          <section id="relacionados" style="margin-top:2.5rem;">
            <h2 style="font-family:var(--font-display); font-size:var(--text-xl); font-weight:600; margin-bottom:1rem;">Eventos relacionados</h2>
            <div class="event-grid" id="grid-relacionados"></div>
          </section>
        </div>

        <aside class="info-card" aria-label="Informações práticas">
          <div class="info-row"><span class="label">Data</span><span class="value">${formatarDataLonga(evento.inicio)}</span></div>
          <div class="info-row"><span class="label">Horário</span><span class="value">${formatarHorario(evento.inicio)}</span></div>
          <div class="info-row"><span class="label">Local</span><span class="value">${local ? local.nome : (evento.enderecoTexto ?? evento.cidade)}</span></div>
          <div class="info-row"><span class="label">Endereço</span><span class="value">${local ? local.endereco : (evento.enderecoTexto ?? evento.cidade)}</span></div>
          <div class="info-row"><span class="label">Entrada</span><span class="value">${gratuito ? "Gratuito" : evento.preco}</span></div>
          <div class="cta-stack" style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.5rem;">
            ${acesso ? `<a class="btn ${acesso.variante}" href="${acesso.url}" target="_blank" rel="noopener">${acesso.rotulo}</a>` : ""}
            <a class="btn btn-ghost" href="${mapaHref}" target="_blank" rel="noopener">Abrir no Google Maps</a>
            <a class="btn btn-ghost" href="${evento.whatsapp}" target="_blank" rel="noopener">Falar no WhatsApp</a>
            <a class="btn btn-ghost" href="${evento.instagram}" target="_blank" rel="noopener">Ver no Instagram</a>
            <button class="btn btn-ghost" id="btn-compartilhar" type="button">Compartilhar</button>
          </div>
        </aside>
      </div>
    </div>
  `;

  const gridRelacionados = document.querySelector("#grid-relacionados");
  const relacionados = await eventosService.listarRelacionados(evento);
  if (relacionados.length === 0) {
    document.querySelector("#relacionados").remove();
  } else {
    const [locaisPorSlug, marcasPorSlug] = await Promise.all([locaisService.mapaPorSlug(), marcasService.mapaPorSlug()]);
    relacionados.forEach((rel) => {
      gridRelacionados.appendChild(
        criarEventCard(rel, { local: locaisPorSlug.get(rel.localSlug), marca: marcasPorSlug.get(rel.marcaSlug) })
      );
    });
  }

  const btnShare = document.querySelector("#btn-compartilhar");
  btnShare.addEventListener("click", async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: evento.titulo, url }); } catch { /* usuário cancelou */ }
    } else {
      await navigator.clipboard.writeText(url);
      btnShare.textContent = "Link copiado!";
      setTimeout(() => (btnShare.textContent = "Compartilhar"), 2000);
    }
  });
}

init();
