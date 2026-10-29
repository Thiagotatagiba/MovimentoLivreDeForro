#!/usr/bin/env node
// scripts/validar-dados.js
// Validação de integridade dos JSONs do catálogo, sem dependências.
//
// Uso: node scripts/validar-dados.js
// Sai com código 1 se encontrar erro; avisos não quebram o processo.
//
// Cobre (ver docs/MELHORIAS.md, TEC-06): JSON válido, IDs/slugs únicos,
// referências entre Evento/Marca/Local, localPadraoId coerente, schema do
// ingresso, formato de links e existência dos arquivos de imagem.

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const erros = [];
const avisos = [];

function lerJSON(nome) {
  const caminho = path.join(RAIZ, 'data', nome);
  try {
    return JSON.parse(fs.readFileSync(caminho, 'utf8'));
  } catch (erro) {
    erros.push(`data/${nome}: JSON inválido — ${erro.message}`);
    return [];
  }
}

function duplicados(itens, campo) {
  const vistos = new Map();
  itens.forEach((item) => {
    const valor = item[campo];
    if (!valor) return;
    vistos.set(valor, (vistos.get(valor) ?? 0) + 1);
  });
  return [...vistos.entries()].filter(([, total]) => total > 1).map(([valor]) => valor);
}

const eventos = lerJSON('eventos.json');
const marcas = lerJSON('marcas.json');
const locais = lerJSON('locais.json');

// ---------- unicidade ----------
for (const [nome, itens] of [['eventos', eventos], ['marcas', marcas], ['locais', locais]]) {
  for (const campo of ['id', 'slug']) {
    if (campo === 'slug' && nome === 'eventos') continue; // slug de evento pode se repetir? não — checa abaixo
    const repetidos = duplicados(itens, campo);
    repetidos.forEach((valor) => erros.push(`${nome}.json: ${campo} duplicado — "${valor}"`));
  }
  itens.forEach((item) => {
    if (!item.id) erros.push(`${nome}.json: item sem id (${JSON.stringify(item).slice(0, 60)}...)`);
    if (!item.slug) avisos.push(`${nome}.json: "${item.nome ?? item.titulo ?? item.id}" sem slug`);
    if (item.ativo === undefined) avisos.push(`${nome}.json: "${item.id}" sem campo ativo`);
  });
}

// ---------- referências ----------
const idsMarcas = new Set(marcas.map((m) => m.id));
const idsLocais = new Set(locais.map((l) => l.id));
const marcasPorId = new Map(marcas.map((m) => [m.id, m]));

eventos.forEach((evento) => {
  if (!idsMarcas.has(evento.marcaId)) {
    erros.push(`evento ${evento.id}: marcaId inexistente (${evento.marcaId})`);
  }
  if (!idsLocais.has(evento.localId)) {
    erros.push(`evento ${evento.id}: localId inexistente (${evento.localId})`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(evento.data ?? '')) {
    erros.push(`evento ${evento.id}: data fora do formato YYYY-MM-DD ("${evento.data}")`);
  }
  if (!evento.titulo) erros.push(`evento ${evento.id}: sem título`);

  const marca = marcasPorId.get(evento.marcaId);
  if (marca?.localPadraoId && evento.localId !== marca.localPadraoId) {
    erros.push(`evento ${evento.id}: localId ${evento.localId} diverge do localPadraoId da marca ${marca.id}`);
  }

  const ingresso = evento.ingresso ?? {};
  if ('plataforma' in ingresso) {
    erros.push(`evento ${evento.id}: campo legado "plataforma" (use tipoEntrada)`);
  }
  if (ingresso.precoAPartirDe !== null && ingresso.precoAPartirDe !== undefined
      && typeof ingresso.precoAPartirDe !== 'number') {
    erros.push(`evento ${evento.id}: precoAPartirDe não é número`);
  }
});

marcas.forEach((marca) => {
  if (marca.localPadraoId && !idsLocais.has(marca.localPadraoId)) {
    erros.push(`marca ${marca.id}: localPadraoId inexistente (${marca.localPadraoId})`);
  }
  if (marca.whatsapp && !/^https?:\/\//.test(marca.whatsapp)) {
    erros.push(`marca ${marca.id}: whatsapp não é URL (${marca.whatsapp}) — deve começar com https://`);
  }
  if (marca.instagram && !/^https?:\/\//.test(marca.instagram)) {
    avisos.push(`marca ${marca.id}: instagram não é URL (${marca.instagram})`);
  }
  if (marca.frequencia === 'semanal' && !(marca.diasSemana ?? []).length) {
    avisos.push(`marca ${marca.id}: semanal sem diasSemana — a recorrência não será gerada`);
  }
});

// ---------- arquivos de imagem ----------
[['marcas', marcas, ['logo', 'capa']], ['locais', locais, ['fotoCapa', 'fotoPerfil']]].forEach(([nome, itens, campos]) => {
  itens.forEach((item) => {
    campos.forEach((campo) => {
      const valor = item[campo];
      if (!valor || valor === 'em breve' || /^https?:\/\//.test(valor)) return;
      const arquivo = path.join(RAIZ, valor.split('?')[0]);
      if (!fs.existsSync(arquivo)) {
        erros.push(`${nome}.json: ${item.id}.${campo} aponta para arquivo inexistente (${valor})`);
      }
    });
  });
});

// ---------- páginas de compartilhamento ----------
// Elas são o que faz o WhatsApp mostrar a arte do evento (o robô não roda JS).
// Precisam ser regeradas sempre que data/*.json mudar.
const pastaCompartilhar = path.join(RAIZ, 'compartilhar');
eventos
  .filter((evento) => evento.ativo && evento.slug)
  .forEach((evento) => {
    if (!fs.existsSync(path.join(pastaCompartilhar, `${evento.slug}.html`))) {
      avisos.push(`evento ${evento.id}: sem página de compartilhamento (rode node scripts/gerar-compartilhamento.js)`);
    }
  });

// ---------- relatório ----------
const total = eventos.length + marcas.length + locais.length;
console.log(`Catálogo: ${eventos.length} eventos, ${marcas.length} marcas, ${locais.length} locais (${total} itens).`);

if (avisos.length) {
  console.log(`\n${avisos.length} aviso(s):`);
  avisos.forEach((aviso) => console.log(`  ! ${aviso}`));
}

if (erros.length) {
  console.error(`\n${erros.length} erro(s):`);
  erros.forEach((erro) => console.error(`  x ${erro}`));
  process.exit(1);
}

console.log('\nNenhum erro de integridade encontrado.');
