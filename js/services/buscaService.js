// js/services/buscaService.js
// Busca client-side de Marcas, Locais e Eventos.
//
// O catálogo é pequeno (dezenas de itens) e já está em memória nos
// repositories — então não faz sentido endpoint nem índice: normaliza o termo
// (sem acento, minúsculo) e filtra em memória.
//
// Revisão 2026-10-28 — implementa o campo de busca da Home, que existia na
// interface mas não fazia nada (ver MELHORIAS.md, PRD-01).

import { listarMarcas } from '../repositories/marcaRepository.js';
import { listarLocais } from '../repositories/localRepository.js';
import { listarEventos } from '../repositories/eventoRepository.js';
import { formatarDataCurta, normalizar } from '../utils/format.js';

const LIMITE = 8;

function pontuar(alvo, texto) {
  const valor = normalizar(texto);
  if (!valor) return 0;
  if (valor === alvo) return 3;
  if (valor.startsWith(alvo)) return 2;
  if (valor.includes(alvo)) return 1;
  return 0;
}

export async function buscar(termo) {
  const alvo = normalizar(termo);
  if (alvo.length < 2) return [];

  const [marcas, locais, eventos] = await Promise.all([
    listarMarcas(),
    listarLocais(),
    listarEventos(),
  ]);

  const marcasPorId = new Map(marcas.map((marca) => [marca.id, marca]));
  const resultados = [];

  marcas.forEach((marca) => {
    const pontos = pontuar(alvo, marca.nome);
    if (!pontos) return;
    resultados.push({
      tipo: 'Marca',
      nome: marca.nome,
      detalhe: [marca.cidadeBase, (marca.categorias ?? [])[0]].filter(Boolean).join(' · '),
      url: `marca.html?slug=${encodeURIComponent(marca.slug)}`,
      pontos,
    });
  });

  locais.forEach((local) => {
    const endereco = local.endereco ?? {};
    const pontos = Math.max(
      pontuar(alvo, local.nome),
      pontuar(alvo, `${endereco.bairro ?? ''} ${endereco.cidade ?? ''}`)
    );
    if (!pontos) return;
    resultados.push({
      tipo: 'Local',
      nome: local.nome,
      detalhe: [endereco.bairro, endereco.cidade].filter(Boolean).join(' · '),
      url: `local.html?slug=${encodeURIComponent(local.slug)}`,
      pontos,
    });
  });

  eventos.forEach((evento) => {
    const marca = marcasPorId.get(evento.marcaId);
    if (!marca) return; // Marca inativa: o evento não aparece em lugar nenhum
    const pontos = Math.max(
      pontuar(alvo, evento.titulo),
      pontuar(alvo, marca.nome)
    );
    if (!pontos) return;
    resultados.push({
      tipo: 'Evento',
      nome: evento.titulo,
      detalhe: `${formatarDataCurta(evento.data)} · ${marca.nome}`,
      url: `evento.html?slug=${encodeURIComponent(evento.slug)}`,
      pontos,
    });
  });

  return resultados
    .sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome, 'pt-BR'))
    .slice(0, LIMITE);
}
