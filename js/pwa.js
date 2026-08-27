// pwa.js — script não-módulo, carregado em toda página via <script src="js/pwa.js">.
// Responsabilidades: registrar o service worker, controlar o menu lateral (drawer)
// e capturar o evento de instalação do PWA pra página de Configurações usar depois.

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((erro) => {
      console.warn('Não foi possível registrar o service worker:', erro);
    });
  });
}

// Captura o prompt de instalação assim que o navegador oferecer (Chrome/Edge/Android).
// Guardado em window pra qualquer página (especialmente configuracoes.html) poder usar.
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

function configurarMenuLateral() {
  const botaoMenu = document.getElementById('botao-menu');
  const menuLateral = document.getElementById('menu-lateral');
  const overlay = document.getElementById('menu-overlay');
  if (!botaoMenu || !menuLateral || !overlay) return;

  function abrirMenu() {
    menuLateral.classList.add('aberto');
    overlay.hidden = false;
    botaoMenu.setAttribute('aria-expanded', 'true');
    menuLateral.setAttribute('aria-hidden', 'false');
  }

  function fecharMenu() {
    menuLateral.classList.remove('aberto');
    overlay.hidden = true;
    botaoMenu.setAttribute('aria-expanded', 'false');
    menuLateral.setAttribute('aria-hidden', 'true');
  }

  botaoMenu.addEventListener('click', () => {
    const jaAberto = menuLateral.classList.contains('aberto');
    if (jaAberto) fecharMenu(); else abrirMenu();
  });

  overlay.addEventListener('click', fecharMenu);

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') fecharMenu();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', configurarMenuLateral);
} else {
  configurarMenuLateral();
}
