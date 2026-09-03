// services/interacaoService.js
// Favoritar (evento) e Seguir (marca) usam a mesma tabela,
// mas são conceitos diferentes — ver DECISOES_DE_ARQUITETURA.md.

import { supabase } from '../data/supabaseClient.js';

const TIPO_POR_ENTIDADE = {
  evento: 'favorito',
  marca: 'seguindo'
};

async function buscarInteracaoExistente(usuarioId, tipo, entidadeTipo, entidadeId) {
  const { data, error } = await supabase
    .from('interacoes')
    .select('id')
    .eq('usuario_id', usuarioId)
    .eq('tipo', tipo)
    .eq('entidade_tipo', entidadeTipo)
    .eq('entidade_id', entidadeId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Alterna o estado (favorita se não existia, remove se já existia).
// Retorna o novo estado: true = adicionado, false = removido.
export async function alternarInteracao(entidadeTipo, entidadeId, usuarioId) {
  const tipo = TIPO_POR_ENTIDADE[entidadeTipo];
  if (!tipo) throw new Error(`Tipo de entidade inválido: ${entidadeTipo}`);

  const existente = await buscarInteracaoExistente(usuarioId, tipo, entidadeTipo, entidadeId);

  if (existente) {
    const { error } = await supabase.from('interacoes').delete().eq('id', existente.id);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase.from('interacoes').insert({
    usuario_id: usuarioId,
    tipo,
    entidade_tipo: entidadeTipo,
    entidade_id: entidadeId
  });
  if (error) throw error;
  return true;
}

export async function listarFavoritos(usuarioId) {
  const { data, error } = await supabase
    .from('interacoes')
    .select('entidade_id')
    .eq('usuario_id', usuarioId)
    .eq('tipo', 'favorito');
  if (error) throw error;
  return data.map((linha) => linha.entidade_id);
}

export async function listarSeguindo(usuarioId) {
  const { data, error } = await supabase
    .from('interacoes')
    .select('entidade_id')
    .eq('usuario_id', usuarioId)
    .eq('tipo', 'seguindo');
  if (error) throw error;
  return data.map((linha) => linha.entidade_id);
}
