// marca.js
import { obterPerfilMarca } from '../services/marcaService.js';
import { formatarDataCurta, formatarDiaSemana, estiloMidia } from '../utils/format.js';

const raiz = document.getElementById('conteudo-marca');
const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

async function iniciar() {
  if (!slug) {
    raiz.innerHTML = estadoVazio('Marca não especificada.');
    return;
  }

  const perfil = await obterPerfilMarca(slug);
  if (!perfil) {
    raiz.innerHTML = estadoVazio('Esta Marca não foi encontrada ou não está mais ativa.');
    return;
  }

  document.title = `${perfil.marca.nome} — Vai Ter Forró!`;
  raiz.innerHTML = montarHtml(perfil);
}

function montarHtml({ marca, localPadrao, proximos, historico }) {
  return `
    <div class="perfil-header">
      <p class="rotulo-eyebrow">Marca</p>
      <h1>${marca.nome}</h1>
      <p style="margin-top: var(--esp-sm); opacity: 0.9;">${marca.descricao}</p>
      <div style="margin-top: var(--esp-sm);">
        ${marca.frequencia ? `<span class="tag-categoria">Baile ${marca.frequencia}</span>` : ''}
        ${marca.categorias.map((c) => `<span class="tag-categoria">${c}</span>`).join('')}
      </div>
    </div>

    <div class="container">
      ${localPadrao ? `
        <section class="secao">
          <h2 style="font-size: var(--tam-titulo-sm);">Local</h2>
          <div class="local-mini" style="margin-top: var(--esp-sm);">
            <div>
              <p style="font-weight: 600;">${localPadrao.nome}</p>
              <p style="font-size: var(--tam-caption);">${localPadrao.endereco?.bairro ?? ''} · ${localPadrao.endereco?.cidade ?? ''}</p>
            </div>
            <a href="local.html?slug=${localPadrao.slug}">Ver Local</a>
          </div>
        </section>
      ` : ''}

      <section class="secao">
        <h2 style="font-size: var(--tam-titulo-sm);">Próximos eventos</h2>
        <div class="grade-eventos" style="margin-top: var(--esp-md);">
          ${proximos.length ? proximos.map(cardEventoHtml).join('') : '<div class="estado-vazio">Nenhum evento futuro cadastrado.</div>'}
        </div>
      </section>

      ${historico.length ? `
        <section class="secao">
          <h2 style="font-size: var(--tam-titulo-sm);">Histórico</h2>
          <div class="grade-eventos" style="margin-top: var(--esp-md);">
            ${historico.map(cardEventoHtml).join('')}
          </div>
        </section>
      ` : ''}

      <div style="display: flex; gap: var(--esp-sm); padding: var(--esp-md) 0 var(--esp-xl); flex-wrap: wrap;">
        ${marca.instagram && marca.instagram !== 'em breve' ? `<a class="botao botao-secundario" href="${marca.instagram}">Instagram</a>` : ''}
        ${marca.site ? `<a class="botao botao-secundario" href="${marca.site}">Site</a>` : ''}
        ${marca.whatsapp && marca.whatsapp !== 'em breve' ? `<a class="botao botao-primario" href="${marca.whatsapp}">WhatsApp</a>` : ''}
      </div>
    </div>
  `;
}

function cardEventoHtml(evento) {
  return `
    <a class="card-evento" href="evento.html?slug=${encodeURIComponent(evento.slug)}">
      <div class="midia" style="${estiloMidia(evento.imagemUrl)}">
        <span class="badge">${formatarDataCurta(evento.data)}</span>
      </div>
      <div class="corpo">
        <p class="titulo-evento">${evento.titulo}</p>
        <p class="meta">${capitalizar(formatarDiaSemana(evento.data))} · ${evento.local?.nome ?? 'local em breve'}</p>
      </div>
    </a>
  `;
}

function capitalizar(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

function estadoVazio(mensagem) {
  return `<div class="estado-vazio" style="padding-top: 80px;">${mensagem}</div>`;
}

iniciar().catch((erro) => {
  console.error(erro);
  raiz.innerHTML = estadoVazio('Não foi possível carregar esta Marca agora.');
});
