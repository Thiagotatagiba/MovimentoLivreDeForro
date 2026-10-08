// evento.js
import { obterEventoCompleto } from '../services/eventoService.js';
import { formatarDataCompleta, formatarPreco, enderecoResumido, enderecoCompleto, estiloMidia, imagemDoEvento, capitalizar } from '../utils/format.js';
import { ligarBotaoInteracao } from '../../components/botaoInteracao.js';
import { ligarBotaoCompartilhar } from '../../components/compartilhar.js';

// "Entrada gratuita · Gratuito" seria redundante — nesse caso mostra só o preço.
function textoIngresso(ingresso) {
  const preco = formatarPreco(ingresso?.precoAPartirDe);
  const tipo = ingresso?.tipoEntrada;
  if (!tipo || tipo === 'Gratuito') return preco;
  return `${preco} · ${tipo}`;
}

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

  const botaoCompartilhar = document.getElementById('botao-compartilhar');
  if (botaoCompartilhar) {
    ligarBotaoCompartilhar(botaoCompartilhar, {
      titulo: evento.titulo,
      texto: `${evento.titulo} — ${capitalizar(formatarDataCompleta(evento.data))} · ${evento.horario}`,
      url: window.location.href,
    });
  }

  const botaoSeguir = document.getElementById('botao-seguir-rodape');
  if (botaoSeguir && evento.marca) {
    ligarBotaoInteracao(botaoSeguir, 'marca', evento.marca.id, { inativo: 'Seguir', ativo: 'Seguindo' });
  }
}

function montarHtml(evento) {
  const marca = evento.marca;
  const local = evento.local;
  const lineup = [...(evento.lineup?.bandas ?? []), ...(evento.lineup?.djs ?? [])];

  return `
    <div class="midia" style="height: 220px; border-radius: 0; ${estiloMidia(imagemDoEvento(evento))}">
      <div class="midia-acoes">
        <button type="button" class="botao-midia" id="botao-compartilhar" aria-label="Compartilhar evento">
          <svg viewBox="0 0 24 24"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>
        </button>
        <button type="button" class="botao-midia botao-favoritar" id="botao-favoritar" aria-label="Favoritar evento" aria-pressed="false">
          <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.7-10-9.3C0.3 8.4 2 5 5.5 5c2 0 3.5 1.2 4.5 2.8C11 6.2 12.5 5 14.5 5 18 5 19.7 8.4 22 11.7 19.5 16.3 12 21 12 21z"/></svg>
        </button>
      </div>
    </div>

    <div class="container" style="margin-top: var(--esp-lg);">
      ${marca ? `
        <a class="rotulo-eyebrow marca-link" href="marca.html?slug=${marca.slug}">
          ${marca.logo ? `<img class="marca-logo-mini" src="${marca.logo}" alt="">` : ''}
          <span>${marca.nome} →</span>
        </a>
      ` : ''}
      <h1 style="margin-top: 4px;">${evento.titulo}</h1>

      <div class="resposta-hoje" style="margin-top: var(--esp-md);">
        <h2 style="font-size: var(--tam-titulo-sm);">Quando</h2>
        <p style="text-transform: capitalize;">${formatarDataCompleta(evento.data)} · ${evento.horario}</p>
      </div>

      <section class="secao">
        <h2 style="font-size: var(--tam-titulo-sm);">Ingresso</h2>
        <p class="texto-suave" style="margin-top: var(--esp-sm);">
          ${textoIngresso(evento.ingresso)}
        </p>
        <a class="botao botao-primario" style="margin-top: var(--esp-sm);" href="${evento.ingresso?.link && evento.ingresso.link !== 'em breve' ? evento.ingresso.link : '#'}">
          Garantir ingresso
        </a>
      </section>

      <section class="secao">
        <h2 style="font-size: var(--tam-titulo-sm);">Sobre o evento</h2>
        <p class="texto-suave" style="margin-top: var(--esp-sm); white-space: pre-line;">${evento.descricao}</p>
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

      ${marca ? `
        <section class="secao" style="padding-bottom: var(--esp-xl);">
          <div style="background: var(--bg-card); border-radius: var(--raio-card); box-shadow: var(--sombra-card); padding: var(--esp-lg) var(--esp-md);">
            <p class="rotulo-eyebrow">Conheça a Marca</p>
            <h2 style="margin-top: 4px;">${marca.nome}</h2>
            ${marca.descricao ? `<p class="texto-suave" style="margin-top: var(--esp-sm);">${marca.descricao}</p>` : ''}
            <div style="display: flex; gap: var(--esp-sm); margin-top: var(--esp-md); flex-wrap: wrap;">
              <button type="button" class="botao botao-secundario botao-seguir" id="botao-seguir-rodape" style="width: auto; padding-left: 24px; padding-right: 24px;" aria-pressed="false">Seguir</button>
              <a class="botao botao-primario" style="width: auto; padding-left: 24px; padding-right: 24px;" href="marca.html?slug=${marca.slug}">Ver página →</a>
            </div>
          </div>
        </section>
      ` : ''}
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