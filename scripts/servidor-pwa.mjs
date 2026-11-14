// Disposable loopback server to test a real v4 -> candidate service-worker update.
// pwa.localhost is a trustworthy loopback origin and exercises production caching.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const anterior=execFileSync('git',['show','60e87d4be852dca7cab996815b49575417b35950:sw.js'],{cwd:root,encoding:'utf8'});
let novo=false;
const port=Number(process.argv.find(a=>a.startsWith('--porta='))?.slice(8)??8769);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Porta invalida');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
 '.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://pwa.localhost');
  if(!['pwa.localhost','127.0.0.1','localhost'].includes((req.headers.host??'').split(':')[0])){
   res.writeHead(403);res.end();return;
  }
  if(req.method==='POST' && url.pathname==='/__pwa/atualizar') {
   if(req.headers.origin!=='http://pwa.localhost:'+port){res.writeHead(403);res.end();return;}
   novo=true;res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"atualizacao":true}');return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const pathname=decodeURIComponent(url.pathname);
  if(pathname.split(/[\\/]/).some(p=>p.startsWith('.')&&p!=='')){res.writeHead(403);res.end();return;}
  const relative=pathname==='/'?'/scripts/fixtures/pwaPublicacao.html':pathname;
  const target=path.resolve(root,'.'+relative);
  if(!target.startsWith(path.resolve(root)+path.sep)){res.writeHead(403);res.end();return;}
  const content=pathname==='/sw.js' && !novo?anterior:await fs.readFile(target);
  res.writeHead(200,{'Content-Type':types[path.extname(target)]??'application/octet-stream','Cache-Control':'no-store'});
  res.end(req.method==='HEAD'?undefined:content);
 }catch(error){res.writeHead(error.code==='ENOENT'?404:400);res.end('Recurso indisponivel');}
}).listen(port,'127.0.0.1',()=>console.log('PWA descartavel: http://pwa.localhost:'+port+' (v4 -> candidata, sem deploy)'));
