import {test,before,after,beforeEach,afterEach} from 'node:test';import assert from 'node:assert/strict';
import {criarBancoAdministrativo,id} from './fixtures/bancoAdministrativo.mjs';
let db;
const local=()=>({nome:'Espaço fictício novo',endereco:{logradouro:'Rua de teste',numero:'10',bairro:'Centro',cidade:'Vitória',estado:'ES'},latitude:-20.3,longitude:-40.3,tipo:'Espaço cultural'});
const marca=()=>({nome:'Marca fictícia nova',localPadraoId:id(201),categorias:['Baile'],diasSemana:['sábado'],instagram:'https://instagram.com/teste'});
async function as(n=6,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?id(n):'']);await db.exec('set role '+role);}
async function owner(sql,args=[]){await db.exec('reset role');return db.query(sql,args);}
async function call(tipo,c,key=id(9901)){return(await db.query('select public.criar_'+tipo+'_catalogo($1,$2) result',[c,key])).rows[0].result;}
async function denied(fn,re){await db.exec('savepoint expected');try{await assert.rejects(fn,re);}finally{await db.exec('rollback to savepoint expected;release savepoint expected');}}
before(async()=>{db=await criarBancoAdministrativo();});beforeEach(async()=>{await db.exec('reset role;begin');await as();});afterEach(async()=>{await db.exec('rollback;reset role');});after(async()=>{await db.close();});
test('only global can create official venues and brands, regardless of forged metadata',async()=>{
 for(const n of [1,2,3,4,5,8]){await as(n);await denied(()=>call('local',local()),/somente_administrador_global/);await denied(()=>call('marca',marca()),/somente_administrador_global/);}
 await as(null,'anon');await denied(()=>call('local',local()),/permission denied/);
});
test('creation generates compatible identities and audit without granting team access or creating events',async()=>{
 const l=await call('local',local());const m=await call('marca',{...marca(),localPadraoId:l.id},id(9902));
 assert.match(l.id_legado,/^loc-[\da-f-]{36}$/);assert.match(m.id_legado,/^mrc-[\da-f-]{36}$/);assert.match(m.slug,/^marca-ficticia-nova-/);
 const row=(await owner('select local_padrao_id from public.marcas where id=$1',[m.id])).rows[0];assert.equal(row.local_padrao_id,l.id);
 assert.equal((await owner('select count(*)::int n from public.auditoria_catalogo')).rows[0].n,2);
 assert.equal((await owner('select count(*)::int n from public.membros_marca')).rows[0].n,5);
 assert.equal((await owner('select count(*)::int n from public.eventos')).rows[0].n,2);
 await as(null,'anon');assert.equal((await db.query('select nome from public.marcas where id=$1',[m.id])).rows[0].nome,marca().nome);
 await denied(()=>db.query('select * from public.auditoria_catalogo'),/permission denied/);
});
test('request replay is identical, different data conflicts, other keys cannot duplicate a brand or venue',async()=>{
 const first=await call('local',local());assert.deepEqual(await call('local',local()),first);
 await denied(()=>call('local',{...local(),nome:'Outro'}),/chave_idempotencia_reutilizada/);
 await denied(()=>call('local',local(),id(9902)),/cadastro_ja_existe/);
 await call('marca',marca(),id(9902));await denied(()=>call('marca',marca(),id(9903)),/cadastro_ja_existe/);
});
test('revoking global access blocks a previously successful replay',async()=>{
 await call('marca',marca());await owner('update public.administradores_sistema set ativo=false where usuario_id=$1',[id(6)]);await as();
 await denied(()=>call('marca',marca()),/somente_administrador_global/);
});
test('server rejects injected identities, permissions, unsafe links and malformed address/pin',async()=>{
 for(const patch of [{id:'fake'},{slug:'fake'},{ativo:false},{usuario_id:id(1)},{site:'http://example.com'},{logo:'https://user:pass@example.com/x'},{categorias:{}},{diasSemana:[1]},{nome:''}])
  await denied(()=>call('marca',{...marca(),...patch}),/campo_nao_editavel|url_https|lista_invalida|nome_obrigatorio/);
 for(const patch of [{latitude:null},{longitude:181},{endereco:{}},{endereco:{...local().endereco,estado:'Espirito Santo'}},{endereco:{...local().endereco,autor:'fake'}}])
  await denied(()=>call('local',{...local(),...patch}),/confirme_ponto|ponto_invalido|endereco_/);
});
test('inactive default venue rejected; itinerant brand allowed; direct writes and audit leaks denied',async()=>{
 await owner('update public.locais set ativo=false where id=$1',[id(201)]);await as();await denied(()=>call('marca',marca()),/local_padrao_indisponivel/);
 const c=marca();delete c.localPadraoId;await call('marca',c);
 await denied(()=>db.query("insert into public.marcas(nome,slug) values('direto','direto')"),/permission denied/);
 await as(1);assert.deepEqual((await db.query('select * from public.auditoria_catalogo')).rows,[]);
});
test('audit failure rolls back entity and idempotency; existing identities remain unchanged',async()=>{
 await owner("create function public.fail_catalog_audit() returns trigger language plpgsql as $$begin raise exception 'audit_failed';end$$");
 await owner('create trigger fail_audit before insert on public.auditoria_catalogo for each row execute function public.fail_catalog_audit()');await as();
 await denied(()=>call('local',local()),/audit_failed/);
 const result=await owner('select (select count(*) from public.locais)::int locais,(select count(*) from app_private.operacoes_administrativas)::int operacoes');assert.deepEqual(result.rows[0],{locais:1,operacoes:0});
 assert.equal((await owner('select id_legado from public.marcas where id=$1',[id(101)])).rows[0].id_legado,'mrc-a');
});
