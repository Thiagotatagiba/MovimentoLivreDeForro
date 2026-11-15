// Staging only: the third synthetic account must have a temporary global role.
import assert from 'node:assert/strict';import {configurarTeste,criarHttpHomologacao} from './lib/homologacaoAuth.mjs';
const config=configurarTeste(process.env,{escrita:true});if(config.ref!=='qmhrlexpnnbjntpecjis')throw Error('Projeto incorreto.');
const args=process.argv.slice(2),key=args[0]?.startsWith('--rodada=')?args[0].slice(9):null;
if(args.length!==1||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key??''))throw Error('Uso: --rodada=UUID');
const http=criarHttpHomologacao(config),sessions=[];let etapa='login';
const rpc=(name,body,token)=>http('/rest/v1/rpc/'+name,{method:'POST',body,token});
try{
 for(const account of config.accounts){const r=await http('/auth/v1/token?grant_type=password',{method:'POST',body:{email:account.email,password:account.password}});assert.ok(r.ok);sessions.push({id:r.data.user.id,token:r.data.access_token});}
 const [editor,,global]=sessions;
 const role=await http('/rest/v1/administradores_sistema?select=ativo',{token:global.token});assert.deepEqual(role.data,[{ativo:true}]);
 const command={p_chave:key,p_conteudo:{nome:'Local ficticio concorrente '+key,endereco:{logradouro:'Rua ficticia',numero:'10',bairro:'Centro',cidade:'Vitoria',estado:'ES'},latitude:-20.3,longitude:-40.3}};
 etapa='permissoes';assert.equal((await rpc('criar_local_catalogo',command,editor.token)).status,403);assert.ok(!(await rpc('criar_local_catalogo',command)).ok);
 etapa='concorrencia';const rows=await Promise.all([rpc('criar_local_catalogo',command,global.token),rpc('criar_local_catalogo',command,global.token)]);assert.ok(rows.every(r=>r.ok));assert.deepEqual(rows[0].data,rows[1].data);const local=rows[0].data;
 assert.equal((await rpc('criar_local_catalogo',{...command,p_conteudo:{...command.p_conteudo,nome:'Outro'}},global.token)).status,400);
 etapa='auditoria';const audit=await http('/rest/v1/auditoria_catalogo?select=id&entidade_id=eq.'+local.id,{token:global.token});assert.equal(audit.data.length,1);
 const hidden=await http('/rest/v1/auditoria_catalogo?select=id',{token:editor.token});assert.ok(hidden.ok);assert.deepEqual(hidden.data,[]);
 etapa='leitura publica';const published=await http('/rest/v1/locais?select=id,id_legado,slug&id=eq.'+local.id);assert.ok(published.ok);assert.equal(published.data.length,1);
 console.log(JSON.stringify({ok:true,localId:local.id,slug:local.slug,auditorias:1,concorrencia:'mesmo cadastro'}));
}catch{console.error('Homologacao de cadastros falhou na etapa '+etapa+'. Detalhes sensiveis omitidos.');process.exitCode=1;}
finally{const results=await Promise.allSettled(sessions.map(s=>http('/auth/v1/logout?scope=local',{method:'POST',token:s.token})));if(results.some(r=>r.status==='rejected'||!r.value.ok)){console.error('Verifique sessoes de homologacao.');process.exitCode=1;}}
