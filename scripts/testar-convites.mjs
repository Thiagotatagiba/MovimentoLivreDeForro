import {test,before,after,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {criarBancoAdministrativo,id} from './fixtures/bancoAdministrativo.mjs';
let db;
const marca=id(101),token='ab'.repeat(32),key=n=>id(7000+n);
async function as(n,role='authenticated'){
 await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?id(n):'']);await db.exec('set role '+role);
}
async function denied(sql,args,check){
 await db.exec('savepoint expected_error');
 try{await assert.rejects(db.query(sql,args),check);}finally{await db.exec('rollback to savepoint expected_error;release savepoint expected_error');}
}
async function create({user=1,email='user4@example.test',papel='equipe',permissoes=['gerenciar_eventos'],nonce=token,chave=1,brand=marca}={}){
 await as(user);return (await db.query('select public.criar_convite_marca($1,$2,$3,$4,$5,$6) result',[brand,email,papel,permissoes,nonce,key(chave)])).rows[0].result;
}
async function accept(convite,user=4,chave=2){await as(user);return (await db.query('select public.aceitar_convite_marca($1,$2,$3) result',[convite,token,key(chave)])).rows[0].result;}
before(async()=>{db=await criarBancoAdministrativo();});
beforeEach(async()=>{await db.exec("reset role;begin;update auth.users set email='user'||right(id::text,1)||'@example.test',email_confirmed_at=now();");});
afterEach(async()=>{await db.exec('rollback;reset role');});
after(async()=>{await db.close();});

test('anonymous and direct clients cannot invoke invitation APIs or read private token/outbox tables',async()=>{
 await as(null,'anon');
 await denied('select public.aceitar_convite_marca($1,$2,$3)',[id(900),token,key(1)],/permission denied/);
 await denied('select * from public.convites_marca',[],/permission denied/);
 await as(1);
 for(const table of ['app_private.tokens_convite','app_private.outbox_convites'])await denied('select * from '+table,[],/permission denied/);
 await denied("insert into public.convites_marca(marca_id,email_destino,papel,criado_por) values($1,'x@example.test','administrador',$2)",[marca,id(1)],/permission denied/);
});

test('only an active brand administrator or global administrator can create invitations',async()=>{
 for(const user of [2,3,5,8]){
  await as(user);await denied('select public.criar_convite_marca($1,$2,$3,$4,$5,$6)',[marca,'user4@example.test','equipe',[],token,key(user)],/sem_permissao/);
 }
 const invitation=await create({user:6});assert.ok(invitation.convite_id);
});

test('creation normalizes identity, expires in seven days and atomically stores audit, hash and private delivery',async()=>{
 const invitation=await create({email:' USER4@EXAMPLE.TEST ',permissoes:['publicar_eventos','gerenciar_eventos','gerenciar_eventos']});
 await db.exec('reset role');
 const row=(await db.query('select *,extract(epoch from (expira_em-criado_em)) seconds from public.convites_marca')).rows[0];
 assert.equal(row.email_destino,'user4@example.test');assert.equal(row.estado,'pendente');assert.ok(Math.abs(Number(row.seconds)-604800)<1);
 assert.deepEqual(row.permissoes,['gerenciar_eventos','publicar_eventos']);
 assert.equal((await db.query('select count(*)::int n from public.membros_marca where usuario_id=$1',[id(4)])).rows[0].n,0);
 assert.equal((await db.query('select token from app_private.outbox_convites')).rows[0].token,token);
 const hash=(await db.query('select token_hash from app_private.tokens_convite')).rows[0].token_hash;
 assert.match(hash,/^[a-f0-9]{64}$/);assert.notEqual(hash,token);
 const publicRows=(await db.query('select * from public.auditoria_administrativa')).rows;
 assert.ok(!JSON.stringify(publicRows).includes(token));assert.ok(!JSON.stringify(publicRows).includes('user4@example.test'));
 assert.ok(!JSON.stringify(invitation).includes(token));
});

