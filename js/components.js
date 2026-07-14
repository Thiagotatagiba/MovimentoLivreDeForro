import { formatarDataCurta, formatarDataCompleta, formatarHorario, ehHoje } from "./utils.js";
import { botaoIngresso, formatarValorIngresso } from "./ingresso.js";

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
    return `<img src="${evento.imagem}" alt="" loading="lazy" decoding="async" width="400" height="300" />`;
  }
  return svgTextura();
}

/**
 * Retorna o elemento <article> pronto para inserir no DOM. Único ponto de
 * verdade do card de evento — usado na Home, na Agenda e nos relacionados.
 *
 * Hierarquia visual (inspirada em Sympla/Shotgun/Fever, adaptada à
 * identidade do projeto): **Marca → Nome do evento** → Data/Horário →
 * Cidade/Local → Valor → Botão de Ingressos (só quando o evento tem link
 * de compra — ver js/ingresso.js). A Marca vem primeiro de propósito: é ela
 * que fideliza — em dois anos a comunidade vai perguntar "hoje tem Deck?",
 * não o nome de cada edição. Sem ingresso, o card continua navegável
 * normalmente pela imagem e pelos títulos; só o botão extra some.
 *
 * @param {object} evento
 * @param {object} contexto
 * @param {object} [contexto.local] - local físico (endereço) do evento
 * @param {object} [contexto.marca] - identidade do baile (Marca) do evento
 */
export function criarEventCard(evento, contexto = {}) {
  const { local, marca } = contexto;
  const art = document.createElement("article");
  art.className = "event-card";

  const hoje = ehHoje(evento);
  const href = `evento.html?slug=${encodeURIComponent(evento.slug)}`;
  const nomeIdentidade = marca ? marca.nome : evento.cidade;
  const nomeLocal = local ? local.nome : evento.cidade;

  const acesso = botaoIngresso(evento);
  const marcaHref = marca ? `marca.html?slug=${encodeURIComponent(marca.slug)}` : null;

  art.innerHTML = `
    <a href="${href}" class="thumb" aria-hidden="true" tabindex="-1">
      ${miniaturaHtml(evento)}
      <span class="badge-type">${evento.tipo}</span>
      ${hoje ? `<span class="pulse-today"><span class="pulse-bars"><span></span><span></span><span></span></span>Hoje</span>` : ""}
    </a>
    <div class="body">
      <h3 class="card-marca">${marcaHref ? `<a href="${marcaHref}">${nomeIdentidade}</a>` : nomeIdentidade}</h3>
      <p class="card-evento-titulo"><a href="${href}">${evento.titulo}</a></p>
      <p class="card-line">${formatarDataCurta(evento.inicio)} · ${formatarHorario(evento.inicio)}</p>
      <p class="card-line card-line--muted">📍 ${evento.cidade} · ${nomeLocal}</p>
      <div class="card-footer">
        <p class="card-price">${formatarValorIngresso(evento)}</p>
        ${acesso ? `<a class="btn ${acesso.variante} btn-block" href="${acesso.url}" target="_blank" rel="noopener">${acesso.rotulo}</a>` : ""}
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

/**
 * Banner "Hoje tem forró?" — a resposta mais direta possível à pergunta
 * central do projeto, logo abaixo do título da Home.
 */
export function criarBannerHoje(eventosHoje, hojeIso, marcasPorSlug = new Map()) {
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

  const nomesMarcas = [...new Set(eventosHoje.map((e) => marcasPorSlug.get(e.marcaSlug)?.nome).filter(Boolean))];
  const contagem = eventosHoje.length === 1 ? "1 evento acontecendo hoje" : `${eventosHoje.length} eventos acontecendo hoje`;
  const destaqueMarcas =
    nomesMarcas.length > 0
      ? `<p class="today-banner-highlights">${nomesMarcas.slice(0, 3).join(" • ")}${nomesMarcas.length > 3 ? ` e mais ${nomesMarcas.length - 3}` : ""}</p>`
      : "";

  div.innerHTML = `
    <p class="today-banner-date">Hoje · ${dataTxt}</p>
    <p class="today-banner-count">
      <span class="pulse-bars" aria-hidden="true"><span></span><span></span><span></span></span>
      🔥 ${contagem}
    </p>
    ${destaqueMarcas}
    <a class="btn btn-primary btn-sm today-banner-cta" href="agenda.html?janela=hoje">Ver todos</a>
  `;
  return div;
}

/**
 * Espaço reservado para uma funcionalidade futura (avaliações, seguidores,
 * estatísticas...) — nunca mostra números ou dados inventados, só comunica
 * com clareza que o recurso existe no roadmap. Reutilizável em qualquer
 * página de perfil (Marca hoje; Professor e Banda no futuro).
 */
export function criarFuturoRecurso(titulo, descricao) {
  const div = document.createElement("div");
  div.className = "future-feature";
  div.innerHTML = `
    <span class="future-feature-tag">Em breve</span>
    <h3>${titulo}</h3>
    <p>${descricao}</p>
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
