// evento.js — página de detalhe do evento.
//
// Revisão 2026-10-28 (2), a partir do feedback de uso:
// - a capa tinha 791px de altura no desktop (aspect-ratio 16/10 em tela cheia);
//   agora é uma faixa curta, com a foto de perfil e o nome da Marca por cima;
// - o conteúdo virou duas colunas no computador (texto + cartão de ingresso
//   fixo), e no celular o cartão de ingresso aparece antes da descrição;
// - data/hora e preço ganharam hierarquia no topo (antes ficavam espalhados).

import { obterEventoCompleto } from '../services/eventoService.js';
import {
  formatarDataCompleta,
  formatarDataCurtaComDia,
  formatarHora,
  formatarPreco,
  formatarPrecoCurto,
  enderecoResumido,
  enderecoCompleto,
  estiloMidia,
  imagemDoEvento,
  capitalizar,
  escaparHtml,
  ehHoje,
  normalizar,
  linkInstagram,
  linkWhatsapp,
  linkRota,
} from '../utils/format.js';
import { atualizarMeta, atualizarCanonical } from '../utils/meta.js';
import { estadoVazioHtml } from '../utils/ui.js';
import { ligarBotaoInteracao } from '../../components/botaoInteracao.js';
import { ligarBotaoCompartilhar } from '../../components/compartilhar.js';

// "Entrada gratuita · Gratuito" seria redundante — nesse caso mostra só o preço.
function textoIngresso(ingresso) {
  const preco = formatarPreco(ingresso?.precoAPartirDe);
  const tipo = ingresso?.tipoEntrada;
  if (!tipo || tipo === 'Gratuito') return preco;
  return `${preco} · ${tipo}`;
}

function avatarMarcaHtml(marca, classe = 'avatar-letra') {
  if (marca?.logo) {
    return `<img src="${escaparHtml(marca.logo)}" alt="">`;
  }
  const inicial = escaparHtml((marca?.nome ?? '?').trim().charAt(0));
  return `<span class="${classe}" aria-hidden="true">${inicial}</span>`;
}

const raiz = document.getElementById('conteudo-evento');
const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

async function iniciar() {
  if (!slug) {
    raiz.innerHTML = estadoVazioHtml({
      icone: '🔎',
      titulo: 'Evento não especificado',
      texto: 'Volta para a agenda e escolhe um baile.',
      ctaHref: 'agenda.html',
      ctaTexto: 'Ver agenda',
    });
    return;
  }

  const evento = await obterEventoCompleto(slug);
  if (!evento) {
    raiz.innerHTML = estadoVazioHtml({
      icone: '😕',
      titulo: 'Evento não encontrado',
      texto: 'Este evento não existe mais ou saiu do ar.',
      ctaHref: 'agenda.html',
      ctaTexto: 'Ver agenda',
    });
    return;
  }

  atualizarMeta({
    titulo: `${evento.titulo} — Vai Ter Forró!`,
    descricao: `${evento.titulo} · ${capitalizar(formatarDataCompleta(evento.data))} às ${evento.horario} · ${evento.local?.nome ?? ''}`,
    imagem: imagemDoEvento(evento),
  });
  atualizarCanonical(`evento.html?slug=${encodeURIComponent(evento.slug)}`);

  const imagemCapa = imagemDoEvento(evento);
  const diretorio = window.location.pathname.replace(/[^/]*$/, '');
  const paginaCompartilhar = `${window.location.origin}${diretorio}compartilhar/${encodeURIComponent(evento.slug)}.html`;
  let urlCompartilhar = window.location.href;

  // A página estática de compartilhamento é o que permite a prévia com a arte
  // no WhatsApp (o robô não executa JS). Se ela ainda não foi gerada para este
  // evento, cai no link normal em vez de compartilhar um 404.
  fetch(paginaCompartilhar, { method: 'HEAD' })
    .then((resposta) => { if (resposta.ok) urlCompartilhar = paginaCompartilhar; })
    .catch(() => {});

  raiz.innerHTML = montarHtml(evento);

  const botaoFavoritar = document.getElementById('botao-favoritar');
  if (botaoFavoritar) ligarBotaoInteracao(botaoFavoritar, 'evento', evento.id);

  const botaoCompartilhar = document.getElementById('botao-compartilhar');
  if (botaoCompartilhar) {
    ligarBotaoCompartilhar(botaoCompartilhar, {
      titulo: evento.titulo,
      texto: `${evento.titulo} — ${capitalizar(formatarDataCompleta(evento.data))} · ${evento.horario}`,
      url: () => urlCompartilhar,
      imagem: imagemCapa,
    });
  }

  const botaoAmpliar = document.getElementById('botao-ampliar-capa');
  if (botaoAmpliar && imagemCapa) {
    botaoAmpliar.addEventListener('click', () => abrirLightbox(imagemCapa, evento.titulo));
  }

  const capaEl = document.querySelector('.evento-capa');
  if (capaEl && imagemCapa) {
    capaEl.addEventListener('click', (clique) => {
      // Marca, compartilhar e favoritar continuam com o comportamento deles.
      if (clique.target.closest('a, button')) return;
      abrirLightbox(imagemCapa, evento.titulo);
    });
  }

  const botaoSeguir = document.getElementById('botao-seguir-rodape');
  if (botaoSeguir && evento.marca) {
    ligarBotaoInteracao(botaoSeguir, 'marca', evento.marca.id, { inativo: 'Seguir', ativo: 'Seguindo' });
  }

  const botaoCalendario = document.getElementById('botao-calendario');
  if (botaoCalendario) {
    botaoCalendario.addEventListener('click', () => baixarICS(evento));
  }
}

