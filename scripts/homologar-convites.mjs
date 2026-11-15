// Writes only revocable synthetic invitations in the named nonproduction project.
// Does not grant/revoke memberships or send email. Credentials stay in memory.
import assert from 'node:assert/strict';
import {configurarTeste,criarHttpHomologacao} from './lib/homologacaoAuth.mjs';
import {randomBytes,randomUUID} from 'node:crypto';
const config=configurarTeste(process.env,{escrita:true});
const args=process.argv.slice(2);
if(args.some(a=>a!=='--aceitacao'))throw Error('Uso: homologar-convites.mjs [--aceitacao]');
if(config.ref!=='qmhrlexpnnbjntpecjis')throw Error('Este fixture exige o projeto de homologacao conhecido.');
const http=criarHttpHomologacao(config),sessions=[];
let etapa='autenticacao';
const rpc=(name,body,token)=>http('/rest/v1/rpc/'+name,{method:'POST',body,token});
try{
 for(const account of config.accounts){
  const login=await http('/auth/v1/token?grant_type=password',{method:'POST',body:{email:account.email,password:account.password}});
  assert.ok(login.ok,'Login da conta ficticia recusado');sessions.push({token:login.data.access_token});
  const user=await http('/auth/v1/user',{token:login.data.access_token});assert.ok(user.ok&&user.data.email_confirmed_at);
  Object.assign(sessions.at(-1),{id:user.data.id,email:user.data.email});
 }
 const [editor,publisher,admin]=sessions;
 const [recipient,wrong]=args.includes('--aceitacao')?[publisher,editor]:[editor,publisher];
 etapa='criar e repetir';
 const memberships=await http('/rest/v1/membros_marca?select=marca_id&usuario_id=eq.'+admin.id+'&papel=eq.administrador&ativo=eq.true',{token:admin.token});
 assert.ok(memberships.ok&&memberships.data.length===1,'Administrador da marca B indisponivel');
 const brand=memberships.data[0].marca_id,token=randomBytes(32).toString('hex');
 const command={p_marca:brand,p_email:recipient.email,p_papel:'equipe',p_permissoes:['gerenciar_eventos'],p_token:token,p_chave:randomUUID()};
 const unauthorized=await rpc('criar_convite_marca',command,recipient.token);assert.equal(unauthorized.data.code,'42501');
 const created=await rpc('criar_convite_marca',command,admin.token);assert.ok(created.ok,'Criacao recusada');
 const replay=await rpc('criar_convite_marca',command,admin.token);assert.deepEqual(replay.data,created.data);
 assert.ok(!JSON.stringify(created.data).includes(token));
 console.log('OK: criar/repetir convite sem conceder acesso');
 etapa='destinatario e RLS';
 const id=created.data.convite_id;
 const invisible=await http('/rest/v1/convites_marca?select=*&id=eq.'+id,{token:wrong.token});assert.deepEqual(invisible.data,[]);
 const denied=await rpc('aceitar_convite_marca',{p_convite:id,p_token:token,p_chave:randomUUID()},wrong.token);assert.equal(denied.data.code,'42501');
 const own=await http('/rest/v1/convites_marca?select=*&id=eq.'+id,{token:recipient.token});assert.ok(own.ok&&own.data.length===1);
 assert.ok(!JSON.stringify(own.data).includes(token));
 const badToken=await rpc('aceitar_convite_marca',{p_convite:id,p_token:randomBytes(32).toString('hex'),p_chave:randomUUID()},recipient.token);assert.equal(badToken.data.code,'42501');
 console.log('OK: destinatario, email verificado, token e RLS');
 etapa='revogacao';
 const revoke={p_convite:id,p_chave:randomUUID()};
 const revoked=await rpc('revogar_convite_marca',revoke,admin.token);assert.ok(revoked.ok);
 const revokedAgain=await rpc('revogar_convite_marca',revoke,admin.token);assert.deepEqual(revokedAgain.data,revoked.data);
 const used=await rpc('aceitar_convite_marca',{p_convite:id,p_token:token,p_chave:randomUUID()},recipient.token);
 assert.equal(used.status,409);assert.equal(used.data.code,'PT409');
 console.log('OK: revogacao/replay e aceitacao posterior recusada com HTTP 409');
 if(args.includes('--aceitacao')){
  etapa='aceitacao concorrente';
  const existing=await http('/rest/v1/membros_marca?select=id&marca_id=eq.'+brand+'&usuario_id=eq.'+recipient.id+'&ativo=eq.true',{token:recipient.token});
  assert.ok(existing.ok&&existing.data.length===0,'A conta PUBLICADOR ja pertence a marca B; este teste de concessao nao deve ser repetido sem preparar outro fixture.');
  const fresh={...command,p_permissoes:['consultar_listas'],p_token:randomBytes(32).toString('hex'),p_chave:randomUUID()};
  const invitation=await rpc('criar_convite_marca',fresh,admin.token);assert.ok(invitation.ok);
  const payload={p_convite:invitation.data.convite_id,p_token:fresh.p_token,p_chave:randomUUID()};
  const competitor={...payload,p_chave:randomUUID()};
  const race=await Promise.all([rpc('aceitar_convite_marca',payload,recipient.token),rpc('aceitar_convite_marca',competitor,recipient.token)]);
  assert.equal(race.filter(r=>r.ok).length,1);assert.ok(race.some(r=>r.status===409&&r.data.code==='PT409'));
  const winning=race[0].ok?payload:competitor;
  const repeated=await rpc('aceitar_convite_marca',winning,recipient.token);assert.deepEqual(repeated.data,race.find(r=>r.ok).data);
  const audit=await http('/rest/v1/auditoria_administrativa?select=id&entidade_id=eq.'+payload.p_convite+'&acao=eq.aceitar_convite',{token:admin.token});
  assert.ok(audit.ok&&audit.data.length===1);
  const membership=await http('/rest/v1/membros_marca?select=papel,permissoes:permissoes_membro(permissao)&marca_id=eq.'+brand+'&usuario_id=eq.'+recipient.id+'&ativo=eq.true',{token:recipient.token});
  assert.equal(membership.data[0].papel,'equipe');assert.deepEqual(membership.data[0].permissoes,[{permissao:'consultar_listas'}]);
  console.log('OK: duas aceitacoes concorrentes, um vinculo, replay e auditoria unica; permissao restrita a consultar listas');
 }
}catch{console.error('Homologacao de convites interrompida na etapa '+etapa+'. Detalhes sensiveis omitidos.');process.exitCode=1;}
finally{
 const closed=await Promise.allSettled(sessions.map(s=>http('/auth/v1/logout?scope=local',{method:'POST',token:s.token})));
 if(closed.some(s=>s.status==='rejected'||!s.value.ok))console.error('Confira o encerramento das sessoes ficticias.');
}
