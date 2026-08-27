// local.js
import { obterPerfilLocal } from '../services/localService.js';
import { formatarDataCurta, formatarDiaSemana, enderecoCompleto, estiloMidia } from '../utils/format.js';

const raiz = document.getElementById('conteudo-local');
const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

async function iniciar() {
  if (!slug) {
    raiz.innerHTML = estadoVazio('Local não especificado.');
    return;
  }

  const perfil = await obterPerfilLocal(slug);
  if (!perfil) {
    raiz.innerHTML = estadoVazio('Este Local não foi encontrado ou não está mais ativo.');
    return;
  }

  document.title = `${perfil.local.nome} — Vai Ter Forró!`;
  raiz.innerHTML = montarHtml(perfil);
}

function montarHtml({ local, proximos, marcas }) {
  const linkMapa = local.mapsLink
    || (local.latitude != null && local.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${local.latitude},${local.longitude}`
      : null);

  return `
    <div class="perfil-header">
      <p class="rotulo-eyebrow">Local${local.tipo ? ` · ${local.tipo}` : ''}</p>
      <h1>${local.nome}</h1>
      <p style="margin-top: var(--esp-sm); opacity: 0.9;">${enderecoCompleto(local.endereco)}</p>
    </div>

    <div class="container">
      ${local.descricao ? `
        <section class="secao">
          <p class="texto-suave">${local.descricao}</p>
        </section>
      ` : ''}

      <div class="secao" style="display: flex; gap: var(--esp-sm); flex-wrap: wrap;">
        ${linkMapa ? `<a class="botao botao-secundario" style="width: auto; flex: 1;" href="${linkMapa}">Ver rota no Maps</a>` : ''}
        ${local.telefone ? `<a class="botao botao-secundario" style="width: auto; flex: 1;" href="tel:${local.telefone}">Ligar</a>` : ''}
      </div>

      ${marcas.length ? `
        <section class="secao">
          <h2 style="font-size: var(--tam-titulo-sm);">Marcas que já usaram este espaço</h2>
          <div style="display: flex; flex-wrap: wrap; gap: var(--esp-sm); margin-top: var(--esp-md);">
            ${marcas.map((m) => `<a class="tag-categoria" style="background: var(--cor-pine-claro); color: var(--cor-pine-escuro);" href="marca.html?slug=${m.slug}">${m.nome}</a>`).join('')}
          </div>
        </section>
      ` : ''}

      <section class="secao">
        <h2 style="font-size: var(--tam-titulo-sm);">Próximos eventos aqui</h2>
        <div class="grade-eventos" style="margin-top: var(--esp-md);">
          ${proximos.length ? proximos.map(cardEventoHtml).join('') : '<div class="estado-vazio">Nenhum evento futuro neste Local por enquanto.</div>'}
        </div>
      </section>
    </div>
  `;
}

function cardEventoHtml(evento) {
  return `
    <a class="card-evento" href="evento.html?slug=${encodeURIComponent(evento.slug)}">
      <div class="midia" style="${estiloMidia(evento.imagemUrl)}">
        <span class="badge">${formatarDataCurta(evento.data)}</span>
        <span class="marca-nome">${evento.marca?.nome ?? ''}</span>
      </div>
      <div class="corpo">
        <p class="titulo-evento">${evento.titulo}</p>
        <p class="meta">${capitalizar(formatarDiaSemana(evento.data))}</p>
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
  raiz.innerHTML = estadoVazio('Não foi possível carregar este Local agora.');
});
