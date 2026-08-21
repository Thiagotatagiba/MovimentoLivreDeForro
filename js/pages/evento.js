// evento.js
import { obterEventoCompleto } from '../services/eventoService.js';
import { formatarDataCompleta, formatarPreco, enderecoResumido, enderecoCompleto } from '../utils/format.js';

const raiz = document.getElementById('conteudo-evento');
const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

async function iniciar() {
  if (!slug) {
    raiz.innerHTML = estadoVazio('Evento não especificado.');
    return;
  }

  const evento = await obterEventoCompleto(slug);
  if (!evento) {
    raiz.innerHTML = estadoVazio('Este evento não foi encontrado ou não está mais ativo.');
    return;
  }

  document.title = `${evento.titulo} — Vai Ter Forró!`;
  raiz.innerHTML = montarHtml(evento);
}

function montarHtml(evento) {
  const marca = evento.marca;
  const local = evento.local;
  const lineup = [...(evento.lineup?.bandas ?? []), ...(evento.lineup?.djs ?? [])];

  return `
    <div class="midia" style="height: 220px; border-radius: 0;">
      <span class="marca-nome" style="font-size: var(--tam-titulo-lg);">${marca?.nome ?? 'Marca em breve'}</span>
    </div>

    <div class="container" style="margin-top: var(--esp-lg);">
      ${marca ? `<a class="rotulo-eyebrow" href="marca.html?slug=${marca.slug}">${marca.nome} →</a>` : ''}
      <h1 style="margin-top: 4px;">${evento.titulo}</h1>

      <div class="resposta-hoje" style="margin-top: var(--esp-md);">
        <h2 style="font-size: var(--tam-titulo-sm);">Quando</h2>
        <p style="text-transform: capitalize;">${formatarDataCompleta(evento.data)} · ${evento.horario}</p>
      </div>

      <section class="secao">
        <h2 style="font-size: var(--tam-titulo-sm);">Sobre o evento</h2>
        <p class="texto-suave" style="margin-top: var(--esp-sm);">${evento.descricao}</p>
      </section>

      ${lineup.length ? `
        <section class="secao">
          <h2 style="font-size: var(--tam-titulo-sm);">Line-up</h2>
          <p class="texto-suave" style="margin-top: var(--esp-sm);">${lineup.join(' · ')}</p>
        </section>
      ` : ''}

      <section class="secao">
        <h2 style="font-size: var(--tam-titulo-sm);">Ingresso</h2>
        <p class="texto-suave" style="margin-top: var(--esp-sm);">
          ${formatarPreco(evento.ingresso?.precoAPartirDe)} · ${evento.ingresso?.plataforma ?? 'em breve'}
        </p>
      </section>

      <section class="secao">
        <h2 style="font-size: var(--tam-titulo-sm);">Localização</h2>
        <div class="local-mini" style="margin-top: var(--esp-sm);">
          <div>
            <p style="font-weight: 600;">${local?.nome ?? 'Local em breve'}</p>
            <p style="font-size: var(--tam-caption);">${enderecoResumido(local?.endereco)}</p>
          </div>
          ${local ? `<a href="local.html?slug=${local.slug}">Ver Local</a>` : ''}
        </div>
        <p class="texto-fraco" style="font-size: var(--tam-caption); margin-top: var(--esp-sm);">
          ${enderecoCompleto(local?.endereco)}
        </p>
      </section>

      <div style="padding: var(--esp-md) 0 var(--esp-xl);">
        <a class="botao botao-primario" href="${evento.ingresso?.link && evento.ingresso.link !== 'em breve' ? evento.ingresso.link : '#'}">
          Garantir ingresso
        </a>
      </div>
    </div>
  `;
}

function estadoVazio(mensagem) {
  return `<div class="estado-vazio" style="padding-top: 80px;">${mensagem}</div>`;
}

iniciar().catch((erro) => {
  console.error(erro);
  raiz.innerHTML = estadoVazio('Não foi possível carregar este evento agora.');
});
