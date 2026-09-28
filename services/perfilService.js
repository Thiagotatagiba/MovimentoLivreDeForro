// services/perfilService.js
// CRUD do perfil do usuário logado + upload de avatar.
// Mesmo padrão de interacaoService.js: fala direto com o Supabase — a
// tabela `perfis` já tem RLS garantindo que cada um só vê/edita o próprio
// perfil, então não precisamos de uma camada de repository aqui.

import { supabase } from '../data/supabaseClient.js';

export async function obterPerfil(usuarioId) {
  const { data, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', usuarioId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function salvarPerfil(usuarioId, dados) {
  const { error } = await supabase
    .from('perfis')
    .update(dados)
    .eq('id', usuarioId);
  if (error) throw error;
}

// Envia o arquivo pra pasta do próprio usuário no bucket "avatares" e
// devolve a URL pública já pronta pra salvar em perfis.avatar_url.
export async function enviarAvatar(usuarioId, arquivo) {
  const extensao = arquivo.name.split('.').pop();
  const caminho = `${usuarioId}/avatar.${extensao}`;

  const { error: erroUpload } = await supabase.storage
    .from('avatares')
    .upload(caminho, arquivo, { upsert: true });
  if (erroUpload) throw erroUpload;

  const { data } = supabase.storage.from('avatares').getPublicUrl(caminho);
  // Cache-bust: o nome do arquivo não muda entre uploads, então sem isso o
  // navegador continuaria mostrando a imagem antiga do cache.
  return `${data.publicUrl}?v=${Date.now()}`;
}
