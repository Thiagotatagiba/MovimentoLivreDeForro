// components/botaoInteracao.js
// Liga um botão de favoritar (evento) ou seguir (marca) a uma entidade.
// Usado em evento.html e marca.html — mesmo comportamento nos dois: se a
// pessoa não estiver logada, o clique abre o modal de login em vez de
// alternar o estado.

import { obterUsuarioAtual } from '../services/authService.js';
import { verificarInteracao, alternarInteracao } from '../services/interacaoService.js';
import { abrirModalLogin } from './loginModal.js';

// textos (opcional): { inativo: 'Seguir', ativo: 'Seguindo' } — pra botões
// com texto. Sem isso, o botão é só ícone (ex: coração no evento) e apenas
// a classe "ativo" muda.
export async function ligarBotaoInteracao(botao, entidadeTipo, entidadeId, textos) {
  let ativo = false;

  const usuario = await obterUsuarioAtual();
  if (usuario) {
    try {
      ativo = await verificarInteracao(entidadeTipo, entidadeId, usuario.id);
      atualizarVisual();
    } catch (erro) {
      console.warn('Não foi possível verificar a interação:', erro);
    }
  }

  botao.addEventListener('click', async () => {
    const usuarioAtual = await obterUsuarioAtual();
    if (!usuarioAtual) {
      abrirModalLogin();
      return;
    }

    botao.disabled = true;
    try {
      ativo = await alternarInteracao(entidadeTipo, entidadeId, usuarioAtual.id);
      atualizarVisual();
    } catch (erro) {
      console.error('Não foi possível atualizar a interação:', erro);
    } finally {
      botao.disabled = false;
    }
  });

  function atualizarVisual() {
    botao.classList.toggle('ativo', ativo);
    botao.setAttribute('aria-pressed', String(ativo));
    if (textos) botao.textContent = ativo ? textos.ativo : textos.inativo;
  }
}
