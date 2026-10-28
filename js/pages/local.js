// local.js — página do Local.
//
// Revisão 2026-10-28 (2): capa curta com foto e nome por cima; endereço,
// contato e ações abaixo, no fundo claro.

import { obterPerfilLocal } from '../services/localService.js';
import {
  enderecoCompleto,
  estiloCapa,
  escaparHtml,
  linkInstagram,
  linkRota,
  linkTelefone,
} from '../utils/format.js';
import { atualizarMeta, atualizarCanonical } from '../utils/meta.js';
import { cardEventoHtml } from '../utils/cardEvento.js';
import { estadoVazioHtml } from '../utils/ui.js';
import { ligarBotaoCompartilhar } from '../../components/compartilhar.js';

const raiz = document.getElementById('conteudo-local');
const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

async function iniciar() {
  if (!slug) {
    raiz.innerHTML = estadoVazioHtml({
      icone: '🔎',
      titulo: 'Local não especificado',
      texto: 'Escolhe um Local na página de um evento.',
      ctaHref: 'agenda.html',
      ctaTexto: 'Ver agenda',
    });
    return;
  }

  const perfil = await obterPerfilLocal(slug);
  if (!perfil) {
    raiz.innerHTML = estadoVazioHtml({
      icone: '😕',
      titulo: 'Local não encontrado',
      texto: 'Este Local não existe mais ou saiu do ar.',
      ctaHref: 'agenda.html',
      ctaTexto: 'Ver agenda',
    });
    return;
  }

  atualizarMeta({
    titulo: `${perfil.local.nome} — Vai Ter Forró!`,
    descricao: `${perfil.local.nome} · ${enderecoCompleto(perfil.local.endereco)}`,
    imagem: perfil.local.fotoCapa,
  });
  atualizarCanonical(`local.html?slug=${encodeURIComponent(perfil.local.slug)}`);

  raiz.innerHTML = montarHtml(perfil);

  const botaoCompartilhar = document.getElementById('botao-compartilhar-local');
  if (botaoCompartilhar) {
    ligarBotaoCompartilhar(botaoCompartilhar, {
      titulo: perfil.local.nome,
      texto: `${perfil.local.nome} — ${perfil.local.endereco?.cidade ?? ''}`,
      url: window.location.href,
    });
  }
}

function avatarHtml(local) {
  if (local.fotoPerfil) {
    return `<img class="perfil-capa-logo" src="${escaparHtml(local.fotoPerfil)}" alt="">`;
  }
  const inicial = escaparHtml((local.nome ?? '?').trim().charAt(0));
  return `<span class="perfil-capa-logo avatar-letra" aria-hidden="true">${inicial}</span>`;
}

function montarHtml({ local, proximos, marcas }) {
  const linkMapa = local.mapsLink
    || (local.latitude != null && local.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${local.latitude},${local.longitude}`
      : null);
  const rota = linkRota(local);

  const instagram = linkInstagram(local.instagram);
  const telefone = linkTelefone(local.telefone);
  const site = local.site && local.site !== 'em breve' ? local.site : null;
  const cidade = local.endereco?.cidade;

  return `
    <header class="perfil-capa" style="${estiloCapa(local.fotoCapa)}">
      <div class="perfil-capa-conteudo">
        ${avatarHtml(local)}
        <div class="perfil-capa-texto">
          <p class="rotulo-eyebrow">Local${local.tipo ? ` · ${escaparHtml(local.tipo)}` : ''}</p>
          <h1>${escaparHtml(local.nome)}</h1>
          ${cidade ? `<p>${escaparHtml(cidade)}</p>` : ''}
        </div>
      </div>
    </header>

    <div class="container">
      <section class="perfil-resumo">
        <p class="texto-suave">${escaparHtml(enderecoCompleto(local.endereco))}</p>

        <div class="secao-acoes">
          ${rota ? `<a class="botao botao-primario" href="${escaparHtml(rota)}" target="_blank" rel="noopener">Como chegar</a>` : ''}
          ${linkMapa ? `<a class="botao botao-secundario" href="${escaparHtml(linkMapa)}" target="_blank" rel="noopener">Ver no mapa</a>` : ''}
          ${telefone ? `<a class="botao botao-secundario" href="${escaparHtml(telefone)}">Ligar</a>` : ''}
          <button type="button" class="botao botao-secundario" id="botao-compartilhar-local">Compartilhar</button>
        </div>

        ${(instagram || site) ? `
          <div class="lista-chips">
            ${instagram ? `<a class="chip" href="${escaparHtml(instagram)}" target="_blank" rel="noopener">Instagram</a>` : ''}
            ${site ? `<a class="chip" href="${escaparHtml(site)}" target="_blank" rel="noopener">Site</a>` : ''}
          </div>
        ` : ''}
      </section>

      ${local.descricao ? `
        <section class="secao">
          <h2>Sobre o espaço</h2>
          <p class="texto-suave">${escaparHtml(local.descricao)}</p>
        </section>
      ` : ''}

      ${marcas.length ? `
        <section class="secao">
          <h2>Marcas que já usaram este espaço</h2>
          <div class="lista-chips">
            ${marcas.map((marca) => `<a class="chip" href="marca.html?slug=${encodeURIComponent(marca.slug)}">${escaparHtml(marca.nome)}</a>`).join('')}
          </div>
        </section>
      ` : ''}

      <section class="secao" style="padding-bottom: var(--esp-xl);">
        <h2>Próximos eventos aqui</h2>
        ${proximos.length
          ? `<div class="grade-eventos">${proximos.map((evento) => cardEventoHtml(evento, { mostrarLocal: false })).join('')}</div>`
          : estadoVazioHtml({
              icone: '📅',
              titulo: 'Nenhum evento futuro neste Local',
              texto: 'Enquanto isso, veja o que está rolando na agenda.',
              ctaHref: 'agenda.html',
              ctaTexto: 'Ver agenda',
            })}
      </section>
    </div>
  `;
}

iniciar().catch((erro) => {
  console.error(erro);
  raiz.innerHTML = estadoVazioHtml({
    icone: '😕',
    titulo: 'Não foi possível carregar este Local',
    texto: 'Tenta de novo em instantes.',
    ctaHref: 'agenda.html',
    ctaTexto: 'Ver agenda',
  });
});
