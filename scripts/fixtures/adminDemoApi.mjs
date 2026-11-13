// Disposable loopback-only fixture. Never imports a Supabase client.
import {criarBancoAdministrativo,id} from './bancoAdministrativo.mjs';
export async function criarApiDemo() {
 const db=await criarBancoAdministrativo();
 let fila=Promise.resolve();
 const perfis={administrador:1,editor:2,publicador:3,'outra-marca':5};
 const enfileirar=fn=>{const next=fila.then(fn);fila=next.catch(()=>{});return next;};
 async function executar(path,perfil,body,query) {
  if(!Object.hasOwn(perfis,perfil)) return {status:401,error:{code:'42501',message:'Perfil fictício inválido.'}};
  return enfileirar(async()=>{
   try {
    await db.exec('reset role;begin');
    await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id(perfis[perfil])]);
    await db.exec('set local role authenticated');
    let data;
    if(path==='/__admin_demo/contexto') {
     const marcas=(await db.query(`select m.id,m.id_legado,m.slug,m.nome,
      case when mm.papel='administrador' then '["gerenciar_eventos","publicar_eventos"]'::jsonb
      else coalesce(jsonb_agg(p.permissao) filter(where p.permissao is not null),'[]'::jsonb) end permissoes
      from public.membros_marca mm join public.marcas m on m.id=mm.marca_id
      left join public.permissoes_membro p on p.membro_id=mm.id
      where mm.usuario_id=auth.uid() and mm.ativo
      group by m.id,mm.id,mm.papel`)).rows;
     data={marcas};
    } else if(path==='/__admin_demo/eventos') {
     data=(await db.query(`select e.id,e.id_legado,e.slug,e.estado_publicacao,e.versao_publicada_id,
      case when v.id is null then null else jsonb_build_object('numero',v.numero,'conteudo',v.conteudo,'situacao',v.situacao) end versao
      from public.eventos e left join public.versoes_evento v on v.id=e.versao_publicada_id where e.marca_id=$1 order by e.id`,[query.get('marca')])).rows;
    } else if(path==='/__admin_demo/evento') {
     const evento=(await db.query(`select e.id,e.id_legado,e.slug,e.marca_id,e.local_id,e.estado_publicacao,e.versao_publicada_id,
      case when v.id is null then null else jsonb_build_object('numero',v.numero,'conteudo',v.conteudo,'situacao',v.situacao) end versao
      from public.eventos e left join public.versoes_evento v on v.id=e.versao_publicada_id where e.id=$1`,[query.get('id')])).rows[0];
     if(!evento) throw Object.assign(Error('Sem acesso.'),{code:'42501'});
     const rascunho=(await db.query('select conteudo,revisao,atualizado_em from public.rascunhos_evento where evento_id=$1',[evento.id])).rows[0]??null;
     data={evento,rascunho,conteudo:rascunho?.conteudo??evento.versao?.conteudo??{},revisao:rascunho?.revisao??0};
    } else if(path==='/__admin_demo/rpc') {
     const p=body.parametros;
     if(body.nome==='salvar_rascunho_evento') data=(await db.query('select public.salvar_rascunho_evento($1,$2,$3,$4) result',[p.p_evento,p.p_conteudo,p.p_revisao,p.p_chave])).rows[0].result;
     else if(body.nome==='publicar_evento') data=(await db.query('select public.publicar_evento($1,$2,$3) result',[p.p_evento,p.p_revisao,p.p_chave])).rows[0].result;
     else if(body.nome==='alterar_situacao_evento') data=(await db.query('select public.alterar_situacao_evento($1,$2,$3,$4) result',[p.p_evento,p.p_situacao,p.p_versao,p.p_chave])).rows[0].result;
     else throw Object.assign(Error('Operação de demonstração inválida.'),{code:'22023'});
    } else throw Object.assign(Error('Recurso de demonstração inexistente.'),{code:'22023'});
    await db.exec('commit;reset role');
    return {status:200,data};
   } catch(error) {
    await db.exec('rollback;reset role');
    return {status:400,error:{code:error.code??'LOCAL',message:error.message}};
   }
  });
 }
 return {executar,fechar:()=>enfileirar(()=>db.close())};
}
