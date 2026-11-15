import {ErroAdministracao} from './administracaoService.js';
export function criarServicoListasVip({obterCliente=async()=>(await import('../data/supabaseClient.js')).supabase}={}){
 async function rpc(nome,params,escrita=false){
  if(escrita&&!params.p_chave)throw new ErroAdministracao('VALIDACAO','Identificador da solicitação obrigatório.');
  const client=await obterCliente(),query=client.rpc(nome,params);
  const {data,error}=await (typeof query.retry==='function'?query.retry(false):query);
  if(error){const code=error.code==='PT409'?'CONFLITO':error.code==='42501'?'SEM_PERMISSAO':
   ['22023','23514','23505'].includes(error.code)?'VALIDACAO':'INDISPONIVEL';
   throw new ErroAdministracao(code,code==='CONFLITO'?'Recarregue a lista e confira seu estado antes de continuar.':'Não foi possível concluir a operação da lista.',error);
  }
  return data;
 }
 return {
  consultar:listaId=>rpc('consultar_lista_vip',{p_lista:listaId}),
  doEvento:eventoLegado=>rpc('consultar_lista_vip_evento',{p_evento_legado:eventoLegado}),
  criar:({eventoId,titulo,termos,prazo,inicio,fim,maxAcompanhantes,chave})=>rpc('criar_lista_vip',{
   p_evento:eventoId,p_titulo:titulo,p_termos:termos,p_prazo:prazo,p_inicio:inicio,p_fim:fim,p_acompanhantes:maxAcompanhantes,p_chave:chave},true),
  encerrar:({listaId,revisao,chave})=>rpc('encerrar_lista_vip',{p_lista:listaId,p_revisao:revisao,p_chave:chave},true),
  minha:listaId=>rpc('consultar_minha_inscricao_vip',{p_lista:listaId}),
  salvar:({listaId,nome,acompanhantes,aceitaTermos,revisao,chave})=>rpc('salvar_inscricao_vip',{
   p_lista:listaId,p_nome:nome,p_acompanhantes:acompanhantes,p_aceita_termos:aceitaTermos,p_revisao:revisao,p_chave:chave},true),
  cancelar:({listaId,revisao,chave})=>rpc('cancelar_inscricao_vip',{p_lista:listaId,p_revisao:revisao,p_chave:chave},true),
  corrigir:({inscricaoId,nome,acompanhantes,revisao,chave})=>rpc('corrigir_inscricao_vip',{
   p_inscricao:inscricaoId,p_nome:nome,p_acompanhantes:acompanhantes,p_revisao:revisao,p_chave:chave},true),
  grupos:listaId=>rpc('consultar_grupos_vip',{p_lista:listaId}),
  exportar:listaId=>rpc('exportar_lista_vip',{p_lista:listaId}),
  gestao:()=>rpc('consultar_gestao_listas_vip',{}),
  confirmarData:({listaId,versaoId,revisao,chave})=>rpc('confirmar_data_lista_vip',{
   p_lista:listaId,p_versao:versaoId,p_revisao:revisao,p_chave:chave},true),
 };
}
