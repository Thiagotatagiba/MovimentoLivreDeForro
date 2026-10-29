#!/usr/bin/env node
// scripts/gerar-compartilhamento.js
// Gera uma página HTML estática por evento em /compartilhar/{slug}.html.
//
// Por que isso existe: WhatsApp/Facebook/Telegram NÃO executam JavaScript.
// Eles leem apenas o HTML inicial da URL. Como evento.html é montado por JS e
// recebe ?slug=, todos os eventos compartilhavam a mesma prévia (o ícone do
// site). Cada página gerada tem og:image/og:title daquele evento e redireciona
// a pessoa para a página real.
//
// Uso: node scripts/gerar-compartilhamento.js
// Rode antes de cada deploy em que data/*.json mudar (o validar-dados.js avisa
// quando faltar página para algum evento ativo).

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const BASE = 'https://vaiterforro.com.br/';
const ICONE_PADRAO = `${BASE}assets/icons/icon-512.png`;

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function lerJSON(nome) {
  return JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', nome), 'utf8'));
}

function esc(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function capitalizar(texto) {
  const valor = String(texto ?? '');
  return valor.charAt(0).toUpperCase() + valor.slice(1);
}

function dataLonga(iso) {
  const [ano, mes, dia] = String(iso ?? '').split('-').map(Number);
  if (!ano || !mes || !dia) return iso ?? '';
  const data = new Date(ano, mes - 1, dia);
  return `${DIAS[data.getDay()]}, ${dia} de ${MESES[mes - 1]}`;
}

function precoTexto(preco) {
  if (preco === 0) return 'Entrada gratuita';
  if (preco == null) return null;
  const valor = Number(preco);
  if (Number.isNaN(valor)) return null;
  const numero = valor % 1 === 0 ? String(valor) : valor.toFixed(2).replace('.', ',');
  return `A partir de R$ ${numero}`;
}

function urlAbsoluta(valor) {
  if (!valor || valor === 'em breve') return null;
  if (/^https?:\/\//i.test(valor)) return valor;
  return `${BASE}${String(valor).replace(/^\//, '')}`;
}

const eventos = lerJSON('eventos.json');
const marcas = lerJSON('marcas.json');
const locais = lerJSON('locais.json');

const marcasPorId = new Map(marcas.map((marca) => [marca.id, marca]));
const locaisPorId = new Map(locais.map((local) => [local.id, local]));

const pasta = path.join(RAIZ, 'compartilhar');
fs.mkdirSync(pasta, { recursive: true });

let gerados = 0;

for (const evento of eventos) {
  if (!evento.ativo || !evento.slug) continue;

  const marca = marcasPorId.get(evento.marcaId);
  const local = locaisPorId.get(evento.localId);
  if (!marca || !local) {
    console.warn(`- ${evento.id}: ignorado (Marca ou Local inexistente)`);
    continue;
  }

  const urlEvento = `${BASE}evento.html?slug=${encodeURIComponent(evento.slug)}`;
  const urlCompartilhar = `${BASE}compartilhar/${encodeURIComponent(evento.slug)}.html`;
  const urlRelativa = `../evento.html?slug=${encodeURIComponent(evento.slug)}`;

  const imagem = urlAbsoluta(evento.imagemUrl)
    || urlAbsoluta(marca.capa)
    || ICONE_PADRAO;

  const descricaoPartes = [
    capitalizar(dataLonga(evento.data)),
    evento.horario,
    local.nome,
    marca.nome,
    precoTexto(evento.ingresso?.precoAPartirDe),
  ].filter(Boolean);

  const descricao = descricaoPartes.join(' · ').slice(0, 200);
  const titulo = `${evento.titulo} — Vai Ter Forró!`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="robots" content="noindex, follow">
<meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="${esc(urlEvento)}">

<meta property="og:type" content="article">
<meta property="og:site_name" content="Vai Ter Forró!">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${esc(evento.titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:image" content="${esc(imagem)}">
<meta property="og:image:alt" content="${esc(`Arte do evento ${evento.titulo}`)}">
<meta property="og:url" content="${esc(urlCompartilhar)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(evento.titulo)}">
<meta name="twitter:description" content="${esc(descricao)}">
<meta name="twitter:image" content="${esc(imagem)}">

<!-- Gerado por scripts/gerar-compartilhamento.js. Não editar à mão. -->
<meta http-equiv="refresh" content="0; url=${esc(urlRelativa)}">
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #F5EFE1; color: #241F19; font-family: system-ui, sans-serif; text-align: center; padding: 24px; }
  a { color: #1E4638; font-weight: 600; }
</style>
</head>
<body>
  <p>Redirecionando para o evento…</p>
  <p><a href="${esc(urlRelativa)}">Abrir o evento</a></p>
  <script>location.replace(${JSON.stringify(urlRelativa)});</script>
</body>
</html>
`;

  fs.writeFileSync(path.join(pasta, `${evento.slug}.html`), html, 'utf8');
  gerados += 1;
}

console.log(`Páginas de compartilhamento geradas: ${gerados} em compartilhar/.`);
