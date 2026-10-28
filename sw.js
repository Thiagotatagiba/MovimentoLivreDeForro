// sw.js — service worker do Vai Ter Forró!
//
// Estratégia (revisada em 2026-10-28 — ver MELHORIAS.md, TEC-01/TEC-02):
//
// - same-origin estático (HTML/CSS/JS/ícones): stale-while-revalidate.
//   Serve o cache na hora e atualiza em background. Resolve o problema de
//   deploy antigo ficar "congelado" até alguém trocar CACHE_NOME à mão, sem
//   perder a velocidade de abrir offline.
// - dados (data/*.json): network-only — agenda desatualizada é pior que nada.
// - cross-origin (Supabase, Google Fonts, esm.sh): network-only, sem cache.
//   Antes, TODO GET fora de /data/ era cacheado, incluindo chamadas do
//   Supabase cujo cache key é só a URL (risco de resposta antiga de sessão).
// - localhost/127.0.0.1: network-only, pra não mascarar mudanças em dev.
// - instalação: pré-cacheia a casca (incluindo os módulos JS), então o app
//   instalado abre offline em vez de mostrar página vazia.

const CACHE_NOME = 'vai-ter-forro-v4';

const EH_LOCALHOST = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const ARQUIVOS_ESTATICOS = [
  'index.html',
  'agenda.html',
  'sobre.html',
  'favoritos.html',
  'configuracoes.html',
  'privacidade.html',
  'evento.html',
  'marca.html',
  'local.html',
  'perfil.html',
  'perfil-editar.html',
  'css/tokens.css',
  'css/base.css',
  'css/components.css',
  'css/perfil.css',
  'css/perfil-visualizar.css',
  'components/modal-login.css',
  'components/loginModal.js',
  'components/painelUsuario.js',
  'components/botaoInteracao.js',
  'components/compartilhar.js',
  'js/barraTopo.js',
  'js/pwa.js',
  'js/pages/home.js',
  'js/pages/agenda.js',
  'js/pages/evento.js',
  'js/pages/marca.js',
  'js/pages/local.js',
  'js/pages/favoritos.js',
  'js/pages/perfil.js',
  'js/pages/perfil-editar.js',
  'js/pages/configuracoes.js',
  'js/repositories/eventoRepository.js',
  'js/repositories/marcaRepository.js',
  'js/repositories/localRepository.js',
  'js/services/eventoService.js',
  'js/services/marcaService.js',
  'js/services/localService.js',
  'js/services/buscaService.js',
  'js/services/eventValidator.js',
  'js/utils/format.js',
  'js/utils/cardEvento.js',
  'js/utils/ui.js',
  'js/utils/meta.js',
  'services/authService.js',
  'services/perfilService.js',
  'services/interacaoService.js',
  'manifest.json',
  'assets/icons/favicon-32.png',
  'assets/icons/logo-64.png',
  'assets/icons/avatar-padrao.svg',
];

self.addEventListener('install', (evento) => {
  if (EH_LOCALHOST) {
    evento.waitUntil(self.skipWaiting());
    return;
  }

  evento.waitUntil(
    caches.open(CACHE_NOME)
      .then((cache) => cache.addAll(ARQUIVOS_ESTATICOS))
      .catch((erro) => console.warn('Pré-cache incompleto:', erro))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(
        chaves.filter((chave) => chave !== CACHE_NOME).map((chave) => caches.delete(chave))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const { request } = evento;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Cross-origin (Supabase, fontes, esm.sh): direto na rede, nunca no cache.
  if (url.origin !== self.location.origin) return;

  // Dev local: sempre rede.
  if (EH_LOCALHOST) {
    evento.respondWith(fetch(request));
    return;
  }

  // Dados: sempre rede.
  if (url.pathname.includes('/data/')) {
    evento.respondWith(fetch(request));
    return;
  }

  evento.respondWith(responderComCache(evento));
});

async function responderComCache(evento) {
  const { request } = evento;
  const cache = await caches.open(CACHE_NOME);
  const emCache = await cache.match(request);

  const daRede = fetch(request)
    .then((resposta) => {
      if (resposta && resposta.ok) cache.put(request, resposta.clone());
      return resposta;
    })
    .catch(() => null);

  // Mantém o worker vivo até a atualização de cache terminar (SWR).
  evento.waitUntil(daRede);

  if (emCache) return emCache;

  const respostaRede = await daRede;
  if (respostaRede) return respostaRede;

  // Navegação offline: devolve a Home cacheada.
  if (request.mode === 'navigate') {
    const home = await cache.match('index.html');
    if (home) return home;
  }

  return new Response('Sem conexão e sem cópia em cache.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
