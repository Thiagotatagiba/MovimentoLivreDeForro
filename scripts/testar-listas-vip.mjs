import {test,before,after,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {criarBancoAdministrativo,id} from './fixtures/bancoAdministrativo.mjs';
let db;
async function as(n=1,role='authenticated'){
 await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?id(n):'']);await db.exec('set role '+role);
}
async function owner(sql,args=[]){await db.exec('reset role');return db.query(sql,args);}
const args=()=>[id(301),' Lista VIP ',' Entrada com desconto até 23h ',new Date(Date.now()+3600000).toISOString(),
 new Date(Date.now()+1800000).toISOString(),new Date(Date.now()+7200000).toISOString(),2,id(9001)];
async function create(values=args()){return(await db.query('select public.criar_lista_vip($1,$2,$3,$4,$5,$6,$7,$8) result',values)).rows[0].result;}
const read=async list=>(await db.query('select public.consultar_lista_vip($1) result',[list])).rows[0].result;
const close=async(list,revision=1,key=id(9002))=>(await db.query('select public.encerrar_lista_vip($1,$2,$3) result',[list,revision,key])).rows[0].result;
async function denied(fn,pattern){await db.exec('savepoint expected');try{await assert.rejects(fn,pattern);}finally{await db.exec('rollback to savepoint expected;release savepoint expected');}}
before(async()=>{db=await criarBancoAdministrativo();});
beforeEach(async()=>{await db.exec('reset role;begin');await as();});
afterEach(async()=>{await db.exec('rollback;reset role');});
after(async()=>{await db.close();});

