// sw.js — service worker do Vai Ter Forró!
// Estratégia: cache-first pra estático (HTML/CSS/JS/ícones), network-only pra
// dados (data/*.json), porque agenda desatualizada é pior que sem cache nenhum.

const CACHE_NOME = 'vai-ter-forro-v1';

// Em desenvolvimento local o cache só atrapalha: mascara mudanças de JS/CSS
// e obriga a limpar o Service Worker manualmente a cada teste (já aconteceu
// várias vezes neste projeto). self.location é o endereço de onde o próprio
// service worker foi registrado, então isso identifica o ambiente de dev
// sem precisar de nenhuma configuração extra.
const EH_LOCALHOST = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const ARQUIVOS_ESTATICOS = [
  'index.html',
  'agenda.html',
  'sobre.html',
  'favoritos.html',
  'configuracoes.html',
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
  'js/pwa.js',
  'js/barraTopo.js',
  'manifest.json',
];

self.addEventListener('install', (evento) => {
  if (EH_LOCALHOST) {
    evento.waitUntil(self.skipWaiting());
    return;
  }

  evento.waitUntil(
    caches.open(CACHE_NOME)
      .then((cache) => cache.addAll(ARQUIVOS_ESTATICOS))
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
  if (evento.request.method !== 'GET') return;

  const url = new URL(evento.request.url);

  // Localhost: sempre rede, nunca lê nem escreve no cache. Zero chance de
  // ficar servindo HTML/JS/CSS antigo durante o desenvolvimento.
  if (EH_LOCALHOST) {
    evento.respondWith(fetch(evento.request));
    return;
  }

  // Dados: sempre rede, nunca cache — a agenda muda o tempo todo.
  if (url.pathname.includes('/data/')) {
    evento.respondWith(fetch(evento.request));
    return;
  }

  // Estático: cache-first, com fallback pra rede (e guarda no cache pra próxima).
  evento.respondWith(
    caches.match(evento.request).then((respostaCache) => {
      if (respostaCache) return respostaCache;

      return fetch(evento.request).then((respostaRede) => {
        const copia = respostaRede.clone();
        caches.open(CACHE_NOME).then((cache) => cache.put(evento.request, copia));
        return respostaRede;
      });
    })
  );
});
