import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {configurarHomologacao,configurarTeste,criarHttpHomologacao,executarHomologacao,PRODUCAO_REF} from './lib/homologacaoAuth.mjs';

const ref='abcdefghijklmnopqrst',key='sb_publishable_only_a_public_test_key';
const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
const env=()=>({VTF_HOMOLOG_REF:ref,VTF_HOMOLOG_PUBLIC_KEY:key,VTF_HOMOLOG_EVENTO:id(100),VTF_HOMOLOG_MARCA:id(200),
  VTF_EDITOR_EMAIL:'editor@example.test',VTF_EDITOR_PASSWORD:'fixture-editor',
  VTF_PUBLICADOR_EMAIL:'publisher@example.test',VTF_PUBLICADOR_PASSWORD:'fixture-publisher',
  VTF_OUTRA_MARCA_EMAIL:'other@example.test',VTF_OUTRA_MARCA_PASSWORD:'fixture-other'});

function fake({legacy='evt-homologacao-concorrencia',unverified=false}={}) {
  const calls=[],sessions=new Map(),content={titulo:'Ficticio',dataTermino:'2026-11-15',horarioTermino:'02:00',terminoEstimado:false};
  let draft=null,event={id:id(100),id_legado:legacy,marca_id:id(200),versao_publicada_id:id(300),
    versao:{numero:1,conteudo:content,situacao:'cancelado'}};
  const replays=new Map();
  const fetchImpl=async(input,options)=>{
    const url=new URL(input),body=options.body?JSON.parse(options.body):null;
    const token=options.headers.Authorization?.replace('Bearer ','');
    const role=sessions.get(token);
    calls.push({path:url.pathname,method:options.method,body});
    const result=(data,status=200)=>new Response(JSON.stringify(data),{status});
    if(url.pathname==='/auth/v1/token') {
      const account=['EDITOR','PUBLICADOR','OUTRA_MARCA'].find(r=>env()[`VTF_${r}_EMAIL`]===body.email);
      const access='secret-session-'+account;sessions.set(access,account);return result({access_token:access});
    }
    if(url.pathname==='/auth/v1/user') return result({id:id(['EDITOR','PUBLICADOR','OUTRA_MARCA'].indexOf(role)+1),
      email_confirmed_at:unverified?null:'2026-11-13T00:00:00Z'});
    if(url.pathname==='/auth/v1/logout') {sessions.delete(token);return new Response(null,{status:204});}
    if(url.pathname.endsWith('/administradores_sistema')) return result([]);
    if(url.pathname.endsWith('/membros_marca')) return result([{id:id(400),marca_id:id(role==='OUTRA_MARCA'?201:200),papel:'equipe',
      permissoes:[{permissao:role==='EDITOR'?'gerenciar_eventos':'publicar_eventos'}]}]);
    if(url.pathname.endsWith('/eventos')) return result([structuredClone(event)]);
    if(url.pathname.endsWith('/rascunhos_evento')) return result(role && role!=='OUTRA_MARCA' && draft?[structuredClone(draft)]:[]);
    if(url.pathname.endsWith('/salvar_rascunho_evento')) {
      if(role!=='EDITOR') return result({code:'42501'},403);
      if(replays.has(body.p_chave)) return result(replays.get(body.p_chave));
      if(body.p_revisao!==(draft?.revisao??0)) return result({code:'40001'},409);
      draft={evento_id:id(100),conteudo:structuredClone(body.p_conteudo),revisao:body.p_revisao+1};
      const response={revisao:draft.revisao};replays.set(body.p_chave,response);return result(response);
    }
    if(url.pathname.endsWith('/publicar_evento')) {
      if(role!=='PUBLICADOR') return result({code:'42501'},403);
      event={...event,versao_publicada_id:id(301),versao:{...event.versao,numero:2,conteudo:structuredClone(draft.conteudo)}};
      draft.revisao++;return result({versao_id:id(301)});
    }
    throw Error('Unexpected route');
  };
  return {fetchImpl,calls,sessions};
}

test('staging configuration refuses production, custom hosts and privileged keys',()=>{
  for(const changes of [{VTF_HOMOLOG_REF:PRODUCAO_REF},{VTF_HOMOLOG_REF:'https://example.com'},
    {VTF_HOMOLOG_PUBLIC_KEY:'sb_secret_administrative'},
    {VTF_HOMOLOG_PUBLIC_KEY:'a.'+Buffer.from(JSON.stringify({role:'service_role',ref})).toString('base64url')+'.b'}])
    assert.throws(()=>configurarHomologacao({...env(),...changes}));
  assert.equal(configurarHomologacao(env()).url,`https://${ref}.supabase.co`);
  assert.throws(()=>configurarTeste(env(),{escrita:true}),/Confirme/);
});

