// Creates one unpublished synthetic draft per explicit request key, staging only.
import assert from 'node:assert/strict';import {configurarTeste,criarHttpHomologacao} from './lib/homologacaoAuth.mjs';
const config=configurarTeste(process.env,{escrita:true});if(config.ref!=='qmhrlexpnnbjntpecjis')throw Error('Projeto de teste incorreto.');
const args=process.argv.slice(2),key=args[0]?.startsWith('--rodada=')?args[0].slice(9):null;
if(args.length!==1||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key??''))throw Error('Uso: --rodada=UUID');
const http=criarHttpHomologacao(config),sessions=[];let etapa='login';
const rpc=(name,body,token)=>http('/rest/v1/rpc/'+name,{method:'POST',body,token});
try{
 for(const account of config.accounts){const login=await http('/auth/v1/token?grant_type=password',{method:'POST',body:{email:account.email,password:account.password}});assert.ok(login.ok);sessions.push({token:login.data.access_token,id:login.data.user.id});}
 const [,publisher,admin]=sessions;
 const globals=await http('/rest/v1/administradores_sistema?select=usuario_id',{token:admin.token});assert.ok(globals.ok);assert.deepEqual(globals.data,[],'Remova o papel global temporario antes deste teste.');
 const memberships=await http('/rest/v1/membros_marca?select=marca_id&usuario_id=eq.'+admin.id+'&papel=eq.administrador&ativo=eq.true',{token:admin.token});assert.ok(memberships.ok&&memberships.data.length===1);
 const venues=await http('/rest/v1/locais?select=id&ativo=eq.true&order=id&limit=1',{token:admin.token});assert.ok(venues.ok&&venues.data.length===1);
 const command={p_marca:memberships.data[0].marca_id,p_local:venues.data[0].id,p_chave:key,p_conteudo:{titulo:'Evento fictício — corrida de criação',data:'2026-12-24',horario:'20:00',dataTermino:'2026-12-25',horarioTermino:'01:00',terminoEstimado:false,ativo:true}};
 etapa='permissao';const denied=await rpc('criar_evento_rascunho',command,publisher.token);assert.equal(denied.status,403);
 etapa='concorrencia';const results=await Promise.all([rpc('criar_evento_rascunho',command,admin.token),rpc('criar_evento_rascunho',command,admin.token)]);
 assert.ok(results.every(r=>r.ok));assert.deepEqual(results[0].data,results[1].data);const created=results[0].data;
 assert.match(created.id_legado,/^evt-[0-9a-f-]{36}$/);assert.equal(created.revisao,1);
 const changed=await rpc('criar_evento_rascunho',{...command,p_conteudo:{...command.p_conteudo,titulo:'Diferente'}},admin.token);assert.equal(changed.status,400);
 etapa='rascunho privado';const publicEvent=await http('/rest/v1/eventos?select=id&id=eq.'+created.evento_id);assert.ok(publicEvent.ok);assert.deepEqual(publicEvent.data,[]);
 const privateEvent=await http('/rest/v1/eventos?select=id,id_legado,slug,versao_publicada_id,rascunho:rascunhos_evento(revisao,conteudo)&id=eq.'+created.evento_id,{token:admin.token});assert.ok(privateEvent.ok&&privateEvent.data.length===1);
 assert.equal(privateEvent.data[0].versao_publicada_id,null);assert.equal(privateEvent.data[0].rascunho.revisao,1);assert.equal(privateEvent.data[0].rascunho.conteudo.id,created.id_legado);
 const audit=await http('/rest/v1/auditoria_administrativa?select=id&acao=eq.criar_evento&entidade_id=eq.'+created.evento_id,{token:admin.token});assert.ok(audit.ok);assert.equal(audit.data.length,1);
 console.log('OK: produtor sem permissao recusado; duas criacoes concorrentes devolveram um unico evento/auditoria; rascunho invisivel ao anon.');
 console.log(JSON.stringify({eventoId:created.evento_id,slug:created.slug,publicado:false}));
}catch{console.error('Homologacao de criacao falhou na etapa '+etapa+'. Detalhes sensiveis omitidos.');process.exitCode=1;}
finally{const closed=await Promise.allSettled(sessions.map(s=>http('/auth/v1/logout?scope=local',{method:'POST',token:s.token})));if(closed.some(s=>s.status==='rejected'||!s.value.ok)){console.error('Verifique encerramento de sessoes ficticias.');process.exitCode=1;}}
