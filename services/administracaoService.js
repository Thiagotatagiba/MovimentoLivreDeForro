export class ErroAdministracao extends Error {
  constructor(codigo, mensagem, causa) {
    super(mensagem, {cause:causa}); this.name='ErroAdministracao'; this.codigo=codigo;
  }
}
function traduzirErro(erro) {
  if (erro.code === '40001') return new ErroAdministracao('CONFLITO',
    'Outra pessoa alterou este registro. Recarregue e compare as mudancas antes de salvar.',erro);
  if (erro.code === '42501') return new ErroAdministracao('SEM_PERMISSAO',
    'Sua conta nao tem permissao para esta operacao.',erro);
  if (['22023','22007','22008','23514','23505'].includes(erro.code)) return new ErroAdministracao('VALIDACAO',
    'Confira os dados, horarios, permissoes e administradores ativos.',erro);
  return new ErroAdministracao('INDISPONIVEL','Nao foi possivel concluir a operacao. Tente novamente com a mesma solicitacao.',erro);
}
export function criarServicoAdministrativo({
  obterCliente=async()=>(await import('../data/supabaseClient.js')).supabase,
}={}) {
  async function rpc(nome,parametros) {
    if (!parametros.p_chave) throw new ErroAdministracao('VALIDACAO','Identificador da solicitacao obrigatorio.');
    const cliente=await obterCliente();
    const {data,error}=await cliente.rpc(nome,parametros);
    if (error) throw traduzirErro(error);
    return data;
  }
  return {
    salvarRascunho:({eventoId,conteudo,revisao,chave})=>rpc('salvar_rascunho_evento',{
      p_evento:eventoId,p_conteudo:conteudo,p_revisao:revisao,p_chave:chave,
    }),
    publicarEvento:({eventoId,revisao,chave})=>rpc('publicar_evento',{
      p_evento:eventoId,p_revisao:revisao,p_chave:chave,
    }),
    alterarSituacao:({eventoId,situacao,versaoId,chave})=>rpc('alterar_situacao_evento',{
      p_evento:eventoId,p_situacao:situacao,p_versao:versaoId,p_chave:chave,
    }),
    alterarMembro:({membroId,papel,ativo,permissoes,chave})=>rpc('alterar_membro_marca',{
      p_membro:membroId,p_papel:papel,p_ativo:ativo,p_permissoes:permissoes,p_chave:chave,
    }),
    async carregarEvento(eventoId) {
      const cliente=await obterCliente();
      const {data:evento,error}=await cliente.from('eventos')
        .select('id,id_legado,slug,marca_id,local_id,estado_publicacao,versao_publicada_id,versao:versoes_evento!eventos_versao_publicada_do_mesmo_evento(numero,conteudo,situacao)')
        .eq('id',eventoId).maybeSingle();
      if (error) throw traduzirErro(error);
      if (!evento) throw new ErroAdministracao('SEM_PERMISSAO','Evento indisponivel para sua conta.');
      const {data:rascunho,error:erroRascunho}=await cliente.from('rascunhos_evento')
        .select('conteudo,revisao,atualizado_em').eq('evento_id',eventoId).maybeSingle();
      if (erroRascunho) throw traduzirErro(erroRascunho);
      return {evento,rascunho,conteudo:rascunho?.conteudo ?? evento.versao?.conteudo ?? {},
        revisao:rascunho?.revisao ?? 0};
    },
  };
}
// Reuse this key when retrying the same operation. A changed payload needs a new key.
export const novaChaveAdministrativa=()=>crypto.randomUUID();
export const administracao=criarServicoAdministrativo();
