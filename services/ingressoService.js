// services/ingressoService.js
// Carteira de ingressos. Mesmo padrão de perfilService/interacaoService: fala
// direto com o Supabase, e o RLS garante que cada pessoa só mexe nos próprios
// ingressos. A imagem fica num bucket PRIVADO (QR code = senha de entrada),
// então ela só é exibida por link assinado, que expira em poucos minutos.

import { supabase } from '../data/supabaseClient.js';
import { EXTENSOES_IMAGEM, validarImagem } from '../js/utils/ingressos.js';

const BUCKET = 'ingressos';

// crypto.randomUUID() só existe em páginas seguras (https ou localhost). Testar o
// site no celular pelo IP da rede (http://192.168...) quebraria o "adicionar".
// getRandomValues funciona em qualquer contexto, então serve de plano B.
function novoUuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // versão 4
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function linhaParaIngresso(linha) {
  return {
    id: linha.id,
    eventoId: linha.evento_id,
    titulo: linha.titulo,
    dataEvento: linha.data_evento,
    imagemPath: linha.imagem_path,
    usadoEm: linha.usado_em,
    criadoEm: linha.criado_em,
  };
}

export async function listarIngressos(usuarioId) {
  const { data, error } = await supabase
    .from('ingressos')
    .select('*')
    .eq('usuario_id', usuarioId);
  if (error) throw error;
  return data.map(linhaParaIngresso);
}

// Ordem das operações importa: sobe a imagem primeiro e só depois grava a
// linha. Se a linha falhar, apaga a imagem — nunca sobra arquivo sem dono.
export async function adicionarIngresso({ usuarioId, eventoId, titulo, dataEvento, arquivo }) {
  const problema = validarImagem(arquivo);
  if (problema) throw new Error(problema);

  const id = novoUuid();
  const caminho = `${usuarioId}/${id}.${EXTENSOES_IMAGEM[arquivo.type]}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
  if (erroUpload) throw erroUpload;

  const { data, error } = await supabase
    .from('ingressos')
    .insert({
      id,
      usuario_id: usuarioId,
      evento_id: eventoId ?? null,
      titulo: titulo.trim(),
      data_evento: dataEvento,
      imagem_path: caminho,
    })
    .select()
    .single();

  if (error) {
    try {
      await supabase.storage.from(BUCKET).remove([caminho]);
    } catch (erroLimpeza) {
      console.warn('Não consegui apagar a imagem após falha ao salvar o ingresso:', erroLimpeza);
    }
    throw error;
  }
  return linhaParaIngresso(data);
}

// usado = true marca agora; usado = false desfaz.
export async function marcarUsado(ingressoId, usado) {
  const { data, error } = await supabase
    .from('ingressos')
    .update({ usado_em: usado ? new Date().toISOString() : null })
    .eq('id', ingressoId)
    .select()
    .single();
  if (error) throw error;
  return linhaParaIngresso(data);
}

// Apaga a imagem primeiro e a linha depois. Se a linha falhar, o ingresso
// continua na lista (a pessoa vê e tenta de novo; apagar um arquivo que já não
// existe não dá erro). O contrário deixaria uma imagem invisível e eterna.
export async function excluirIngresso(ingresso) {
  const { error: erroArquivo } = await supabase.storage.from(BUCKET).remove([ingresso.imagemPath]);
  if (erroArquivo) throw erroArquivo;

  const { error } = await supabase.from('ingressos').delete().eq('id', ingresso.id);
  if (error) throw error;
}

// Link temporário (10 min) pra exibir a imagem privada.
export async function urlDaImagem(imagemPath, segundos = 600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(imagemPath, segundos);
  if (error) throw error;
  return data.signedUrl;
}
