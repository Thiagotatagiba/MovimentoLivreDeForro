// js/utils/cardEvento.js
// Gera o HTML do card de evento usado em agenda.html, index.html, local.html,
// marca.html e favoritos.html. Função pura: só monta string, nunca toca DOM
// nem repositório.
//
// Revisão 2026-10-28 (4): as ocorrências semanais geradas foram removidas, e
// com elas o modo "sem link" e o título "Toda quinta". O card agora representa
// sempre um evento real.

import {
  formatarDataCurtaComDia,
  formatarHora,
  formatarPrecoCurto,
  ehHoje,
  escaparHtml,
  imagemDoEvento,
} from './format.js';

export function cardEventoHtml(evento, opcoes = {}) {
  const {
    mostrarMarca = true,
    mostrarLocal = true,
    mostrarData = true,
  } = opcoes;

  const href = `evento.html?slug=${encodeURIComponent(evento.slug ?? '')}`;
  const nomeMarca = evento.marca?.nome ?? 'Marca em breve';
  const nomeLocal = evento.local?.nome ?? 'Local em breve';
  const imagem = imagemDoEvento(evento);
  const preco = formatarPrecoCurto(evento.ingresso?.precoAPartirDe);

  // Selo sobre a foto: data (ou "Hoje").
  const seloData = mostrarData
    ? (ehHoje(evento.data)
        ? '<div class="card-selos"><span class="selo selo--hoje">Hoje</span></div>'
        : `<div class="card-selos"><span class="selo selo--data">${escaparHtml(formatarDataCurtaComDia(evento.data))}</span></div>`)
    : '';

  // Linha de informação: horário + preço mínimo.
  const partesMeta = [];
  if (evento.horario) partesMeta.push(formatarHora(evento.horario));
  if (preco) partesMeta.push(preco);

  // Foto de perfil da Marca antes do nome (inicial quando não há logo).
  const inicialMarca = escaparHtml(nomeMarca.trim().charAt(0));
  const avatarMarca = evento.marca?.logo
    ? `<img class="card-marca-logo" src="${escaparHtml(evento.marca.logo)}" alt="" loading="lazy" decoding="async">`
    : `<span class="card-marca-logo card-marca-logo--letra" aria-hidden="true">${inicialMarca}</span>`;

  return `
    <a class="card-evento" href="${href}">
      <div class="midia">
        ${imagem ? `<img class="midia-img" src="${escaparHtml(imagem)}" alt="" loading="lazy" decoding="async">` : ''}
        ${seloData}
        ${mostrarMarca ? `
          <span class="card-marca">
            ${avatarMarca}
            <span class="marca-nome">${escaparHtml(nomeMarca)}</span>
          </span>
        ` : ''}
      </div>
      <div class="corpo">
        <p class="titulo-evento">${escaparHtml(evento.titulo)}</p>
        ${partesMeta.length ? `<p class="meta">${escaparHtml(partesMeta.join(' · '))}</p>` : ''}
        ${mostrarLocal ? `<p class="meta-local">${escaparHtml(nomeLocal)}</p>` : ''}
      </div>
    </a>
  `;
}

// Card de dia da Tira de Dias da Home.
export function cardDiaHtml({ rotulo, diaDoMes, mesAbreviado, data, ehHoje: hoje }) {
  return `
    <button type="button" class="card-dia${hoje ? ' ativo' : ''}" aria-haspopup="dialog">
      <span class="card-dia-badge" data-badge-para="${data}" hidden></span>
      <span class="cartao-borda">
        <span class="cartao-conteudo">
          <span class="cartao-dia-numero">${diaDoMes}</span>
          <span class="cartao-dia-mes">${mesAbreviado}</span>
        </span>
      </span>
      <span class="rotulo-dia">${rotulo}</span>
    </button>
  `;
}