test('creation is idempotent; duplicate pending invitations and changed request keys are explicit conflicts',async()=>{
 const first=await create();assert.deepEqual(await create(),first);
 await as(1);await denied('select public.criar_convite_marca($1,$2,$3,$4,$5,$6)',[marca,'user4@example.test','equipe',['gerenciar_eventos'],token,key(2)],e=>e.code==='PT409');
 await denied('select public.criar_convite_marca($1,$2,$3,$4,$5,$6)',[marca,'user4@example.test','equipe',['gerenciar_eventos'],'cd'.repeat(32),key(1)],/chave_idempotencia_reutilizada/);
 await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from app_private.outbox_convites')).rows[0].n,1);
});

test('acceptance requires the confirmed primary email and correct token, never JWT metadata',async()=>{
 const c=await create();
 await as(3);await denied('select public.aceitar_convite_marca($1,$2,$3)',[c.convite_id,token,key(2)],/convite_indisponivel/);
 await db.exec('reset role');await db.query('update auth.users set email_confirmed_at=null where id=$1',[id(4)]);
 await as(4);await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({email:'user4@example.test',user_metadata:{email_verified:true}})]);
 await denied('select public.aceitar_convite_marca($1,$2,$3)',[c.convite_id,token,key(2)],/convite_indisponivel/);
 await db.exec('reset role');await db.query('update auth.users set email_confirmed_at=now() where id=$1',[id(4)]);
 await db.query('update auth.users set is_anonymous=true where id=$1',[id(4)]);
 await as(4);await denied('select public.aceitar_convite_marca($1,$2,$3)',[c.convite_id,token,key(2)],/convite_indisponivel/);
 await db.exec('reset role');await db.query('update auth.users set is_anonymous=false where id=$1',[id(4)]);
 await as(4);await denied('select public.aceitar_convite_marca($1,$2,$3)',[c.convite_id,'cd'.repeat(32),key(2)],/convite_indisponivel/);
});

test('acceptance grants exactly the invited role once and scrubs the delivery token',async()=>{
 const c=await create();const result=await accept(c.convite_id);assert.equal(result.estado,'aceito');
 assert.deepEqual(await accept(c.convite_id),result);
 await as(4);await denied('select public.aceitar_convite_marca($1,$2,$3)',[c.convite_id,token,key(3)],e=>e.code==='PT409');
 await db.exec('reset role');const member=(await db.query('select * from public.membros_marca where id=$1',[result.membro_id])).rows[0];
 assert.equal(member.papel,'equipe');assert.equal(member.ativo,true);
 assert.deepEqual((await db.query('select permissao from public.permissoes_membro where membro_id=$1',[member.id])).rows.map(p=>p.permissao),['gerenciar_eventos']);
 assert.equal((await db.query('select token from app_private.outbox_convites')).rows[0].token,null);
 assert.equal((await db.query("select count(*)::int n from public.auditoria_administrativa where acao='aceitar_convite'")).rows[0].n,1);
});

test('revocation prevents acceptance and clears pending delivery atomically',async()=>{
 const c=await create();await as(1);
 const sql='select public.revogar_convite_marca($1,$2) result';
 const a=(await db.query(sql,[c.convite_id,key(3)])).rows[0].result;
 assert.deepEqual((await db.query(sql,[c.convite_id,key(3)])).rows[0].result,a);
 await as(4);await denied('select public.aceitar_convite_marca($1,$2,$3)',[c.convite_id,token,key(4)],e=>e.code==='PT409');
 await db.exec('reset role');assert.equal((await db.query('select token from app_private.outbox_convites')).rows[0].token,null);
});

test('expired invitations cannot grant access; a replacement expires old state and scrubs its outbox',async()=>{
 const c=await create();await db.exec('reset role');await db.query("update public.convites_marca set expira_em=now()-interval '1 minute' where id=$1",[c.convite_id]);
 await as(4);await denied('select public.aceitar_convite_marca($1,$2,$3)',[c.convite_id,token,key(2)],e=>e.code==='PT409');
 await create({nonce:'cd'.repeat(32),chave:3});await db.exec('reset role');
 assert.equal((await db.query('select estado from public.convites_marca where id=$1',[c.convite_id])).rows[0].estado,'expirado');
 assert.equal((await db.query('select token from app_private.outbox_convites where convite_id=$1',[c.convite_id])).rows[0].token,null);
});

