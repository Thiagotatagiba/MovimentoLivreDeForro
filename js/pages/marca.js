// marca.js — página da Marca.
//
// Revisão 2026-10-28 (2): capa passou a ser uma faixa curta com a foto de
// perfil e o nome da Marca por cima; descrição, tags e ações vieram para baixo,
// no fundo claro. Antes a capa era o fundo de um cabeçalho alto.

import { obterPerfilMarca } from '../services/marcaService.js';
import {
  formatarDiasSemana,
  estiloCapa,
  escaparHtml,
  linkInstagram,
  linkWhatsapp,
} from '../utils/format.js';
import { atualizarMeta, atualizarCanonical } from '../utils/meta.js';
import { cardEventoHtml } from '../utils/cardEvento.js';
import { estadoVazioHtml } from '../utils/ui.js';
import { ligarBotaoInteracao } from '../../components/botaoInteracao.js';
import { ligarBotaoCompartilhar } from '../../components/compartilhar.js';

const raiz = document.getElementById('conteudo-marca');
const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

async function iniciar() {
  if (!slug) {
    raiz.innerHTML = estadoVazioHtml({
      icone: '🔎',
      titulo: 'Marca não especificada',
      texto: 'Escolhe uma Marca na agenda.',
      ctaHref: 'agenda.html',
      ctaTexto: 'Ver agenda',
    });
    return;
  }

  const perfil = await obterPerfilMarca(slug);
  if (!perfil) {
    raiz.innerHTML = estadoVazioHtml({
      icone: '😕',
      titulo: 'Marca não encontrada',
      texto: 'Esta Marca não existe mais ou saiu do ar.',
      ctaHref: 'agenda.html',
      ctaTexto: 'Ver agenda',
    });
    return;
  }

  atualizarMeta({
    titulo: `${perfil.marca.nome} — Vai Ter Forró!`,
    descricao: perfil.marca.descricao,
    imagem: perfil.marca.capa,
  });
  atualizarCanonical(`marca.html?slug=${encodeURIComponent(perfil.marca.slug)}`);

  raiz.innerHTML = montarHtml(perfil);

  const botaoSeguir = document.getElementById('botao-seguir');
  if (botaoSeguir) {
    ligarBotaoInteracao(botaoSeguir, 'marca', perfil.marca.id, { inativo: 'Seguir', ativo: 'Seguindo' });
  }

  const botaoCompartilhar = document.getElementById('botao-compartilhar-marca');
  if (botaoCompartilhar) {
    ligarBotaoCompartilhar(botaoCompartilhar, {
      titulo: perfil.marca.nome,
      texto: `${perfil.marca.nome} — ${perfil.marca.cidadeBase ?? 'Grande Vitória'}`,
      url: window.location.href,
    });
  }
}

function avatarHtml(marca, classe) {
  if (marca.logo) {
    return `<img class="${classe}" src="${escaparHtml(marca.logo)}" alt="">`;
  }
  const inicial = escaparHtml((marca.nome ?? '?').trim().charAt(0));
  return `<span class="${classe} avatar-letra" aria-hidden="true">${inicial}</span>`;
}

function montarHtml({ marca, localPadrao, proximos, historico }) {
  const categorias = marca.categorias ?? [];
  const instagram = linkInstagram(marca.instagram);
  const whatsapp = linkWhatsapp(marca.whatsapp);
  const site = marca.site && marca.site !== 'em breve' ? marca.site : null;

  return `
    <header class="perfil-capa" style="${estiloCapa(marca.capa)}">
      <div class="perfil-capa-conteudo">
        ${avatarHtml(marca, 'perfil-capa-logo')}
        <div class="perfil-capa-texto">
          <p class="rotulo-eyebrow">Marca</p>
          <h1>${escaparHtml(marca.nome)}</h1>
          ${marca.cidadeBase ? `<p>${escaparHtml(marca.cidadeBase)}</p>` : ''}
        </div>
      </div>
    </header>

    <div class="container">
      <section class="perfil-resumo">
        ${marca.descricao ? `<p class="texto-suave">${escaparHtml(marca.descricao)}</p>` : ''}

        <div>
          ${marca.frequencia ? `<span class="tag-categoria">Baile ${escaparHtml(marca.frequencia)}</span>` : ''}
          ${marca.diasSemana?.length ? `<span class="tag-categoria">${escaparHtml(formatarDiasSemana(marca.diasSemana))}</span>` : ''}
          ${categorias.map((categoria) => `<span class="tag-categoria">${escaparHtml(categoria)}</span>`).join('')}
        </div>

        <div class="secao-acoes">
          <button type="button" class="botao botao-secundario botao-seguir" id="botao-seguir" aria-pressed="false">Seguir</button>
          <button type="button" class="botao botao-secundario" id="botao-compartilhar-marca">Compartilhar</button>
        </div>
      </section>

      ${localPadrao ? `
        <section class="secao">
          <h2>Local</h2>
          <div class="local-mini">
            <div>
              <p style="font-weight: 600;">${escaparHtml(localPadrao.nome)}</p>
              <p class="texto-caption">${escaparHtml([localPadrao.endereco?.bairro, localPadrao.endereco?.cidade].filter(Boolean).join(' · '))}</p>
            </div>
            <a href="local.html?slug=${encodeURIComponent(localPadrao.slug)}">Ver Local</a>
          </div>
        </section>
      ` : ''}

      <section class="secao">
        <h2>Próximos eventos</h2>
        ${proximos.length
          ? `<div class="grade-eventos">${proximos.map((evento) => cardEventoHtml(evento, { mostrarMarca: false })).join('')}</div>`
          : estadoVazioHtml({
              icone: '📅',
              titulo: 'Nenhum evento futuro',
              texto: 'Acompanhe o Instagram da Marca para saber da próxima edição.',
              ctaHref: 'agenda.html',
              ctaTexto: 'Ver outros bailes',
            })}
      </section>

      ${historico.length ? `
        <section class="secao">
          <h2>Histórico</h2>
          <div class="grade-eventos">
            ${historico.map((evento) => cardEventoHtml(evento, { mostrarMarca: false })).join('')}
          </div>
        </section>
      ` : ''}

      ${(instagram || whatsapp || site) ? `
        <section class="secao">
          <h2>Contato</h2>
          <div class="lista-chips">
            ${instagram ? `<a class="chip" href="${escaparHtml(instagram)}" target="_blank" rel="noopener">Instagram</a>` : ''}
            ${whatsapp ? `<a class="chip" href="${escaparHtml(whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
            ${site ? `<a class="chip" href="${escaparHtml(site)}" target="_blank" rel="noopener">Site</a>` : ''}
          </div>
        </section>
      ` : ''}
    </div>
  `;
}

iniciar().catch((erro) => {
  console.error(erro);
  raiz.innerHTML = estadoVazioHtml({
    icone: '😕',
    titulo: 'Não foi possível carregar esta Marca',
    texto: 'Tenta de novo em instantes.',
    ctaHref: 'agenda.html',
    ctaTexto: 'Ver agenda',
  });
});
