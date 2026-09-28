// components/painelUsuario.js
// Único lugar que decide o que aparece no painel "Bem vindo, ..." do menu
// lateral. Chamado automaticamente por js/pwa.js em toda página — nunca
// precisa ser importado manualmente em cada arquivo HTML.

import { obterUsuarioAtual, aoMudarAutenticacao, logout } from '../services/authService.js';
import { obterPerfil } from '../services/perfilService.js';
import { abrirModalLogin } from './loginModal.js';

export function inicializarPainelUsuario() {
  const nomeEl = document.getElementById('painel-usuario-nome');
  const acaoEl = document.getElementById('painel-usuario-acao');

  // Páginas que ainda não tiverem esses elementos simplesmente não fazem nada.
  if (!nomeEl || !acaoEl) return;

  renderizarDeslogado(); // estado inicial, enquanto a sessão é verificada

  obterUsuarioAtual()
    .then((usuario) => (usuario ? renderizarLogado(usuario) : renderizarDeslogado()))
    .catch(() => renderizarDeslogado());

  aoMudarAutenticacao((usuario) => {
    if (usuario) {
      renderizarLogado(usuario);
    } else {
      renderizarDeslogado();
    }
  });

  async function renderizarLogado(usuario) {
    // Nome do Google como fallback imediato, enquanto o apelido real do
    // perfil (que pode já ter sido customizado) ainda está carregando.
    nomeEl.textContent = usuario.user_metadata?.full_name || usuario.email || 'Forrozeiro';
    nomeEl.style.cursor = 'pointer';
    nomeEl.onclick = () => { window.location.href = 'perfil.html'; };

    acaoEl.textContent = 'Sair';
    acaoEl.onclick = () => logout();

    try {
      const perfil = await obterPerfil(usuario.id);
      if (perfil?.apelido) nomeEl.textContent = perfil.apelido;
    } catch (erro) {
      console.warn('Não foi possível carregar o apelido do perfil:', erro);
    }
  }

  function renderizarDeslogado() {
    nomeEl.textContent = 'Forrozeiro';
    nomeEl.style.cursor = '';
    nomeEl.onclick = null;

    acaoEl.textContent = 'Entrar';
    acaoEl.onclick = () => abrirModalLogin();
  }
}
