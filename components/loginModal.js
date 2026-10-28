// components/loginModal.js
// Modal de login (Google + Magic Link), usado por Favoritos, Perfil e pelo
// botão "Entrar" do menu lateral.
//
// Revisão 2026-10-28: fecha com Esc, prende o foco dentro do diálogo,
// devolve o foco ao elemento de origem, trava o scroll do body e anuncia
// o status com role="status". Antes o modal era uma caixa sem essas regras.

import { loginComMagicLink, loginComGoogle } from '../services/authService.js';

export function abrirModalLogin() {
  const elementoDeOrigem = document.activeElement;

  const overlay = document.createElement('div');
  overlay.className = 'modal-login-overlay';
  overlay.innerHTML = `
    <div class="modal-login" role="dialog" aria-modal="true" aria-labelledby="modal-login-titulo">
      <button class="modal-login-fechar" type="button" aria-label="Fechar">&times;</button>

      <h2 class="modal-login-titulo" id="modal-login-titulo">Entrar</h2>
      <p class="modal-login-subtitulo">Favorite eventos e siga suas Marcas favoritas.</p>

      <button class="modal-login-google" type="button">Continuar com Google</button>

      <div class="modal-login-divisor"><span>ou</span></div>

      <form class="modal-login-form" novalidate>
        <label for="modal-login-email">E-mail</label>
        <input type="email" id="modal-login-email" required placeholder="seu@email.com" autocomplete="email">
        <button type="submit" class="modal-login-enviar">Enviar link mágico</button>
      </form>

      <p class="modal-login-status" role="status" aria-live="polite" hidden></p>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const focaveis = () => [...overlay.querySelectorAll('button, input, a[href]')]
    .filter((el) => !el.disabled && !el.hidden && el.offsetParent !== null);

  function fechar() {
    overlay.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', aoTeclar);
    elementoDeOrigem?.focus?.();
  }

  function aoTeclar(evento) {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      fechar();
      return;
    }

    if (evento.key !== 'Tab') return;

    const itens = focaveis();
    if (itens.length === 0) return;
    const primeiro = itens[0];
    const ultimo = itens[itens.length - 1];

    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  }

  overlay.querySelector('.modal-login-fechar').addEventListener('click', fechar);
  overlay.addEventListener('click', (evento) => {
    if (evento.target === overlay) fechar();
  });

  overlay.querySelector('.modal-login-google').addEventListener('click', () => {
    loginComGoogle().catch((erro) => console.warn('Falha no login com Google:', erro));
  });

  const form = overlay.querySelector('.modal-login-form');
  const status = overlay.querySelector('.modal-login-status');

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const email = form.querySelector('#modal-login-email').value.trim();
    const botao = form.querySelector('.modal-login-enviar');

    if (!email || !email.includes('@')) {
      status.hidden = false;
      status.classList.add('modal-login-status-erro');
      status.textContent = 'Digite um e-mail válido.';
      form.querySelector('#modal-login-email').focus();
      return;
    }

    botao.disabled = true;
    botao.textContent = 'Enviando...';

    try {
      await loginComMagicLink(email);
      status.hidden = false;
      status.classList.remove('modal-login-status-erro');
      status.textContent = `Link enviado para ${email}. Confira sua caixa de entrada.`;
      form.hidden = true;
      overlay.querySelector('.modal-login-google').hidden = true;
      overlay.querySelector('.modal-login-divisor').hidden = true;
    } catch (erro) {
      console.error(erro);
      status.hidden = false;
      status.classList.add('modal-login-status-erro');
      status.textContent = 'Não foi possível enviar o link. Tente novamente.';
      botao.disabled = false;
      botao.textContent = 'Enviar link mágico';
    }
  });

  document.addEventListener('keydown', aoTeclar);
  overlay.querySelector('.modal-login-google').focus();

  return overlay;
}
