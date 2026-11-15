import {test,before,after,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {criarBancoAdministrativo,id} from './fixtures/bancoAdministrativo.mjs';
let db,list;
async function as(n=1,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?id(n):'']);await db.exec('set role '+role);}
async function rpc(name,args=[]){return(await db.query('select public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') result',args)).rows[0].result;}
async function owner(sql,args=[]){await db.exec('reset role');return db.query(sql,args);}
async function denied(fn,pattern){await db.exec('savepoint expected');try{await assert.rejects(fn,pattern);}finally{await db.exec('rollback to savepoint expected;release savepoint expected');}}
const save=(name='Maria',companions=['João'],rev=0,key=id(9100),terms=true)=>rpc('salvar_inscricao_vip',[list,name,companions,terms,rev,key]);
const mine=()=>rpc('consultar_minha_inscricao_vip',[list]);
const groups=()=>rpc('consultar_grupos_vip',[list]);
const close=async()=>{await as();return rpc('encerrar_lista_vip',[list,1,id(9200)]);};
async function version(state,number){await owner('insert into public.versoes_evento(id,evento_id,numero,conteudo,situacao) select $1,evento_id,$2,conteudo,$3 from public.versoes_evento where id=$4',[id(450+number),number,state,id(401)]);await owner('update public.eventos set versao_publicada_id=$1 where id=$2',[id(450+number),id(301)]);}
before(async()=>{db=await criarBancoAdministrativo();});
beforeEach(async()=>{await db.exec('reset role;begin');await as();const now=Date.now();list=(await rpc('criar_lista_vip',[id(301),'VIP Teste','Desconto até 23h',new Date(now+3600000).toISOString(),new Date(now).toISOString(),new Date(now+7200000).toISOString(),10,id(9001)])).lista_id;});
afterEach(async()=>{await db.exec('rollback;reset role');});after(async()=>{await db.close();});
test('registration is authenticated, self-only, terms-required and rejects anonymous sign-in users',async()=>{
 await as(null,'anon');await denied(()=>save(),/permission denied/);
 await owner('update auth.users set is_anonymous=true where id=$1',[id(4)]);await as(4);await denied(()=>save(),/autenticacao_obrigatoria/);
 await owner('update auth.users set is_anonymous=false where id=$1',[id(4)]);await as(4);await denied(()=>save('Maria',[],0,id(9100),false),/termos_ou_acompanhantes/);
 const result=await save();assert.ok(result.inscricao_id);assert.equal(result.revisao,1);
});
test('exact replay and competing initial revision produce one group and one audit',async()=>{
 await as(4);const result=await save();assert.deepEqual(await save(),result);
 await denied(()=>save('Outra pessoa',[],0,id(9101)),/conflito_revisao/);
 assert.equal((await owner('select count(*)::int n from public.inscricoes_vip')).rows[0].n,1);
 assert.equal((await owner("select count(*)::int n from app_private.auditoria_listas_vip where acao='salvar_inscricao'")).rows[0].n,1);
});
test('owner RLS hides all other groups even from producer direct table reads',async()=>{
 await as(4);await save();await as(7);await save('Pedro',[],0,id(9102));
 assert.equal((await mine()).nome,'Pedro');assert.equal((await db.query('select count(*)::int n from public.inscricoes_vip')).rows[0].n,1);
 await as();assert.deepEqual((await db.query('select * from public.inscricoes_vip')).rows,[]);
 await as(null,'anon');await denied(()=>db.query('select * from public.inscricoes_vip'),/permission denied/);
});
test('owners can update, cancel and rejoin while open with monotonic revision and preserved audit',async()=>{
 await as(4);const first=await save();await save('Maria Nova',[],1,id(9101));
 const canceled=await rpc('cancelar_inscricao_vip',[list,2,id(9102)]);assert.equal(canceled.revisao,3);assert.equal((await mine()).ativa,false);
 const rejoined=await save('Maria Outra',['Ana'],3,id(9103));assert.equal(rejoined.inscricao_id,first.inscricao_id);assert.equal(rejoined.revisao,4);
 assert.equal((await mine()).ativa,true);
 const audit=(await owner("select antes,depois from app_private.auditoria_listas_vip where acao='cancelar_inscricao'")).rows[0];assert.equal(audit.antes.ativa,true);assert.equal(audit.depois.ativa,false);
});
test('individual mode, ten companions, whitespace and invalid/control-character names are enforced',async()=>{
 await as(4);await save(' Maria ',Array.from({length:10},(_,i)=>'Pessoa '+i));assert.equal((await mine()).nome,'Maria');
 for(const [name,comp] of [['Maria',Array(11).fill('Pessoa')],[' ',[]],['Maria\n1. Forjado',[]],['Maria',[null]],['Maria',[' ']]])
  await denied(()=>save(name,comp,1,id(9101)),/nomes_invalidos/);
 await owner('update public.listas_vip set max_acompanhantes=0');await as(7);await denied(()=>save(),/termos_ou_acompanhantes/);assert.ok((await save('Pedro',[])).inscricao_id);
});
test('deadline blocks owner updates/cancellation without cron; failed transaction cannot bypass it',async()=>{
 await as(4);await save();await owner("update public.listas_vip set prazo_inscricao=clock_timestamp()-interval '1 second'");await as(4);
 await denied(()=>save('Changed',[],1,id(9101)),/lista_nao_aberta/);await denied(()=>rpc('cancelar_inscricao_vip',[list,1,id(9102)]),/lista_nao_aberta/);
 assert.equal((await mine()).nome,'Maria');
});
test('only list-authorized producers see groups and duplicate flags; owners never receive flags',async()=>{
 await as(4);await save('Maria',[' maria ']);await as(7);await save('João',[],0,id(9102));
 assert.equal((await mine()).duplicados,undefined);for(const user of [2,3,4,5]){await as(user);await denied(()=>groups(),/sem_permissao/);}
 await as(8);const data=await groups();assert.equal(data.grupos.length,2);assert.deepEqual(data.duplicados,['maria']);
 await denied(()=>rpc('corrigir_inscricao_vip',[data.grupos[0].id,'Correção',['Outra'],1,id(9190)]),/sem_permissao/);
});
test('full-list export is forbidden before closure at the server, including suspended lists',async()=>{
 await as();await denied(()=>rpc('exportar_lista_vip',[list]),/exportacao_somente_apos_fechamento/);
 await version('adiado',2);await as();await denied(()=>rpc('exportar_lista_vip',[list]),/exportacao_somente_apos_fechamento/);
});
test('closed-list correction changes names only, requires CAS and preserves exact participant count',async()=>{
 await as(4);const result=await save();await as();await denied(()=>rpc('corrigir_inscricao_vip',[result.inscricao_id,'Nova',['Ana'],1,id(9101)]),/correcao_somente_apos_fechamento/);
 await close();await as();for(const comp of [[],['Ana','Bia']])await denied(()=>rpc('corrigir_inscricao_vip',[result.inscricao_id,'Nova',comp,1,id(9101)]),/quantidade_imutavel/);
 await denied(()=>rpc('corrigir_inscricao_vip',[result.inscricao_id,'Nova',['Ana'],9,id(9101)]),/conflito_revisao/);
 const corrected=await rpc('corrigir_inscricao_vip',[result.inscricao_id,'Maria Corrigida',['Ana'],1,id(9101)]);assert.equal(corrected.revisao,2);
 const audit=(await owner("select antes,depois from app_private.auditoria_listas_vip where acao='corrigir_nomes'")).rows[0];assert.equal(audit.antes.nome,'Maria');assert.equal(audit.depois.nome,'Maria Corrigida');
});
test('closed text export numbers groups/letters, totals people and never includes photos, ids or CSV',async()=>{
 await as(4);await save();await as(7);await save('Pedro',[],0,id(9102));await close();await as(8);
 const text=await rpc('exportar_lista_vip',[list]);assert.match(text,/1\. Maria\n   A\. João/);assert.match(text,/2\. Pedro/);assert.match(text,/Total de pessoas: 3$/);assert.doesNotMatch(text,/avatar|https:|00000000/);
});
test('manual closure blocks new groups, cancellations and reactivation while preserving existing groups',async()=>{
 await as(4);await save();await close();await as(4);await denied(()=>rpc('cancelar_inscricao_vip',[list,1,id(9102)]),/lista_nao_aberta/);
 await as(7);await denied(()=>save(),/lista_nao_aberta/);await as();assert.equal((await groups()).grupos.length,1);
});
test('postponement requires explicit current-version new-date confirmation; new publication invalidates it',async()=>{
 await version('adiado',2);await as(4);await denied(()=>save(),/lista_nao_aberta/);
 await as();await denied(()=>rpc('confirmar_data_lista_vip',[list,id(401),1,id(9300)]),/conflito_data_ou_revisao/);
 await rpc('confirmar_data_lista_vip',[list,id(452),1,id(9301)]);await as(4);await save();
 await version('adiado',3);await as(7);await denied(()=>save(),/lista_nao_aberta/);
});
test('cancellation closes permanently and preserves groups across subsequent event confirmation',async()=>{
 await as(4);await save();await version('cancelado',2);await version('confirmado',3);await as(7);await denied(()=>save(),/lista_nao_aberta/);
 await as();assert.equal((await groups()).grupos.length,1);assert.match(await rpc('exportar_lista_vip',[list]),/Maria/);
});
test('revoked producer loses group access and cannot replay a successful correction',async()=>{
 await as(4);const result=await save();await close();await as();await rpc('corrigir_inscricao_vip',[result.inscricao_id,'Nova',['Ana'],1,id(9101)]);
 await owner('update public.membros_marca set ativo=false where usuario_id=$1',[id(1)]);await as();await denied(()=>groups(),/sem_permissao/);
 await denied(()=>rpc('corrigir_inscricao_vip',[result.inscricao_id,'Nova',['Ana'],1,id(9101)]),/sem_permissao/);
});
test('registrations do not migrate to another edition, and membership metadata cannot grant list access',async()=>{
 await as(4);await save();await db.query("select set_config('request.jwt.claims',$1,false)",['{"user_metadata":{"papel":"administrador"}}']);
 await denied(()=>groups(),/sem_permissao/);assert.deepEqual(await rpc('consultar_gestao_listas_vip'),[]);
 assert.equal((await db.query('select count(*)::int n from public.inscricoes_vip where lista_id<>$1',[list])).rows[0].n,0);
});
test('direct writes and forged target owner are impossible; public event lookup returns metadata only',async()=>{
 await as(4);await save();await denied(()=>db.query('update public.inscricoes_vip set usuario_id=$1',[id(7)]),/permission denied/);
 await denied(()=>db.query('delete from public.inscricoes_vip'),/permission denied/);
 await as(null,'anon');const metadata=await rpc('consultar_lista_vip_evento',['evt-test']);assert.equal(metadata.id,list);assert.equal(metadata.nome,undefined);
 assert.equal(await rpc('consultar_lista_vip_evento',['evt-missing']),null);
});
test('audit failure rolls back registration and prevents partial identity/person creation',async()=>{
 await owner("create function app_private.qa_fail_vip_group() returns trigger language plpgsql as $$begin raise exception 'qa_audit_failed';end$$");
 await owner("create trigger qa_fail_vip_group before insert on app_private.auditoria_listas_vip for each row when (new.acao='salvar_inscricao') execute function app_private.qa_fail_vip_group()");
 await as(4);await denied(()=>save(),/qa_audit_failed/);assert.equal(await mine(),null);
 assert.equal((await owner("select count(*)::int n from app_private.operacoes_administrativas where operacao='salvar_inscricao_vip'")).rows[0].n,0);
});
