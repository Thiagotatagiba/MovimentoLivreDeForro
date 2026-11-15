// Real Auth/PostgREST tests, synthetic fixture only. No provider or real email.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {configurarTeste,criarHttpHomologacao} from './lib/homologacaoAuth.mjs';
const config=configurarTeste(process.env,{escrita:true});
if(config.ref!=='qmhrlexpnnbjntpecjis')throw Error('Projeto de teste incorreto.');
const argv=process.argv.slice(2),list=argv.find(a=>a.startsWith('--lista='))?.slice(8),fechada=argv.includes('--fechada');
if(!/^[0-9a-f-]{36}$/.test(list??'')||argv.some(a=>a!=='--fechada'&&!a.startsWith('--lista=')))throw Error('Uso: --lista=UUID [--fechada]');
const http=criarHttpHomologacao(config),sessions=[];let etapa='login';
const rpc=(name,body,token)=>http('/rest/v1/rpc/'+name,{method:'POST',body,token});
try{
 for(const account of config.accounts){const login=await http('/auth/v1/token?grant_type=password',{method:'POST',body:{email:account.email,password:account.password}});assert.ok(login.ok);sessions.push(login.data.access_token);}
 const [owner,viewer,admin]=sessions;
 etapa='fixture';const metadata=await rpc('consultar_lista_vip',{p_lista:list});assert.ok(metadata.ok&&metadata.data);
 const event=await http('/rest/v1/eventos?select=id_legado&id=eq.'+metadata.data.evento_id,{token:admin});
 assert.equal(event.data?.[0]?.id_legado,'evt-homologacao-vip-2026-11-15','Nunca usar evento real neste teste.');
 assert.equal(metadata.data.max_acompanhantes,2);
 etapa='privacidade';const hidden=await rpc('consultar_grupos_vip',{p_lista:list},owner);assert.equal(hidden.status,403);
 const forbidden=await http('/rest/v1/inscricoes_vip?select=*');assert.equal(forbidden.status,401);
 const own=await rpc('consultar_minha_inscricao_vip',{p_lista:list},owner);assert.ok(own.ok);assert.equal(own.data?.duplicados,undefined);
 console.log('OK: fixture, acesso anon recusado e grupos restritos ao produtor');
 if(!fechada){
  assert.equal(metadata.data.estado,'aberta');etapa='concorrencia';
  const existing=await rpc('consultar_minha_inscricao_vip',{p_lista:list},viewer);assert.ok(existing.ok);
  const command={p_lista:list,p_nome:'Outro titular fictício',p_acompanhantes:['Maria fictícia'],p_aceita_termos:true,p_revisao:existing.data?.revisao??0,p_chave:randomUUID()};
  const competing={...command,p_chave:randomUUID()};
  const race=await Promise.all([rpc('salvar_inscricao_vip',command,viewer),rpc('salvar_inscricao_vip',competing,viewer)]);
  assert.equal(race.filter(r=>r.ok).length,1);assert.ok(race.some(r=>r.status===409));
  const winner=race[0].ok?command:competing;assert.deepEqual((await rpc('salvar_inscricao_vip',winner,viewer)).data,race.find(r=>r.ok).data);
  const privateRows=await http('/rest/v1/inscricoes_vip?select=id,usuario_id&lista_id=eq.'+list,{token:viewer});assert.equal(privateRows.data.length,1);
  const beforeExport=await rpc('exportar_lista_vip',{p_lista:list},admin);assert.equal(beforeExport.status,409);
  const groupData=await rpc('consultar_grupos_vip',{p_lista:list},viewer);assert.ok(groupData.ok);assert.ok(groupData.data.duplicados.includes('maria fictícia'));
  etapa='cancelar e reinscrever';const current=await rpc('consultar_minha_inscricao_vip',{p_lista:list},viewer);
  const canceled=await rpc('cancelar_inscricao_vip',{p_lista:list,p_revisao:current.data.revisao,p_chave:randomUUID()},viewer);assert.ok(canceled.ok);
  const rejoined=await rpc('salvar_inscricao_vip',{...command,p_revisao:canceled.data.revisao,p_chave:randomUUID()},viewer);assert.ok(rejoined.ok);
  console.log('OK: duas escritas concorrentes, um grupo, replay, cancelamento/reinscricao e exportacao antecipada recusada');
 }else{
  assert.equal(metadata.data.estado,'encerrada');etapa='fechamento';
  const deniedSave=await rpc('salvar_inscricao_vip',{p_lista:list,p_nome:'Nao deve entrar',p_acompanhantes:[],p_aceita_termos:true,p_revisao:own.data?.revisao??0,p_chave:randomUUID()},owner);assert.equal(deniedSave.status,409);
  const deniedCancel=await rpc('cancelar_inscricao_vip',{p_lista:list,p_revisao:own.data?.revisao??0,p_chave:randomUUID()},owner);assert.equal(deniedCancel.status,409);
  const text=await rpc('exportar_lista_vip',{p_lista:list},viewer);assert.ok(text.ok);assert.match(text.data,/Total de pessoas: 5$/);assert.doesNotMatch(text.data,/https:|avatar_url/);
  const correction=await rpc('corrigir_inscricao_vip',{p_inscricao:own.data.id,p_nome:'Proibido',p_acompanhantes:own.data.acompanhantes,p_revisao:own.data.revisao,p_chave:randomUUID()},viewer);assert.equal(correction.status,403);
  console.log('OK: titular bloqueado apos fechamento, exportacao textual com cinco pessoas e correcao recusada para somente consulta');
 }
}catch{console.error('Homologacao VIP falhou na etapa '+etapa+'. Dados sensiveis omitidos.');process.exitCode=1;}
finally{const ended=await Promise.allSettled(sessions.map(token=>http('/auth/v1/logout?scope=local',{method:'POST',token})));if(ended.some(x=>x.status==='rejected'||!x.value.ok)){console.error('Falha ao encerrar sessao ficticia.');process.exitCode=1;}}
