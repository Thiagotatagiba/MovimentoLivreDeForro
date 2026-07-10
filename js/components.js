import { formatarDataCurta, ehHoje } from "./utils.js";

/** Padrão de "passos de dança" abstrato usado como textura nas miniaturas — sem clichês figurativos. */
function svgTextura() {
  return `
    <svg viewBox="0 0 200 125" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="passos" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
          <circle cx="6" cy="6" r="3" fill="#ffffff" />
          <circle cx="26" cy="18" r="3" fill="#ffffff" />
        </pattern>
      </defs>
      <rect width="200" height="125" fill="url(#passos)" />
    </svg>`;
}

/** Retorna o elemento <article> pronto para inserir no DOM. Único ponto de verdade do card de evento. */
export function criarEventCard(evento, local) {
  const art = document.createElement("article");
  art.className = "event-card";

  const hoje = ehHoje(evento);
  const gratuito = evento.entrada === "gratuito";

  art.innerHTML = `
    <a href="evento.html?slug=${encodeURIComponent(evento.slug)}" class="thumb" aria-hidden="true" tabindex="-1">
      ${svgTextura()}
      <span class="badge-type">${evento.tipo}</span>
      ${hoje ? `<span class="pulse-today"><span class="pulse-bars"><span></span><span></span><span></span></span>Hoje</span>` : ""}
    </a>
    <div class="body">
      <h3><a href="evento.html?slug=${encodeURIComponent(evento.slug)}">${evento.titulo}</a></h3>
      <p class="meta">
        <span>📍 ${local ? local.nome : evento.cidade}</span>
        <span>· ${evento.cidade}</span>
        <span>· ${formatarDataCurta(evento.data)}, ${evento.horario}</span>
      </p>
      <div class="footer-row">
        <span class="price-tag ${gratuito ? "free" : ""}">${gratuito ? "Gratuito" : evento.preco}</span>
        <a class="btn btn-primary btn-sm" href="evento.html?slug=${encodeURIComponent(evento.slug)}">Quero ir</a>
      </div>
    </div>
  `;
  return art;
}

export function criarEsqueletos(quantidade) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < quantidade; i++) {
    const div = document.createElement("div");
    div.className = "skeleton-card";
    div.setAttribute("aria-hidden", "true");
    frag.appendChild(div);
  }
  return frag;
}

export function criarEstadoVazio(titulo, mensagem, cta) {
  const div = document.createElement("div");
  div.className = "empty-state";
  div.innerHTML = `
    <h3>${titulo}</h3>
    <p>${mensagem}</p>
    ${cta ? `<a class="btn btn-ghost" href="${cta.href}">${cta.texto}</a>` : ""}
  `;
  return div;
}

/** Liga o botão hambúrguer do header em todas as páginas. */
export function ligarMenuMobile() {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".nav-mobile");
  if (!toggle || !menu) return;
  toggle.addEventListener("click", () => {
    const aberto = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(aberto));
  });
}
