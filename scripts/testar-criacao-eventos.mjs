import {test,before,after,beforeEach,afterEach} from 'node:test';import assert from 'node:assert/strict';
import {criarBancoAdministrativo,id} from './fixtures/bancoAdministrativo.mjs';import fs from 'node:fs';
let db;
const content=()=>({titulo:'Forró de estreia',data:'2026-12-20',horario:'22:00',dataTermino:'2026-12-21',horarioTermino:'02:00',terminoEstimado:false,ativo:true,lineup:{bandas:['Trio fictício'],djs:[]}});
async function as(n=1,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?id(n):'']);await db.exec('set role '+role);}
async function rpc(name,args){return(await db.query('select public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') result',args)).rows[0].result;}
const create=(c=content(),key=id(9701),brand=id(101),venue=id(201))=>rpc('criar_evento_rascunho',[brand,venue,c,key]);
async function owner(sql,args=[]){await db.exec('reset role');return db.query(sql,args);}
async function denied(fn,pattern){await db.exec('savepoint expected');try{await assert.rejects(fn,pattern);}finally{await db.exec('rollback to savepoint expected;release savepoint expected');}}
before(async()=>{db=await criarBancoAdministrativo();});beforeEach(async()=>{await db.exec('reset role;begin');await as();});afterEach(async()=>{await db.exec('rollback;reset role');});after(async()=>{await db.close();});
test('global administrator creates an edition without any producer membership in that brand',async()=>{
 await as(6);const result=await create(content(),id(9701),id(102));assert.ok(result.evento_id);assert.equal(result.marca_id,id(102));assert.equal(result.revisao,1);
 assert.equal((await owner('select count(*)::int n from public.membros_marca where usuario_id=$1',[id(6)])).rows[0].n,0);
});
test('event editors may create only in their brand; publishers, list viewers and anon may not',async()=>{
 for(const n of [3,4,5,8]){await as(n);await denied(()=>create(),/sem_permissao/);}
 await as(2);await denied(()=>create(content(),id(9701),id(102)),/sem_permissao/);assert.ok((await create()).evento_id);
 await as(null,'anon');await denied(()=>create(),/permission denied/);
});
test('creation generates immutable compatible identities and only a hidden initial draft, no public version/outbox',async()=>{
 const result=await create();assert.match(result.id_legado,/^evt-[0-9a-f-]{36}$/);assert.match(result.slug,/^forro-de-estreia-2026-12-20-[0-9a-f]{32}$/);
 assert.equal(result.conteudo.id,result.id_legado);assert.equal(result.conteudo.slug,result.slug);assert.equal(result.conteudo.marcaId,'mrc-a');assert.equal(result.conteudo.localId,'loc-a');
 const e=(await owner('select estado_publicacao,versao_publicada_id from public.eventos where id=$1',[result.evento_id])).rows[0];assert.deepEqual(e,{estado_publicacao:'rascunho',versao_publicada_id:null});
 assert.equal((await owner('select count(*)::int n from public.versoes_evento where evento_id=$1',[result.evento_id])).rows[0].n,0);
 assert.equal((await owner('select count(*)::int n from app_private.outbox_publicacoes where evento_id=$1',[result.evento_id])).rows[0].n,0);
 await as(null,'anon');assert.deepEqual((await db.query('select id from public.eventos where id=$1',[result.evento_id])).rows,[]);
 await denied(()=>db.query('select * from public.rascunhos_evento where evento_id=$1',[result.evento_id]),/permission denied/);
});
test('creation replay is stable; same key with different content fails and same titles get distinct slugs',async()=>{
 const c=content(),first=await create(c);assert.deepEqual(await create(c),first);
 await denied(()=>create({...c,titulo:'Outro'}),/chave_idempotencia_reutilizada/);
 const second=await create(c,id(9702));assert.notEqual(second.slug,first.slug);assert.notEqual(second.id_legado,first.id_legado);
 assert.equal((await owner("select count(*)::int n from public.auditoria_administrativa where acao='criar_evento'")).rows[0].n,2);
});
test('new editions require explicit confirmed end, reject missing/estimated/string confirmation and impossible dates',async()=>{
 for(const delta of [{horarioTermino:''},{dataTermino:'2026-12-20',horarioTermino:'21:00'},{data:'2026-02-30'},{terminoEstimado:true},{terminoEstimado:'false'},{terminoEstimado:null}])
  await denied(()=>create({...content(),...delta}),/horarios_confirmados|inicio_e_termino|termino_anterior|date\/time|date field|out of range/);
});
test('inactive or identity-less brands/venues cannot create an edition',async()=>{
 await owner('update public.locais set ativo=false where id=$1',[id(201)]);await as();await denied(()=>create(),/marca_ou_local_indisponivel/);
 await owner('update public.locais set ativo=true,id_legado=null where id=$1',[id(201)]);await as();await denied(()=>create(),/marca_ou_local_indisponivel/);
 await owner("update public.locais set id_legado='loc-a'");await owner('update public.marcas set ativo=false where id=$1',[id(101)]);await as();await denied(()=>create(),/marca_ou_local_indisponivel/);
});
test('client cannot choose identities, public status or internal publication metadata',async()=>{
 for(const field of ['id','slug','marcaId','localId','situacao','estado_publicacao','publicado_por'])
  await denied(()=>create({...content(),[field]:'forged'}),/campo_nao_editavel/);
});
test('image is optional and only credential-free HTTPS URLs are accepted for new events',async()=>{
 for(const image of ['javascript:alert(1)','http://example.test/a.jpg','https://user:secret@example.test/a.jpg','https://example.test/a\nb',null,{}])
  await denied(()=>create({...content(),imagemUrl:image}),/imagem_https_obrigatoria/);
 assert.equal((await create({...content(),imagemUrl:'https://example.test/a.jpg'})).conteudo.imagemUrl,'https://example.test/a.jpg');
});
test('first publication and subsequent edits preserve generated IDs/slugs and create version one only explicitly',async()=>{
 const result=await create();await as(3);const published=await rpc('publicar_evento',[result.evento_id,1,id(9703)]);assert.equal(published.numero,1);
 await as(null,'anon');const version=(await db.query('select conteudo from public.versoes_evento where evento_id=$1',[result.evento_id])).rows[0].conteudo;
 assert.equal(version.id,result.id_legado);assert.equal(version.slug,result.slug);assert.equal(version.terminoEstimado,false);
});
test('revoked authority blocks replay and audit failure rolls back event/draft/idempotency together',async()=>{
 await as(2);const c=content();await create(c);await owner('update public.membros_marca set ativo=false where usuario_id=$1',[id(2)]);await as(2);await denied(()=>create(c),/sem_permissao/);
 await owner("create function app_private.qa_fail_create() returns trigger language plpgsql as $$begin raise exception 'qa_create_failed';end$$");
 await owner("create trigger qa_fail_create before insert on public.auditoria_administrativa for each row when(new.acao='criar_evento') execute function app_private.qa_fail_create()");
 const before=(await owner('select count(*)::int n from public.eventos')).rows[0].n;await as();await denied(()=>create(c,id(9702)),/qa_create_failed/);
 assert.equal((await owner('select count(*)::int n from public.eventos')).rows[0].n,before);
 assert.equal((await owner('select count(*)::int n from app_private.operacoes_administrativas where chave=$1',[id(9702)])).rows[0].n,0);
});
test('new creation does not modify existing profile/favorite/ticket records or previous event identity',async()=>{
 const before=(await owner('select to_jsonb(e) value from public.eventos e where id=$1',[id(301)])).rows[0];await as();await create();
 assert.deepEqual((await owner('select to_jsonb(e) value from public.eventos e where id=$1',[id(301)])).rows[0],before);
 assert.equal((await owner("select count(*)::int n from public.interacoes where id='favorite-preserved'")).rows[0].n,1);
 assert.equal((await owner("select count(*)::int n from public.ingressos where id='ticket-preserved'")).rows[0].n,1);
});
test('incident pause also disables event creation without changing public catalog reads',async()=>{
 await owner('select 1');await db.exec(fs.readFileSync(new URL('../supabase/liberacao/pausar_administracao.sql',import.meta.url),'utf8').replace('\nbegin;','').replace('\ncommit;',''));
 await as();await denied(()=>create(),/permission denied/);await as(null,'anon');assert.equal((await db.query('select count(*)::int n from public.eventos')).rows[0].n,1);
});
