export class ErroAdministracao extends Error {
  constructor(codigo, mensagem, causa) {
    super(mensagem, {cause:causa}); this.name='ErroAdministracao'; this.codigo=codigo;
  }
}
function traduzirErro(erro) {
  if (['PT409','40001'].includes(erro.code)) return new ErroAdministracao('CONFLITO',
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
    const consulta=cliente.rpc(nome,parametros);
    // Recent SDKs retry HTTP 409 by default; a revision conflict needs user review.
    const {data,error}=await (typeof consulta.retry==='function'?consulta.retry(false):consulta);
    if (error) throw traduzirErro(error);
    return data;
  }
  async function lista(tabela,colunas,filtrar=q=>q) {
    const cliente=await obterCliente(),rows=[];
    for(let offset=0;;offset+=500) {
      const {data,error}=await filtrar(cliente.from(tabela).select(colunas).order('id').range(offset,offset+499));
      if(error) throw traduzirErro(error);
      rows.push(...data);
      if(data.length<500) return rows;
    }
  }
  return {
    async carregarContexto() {
      const cliente=await obterCliente();
      const {data:{user},error:erroAuth}=await cliente.auth.getUser();
      if(erroAuth || !user) throw new ErroAdministracao('SEM_PERMISSAO','Entre para acessar a gestão.');
      const {data:global,error}=await cliente.from('administradores_sistema').select('ativo')
        .eq('usuario_id',user.id).maybeSingle();
      if(error) throw traduzirErro(error);
      const todas=['editar_marca','gerenciar_eventos','publicar_eventos','gerenciar_listas','consultar_listas'];
      if(global?.ativo) {
        const marcas=await lista('marcas','id,id_legado,slug,nome',q=>q.eq('ativo',true));
        return {marcas:marcas.map(m=>({...m,permissoes:todas}))};
      }
      const membros=await lista('membros_marca',
        'id,marca_id,papel,permissoes:permissoes_membro(permissao),marca:marcas(id,id_legado,slug,nome)',
        q=>q.eq('usuario_id',user.id).eq('ativo',true));
      return {marcas:membros.filter(m=>m.marca).map(m=>({...m.marca,
        permissoes:m.papel==='administrador'?todas:m.permissoes.map(p=>p.permissao)}))
        .filter(m=>m.permissoes.some(p=>['gerenciar_eventos','publicar_eventos'].includes(p)))};
    },
    listarEventos:marcaId=>lista('eventos',
      'id,id_legado,slug,estado_publicacao,versao_publicada_id,versao:versoes_evento!eventos_versao_publicada_do_mesmo_evento(numero,conteudo,situacao)',
      q=>q.eq('marca_id',marcaId)),
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
