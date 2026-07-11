import { formatarDataCurta, formatarDataCompleta, formatarHorario, ehHoje } from "./utils.js";
import { badgeAcesso } from "./access.js";

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

/** Miniatura do card: foto real (lazy) quando existir, textura ilustrativa como fallback. */
function miniaturaHtml(evento) {
  if (evento.imagem) {
    return `<img src="${evento.imagem}" alt="" loading="lazy" decoding="async" width="400" height="250" />`;
  }
  return svgTextura();
}

/** Badge padronizada de música — usa as mesmas classes .badge em todo o site. */
function badgeMusicaHtml(evento) {
  if (!evento.musica) return "";
  const aoVivo = evento.musica === "Música ao vivo";
  return `<span class="badge ${aoVivo ? "badge--live" : "badge--dj"}">${aoVivo ? "🎵 Ao vivo" : "🎧 DJ"}</span>`;
}

function badgeAcessoHtml(evento) {
  const badge = badgeAcesso(evento);
  if (!badge) return "";
  return `<span class="badge ${badge.modificador}">${badge.rotulo}</span>`;
}

/**
 * Retorna o elemento <article> pronto para inserir no DOM. Único ponto de
 * verdade do card de evento — usado na Home, na Agenda e nos relacionados.
 *
 * opcoes.ctaLabel: texto do botão de ação (padrão "Ver detalhes").
 */
export function criarEventCard(evento, local, opcoes = {}) {
  const { ctaLabel = "Ver detalhes" } = opcoes;
  const art = document.createElement("article");
  art.className = "event-card";

  const hoje = ehHoje(evento);
  const href = `evento.html?slug=${encodeURIComponent(evento.slug)}`;

  art.innerHTML = `
    <a href="${href}" class="thumb" aria-hidden="true" tabindex="-1">
      ${miniaturaHtml(evento)}
      <span class="badge-type">${evento.tipo}</span>
      ${hoje ? `<span class="pulse-today"><span class="pulse-bars"><span></span><span></span><span></span></span>Hoje</span>` : ""}
    </a>
    <div class="body">
      <h3><a href="${href}">${evento.titulo}</a></h3>
      <p class="meta">
        <span>📍 ${local ? local.nome : evento.cidade}</span>
        <span>· ${evento.cidade}</span>
        <span>· ${formatarDataCurta(evento.inicio)}, ${formatarHorario(evento.inicio)}</span>
      </p>
      <div class="badges-row">
        ${badgeAcessoHtml(evento)}
        ${badgeMusicaHtml(evento)}
      </div>
      <div class="footer-row">
        <span class="price-tag ${evento.entrada === "gratuito" ? "free" : ""}">${evento.entrada === "gratuito" ? "Gratuito" : evento.preco}</span>
        <a class="btn btn-primary btn-sm" href="${href}">${ctaLabel}</a>
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

/**
 * Estado vazio padronizado — nunca uma tela morta. `acoes` aceita links
 * ({ texto, href }) e botões ({ texto, onClick }), misturados livremente.
 */
export function criarEstadoVazio(titulo, mensagem, acoes = []) {
  const div = document.createElement("div");
  div.className = "empty-state";

  const cabecalho = document.createElement("div");
  cabecalho.innerHTML = `<h3>${titulo}</h3><p>${mensagem}</p>`;
  div.appendChild(cabecalho);

  if (acoes.length > 0) {
    const linha = document.createElement("div");
    linha.className = "empty-state-actions";
    acoes.forEach((acao, indice) => {
      const classe = indice === 0 ? "btn btn-primary" : "btn btn-ghost";
      if (acao.href) {
        const a = document.createElement("a");
        a.className = classe;
        a.href = acao.href;
        a.textContent = acao.texto;
        linha.appendChild(a);
      } else if (acao.onClick) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = classe;
        btn.textContent = acao.texto;
        btn.addEventListener("click", acao.onClick);
        linha.appendChild(btn);
      }
    });
    div.appendChild(linha);
  }

  return div;
}

/** Bloco de resumo da semana usado na Home (contagem de eventos, cidades e aulas). */
export function criarResumoSemana(resumo) {
  const div = document.createElement("p");
  div.className = "week-summary";
  if (resumo.totalEventos === 0) {
    div.textContent = "Nenhum evento cadastrado para esta semana ainda.";
    return div;
  }
  const evTxt = resumo.totalEventos === 1 ? "1 evento" : `${resumo.totalEventos} eventos`;
  const cidTxt = resumo.totalCidades === 1 ? "1 cidade" : `${resumo.totalCidades} cidades`;
  const aulaTxt = resumo.totalAulas === 1 ? "1 aula" : `${resumo.totalAulas} aulas`;
  div.innerHTML = `<strong>${evTxt}</strong> nesta semana, em <strong>${cidTxt}</strong> da Grande Vitória — incluindo <strong>${aulaTxt}</strong>.`;
  return div;
}

/**
 * Banner "Hoje tem forró?" — a resposta mais direta possível à pergunta
 * central do projeto, logo abaixo do título da Home.
 */
export function criarBannerHoje(eventosHoje, hojeIso) {
  const div = document.createElement("div");
  div.className = "today-banner";
  const dataTxt = formatarDataCompleta(hojeIso);

  if (eventosHoje.length === 0) {
    div.innerHTML = `
      <p class="today-banner-date">Hoje · ${dataTxt}</p>
      <p class="today-banner-empty">Hoje não há eventos cadastrados. <a href="agenda.html?janela=amanha">Veja a programação de amanhã</a>.</p>
    `;
    return div;
  }

  const cidades = [...new Set(eventosHoje.map((e) => e.cidade))];
  const contagem = eventosHoje.length === 1 ? "1 evento acontecendo hoje" : `${eventosHoje.length} eventos acontecendo hoje`;

  div.innerHTML = `
    <p class="today-banner-date">Hoje · ${dataTxt}</p>
    <p class="today-banner-count">
      <span class="pulse-bars" aria-hidden="true"><span></span><span></span><span></span></span>
      🎉 ${contagem}
    </p>
    <p class="today-banner-cities">📍 ${cidades.join(" • ")}</p>
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