function montarHtml(evento) {
  const marca = evento.marca;
  const local = evento.local;
  const lineup = [...(evento.lineup?.bandas ?? []), ...(evento.lineup?.djs ?? [])];
  const linkIngresso = evento.ingresso?.link && evento.ingresso.link !== 'em breve'
    ? evento.ingresso.link
    : null;
  const preco = formatarPrecoCurto(evento.ingresso?.precoAPartirDe);
  const tipo = evento.ingresso?.tipoEntrada;
  // Ingresso vendido na portaria não tem link online: a mensagem precisa dizer
  // isso, em vez de "venda não divulgada" (que seria falso). Evento gratuito
  // sem link também não deve falar em venda.
  const vendaNoLocal = tipo === 'Ingresso no Local' || tipo === 'Cover';
  const entradaGratuita = tipo === 'Gratuito' || evento.ingresso?.precoAPartirDe === 0;
  const ingressoViaWhatsapp = !!linkIngresso && /wa\.me|api\.whatsapp\.com/i.test(linkIngresso);
  // "Grátis" + "Gratuito" seria repetição: quando já há selo de gratuidade,
  // o tipo "Gratuito" não entra.
  const mostrarTipo = tipo && !(tipo === 'Gratuito' && preco);
  const rotaLocal = linkRota(local);
  // Evita "WineBeer | Jardim da Penha — Jardim da Penha": só acrescenta o
  // bairro quando ele já não estiver no nome do Local.
  const bairro = local?.endereco?.bairro;
  const localLinha = [
    local?.nome ?? 'Local em breve',
    bairro && !normalizar(local?.nome ?? '').includes(normalizar(bairro)) ? bairro : null,
  ].filter(Boolean).join(' — ');
  const imagem = imagemDoEvento(evento);

  const linksMarca = [
    marca?.instagram ? { href: linkInstagram(marca.instagram), texto: 'Instagram' } : null,
    marca?.whatsapp ? { href: linkWhatsapp(marca.whatsapp), texto: 'WhatsApp' } : null,
    marca?.site ? { href: marca.site, texto: 'Site' } : null,
  ].filter((link) => link?.href);

  return `
    <div class="evento-capa${imagem ? ' evento-capa--clicavel' : ''}" style="${estiloMidia(imagem)}">
      <div class="evento-capa-conteudo">
        ${marca ? `
          <a class="evento-capa-marca" href="marca.html?slug=${encodeURIComponent(marca.slug)}">
            ${avatarMarcaHtml(marca)}
            <span class="info">
              <span class="rotulo">Marca</span>
              <span class="nome">${escaparHtml(marca.nome)}</span>
            </span>
          </a>
        ` : '<span></span>'}

        <div class="evento-capa-acoes">
          ${imagem ? `
            <button type="button" class="botao-midia" id="botao-ampliar-capa" aria-label="Ver imagem completa do evento">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/></svg>
            </button>
          ` : ''}
          <button type="button" class="botao-midia" id="botao-compartilhar" aria-label="Compartilhar evento">
            <svg viewBox="0 0 24 24"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>
          </button>
          <button type="button" class="botao-midia botao-favoritar" id="botao-favoritar" aria-label="Favoritar evento" aria-pressed="false">
            <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.7-10-9.3C0.3 8.4 2 5 5.5 5c2 0 3.5 1.2 4.5 2.8C11 6.2 12.5 5 14.5 5 18 5 19.7 8.4 22 11.7 19.5 16.3 12 21 12 21z"/></svg>
          </button>
        </div>
      </div>
    </div>

    <div class="container evento-conteudo">
      <header class="evento-cabecalho">
        <p class="evento-quando">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/></svg>
          ${escaparHtml(capitalizar(formatarDataCompleta(evento.data)))} · ${escaparHtml(formatarHora(evento.horario))}
        </p>
        <h1>${escaparHtml(evento.titulo)}</h1>
        <div class="evento-selos">
          ${preco ? `<span class="evento-selo evento-selo--destaque">${escaparHtml(preco)}</span>` : ''}
          ${mostrarTipo ? `<span class="evento-selo">${escaparHtml(tipo)}</span>` : ''}
          ${ehHoje(evento.data) ? '<span class="evento-selo">Hoje</span>' : ''}
        </div>
      </header>

      <div class="evento-grade">
        <div class="evento-principal">
          ${evento.descricao ? `
            <section class="secao">
              <h2>Sobre o evento</h2>
              <p class="texto-suave" style="white-space: pre-line;">${escaparHtml(evento.descricao)}</p>
            </section>
          ` : ''}

          ${lineup.length ? `
            <section class="secao">
              <h2>Line-up</h2>
              <p class="texto-suave">${lineup.map(escaparHtml).join(' · ')}</p>
            </section>
          ` : ''}

          ${evento.condicoesEspeciais?.length ? `
            <section class="secao">
              <h2>Condições especiais</h2>
              <div class="lista-condicoes">
                ${evento.condicoesEspeciais.map((condicao) => `
                  <div class="condicao-especial">
                    <span class="condicao-especial-icone" aria-hidden="true">${condicao.tipo === 'aniversariante' ? '🎂' : 'ℹ️'}</span>
                    <span>${escaparHtml(condicao.descricao)}</span>
                  </div>
                `).join('')}
              </div>
            </section>
          ` : ''}

          <section class="secao">
            <h2>Localização</h2>
            <div class="local-mini">
              <div>
                <p style="font-weight: 600;">${escaparHtml(local?.nome ?? 'Local em breve')}</p>
                <p class="texto-caption">${escaparHtml(enderecoResumido(local?.endereco))}</p>
              </div>
            </div>
            <p class="texto-fraco texto-caption" style="margin-top: var(--esp-sm);">
              ${escaparHtml(enderecoCompleto(local?.endereco))}
            </p>
            <div class="secao-acoes" style="margin-top: var(--esp-sm);">
              ${rotaLocal ? `<a class="botao botao-secundario" href="${escaparHtml(rotaLocal)}" target="_blank" rel="noopener">Como chegar</a>` : ''}
              ${local ? `<a class="botao botao-secundario" href="local.html?slug=${encodeURIComponent(local.slug)}">Ver Local</a>` : ''}
            </div>
          </section>

          ${marca ? `
            <section class="secao">
              <h2>Quem faz</h2>
              <div class="evento-marca">
                <div class="evento-marca-topo">
                  ${avatarMarcaHtml(marca)}
                  <div>
                    <p class="rotulo-eyebrow">Marca</p>
                    <h2>${escaparHtml(marca.nome)}</h2>
                  </div>
                </div>
                ${marca.descricao ? `<p class="texto-suave" style="margin-top: var(--esp-sm);">${escaparHtml(marca.descricao)}</p>` : ''}
                <div class="secao-acoes">
                  <button type="button" class="botao botao-secundario botao-seguir" id="botao-seguir-rodape" aria-pressed="false">Seguir</button>
                  <a class="botao botao-primario" href="marca.html?slug=${encodeURIComponent(marca.slug)}">Ver página</a>
                </div>
                ${linksMarca.length ? `
                  <div class="lista-chips">
                    ${linksMarca.map((link) => `<a class="chip" href="${escaparHtml(link.href)}" target="_blank" rel="noopener">${escaparHtml(link.texto)}</a>`).join('')}
                  </div>
                ` : ''}
              </div>
            </section>
          ` : ''}
        </div>

        <aside class="evento-aside">
          <div class="evento-cartao">
            <p class="evento-cartao-rotulo">Quando</p>
            <p class="evento-cartao-destaque">${escaparHtml(formatarDataCurtaComDia(evento.data))} · ${escaparHtml(formatarHora(evento.horario))}</p>
            <div class="evento-cartao-local">
              <p class="evento-cartao-linha">${escaparHtml(localLinha)}</p>
              ${rotaLocal ? `
                <a class="evento-cartao-rota" href="${escaparHtml(rotaLocal)}" target="_blank" rel="noopener" aria-label="Ver local e como chegar: ${escaparHtml(local?.nome ?? '')}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
                  Ver local
                </a>
              ` : ''}
            </div>

            <p class="evento-cartao-rotulo">Ingresso</p>
            <p class="evento-cartao-linha">${escaparHtml(textoIngresso(evento.ingresso))}</p>

            <div class="evento-cartao-acoes">
              ${linkIngresso
                ? `<a class="botao botao-primario" href="${escaparHtml(linkIngresso)}" target="_blank" rel="noopener">${ingressoViaWhatsapp ? 'Garantir ingresso no WhatsApp' : 'Garantir ingresso'}</a>`
                : (!entradaGratuita
                    ? `<p class="ingresso-aviso">${vendaNoLocal
                        ? 'Ingresso vendido na portaria.'
                        : 'Venda de ingresso ainda não divulgada — confira as redes da Marca.'}</p>`
                    : '')}
              <button type="button" class="botao botao-secundario" id="botao-calendario">Adicionar ao calendário</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;
}

// ---------- Calendário (.ics) ----------

function escaparICS(texto) {
  return String(texto ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function baixarICS(evento) {
  const [hora, minuto = '00'] = String(evento.horario || '20:00').split(':');
  const data = evento.data.replace(/-/g, '');
  const inicio = `${data}T${hora}${minuto}00`;
  const horaFim = String((Number(hora) + 3) % 24).padStart(2, '0');
  const fim = `${data}T${horaFim}${minuto}00`;

  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vai Ter Forro//PT-BR',
    'BEGIN:VEVENT',
    `UID:${evento.id}@vaiterforro.com.br`,
    `DTSTART:${inicio}`,
    `DTEND:${fim}`,
    `SUMMARY:${escaparICS(evento.titulo)}`,
    `LOCATION:${escaparICS(enderecoCompleto(evento.local?.endereco))}`,
    `DESCRIPTION:${escaparICS(evento.descricao ?? '')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const blob = new Blob([linhas.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${evento.slug || 'evento'}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ---------- Lightbox da capa ----------

let lightboxAberto = null;

function abrirLightbox(src, titulo) {
  if (lightboxAberto) return;

  const origem = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `Imagem do evento: ${titulo}`);
  overlay.innerHTML = `
    <button type="button" class="lightbox-fechar" aria-label="Fechar imagem">&times;</button>
    <img class="lightbox-img" src="${escaparHtml(src)}" alt="${escaparHtml(titulo)}">
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  lightboxAberto = overlay;

  const botaoFechar = overlay.querySelector('.lightbox-fechar');

  function fechar() {
    overlay.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', aoTeclar);
    lightboxAberto = null;
    origem?.focus?.();
  }

  function aoTeclar(evento) {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      fechar();
      return;
    }
    if (evento.key === 'Tab') {
      evento.preventDefault();
      botaoFechar.focus();
    }
  }

  overlay.addEventListener('click', (evento) => {
    if (evento.target === overlay || evento.target.closest('.lightbox-fechar')) fechar();
  });
  document.addEventListener('keydown', aoTeclar);
  botaoFechar.focus();
}

iniciar().catch((erro) => {
  console.error(erro);
  raiz.innerHTML = estadoVazioHtml({
    icone: '😕',
    titulo: 'Não foi possível carregar este evento',
    texto: 'Tenta de novo em instantes.',
    ctaHref: 'agenda.html',
    ctaTexto: 'Ver agenda',
  });
});
