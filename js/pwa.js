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

// Gera a navegação inferior (Início/Agenda/Menu) uma vez aqui, em vez de
// duplicada em cada página — era idêntica em 8 das 10 páginas, variando só
// o aria-current de qual aba está ativa.
function gerarNavInferior() {
  if (document.querySelector('.nav-inferior')) return; // já existe (não deveria mais acontecer)

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

// Gera o overlay + menu lateral (drawer) — HTML idêntico em toda página,
// então nasce aqui uma vez só. O CONTEÚDO do painel de usuário continua
// sendo preenchido por components/painelUsuario.js, como já era.
function gerarMenuLateral() {
  if (document.getElementById('menu-lateral')) return; // já existe (não deveria mais acontecer)

  const html = `
<div class="menu-overlay" id="menu-overlay" hidden></div>
<aside class="menu-lateral" id="menu-lateral" aria-hidden="true">
  <div class="menu-lateral-topo">
    <p>Bem vindo,</p>
    <h2 id="painel-usuario-nome">Forrozeiro</h2>
    <button type="button" id="painel-usuario-acao" class="menu-lateral-acao-auth">Entrar</button>
  </div>
  <nav class="menu-lateral-links">
    <a href="sobre.html">Sobre</a>
    <a href="perfil.html">Meu Perfil</a>
    <a href="configuracoes.html">Configurações</a>
  </nav>
</aside>`;

  document.body.insertAdjacentHTML('beforeend', html);
}

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

// pwa.js é um script clássico (não type="module"), então o painel de
// usuário — que precisa de import/export — é carregado sob demanda aqui.
// Continua sendo UM único arquivo (components/painelUsuario.js) controlando
// o conteúdo em todas as páginas; nada é duplicado por página.
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