test('read-only Auth/PostgREST checks never call administrative RPCs and close sessions',async()=>{
  const f=fake(),checks=await executarHomologacao(configurarTeste(env()),f);
  assert.equal(checks.length,5);
  assert.equal(f.calls.filter(c=>c.path.includes('/rpc/')).length,0);
  assert.equal(f.calls.filter(c=>c.path==='/auth/v1/logout').length,3);
  assert.equal(f.sessions.size,0);
});

test('write scenario checks distinct permissions, CAS conflict, replay and publication',async()=>{
  const f=fake(),checks=await executarHomologacao(configurarTeste({...env(),VTF_HOMOLOG_CONFIRMAR_ESCRITA:ref},{escrita:true}),f);
  assert.equal(checks.length,6);
  assert.equal(f.calls.filter(c=>c.path.endsWith('/salvar_rascunho_evento')).length,5);
  assert.equal(f.calls.filter(c=>c.path.endsWith('/publicar_evento')).length,2);
  assert.equal(f.sessions.size,0);
});

test('write guard rejects a real catalog event before any administrative command',async()=>{
  const f=fake({legacy:'evt-original'});
  await assert.rejects(executarHomologacao(configurarTeste({...env(),VTF_HOMOLOG_CONFIRMAR_ESCRITA:ref},{escrita:true}),f),/ficticio/);
  assert.equal(f.calls.filter(c=>c.path.includes('/rpc/')).length,0);
  assert.equal(f.sessions.size,0);
});

test('unverified account stops testing and closes its session without logging credentials',async()=>{
  const f=fake({unverified:true}),reports=[];
  await assert.rejects(executarHomologacao(configurarTeste(env()),{...f,report:m=>reports.push(m)}),/email confirmado/);
  assert.equal(f.sessions.size,0);
  assert.equal(f.calls.some(c=>c.path.startsWith('/rest/')),false);
  assert.equal(JSON.stringify(reports).includes('secret-session'),false);
});

test('HTTP client refuses redirects and external routes and hides network error details',async()=>{
  assert.throws(()=>criarHttpHomologacao({...configurarHomologacao(env()),url:'https://example.com'}),/Destino/);
  let options;
  const http=criarHttpHomologacao(configurarHomologacao(env()),{fetchImpl:async(_url,o)=>{
    options=o;throw Error('secret password and token');
  }});
  await assert.rejects(http('//example.com'),/Rota/);
  await assert.rejects(http('/auth/v1/user'),{message:'Falha de rede no ambiente de homologacao.'});
  assert.equal(options.redirect,'error');
  assert.equal(options.headers.Authorization,undefined);
});

test('local server substitutes only public staging configuration and refuses production startup',async()=>{
  async function start(extraEnv) {
    const child=spawn(process.execPath,['scripts/servidor-homologacao.mjs','--supabase-homologacao','--porta=0'],
      {cwd:new URL('../',import.meta.url),env:{...process.env,...extraEnv},stdio:['ignore','pipe','pipe']});
    let output='';
    const ready=new Promise((resolve,reject)=>{
      child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/http:\/\/127\.0\.0\.1:(\d+)/);if(match)resolve(match[0]);});
      child.stderr.on('data',()=>{});
      child.on('exit',code=>reject(Error('Servidor recusado: '+code)));
      child.on('error',reject);
    });
    return {child,ready};
  }
  const server=await start(env());
  try {
    const base=await server.ready;
    const source=await (await fetch(base+'/data/supabaseClient.js?perfil=administrador')).text();
    assert.ok(source.includes(`https://${ref}.supabase.co`));
    assert.ok(!source.includes(PRODUCAO_REF));
    assert.ok(!source.includes(env().VTF_EDITOR_PASSWORD));
    assert.ok(source.includes('vtf-homologacao-'+ref));
    assert.equal((await fetch(base+'/__admin_demo/contexto')).status,404);
    const real=await (await fetch(base+'/admin/js/gestaoDependencias.js')).text();
    assert.ok(real.includes('demonstracao:false'));
  } finally {server.child.kill();}
  const production=await start({...env(),VTF_HOMOLOG_REF:PRODUCAO_REF});
  await assert.rejects(production.ready,/recusado/);
});
