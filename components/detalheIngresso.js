// components/detalheIngresso.js
// Janela que abre ao tocar num ingresso: mostra a imagem e deixa marcar como
// usado (com confirmação e "Desfazer") ou excluir (com confirmação).
// Só cuida da tela — as operações reais vêm no objeto "acoes", que a página
// liga ao ingressoService.

import { criar, prenderFoco } from '../js/utils/dom.js';
import { formatarDataBR, formatarMomento } from '../js/utils/ingressos.js';

// ingresso: { id, imagemPath, usadoEm, ... }
// exibir: { titulo, dataEvento, daAgenda } (já resolvido: catálogo ou cópia)
// carregarImagem(imagemPath): Promise<string> — link da imagem
// acoes: { marcarUsado(ing), desfazerUsado(ing) → Promise<ingressoAtualizado>, excluir(ing) → Promise }
export function abrirDetalheIngresso({ ingresso, exibir, carregarImagem, acoes }) {
  const focoAnterior = document.activeElement;
  let atual = ingresso;
  let estado = 'normal'; // normal | confirmarUsado | confirmarExcluir | ocupado
  let fechado = false;

  const areaImagem = criar('div', { classe: 'ingresso-imagem-area' });
  const statusEl = criar('p', { classe: 'ingresso-status', attrs: { role: 'status', hidden: true } });
  const erroEl = criar('p', { classe: 'ingresso-erro', attrs: { role: 'alert', hidden: true } });
  const areaAcoes = criar('div', { classe: 'folha-acoes' });

  const botaoFechar = criar('button', {
    classe: 'folha-fechar', texto: '×', attrs: { type: 'button', 'aria-label': 'Fechar' },
  });
  const folha = criar('div', {
    classe: 'folha folha-detalhe',
    attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ing-det-titulo' },
    filhos: [
      botaoFechar,
      criar('h2', { texto: exibir.titulo, attrs: { id: 'ing-det-titulo' } }),
      criar('p', { classe: 'folha-sub', texto: formatarDataBR(exibir.dataEvento) }),
      statusEl,
      areaImagem,
      erroEl,
      areaAcoes,
    ],
  });
  const overlay = criar('div', { classe: 'folha-overlay', filhos: [folha] });
  document.body.appendChild(overlay);
  const soltarFoco = prenderFoco(folha);

  // ---------- imagem ----------
  async function carregarImg() {
    areaImagem.replaceChildren(criar('p', { classe: 'ingresso-ajuda', texto: 'Carregando imagem...' }));
    try {
      const url = await carregarImagem(atual.imagemPath);
      if (fechado) return;
      areaImagem.replaceChildren(
        criar('img', { classe: 'ingresso-imagem', attrs: { src: url, alt: 'Print do ingresso' } }),
      );
    } catch (erro) {
      console.error('Não foi possível carregar a imagem do ingresso:', erro);
      if (fechado) return;
      areaImagem.replaceChildren(
        criar('p', { classe: 'ingresso-erro', texto: 'Não consegui carregar a imagem. Confira a conexão.' }),
        criar('button', { classe: 'botao botao-secundario', texto: 'Tentar de novo', attrs: { type: 'button' }, aoClicar: carregarImg }),
      );
    }
  }

  // ---------- status e botões, conforme o estado ----------
  function renderStatus() {
    if (atual.usadoEm) {
      statusEl.textContent = `Usado em ${formatarMomento(atual.usadoEm)}`;
      statusEl.hidden = false;
    } else {
      statusEl.hidden = true;
      statusEl.textContent = '';
    }
  }

  function botao(texto, classe, aoClicar, id) {
    return criar('button', {
      classe: `botao ${classe}`, texto, aoClicar,
      attrs: { type: 'button', id, disabled: estado === 'ocupado' },
    });
  }

  function renderAcoes() {
    areaAcoes.replaceChildren();
    if (estado === 'confirmarUsado') {
      areaAcoes.append(
        criar('p', { classe: 'ingresso-confirma', texto: 'Marcar este ingresso como usado? Você poderá desfazer depois.' }),
        botao('Confirmar', 'botao-primario', () => executar(() => acoes.marcarUsado(atual), (novo) => { atual = novo; }), 'ing-confirmar-usado'),
        botao('Cancelar', 'botao-secundario', () => mudarEstado('normal'), 'ing-cancelar-confirmacao'),
      );
    } else if (estado === 'confirmarExcluir') {
      areaAcoes.append(
        criar('p', { classe: 'ingresso-confirma', texto: 'Excluir este ingresso? A imagem também será apagada e não dá para desfazer.' }),
        botao('Excluir definitivamente', 'botao-perigo', () => executar(() => acoes.excluir(atual), null, true), 'ing-confirmar-excluir'),
        botao('Cancelar', 'botao-secundario', () => mudarEstado('normal'), 'ing-cancelar-confirmacao'),
      );
    } else {
      if (atual.usadoEm) {
        areaAcoes.append(botao('Desfazer "usado"', 'botao-primario', () => executar(() => acoes.desfazerUsado(atual), (novo) => { atual = novo; }), 'ing-desfazer-usado'));
      } else {
        areaAcoes.append(botao('Marcar como usado', 'botao-primario', () => mudarEstado('confirmarUsado'), 'ing-marcar-usado'));
      }
      areaAcoes.append(botao('Excluir', 'botao-secundario', () => mudarEstado('confirmarExcluir'), 'ing-excluir'));
    }
  }

  function mudarEstado(novo) {
    estado = novo;
    erroEl.hidden = true;
    renderAcoes();
  }

  // Roda uma operação deixando os botões travados; se falhar, volta ao normal
  // com um aviso (nada muda). aoSucesso recebe o ingresso atualizado.
  async function executar(operacao, aoSucesso, fechaAoTerminar = false) {
    estado = 'ocupado';
    erroEl.hidden = true;
    renderAcoes();
    try {
      const resultado = await operacao();
      if (fechaAoTerminar) return fechar();
      if (aoSucesso) aoSucesso(resultado);
      estado = 'normal';
      renderStatus();
      renderAcoes();
    } catch (erro) {
      console.error('Falha na operação do ingresso:', erro);
      erroEl.textContent = 'Não foi possível concluir agora. Confira a conexão e tente de novo.';
      erroEl.hidden = false;
      estado = 'normal';
      renderAcoes();
    }
  }

  // ---------- fechar ----------
  function aoApertarTecla(evento) {
    if (evento.key === 'Escape' && estado !== 'ocupado') fechar();
  }
  document.addEventListener('keydown', aoApertarTecla);

  function fechar() {
    if (fechado) return;
    fechado = true;
    document.removeEventListener('keydown', aoApertarTecla);
    soltarFoco();
    overlay.remove();
    if (focoAnterior && focoAnterior.focus) focoAnterior.focus();
  }
  botaoFechar.addEventListener('click', () => { if (estado !== 'ocupado') fechar(); });
  overlay.addEventListener('click', (evento) => {
    if (evento.target === overlay && estado !== 'ocupado') fechar();
  });

  renderStatus();
  renderAcoes();
  carregarImg();

  return { fechar };
}
