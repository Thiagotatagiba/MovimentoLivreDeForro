// components/modalIngresso.js
// Janela "Adicionar ingresso". Só cuida da tela: quem de fato salva é o
// callback aoSalvar (a página chama o ingressoService), o que deixa este
// componente testável sem Supabase.

import { criar, prenderFoco } from '../js/utils/dom.js';
import {
  buscarEventosParaSugestao, dataLocalISO, formatarDataBR, validarImagem,
  FORMATOS_ACEITOS,
} from '../js/utils/ingressos.js';

function formatarTamanho(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

// eventos: lista do catálogo (com .marca) pra sugerir enquanto a pessoa digita.
// aoSalvar({ eventoId, titulo, dataEvento, arquivo }): Promise — se rejeitar, a
// janela continua aberta e mostra o erro; se resolver, a janela fecha.
export function abrirModalAdicionarIngresso({ eventos = [], aoSalvar }) {
  const focoAnterior = document.activeElement;
  const hojeISO = dataLocalISO(new Date());

  let eventoVinculado = null; // evento da agenda escolhido (ou null = fora da agenda)
  let arquivo = null;
  let urlPrevia = null;
  let salvando = false;
  let temporizadorBlur = null;

  // ---------- campos ----------
  const inputNome = criar('input', {
    classe: 'ingresso-input',
    attrs: {
      type: 'text', id: 'ing-nome', maxlength: '120', autocomplete: 'off',
      placeholder: 'Ex: Forró do Bombar', role: 'combobox',
      'aria-autocomplete': 'list', 'aria-controls': 'ing-sugestoes', 'aria-expanded': 'false',
    },
  });
  const listaSugestoes = criar('ul', {
    classe: 'ingresso-sugestoes',
    attrs: { id: 'ing-sugestoes', role: 'listbox', hidden: true },
  });
  const avisoVinculo = criar('p', { classe: 'ingresso-vinculo', attrs: { hidden: true } });

  const inputData = criar('input', { classe: 'ingresso-input', attrs: { type: 'date', id: 'ing-data' } });

  const inputArquivo = criar('input', {
    attrs: { type: 'file', id: 'ing-arquivo', accept: 'image/jpeg,image/png,image/webp', hidden: true },
  });
  const botaoAnexar = criar('button', {
    classe: 'botao botao-secundario', texto: 'Anexar print do ingresso',
    attrs: { type: 'button', id: 'ing-anexar' },
  });
  const previa = criar('img', { classe: 'ingresso-previa', attrs: { alt: 'Prévia do print', hidden: true } });
  const infoArquivo = criar('p', { classe: 'ingresso-ajuda', texto: `${FORMATOS_ACEITOS}, até 5 MB.` });

  const erroEl = criar('p', { classe: 'ingresso-erro', attrs: { role: 'alert', hidden: true } });
  const botaoSalvar = criar('button', {
    classe: 'botao botao-primario', texto: 'Salvar ingresso', attrs: { type: 'submit', id: 'ing-salvar' },
  });
  const botaoCancelar = criar('button', {
    classe: 'botao botao-secundario', texto: 'Cancelar', attrs: { type: 'button', id: 'ing-cancelar' },
  });

  const form = criar('form', {
    classe: 'folha-form',
    attrs: { novalidate: true },
    filhos: [
      criar('div', { classe: 'ingresso-campo', filhos: [
        criar('label', { texto: 'Nome do evento', attrs: { for: 'ing-nome' } }),
        inputNome, listaSugestoes, avisoVinculo,
        criar('p', { classe: 'ingresso-ajuda', texto: 'Evento fora da agenda? É só digitar o nome e escolher a data.' }),
      ] }),
      criar('div', { classe: 'ingresso-campo', filhos: [
        criar('label', { texto: 'Data do evento', attrs: { for: 'ing-data' } }),
        inputData,
      ] }),
      criar('div', { classe: 'ingresso-campo', filhos: [
        criar('label', { texto: 'Print do ingresso', attrs: { for: 'ing-anexar' } }),
        botaoAnexar, inputArquivo, previa, infoArquivo,
      ] }),
      erroEl,
      criar('div', { classe: 'folha-acoes', filhos: [botaoSalvar, botaoCancelar] }),
    ],
  });

  const botaoFechar = criar('button', {
    classe: 'folha-fechar', texto: '×', attrs: { type: 'button', 'aria-label': 'Fechar' },
  });
  const folha = criar('div', {
    classe: 'folha',
    attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ing-modal-titulo' },
    filhos: [
      botaoFechar,
      criar('h2', { texto: 'Adicionar ingresso', attrs: { id: 'ing-modal-titulo' } }),
      criar('p', { classe: 'folha-sub', texto: 'Fica salvo só pra você — ninguém mais vê.' }),
      form,
    ],
  });
  const overlay = criar('div', { classe: 'folha-overlay', filhos: [folha] });
  document.body.appendChild(overlay);
  const soltarFoco = prenderFoco(folha);
  inputNome.focus();

  // ---------- comportamento ----------
  function mostrarErro(mensagem) {
    erroEl.textContent = mensagem;
    erroEl.hidden = false;
  }
  function limparErro() {
    erroEl.hidden = true;
    erroEl.textContent = '';
  }

  function esconderSugestoes() {
    listaSugestoes.hidden = true;
    inputNome.setAttribute('aria-expanded', 'false');
  }

  function atualizarSugestoes() {
    if (eventoVinculado) return esconderSugestoes();
    const achados = buscarEventosParaSugestao(eventos, inputNome.value, hojeISO);
    listaSugestoes.replaceChildren();
    if (achados.length === 0) return esconderSugestoes();

    for (const evento of achados) {
      const detalhe = [evento.marca?.nome, formatarDataBR(evento.data)].filter(Boolean).join(' · ');
      const item = criar('li', {
        classe: 'ingresso-sugestao', attrs: { role: 'option', tabindex: '-1' },
        filhos: [
          criar('strong', { texto: evento.titulo }),
          criar('span', { texto: detalhe }),
        ],
      });
      // mousedown (e não click): dispara antes do input perder o foco
      item.addEventListener('mousedown', (e) => { e.preventDefault(); escolherEvento(evento); });
      item.addEventListener('click', () => escolherEvento(evento));
      listaSugestoes.append(item);
    }
    listaSugestoes.hidden = false;
    inputNome.setAttribute('aria-expanded', 'true');
  }

  function escolherEvento(evento) {
    eventoVinculado = evento;
    inputNome.value = evento.titulo;
    inputData.value = evento.data;
    inputData.readOnly = true; // a data vem da agenda, não se edita
    avisoVinculo.replaceChildren(
      criar('span', { texto: '✓ Evento da agenda — a data foi preenchida sozinha. ' }),
      criar('button', { classe: 'ingresso-link', texto: 'Não é esse', attrs: { type: 'button' }, aoClicar: desvincular }),
    );
    avisoVinculo.hidden = false;
    esconderSugestoes();
  }

  function desvincular() {
    eventoVinculado = null;
    inputData.readOnly = false;
    avisoVinculo.hidden = true;
    avisoVinculo.replaceChildren();
    atualizarSugestoes();
  }

  inputNome.addEventListener('input', () => {
    // mexeu no nome depois de escolher da agenda → vira evento fora da agenda
    if (eventoVinculado && inputNome.value !== eventoVinculado.titulo) desvincular();
    else atualizarSugestoes();
  });
  inputNome.addEventListener('focus', () => { clearTimeout(temporizadorBlur); atualizarSugestoes(); });
  inputNome.addEventListener('blur', () => { temporizadorBlur = setTimeout(esconderSugestoes, 150); });

  botaoAnexar.addEventListener('click', () => inputArquivo.click());
  inputArquivo.addEventListener('change', () => {
    const escolhido = inputArquivo.files[0];
    inputArquivo.value = '';
    if (!escolhido) return;

    const problema = validarImagem(escolhido);
    if (problema) return mostrarErro(problema);

    limparErro();
    arquivo = escolhido;
    if (urlPrevia) URL.revokeObjectURL(urlPrevia);
    urlPrevia = URL.createObjectURL(escolhido);
    previa.src = urlPrevia;
    previa.hidden = false;
    infoArquivo.textContent = `${escolhido.name} (${formatarTamanho(escolhido.size)})`;
    botaoAnexar.textContent = 'Trocar print';
  });

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (salvando) return;
    limparErro();

    const nome = inputNome.value.trim();
    if (!nome) return mostrarErro('Digite o nome do evento.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inputData.value)) return mostrarErro('Informe a data do evento.');
    const problema = validarImagem(arquivo);
    if (problema) return mostrarErro(problema);

    salvando = true;
    botaoSalvar.disabled = true;
    botaoSalvar.textContent = 'Salvando...';
    try {
      await aoSalvar({
        eventoId: eventoVinculado?.id ?? null,
        titulo: nome,
        dataEvento: inputData.value,
        arquivo,
      });
      fechar();
    } catch (erro) {
      console.error('Não foi possível salvar o ingresso:', erro);
      mostrarErro('Não foi possível salvar o ingresso. Confira a conexão e tente de novo.');
      salvando = false;
      botaoSalvar.disabled = false;
      botaoSalvar.textContent = 'Salvar ingresso';
    }
  });

  function aoApertarTecla(evento) {
    if (evento.key !== 'Escape' || salvando) return;
    if (!listaSugestoes.hidden) return esconderSugestoes(); // 1º Esc só fecha a lista
    fechar();
  }
  document.addEventListener('keydown', aoApertarTecla);

  function fechar() {
    clearTimeout(temporizadorBlur);
    document.removeEventListener('keydown', aoApertarTecla);
    soltarFoco();
    if (urlPrevia) URL.revokeObjectURL(urlPrevia);
    overlay.remove();
    if (focoAnterior && focoAnterior.focus) focoAnterior.focus();
  }

  botaoCancelar.addEventListener('click', () => { if (!salvando) fechar(); });
  botaoFechar.addEventListener('click', () => { if (!salvando) fechar(); });

  return { fechar };
}
