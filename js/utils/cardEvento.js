// js/utils/cardEvento.js
// Gera o HTML do card de evento usado em agenda.html, index.html, local.html,
// marca.html e favoritos.html. Era 4 cópias quase-idênticas, uma por página
// (ver DECISOES_DE_ARQUITETURA.md, 2026-10-02) — consolidado aqui, com opções
// pra cobrir as pequenas diferenças de cada contexto (ex: marca.html não
// repete o nome da própria Marca, já que a pessoa já está na página dela).
// Função pura: só monta uma string, nunca toca DOM nem repositório.

import { formatarDataCurta, formatarDiaSemana, estiloMidia, imagemDoEvento, ehHoje, capitalizar } from './format.js';

export function cardEventoHtml(evento, opcoes = {}) {
  const {
    mostrarMarca = true,
    mostrarLocal = true,
    mostrarDiaSemana = true,
    badgeHojeEspecial = false,
  } = opcoes;

  const nomeMarca = evento.marca?.nome ?? 'Marca em breve';
  const nomeLocal = evento.local?.nome ?? 'Local em breve';

  const badge = badgeHojeEspecial && ehHoje(evento.data)
    ? `<span class="badge badge-hoje">Hoje</span>`
    : `<span class="badge">${formatarDataCurta(evento.data)}</span>`;

  const metaPartes = [];
  if (mostrarDiaSemana) metaPartes.push(capitalizar(formatarDiaSemana(evento.data)));
  if (mostrarLocal) metaPartes.push(nomeLocal);

  return `
    <a class="card-evento" href="evento.html?slug=${encodeURIComponent(evento.slug)}">
      <div class="midia" style="${estiloMidia(imagemDoEvento(evento))}">
        ${badge}
        ${mostrarMarca ? `<span class="marca-nome">${nomeMarca}</span>` : ''}
      </div>
      <div class="corpo">
        <p class="titulo-evento">${evento.titulo}</p>
        <p class="meta">${metaPartes.join(' · ')}</p>
      </div>
    </a>
  `;
}
