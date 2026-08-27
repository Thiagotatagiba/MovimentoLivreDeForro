// sw.js — service worker do Vai Ter Forró!
// Estratégia: cache-first pra estático (HTML/CSS/JS/ícones), network-only pra
// dados (data/*.json), porque agenda desatualizada é pior que sem cache nenhum.

const CACHE_NOME = 'vai-ter-forro-v1';

const ARQUIVOS_ESTATICOS = [
  'index.html',
  'agenda.html',
  'sobre.html',
  'favoritos.html',
  'configuracoes.html',
  'css/tokens.css',
  'css/base.css',
  'css/components.css',
  'js/pwa.js',
  'manifest.json',
];

self.addEventListener('install', (evento) => {
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
