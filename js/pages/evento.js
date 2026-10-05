// evento.js
import { obterEventoCompleto } from '../services/eventoService.js';
import { formatarDataCompleta, formatarPreco, enderecoResumido, enderecoCompleto, estiloMidia } from '../utils/format.js';
import { ligarBotaoInteracao } from '../../components/botaoInteracao.js';

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

  const botaoFavoritar = document.getElementById('botao-favoritar');
  if (botaoFavoritar) ligarBotaoInteracao(botaoFavoritar, 'evento', evento.id);
}

function montarHtml(evento) {
  const marca = evento.marca;
  const local = evento.local;
  const lineup = [...(evento.lineup?.bandas ?? []), ...(evento.lineup?.djs ?? [])];

  return `
    <div class="midia" style="height: 220px; border-radius: 0; ${estiloMidia(evento.imagemUrl)}">
      <span class="marca-nome" style="font-size: var(--tam-titulo-lg);">${marca?.nome ?? 'Marca em breve'}</span>
      <button type="button" class="botao-favoritar" id="botao-favoritar" aria-label="Favoritar evento" aria-pressed="false">
        <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.7-10-9.3C0.3 8.4 2 5 5.5 5c2 0 3.5 1.2 4.5 2.8C11 6.2 12.5 5 14.5 5 18 5 19.7 8.4 22 11.7 19.5 16.3 12 21 12 21z"/></svg>
      </button>
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

      ${evento.condicoesEspeciais?.length ? `
        <section class="secao">
          <h2 style="font-size: var(--tam-titulo-sm);">Condições especiais</h2>
          <div style="margin-top: var(--esp-sm); display: flex; flex-direction: column; gap: 8px;">
            ${evento.condicoesEspeciais.map((condicao) => `
              <div class="condicao-especial">
                <span class="condicao-especial-icone">${condicao.tipo === 'aniversariante' ? '🎂' : 'ℹ️'}</span>
                <span>${condicao.descricao}</span>
              </div>
            `).join('')}
          </div>
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