test('VIP configuration requires list management, not event editing/publishing or another brand',async()=>{
 for(const n of [2,3,5,8]){await as(n);await denied(()=>create(),/sem_permissao/);}
 await as();assert.ok((await create()).lista_id);
});
test('explicit list manager can create configurations independently of event publishing',async()=>{
 await owner("insert into public.permissoes_membro values($1,'gerenciar_listas')",[id(502)]);await as(2);assert.ok((await create()).lista_id);
});
test('global administrator can create configurations through the same audited RPC',async()=>{
 await as(6);assert.ok((await create()).lista_id);
});
test('anonymous cannot write VIP tables or invoke management; private audit is inaccessible',async()=>{
 const l=await create();await as(null,'anon');await denied(()=>create(),/permission denied/);
 await denied(()=>db.query('update public.listas_vip set titulo=$1 where id=$2',['changed',l.lista_id]),/permission denied/);
 await denied(()=>db.query('select * from app_private.auditoria_listas_vip'),/permission denied/);
});
test('required terms, finite deadlines, benefit validity and companion bound are enforced',async()=>{
 for(const [index,value] of [[1,' '],[2,''],[3,new Date(Date.now()-1000).toISOString()],[3,'infinity'],[4,null],[5,args()[4]],[6,-1],[6,11],[6,null]]){
  const a=args();a[index]=value;await denied(()=>create(a),/lista_invalida/);
 }
});
test('creation is idempotent, trims metadata, audits once and fixes one list per edition',async()=>{
 const a=args(),first=await create(a);assert.deepEqual(await create(a),first);
 assert.equal((await read(first.lista_id)).titulo,'Lista VIP');
 const changed=[...a];changed[1]='changed';await denied(()=>create(changed),/chave_idempotencia_reutilizada/);
 const duplicate=[...a];duplicate[7]=id(9010);await denied(()=>create(duplicate),/lista_da_edicao_existente/);
 assert.equal((await owner('select count(*)::int n from app_private.auditoria_listas_vip')).rows[0].n,1);
});
test('public reads expose only benefit metadata; hidden/inactive event relations fail closed',async()=>{
 const l=await create();await as(null,'anon');const visible=await read(l.lista_id);
 assert.equal(visible.estado,'aberta');assert.deepEqual(Object.keys(visible).sort(),['id','evento_id','titulo','termos','prazo_inscricao','beneficio_inicio','beneficio_fim','max_acompanhantes','revisao','estado'].sort());
 for(const [sql,undo] of [["update public.marcas set ativo=false where id='"+id(101)+"'","update public.marcas set ativo=true"],
  ['update public.locais set ativo=false','update public.locais set ativo=true'],
  ["update public.eventos set estado_publicacao='arquivado' where id='"+id(301)+"'","update public.eventos set estado_publicacao='publicado' where id='"+id(301)+"'"]]){
  await owner(sql);await as(null,'anon');assert.equal(await read(l.lista_id),null);await owner(undo);
 }
});
test('server deadline closes reads without a cron job; manual closure after deadline is rejected',async()=>{
 const l=await create();await owner("update public.listas_vip set prazo_inscricao=clock_timestamp()-interval '1 second'");
 await as(null,'anon');assert.equal((await read(l.lista_id)).estado,'encerrada');
 await as();await denied(()=>close(l.lista_id),/lista_encerrada/);
});
test('manual close uses revision CAS, audits before/after and safely replays exact request',async()=>{
 const l=await create();await denied(()=>close(l.lista_id,9),/conflito_revisao/);
 const result=await close(l.lista_id);assert.equal(result.revisao,2);assert.deepEqual(await close(l.lista_id),result);
 assert.equal((await read(l.lista_id)).estado,'encerrada');await denied(()=>close(l.lista_id,2,id(9003)),/lista_encerrada/);
 const audit=(await owner("select antes,depois from app_private.auditoria_listas_vip where acao='encerrar'")).rows[0];
 assert.equal(audit.antes.encerrada_em,null);assert.equal(audit.depois.motivo_encerramento,'manual');
});
test('authority is revalidated even for a previous successful management request',async()=>{
 const a=args();await create(a);await owner('update public.membros_marca set ativo=false where usuario_id=$1',[id(1)]);
 await as();await denied(()=>create(a),/sem_permissao/);
});
async function version(situation,number){
 await owner(`insert into public.versoes_evento(id,evento_id,numero,conteudo,situacao)
 select $1,evento_id,$2,conteudo,$3 from public.versoes_evento where id=$4`,[id(410+number),number,situation,id(401)]);
 await owner('update public.eventos set versao_publicada_id=$1 where id=$2',[id(410+number),id(301)]);
}
test('cancellation permanently closes and audits the list even after event confirmation',async()=>{
 const l=await create();await version('cancelado',2);await as(null,'anon');assert.equal((await read(l.lista_id)).estado,'encerrada');
 await version('confirmado',3);await as(null,'anon');assert.equal((await read(l.lista_id)).estado,'encerrada');
 assert.equal((await owner("select count(*)::int n from app_private.auditoria_listas_vip where origem='evento'")).rows[0].n,1);
});
test('interruption permanently closes while postponement only suspends configuration',async()=>{
 const l=await create();await version('adiado',2);await as(null,'anon');assert.equal((await read(l.lista_id)).estado,'suspensa');
 await version('confirmado',3);await as(null,'anon');assert.equal((await read(l.lista_id)).estado,'aberta');
 await version('interrompido',4);await as(null,'anon');assert.equal((await read(l.lista_id)).estado,'encerrada');
});
test('creating lists on inactive or unpublished events is refused without side effects',async()=>{
 await owner("update public.eventos set estado_publicacao='rascunho' where id=$1",[id(301)]);await as();
 await denied(()=>create(),/evento_indisponivel/);
 assert.equal((await owner('select count(*)::int n from public.listas_vip')).rows[0].n,0);
});
test('failure to record audit rolls back configuration and idempotency atomically',async()=>{
 await owner("create function app_private.qa_fail_vip() returns trigger language plpgsql as $$begin raise exception 'qa_failure';end$$");
 await owner('create trigger qa_fail_vip before insert on app_private.auditoria_listas_vip for each row execute function app_private.qa_fail_vip()');
 await as();await denied(()=>create(),/qa_failure/);
 assert.equal((await owner('select count(*)::int n from public.listas_vip')).rows[0].n,0);
 assert.equal((await owner("select count(*)::int n from app_private.operacoes_administrativas where operacao='criar_lista_vip'")).rows[0].n,0);
});
test('a public event in another brand cannot make a hidden list visible',async()=>{
 const l=await create();
 await owner('insert into public.versoes_evento(id,evento_id,numero,conteudo) select $1,$2,1,conteudo from public.versoes_evento where id=$3',[id(499),id(302),id(401)]);
 await owner("update public.eventos set versao_publicada_id=$1,estado_publicacao='publicado' where id=$2",[id(499),id(302)]);
 await owner("update public.eventos set estado_publicacao='arquivado' where id=$1",[id(301)]);
 await as(null,'anon');assert.equal(await read(l.lista_id),null);
 assert.deepEqual((await db.query('select id from public.listas_vip')).rows,[]);
});
