// components/loginModal.js
// Aberto a partir do ícone de coração (Favoritos) quando não há
// usuário logado. Ver integração sugerida no fim do arquivo.

import { loginComMagicLink, loginComGoogle } from '../services/authService.js';

export function abrirModalLogin() {
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

      <p class="modal-login-status" hidden></p>
    </div>
  `;

  document.body.appendChild(overlay);

  const fechar = () => overlay.remove();
  overlay.querySelector('.modal-login-fechar').addEventListener('click', fechar);
  overlay.addEventListener('click', (evento) => {
    if (evento.target === overlay) fechar();
  });

  overlay.querySelector('.modal-login-google').addEventListener('click', () => {
    loginComGoogle();
  });

  const form = overlay.querySelector('.modal-login-form');
  const status = overlay.querySelector('.modal-login-status');

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const email = form.querySelector('#modal-login-email').value.trim();
    const botao = form.querySelector('.modal-login-enviar');

    botao.disabled = true;
    botao.textContent = 'Enviando...';

    try {
      await loginComMagicLink(email);
      status.hidden = false;
      status.textContent = `Link enviado para ${email}. Confira sua caixa de entrada.`;
      form.hidden = true;
      overlay.querySelector('.modal-login-google').hidden = true;
      overlay.querySelector('.modal-login-divisor').hidden = true;
    } catch (erro) {
      status.hidden = false;
      status.textContent = 'Não foi possível enviar o link. Tente novamente.';
      botao.disabled = false;
      botao.textContent = 'Enviar link mágico';
    }
  });

  return overlay;
}

/*
Integração sugerida no ícone de coração (Favoritos) do topo:

import { obterUsuarioAtual } from '../services/authService.js';
import { abrirModalLogin } from '../components/loginModal.js';

iconeFavoritos.addEventListener('click', async () => {
  const usuario = await obterUsuarioAtual();
  if (!usuario) {
    abrirModalLogin();
    return;
  }
  navegarParaFavoritos();
});
*/
