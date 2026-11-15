import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {configurarTeste,criarHttpHomologacao} from './lib/homologacaoAuth.mjs';
const config=configurarTeste(process.env,{escrita:true});if(config.ref!=='qmhrlexpnnbjntpecjis')throw Error('Projeto incorreto.');
const args=process.argv.slice(2),key=args[0]?.startsWith('--rodada=')?args[0].slice(9):null;
if(args.length!==1||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key??''))throw Error('Uso: --rodada=UUID');
const http=criarHttpHomologacao(config),sessions=[];let etapa='login';
const rpc=(name,body,token)=>http('/rest/v1/rpc/'+name,{method:'POST',body,token});
try{
 for(const account of config.accounts){const r=await http('/auth/v1/token?grant_type=password',{method:'POST',body:{email:account.email,password:account.password}});assert.ok(r.ok);sessions.push({id:r.data.user.id,token:r.data.access_token});}
 const [editor,,global]=sessions;
 etapa='leitura';assert.equal((await rpc('consultar_cadastros_catalogo',{},editor.token)).status,403);assert.ok(!(await rpc('consultar_cadastros_catalogo',{})).ok);
 const all=await rpc('consultar_cadastros_catalogo',{},global.token);assert.ok(all.ok&&Array.isArray(all.data.marcas));
 etapa='fixture';const created=await rpc('criar_local_catalogo',{p_chave:key,p_conteudo:{nome:'Local ficticio edicao concorrente '+key,endereco:{logradouro:'Rua de teste',numero:'1',bairro:'Centro',cidade:'Vitoria',estado:'ES'},latitude:-20.3,longitude:-40.3}},global.token);assert.ok(created.ok);
 const commands=['Primeira edicao','Segunda edicao'].map(descricao=>({p_id:created.data.id,p_revisao:1,p_conteudo:{descricao},p_chave:randomUUID()}));
 etapa='concorrencia';const results=await Promise.all(commands.map(c=>rpc('editar_local_catalogo',c,global.token)));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const winner=results.findIndex(r=>r.ok);assert.equal(results[winner].data.registro.revisao,2);const replay=await rpc('editar_local_catalogo',commands[winner],global.token);assert.deepEqual(replay.data,results[winner].data);
 etapa='auditoria';const audit=await http('/rest/v1/auditoria_catalogo?select=id&entidade_id=eq.'+created.data.id,{token:global.token});assert.equal(audit.data.length,2);
 console.log(JSON.stringify({ok:true,localId:created.data.id,statuses:results.map(r=>r.status),replay:true,auditorias:2}));
}catch{console.error('Homologacao de edicao falhou na etapa '+etapa+'. Dados sensiveis omitidos.');process.exitCode=1;}
finally{const rows=await Promise.allSettled(sessions.map(s=>http('/auth/v1/logout?scope=local',{method:'POST',token:s.token})));if(rows.some(r=>r.status==='rejected'||!r.value.ok))process.exitCode=1;}
