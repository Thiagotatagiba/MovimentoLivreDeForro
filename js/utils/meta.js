// js/utils/meta.js
// Atualiza <title> e metatags em páginas montadas por JS.
//
// Limitação conhecida: robôs de prévia (WhatsApp, Facebook) não executam JS,
// então para a prévia ficar correta em link compartilhado é preciso HTML
// pré-renderizado por evento (ver MELHORIAS.md, SEO-01). Isto aqui melhora a
// aba, o histórico e leitores que executam JS.

const BASE_URL = 'https://vaiterforro.com.br/';

function garantirMeta(atributo, chave, conteudo) {
  let el = document.head.querySelector(`meta[${atributo}="${chave}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(atributo, chave);
    document.head.appendChild(el);
  }
  el.setAttribute('content', conteudo);
}

export function atualizarMeta({ titulo, descricao, imagem }) {
  if (titulo) {
    document.title = titulo;
    garantirMeta('property', 'og:title', titulo);
    garantirMeta('name', 'twitter:title', titulo);
  }
  if (descricao) {
    const texto = descricao.length > 200 ? `${descricao.slice(0, 197)}...` : descricao;
    garantirMeta('name', 'description', texto);
    garantirMeta('property', 'og:description', texto);
    garantirMeta('name', 'twitter:description', texto);
  }
  if (imagem) {
    const url = imagem.startsWith('http') ? imagem : `${BASE_URL}${imagem.replace(/^\//, '')}`;
    garantirMeta('property', 'og:image', url);
    garantirMeta('name', 'twitter:image', url);
  }
}

export function atualizarCanonical(caminho) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = `${BASE_URL}${String(caminho).replace(/^\//, '')}`;
}