test('recipient RLS exposes only its invitations and never hashes or another brand email',async()=>{
 await create();await as(4);assert.equal((await db.query('select count(*)::int n from public.convites_marca')).rows[0].n,1);
 await as(3);assert.equal((await db.query('select count(*)::int n from public.convites_marca')).rows[0].n,0);
 await as(5);assert.equal((await db.query('select count(*)::int n from public.convites_marca')).rows[0].n,0);
 await as(1);assert.equal((await db.query('select count(*)::int n from public.convites_marca')).rows[0].n,1);
});

test('an existing active member is never silently promoted; inactive membership is reactivated explicitly',async()=>{
 const c=await create({email:'user2@example.test',papel:'administrador',permissoes:[]});
 await as(2);await denied('select public.aceitar_convite_marca($1,$2,$3)',[c.convite_id,token,key(2)],e=>e.code==='PT409');
 await db.exec('reset role');await db.query('update public.membros_marca set ativo=false where usuario_id=$1 and marca_id=$2',[id(2),marca]);
 const accepted=await accept(c.convite_id,2,3);await db.exec('reset role');
 assert.equal((await db.query('select papel from public.membros_marca where id=$1',[accepted.membro_id])).rows[0].papel,'administrador');
 assert.equal((await db.query('select count(*)::int n from public.permissoes_membro where membro_id=$1',[accepted.membro_id])).rows[0].n,0);
});

test('revoked inviter authority and inactive brand block late acceptance',async()=>{
 const c=await create();await db.exec('reset role');await db.query('update public.membros_marca set ativo=false where usuario_id=$1',[id(1)]);
 await as(4);await denied('select public.aceitar_convite_marca($1,$2,$3)',[c.convite_id,token,key(2)],/convite_indisponivel/);
 await db.exec('reset role');await db.query('update public.membros_marca set ativo=true where usuario_id=$1',[id(1)]);await db.query('update public.marcas set ativo=false where id=$1',[marca]);
 await as(4);await denied('select public.aceitar_convite_marca($1,$2,$3)',[c.convite_id,token,key(2)],/convite_indisponivel/);
});

test('revoked administrator cannot replay creation and revoked membership cannot replay acceptance',async()=>{
 const c=await create();await accept(c.convite_id);await db.exec('reset role');
 await db.query('update public.membros_marca set ativo=false where usuario_id in ($1,$2)',[id(1),id(4)]);
 await as(4);await denied('select public.aceitar_convite_marca($1,$2,$3)',[c.convite_id,token,key(2)],/sem_permissao/);
 await as(1);await denied('select public.criar_convite_marca($1,$2,$3,$4,$5,$6)',[marca,'user4@example.test','equipe',['gerenciar_eventos'],token,key(1)],/sem_permissao/);
});

test('invalid permissions fail before invitation and notification are created',async()=>{
 await as(1);
 for(const permissions of [['admin_global'],[null]])await denied('select public.criar_convite_marca($1,$2,$3,$4,$5,$6)',[marca,'user4@example.test','equipe',permissions,token,key(1)],/convite_invalido/);
 await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from public.convites_marca')).rows[0].n,0);
});

test('outbox failure rolls back invitation, token hash, audit and idempotency together',async()=>{
 await db.exec('alter table app_private.outbox_convites add constraint simulate_failure check(false) not valid');
 await as(1);await denied('select public.criar_convite_marca($1,$2,$3,$4,$5,$6)',[marca,'user4@example.test','equipe',[],token,key(1)],/simulate_failure/);
 await db.exec('reset role');
 for(const table of ['public.convites_marca','app_private.tokens_convite','public.auditoria_administrativa','app_private.operacoes_administrativas'])
  assert.equal((await db.query('select count(*)::int n from '+table)).rows[0].n,0);
});
