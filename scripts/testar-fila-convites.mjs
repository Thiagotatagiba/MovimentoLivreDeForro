import {test,before,after,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {criarBancoAdministrativo,id} from './fixtures/bancoAdministrativo.mjs';
import {montarMensagem,processarFila} from '../supabase/functions/enviar-convites/worker.mjs';
let db;
const token='de'.repeat(32),config={ativo:true,from:'Vai Ter Forro <convites@example.test>',appUrl:'https://app.example.test'};
async function as(n=1,role='authenticated'){
 await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?id(n):'']);
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role})]);await db.exec('set role '+role);
}
async function create(){await as();return(await db.query('select public.criar_convite_marca($1,$2,$3,$4,$5,$6) result',
 [id(101),'destino@example.test','equipe',['gerenciar_eventos'],token,id(8001)])).rows[0].result;}
async function api(name,p={}){
 await as(null,'service_role');
 const args={limpar_entregas_convites:[],reservar_entrega_convite:[],iniciar_entrega_convite:[p.p_outbox,p.p_reserva,p.p_payload],
  finalizar_entrega_convite:[p.p_outbox,p.p_reserva,p.p_resultado,p.p_provedor_id,p.p_codigo]}[name];
 assert.ok(args);return(await db.query('select public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') result',args)).rows[0].result;
}
const reserve=()=>api('reservar_entrega_convite');
const start=job=>api('iniciar_entrega_convite',{p_outbox:job.outbox_id,p_reserva:job.reserva_id,p_payload:montarMensagem(job,config)});
const finish=(job,result='enviado',provider='msg_test',code=null)=>api('finalizar_entrega_convite',{
 p_outbox:job.outbox_id,p_reserva:job.reserva_id,p_resultado:result,p_provedor_id:provider,p_codigo:code});
async function owner(sql,args=[]){await db.exec('reset role');return db.query(sql,args);}
async function denied(sql,args,pattern){await db.exec('savepoint expected');try{await assert.rejects(db.query(sql,args),pattern);}finally{await db.exec('rollback to savepoint expected;release savepoint expected');}}
before(async()=>{db=await criarBancoAdministrativo();});
beforeEach(async()=>{await db.exec('reset role;begin');});
afterEach(async()=>{await db.exec('rollback;reset role');});
after(async()=>{await db.close();});

test('worker RPCs reject anon, authenticated and a forged role claim without service grants',async()=>{
 for(const role of ['anon','authenticated']){await as(1,role);
  await db.query("select set_config('request.jwt.claims',$1,false)",['{"role":"service_role"}']);
  await denied('select public.reservar_entrega_convite()',[],/permission denied/);
 }
 await as(null,'service_role');await db.query("select set_config('request.jwt.claims','{}',false)");
 await denied('select public.reservar_entrega_convite()',[],/servico_obrigatorio/);
});

test('claim reserves one job, increments attempts and prevents a second live lease',async()=>{
 await create();const job=await reserve();assert.ok(job.reserva_id);assert.equal(job.token,token);
 assert.equal(await reserve(),null);
 const row=(await owner('select tentativas,reservado_ate>now() as leased from app_private.outbox_convites')).rows[0];
 assert.equal(row.tentativas,1);assert.equal(row.leased,true);
});

test('first send freezes exact payload; retries ignore sender/template changes',async()=>{
 await create();const job=await reserve(),payload=await start(job);
 const repeated=await api('iniciar_entrega_convite',{p_outbox:job.outbox_id,p_reserva:job.reserva_id,p_payload:{from:'changed'}});
 assert.deepEqual(repeated,payload);assert.equal(payload.to[0],'destino@example.test');
 await finish(job,'transitorio',null,'http_503');await owner("update app_private.outbox_convites set proxima_tentativa_em=now()-interval '1 second'");
 const next=await reserve();assert.notEqual(next.reserva_id,job.reserva_id);assert.deepEqual(next.payload,payload);
});

test('wrong recipient payload is rejected before freezing or sending',async()=>{
 await create();const job=await reserve(),payload=montarMensagem(job,config);payload.to=['someone-else@example.test'];
 await as(null,'service_role');await denied('select public.iniciar_entrega_convite($1,$2,$3)',[job.outbox_id,job.reserva_id,payload],/mensagem_invalida/);
 assert.equal((await owner('select payload from app_private.outbox_convites')).rows[0].payload,null);
});

test('successful acknowledgement scrubs token and full email; exact replay is safe, changed replay is rejected',async()=>{
 await create();const job=await reserve();await start(job);assert.deepEqual(await finish(job),{registrado:true});
 assert.deepEqual(await finish(job),{registrado:true});
 await as(null,'service_role');await denied('select public.finalizar_entrega_convite($1,$2,$3,$4,$5)',[job.outbox_id,job.reserva_id,'enviado','different',null],/resultado_reutilizado/);
 const row=(await owner('select token,payload,processado_em is not null as sent,provedor_id from app_private.outbox_convites')).rows[0];
 assert.equal(row.token,null);assert.equal(row.payload,null);assert.equal(row.sent,true);assert.equal(row.provedor_id,'msg_test');
 assert.equal(await reserve(),null);
});

test('transient failure schedules backoff and retains the frozen body for the same provider key',async()=>{
 await create();const job=await reserve();await start(job);await finish(job,'transitorio',null,'sem_resposta');
 const row=(await owner('select token,payload,extract(epoch from proxima_tentativa_em-clock_timestamp()) delay,reserva_id from app_private.outbox_convites')).rows[0];
 assert.equal(row.token,token);assert.ok(row.payload);assert.ok(Number(row.delay)>55&&Number(row.delay)<=60);assert.equal(row.reserva_id,null);
 assert.equal(await reserve(),null);
});

test('expired lease is fenced: an old worker cannot acknowledge a new reservation',async()=>{
 await create();const old=await reserve();await start(old);await owner("update app_private.outbox_convites set reservado_ate=now()-interval '1 second'");
 const current=await reserve();assert.notEqual(old.reserva_id,current.reserva_id);
 assert.deepEqual(await finish(old),{registrado:false,reserva_expirada:true});
 assert.equal((await owner('select processado_em from app_private.outbox_convites')).rows[0].processado_em,null);
});

test('revocation scrubs frozen content and invalidates a claimed job before provider call',async()=>{
 const invitation=await create();const job=await reserve();await start(job);await as(1);
 await db.query('select public.revogar_convite_marca($1,$2)',[invitation.convite_id,id(8002)]);
 const row=(await owner('select token,payload,reserva_id from app_private.outbox_convites')).rows[0];
 assert.equal(row.token,null);assert.equal(row.payload,null);assert.equal(row.reserva_id,null);
 await as(null,'service_role');await denied('select public.iniciar_entrega_convite($1,$2,$3)',[job.outbox_id,job.reserva_id,montarMensagem(job,config)],e=>e.code==='PT409');
});

test('authority revoked after reservation cancels delivery on final revalidation',async()=>{
 await create();const job=await reserve();await owner('update public.membros_marca set ativo=false where usuario_id=$1',[id(1)]);
 assert.equal(await start(job),null);
 assert.equal((await owner('select token from app_private.outbox_convites')).rows[0].token,null);
});

test('cleanup expires stale invitations and removes raw tokens without an email provider',async()=>{
 await create();await owner("update public.convites_marca set expira_em=now()-interval '1 second'");
 const result=await api('limpar_entregas_convites');assert.equal(result.expirados,1);assert.equal(result.cancelados,1);
 assert.equal((await owner('select estado from public.convites_marca')).rows[0].estado,'expirado');
 assert.equal((await owner('select token from app_private.outbox_convites')).rows[0].token,null);
});

test('23-hour safety boundary prevents replay outside provider dedupe window',async()=>{
 await create();const job=await reserve();await start(job);
 await owner("update app_private.outbox_convites set primeira_tentativa_em=now()-interval '24 hours',reservado_ate=now()-interval '1 second'");
 const result=await api('limpar_entregas_convites');assert.equal(result.limite_seguro,1);
 assert.equal(await reserve(),null);assert.equal((await owner('select token from app_private.outbox_convites')).rows[0].token,null);
});

test('permanent failure scrubs secrets and stops processing',async()=>{
 await create();const job=await reserve();await start(job);await finish(job,'permanente',null,'http_422');
 assert.equal(await reserve(),null);const row=(await owner('select token,payload,falhou_em is not null as failed from app_private.outbox_convites')).rows[0];
 assert.deepEqual(row,{token:null,payload:null,failed:true});
});

test('fifth transient attempt becomes terminal rather than scheduling another provider request',async()=>{
 await create();
 for(let i=1;i<=5;i++){
  const job=await reserve();assert.ok(job);await start(job);await finish(job,'transitorio',null,'http_503');
  if(i<5)await owner("update app_private.outbox_convites set proxima_tentativa_em=now()-interval '1 second'");
 }
 assert.equal(await reserve(),null);
 const row=(await owner('select tentativas,token,payload,falhou_em is not null as failed from app_private.outbox_convites')).rows[0];
 assert.deepEqual(row,{tentativas:5,token:null,payload:null,failed:true});
});

test('recipient acceptance also removes a frozen delivery body and closes its operational attempt',async()=>{
 const invitation=await create(),job=await reserve();await start(job);
 await owner("update auth.users set email='destino@example.test',email_confirmed_at=now() where id=$1",[id(4)]);
 await as(4);await db.query('select public.aceitar_convite_marca($1,$2,$3)',[invitation.convite_id,token,id(8002)]);
 const row=(await owner('select token,payload,reserva_id from app_private.outbox_convites')).rows[0];
 assert.deepEqual(row,{token:null,payload:null,reserva_id:null});
 assert.equal((await owner('select resultado from app_private.execucoes_convites')).rows[0].resultado,'cancelado');
});

test('ambiguous acknowledgement recovers with exactly the same frozen provider request',async()=>{
 await create();const deliveries=new Map(),requests=[];
 const send=async(payload,outbox)=>{requests.push({payload,outbox});if(!deliveries.has(outbox))deliveries.set(outbox,'deduped');
  return {resultado:'enviado',provedorId:'deduped',codigo:null};};
 const brokenApi=async(name,p)=>{if(name==='finalizar_entrega_convite')throw Error('lost acknowledgement');return api(name,p);};
 await assert.rejects(processarFila({config,api:brokenApi,enviar:send}),/lost acknowledgement/);
 await owner("update app_private.outbox_convites set reservado_ate=now()-interval '1 second'");
 const result=await processarFila({config,api,enviar:send});assert.equal(result.enviados,1);
 assert.equal(deliveries.size,1);assert.equal(requests.length,2);assert.deepEqual(requests[0],requests[1]);
});
