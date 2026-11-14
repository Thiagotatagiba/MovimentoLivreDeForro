import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {criarManifesto,verificarPublicacao} from './lib/verificacaoPublicacao.mjs';

test('deployment verification detects stale source, stale worker and missing artwork',async()=>{
 const manifesto=await criarManifesto();
 const fs=await import('node:fs/promises');
 let stale=false;
 const server=http.createServer(async(req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1);
  if(stale && name.includes('festival-praca')){res.writeHead(404);res.end();return;}
  if(stale && name==='sw.js'){res.end('old worker');return;}
  if(stale && name.endsWith('catalogoConfig.js')){res.end("export const FONTE_CATALOGO='json';");return;}
  try {const bytes=await fs.readFile(new URL('../'+name,import.meta.url));
   res.end(/\.(?:html|js|json|css)$/.test(name)?bytes.toString('utf8').replace(/\r?\n/g,'\r\n'):bytes);}
  catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/';
 try {
  assert.equal((await verificarPublicacao({base,manifesto})).publicacaoConfirmada,true);
  stale=true;
  const result=await verificarPublicacao({base,manifesto});
  assert.equal(result.publicacaoConfirmada,false);
  assert.deepEqual(result.arquivos.filter(a=>!a.igual).map(a=>a.arquivo),['js/repositories/catalogoConfig.js','sw.js','assets/eventos/festival-praca-viva-2026-12.jpg']);
 } finally {await new Promise(resolve=>server.close(resolve));}
});

test('verification is GET-only, rejects credentialed targets and cannot hide a network failure',async()=>{
 await assert.rejects(verificarPublicacao({base:'https://user:password@example.com/',manifesto:[]}),/invalido/);
 await assert.rejects(verificarPublicacao({manifesto:[]}),/vazio/);
 const methods=[];
 const result=await verificarPublicacao({manifesto:[{arquivo:'sw.js',sha256:'123'}],fetchImpl:async(_url,options)=>{
  methods.push(options.method);throw Error('offline');
 }});
 assert.equal(result.publicacaoConfirmada,false);
 assert.deepEqual(methods,['GET']);
 assert.equal(JSON.stringify(result).includes('password'),false);
});
