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
  // Item do menu que só faz sentido pra quem está logado (pode não existir na página).
  const carteiraEl = document.getElementById('menu-carteira');
  const entrarTopoEl = document.getElementById('topo-entrar');
  const favoritosTopoEl = document.getElementById('topo-favoritos');
  const perfilTopoEl = document.getElementById('topo-perfil');
  const avatarTopoEl = perfilTopoEl?.querySelector('img');
  const AVATAR_PADRAO = 'assets/icons/avatar-padrao.svg';
  function definirAvatar(url) {
    if (!avatarTopoEl) return;
    avatarTopoEl.dataset.fallbackApplied = 'false';
    avatarTopoEl.src = url || AVATAR_PADRAO;
  }

  // Páginas que ainda não tiverem esses elementos simplesmente não fazem nada.
  if (!nomeEl || !acaoEl) return;

  entrarTopoEl?.addEventListener('click', () => abrirModalLogin());
  avatarTopoEl?.addEventListener('error', () => {
    if (avatarTopoEl.dataset.fallbackApplied === 'true') return;
    avatarTopoEl.dataset.fallbackApplied = 'true';
    avatarTopoEl.src = AVATAR_PADRAO;
  });

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
    if (carteiraEl) carteiraEl.hidden = false;
    nomeEl.style.cursor = 'pointer';
    nomeEl.onclick = () => { window.location.href = 'perfil.html'; };

    acaoEl.textContent = 'Sair';
    acaoEl.onclick = () => logout();
    if (entrarTopoEl) entrarTopoEl.hidden = true;
    if (favoritosTopoEl) favoritosTopoEl.hidden = false;
    if (perfilTopoEl) perfilTopoEl.hidden = false;

    try {
      const perfil = await obterPerfil(usuario.id);
      if (perfil?.apelido) nomeEl.textContent = perfil.apelido;
      definirAvatar(perfil?.avatar_url);
    } catch (erro) {
      console.warn('Não foi possível carregar o apelido do perfil:', erro);
    }
  }

  function renderizarDeslogado() {
    nomeEl.textContent = 'Forrozeiro';
    if (carteiraEl) carteiraEl.hidden = true;
    nomeEl.style.cursor = '';
    nomeEl.onclick = null;
    if (entrarTopoEl) entrarTopoEl.hidden = false;
    if (favoritosTopoEl) favoritosTopoEl.hidden = true;
    if (perfilTopoEl) perfilTopoEl.hidden = true;
    definirAvatar(AVATAR_PADRAO);

    acaoEl.textContent = 'Entrar';
    acaoEl.onclick = () => abrirModalLogin();
  }
}
