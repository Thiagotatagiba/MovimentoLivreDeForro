import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = process.argv.find(x=>x.startsWith('--fonte='))?.slice(8) ?? 'json';
const port = Number(process.argv.find(x=>x.startsWith('--porta='))?.slice(8) ?? 8765);
if (!['json','comparacao','supabase'].includes(source)) throw Error('Fonte invalida');
if (!Number.isInteger(port) || (port !== 0 && port < 1024) || port > 65535) throw Error('Porta invalida');
const types = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
  '.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png',
  '.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'};
const server = http.createServer(async (req,res)=>{
  try {
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const url = new URL(req.url,'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname);
    const parts = pathname.split(/[\\/]/);
    if (parts.some(p=>p.startsWith('.') && p !== '')) { res.writeHead(403); res.end(); return; }
    if (pathname === '/js/repositories/catalogoConfig.js') {
      res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});
      res.end(req.method==='HEAD' ? '' : 'export const FONTE_CATALOGO = '+JSON.stringify(source)+';');
      return;
    }
    const target = path.resolve(root,'.'+(pathname.endsWith('/') ? pathname+'index.html' : pathname));
    if (!target.startsWith(root+path.sep)) { res.writeHead(403); res.end(); return; }
    const content = await fs.readFile(target);
    res.writeHead(200,{'Content-Type':(types[path.extname(target)] ?? 'application/octet-stream'),
      'Cache-Control':'no-store'});
    res.end(req.method==='HEAD' ? undefined : content);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 400); res.end('Recurso indisponivel');
  }
});
server.on('error',error=>{ console.error('Servidor local: '+error.code); process.exitCode=1; });
server.listen(port,'127.0.0.1',()=>console.log('Homologacao local: http://127.0.0.1:'+server.address().port+' / fonte='+source+' (sem alterar a flag versionada)'));
