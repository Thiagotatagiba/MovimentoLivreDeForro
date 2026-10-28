// pwa.js — script não-módulo, carregado em toda página via <script src="js/pwa.js">.
// Responsabilidades: registrar o service worker, gerar nav inferior e menu
// lateral, controlar o drawer e capturar o evento de instalação do PWA.
//
// Revisão 2026-10-28 (ver MELHORIAS.md):
// - menu fechado agora fica `inert` (antes o aria-hidden escondia, mas os
//   links continuavam focáveis por Tab);
// - drawer ganhou Favoritos e Privacidade;
// - foco vai para o primeiro link ao abrir, volta pro botão ao fechar;
// - travamento de scroll do body enquanto aberto.

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((erro) => {
      console.warn('Não foi possível registrar o service worker:', erro);
    });
  });
}

// Prompt de instalação (Chrome/Edge/Android), disponível pra configuracoes.html.
window.deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (evento) => {
  evento.preventDefault();
  window.deferredInstallPrompt = evento;
  window.dispatchEvent(new Event('pwa-instalavel'));
});

window.addEventListener('appinstalled', () => {
  window.deferredInstallPrompt = null;
  window.dispatchEvent(new Event('pwa-instalado'));
});

function gerarNavInferior() {
  if (document.querySelector('.nav-inferior')) return;

  const pagina = location.pathname.split('/').pop() || 'index.html';
  const ehHome = pagina === 'index.html' || pagina === '';
  const ehAgenda = pagina === 'agenda.html';

  const html = `
<nav class="nav-inferior" aria-label="Navegação principal">
  <a href="index.html"${ehHome ? ' aria-current="page"' : ''}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>
    Início
  </a>
  <a href="agenda.html"${ehAgenda ? ' aria-current="page"' : ''}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/></svg>
    Agenda
  </a>
  <button type="button" id="botao-menu" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu-lateral">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    Menu
  </button>
</nav>`;

  document.body.insertAdjacentHTML('beforeend', html);
}

function gerarMenuLateral() {
  if (document.getElementById('menu-lateral')) return;

  const html = `
<div class="menu-overlay" id="menu-overlay" hidden></div>
<aside class="menu-lateral" id="menu-lateral" aria-hidden="true" inert>
  <div class="menu-lateral-topo">
    <p>Bem vindo,</p>
    <h2 id="painel-usuario-nome">Forrozeiro</h2>
    <button type="button" id="painel-usuario-acao" class="menu-lateral-acao-auth">Entrar</button>
  </div>
  <nav class="menu-lateral-links" aria-label="Menu">
    <a href="favoritos.html">Favoritos</a>
    <a href="perfil.html">Meu Perfil</a>
    <a href="agenda.html">Agenda</a>
    <a href="carteira.html" id="menu-carteira" hidden>Carteira de ingressos</a>
    <a href="sobre.html">Sobre</a>
    <a href="configuracoes.html">Configurações</a>
    <a href="privacidade.html">Privacidade</a>
  </nav>
  <p class="menu-lateral-rodape">Vai Ter Forró! · vaiterforro.com.br</p>
</aside>`;

  document.body.insertAdjacentHTML('beforeend', html);
}

function configurarMenuLateral() {
  const botaoMenu = document.getElementById('botao-menu');
  const menuLateral = document.getElementById('menu-lateral');
  const overlay = document.getElementById('menu-overlay');
  if (!botaoMenu || !menuLateral || !overlay) return;

  const focaveis = () => [...menuLateral.querySelectorAll('a[href], button:not([disabled])')];

  function abrirMenu() {
    menuLateral.inert = false;
    menuLateral.classList.add('aberto');
    overlay.hidden = false;
    botaoMenu.setAttribute('aria-expanded', 'true');
    menuLateral.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // Espera o próximo frame: a transição de visibility/transform precisa ter
    // sido aplicada antes de mover o foco pra dentro do drawer.
    requestAnimationFrame(() => focaveis()[0]?.focus());
  }

  function fecharMenu({ devolverFoco = true } = {}) {
    menuLateral.classList.remove('aberto');
    overlay.hidden = true;
    botaoMenu.setAttribute('aria-expanded', 'false');
    menuLateral.setAttribute('aria-hidden', 'true');
    menuLateral.inert = true;
    document.body.style.overflow = '';
    if (devolverFoco) botaoMenu.focus();
  }

  botaoMenu.addEventListener('click', () => {
    if (menuLateral.classList.contains('aberto')) fecharMenu();
    else abrirMenu();
  });

  overlay.addEventListener('click', () => fecharMenu());

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && menuLateral.classList.contains('aberto')) {
      fecharMenu();
    }
  });

  // Mantém o Tab dentro do drawer enquanto ele está aberto.
  menuLateral.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Tab' || !menuLateral.classList.contains('aberto')) return;
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
  });

  menuLateral.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener('click', () => fecharMenu({ devolverFoco: false }));
  });
}

// painelUsuario.js precisa de import/export, então é carregado sob demanda.
function inicializarPainelUsuario() {
  import('../components/painelUsuario.js')
    .then(({ inicializarPainelUsuario }) => inicializarPainelUsuario())
    .catch((erro) => console.warn('Não foi possível carregar o painel do usuário:', erro));
}

function inicializarPwa() {
  gerarNavInferior();
  gerarMenuLateral();
  configurarMenuLateral();
  inicializarPainelUsuario();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarPwa);
} else {
  inicializarPwa();
}
