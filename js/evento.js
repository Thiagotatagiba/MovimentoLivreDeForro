import { buscarEventoPorSlug, buscarLocalPorSlug, eventosRelacionados } from "./data.js";
import { criarEventCard, ligarMenuMobile } from "./components.js";
import { formatarDataLonga } from "./utils.js";

async function init() {
  ligarMenuMobile();

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const main = document.querySelector("#evento-conteudo");

  if (!slug) {
    main.innerHTML = `<div class="empty-state"><h3>Evento não encontrado</h3><p>Faltou informar qual evento abrir.</p><a class="btn btn-ghost" href="agenda.html">Ver agenda completa</a></div>`;
    return;
  }

  const evento = await buscarEventoPorSlug(slug);
  if (!evento) {
    main.innerHTML = `<div class="empty-state"><h3>Esse evento não existe mais</h3><p>Ele pode ter sido removido ou o link está incorreto.</p><a class="btn btn-ghost" href="agenda.html">Ver agenda completa</a></div>`;
    return;
  }

  const local = await buscarLocalPorSlug(evento.localSlug);
  document.title = `${evento.titulo} — Movimento Livre de Forró`;

  const gratuito = evento.entrada === "gratuito";

  main.innerHTML = `
    <nav class="breadcrumb wrap" aria-label="Trilha de navegação">
      <a href="agenda.html">Agenda</a> / <span>${evento.titulo}</span>
    </nav>
    <div class="wrap">
      <div class="event-hero">
        <svg viewBox="0 0 200 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <pattern id="passos-hero" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
              <circle cx="6" cy="6" r="3" fill="#ffffff" />
              <circle cx="26" cy="18" r="3" fill="#ffffff" />
            </pattern>
          </defs>
          <rect width="200" height="90" fill="url(#passos-hero)" />
        </svg>
      </div>

      <div class="event-detail-grid">
        <div>
          <p class="section-head eyebrow" style="margin-top:1.5rem">${evento.tipo}</p>
          <h1 style="font-family:var(--font-display); font-size:var(--text-2xl); font-weight:600;">${evento.titulo}</h1>
          <p style="margin-top:0.75rem; color:var(--ink-soft); max-width:60ch;">${evento.descricao}</p>

          <div class="chip-row" style="margin-top:1.5rem;">
            <span class="chip">${evento.musica}</span>
            <span class="chip">${gratuito ? "Entrada gratuita" : evento.preco}</span>
          </div>

          <section id="relacionados" style="margin-top:2.5rem;">
            <h2 style="font-family:var(--font-display); font-size:var(--text-xl); font-weight:600; margin-bottom:1rem;">Eventos relacionados</h2>
            <div class="event-grid" id="grid-relacionados"></div>
          </section>
        </div>

        <aside class="info-card" aria-label="Informações práticas">
          <div class="info-row"><span class="label">Data</span><span class="value">${formatarDataLonga(evento.data)}</span></div>
          <div class="info-row"><span class="label">Horário</span><span class="value">${evento.horario}</span></div>
          <div class="info-row"><span class="label">Local</span><span class="value">${local ? local.nome : evento.cidade}</span></div>
          <div class="info-row"><span class="label">Endereço</span><span class="value">${local ? local.endereco : evento.cidade}</span></div>
          <div class="info-row"><span class="label">Entrada</span><span class="value">${gratuito ? "Gratuito" : evento.preco}</span></div>
          <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.5rem;">
            <a class="btn btn-primary" href="${evento.whatsapp}" target="_blank" rel="noopener">Quero ir · Falar no WhatsApp</a>
            <a class="btn btn-ghost" href="${evento.instagram}" target="_blank" rel="noopener">Ver no Instagram</a>
            <button class="btn btn-ghost" id="btn-compartilhar" type="button">Compartilhar</button>
          </div>
        </aside>
      </div>
    </div>
  `;

  const gridRelacionados = document.querySelector("#grid-relacionados");
  const relacionados = await eventosRelacionados(evento);
  if (relacionados.length === 0) {
    document.querySelector("#relacionados").remove();
  } else {
    const locaisCache = new Map();
    for (const rel of relacionados) {
      if (rel.localSlug && !locaisCache.has(rel.localSlug)) {
        locaisCache.set(rel.localSlug, await buscarLocalPorSlug(rel.localSlug));
      }
      gridRelacionados.appendChild(criarEventCard(rel, locaisCache.get(rel.localSlug)));
    }
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
