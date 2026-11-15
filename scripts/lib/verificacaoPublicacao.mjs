import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

export const arquivosPublicacao=[
 'admin/cadastros.html','admin/js/cadastros.js','admin/js/cadastroModelo.js','admin/js/mapaCadastro.js','data/mapasConfig.json',
 'index.html','agenda.html','evento.html','favoritos.html','carteira.html',
 'css/components.css',
 'js/repositories/catalogoConfig.js','js/repositories/catalogoAdapter.js',
 'js/repositories/catalogoRepository.js','js/repositories/catalogoSupabase.js',
 'js/utils/midiasLocais.js','js/utils/eventoPublico.js','js/utils/cardEvento.js',
 'js/pages/home.js','js/pages/evento.js','data/supabaseClient.js','sw.js','manifest.json',
 'assets/eventos/festival-praca-viva-2026-12.jpg',
 'admin/gestao.html','admin/convites.html','admin/listas.html',
 'admin/css/gestao.css','admin/css/convites.css',
 'admin/js/gestao.js','admin/js/gestaoDependencias.js','admin/js/editorModelo.js',
 'admin/js/novoEventoModelo.js',
 'admin/js/convites.js','admin/js/conviteModelo.js','admin/js/listas.js',
 'lista-vip.html','css/listas-vip.css','js/pages/lista-vip.js','js/utils/vipModelo.js',
 'services/administracaoService.js','services/listasVipService.js','components/loginModal.js',
];
const hash=(bytes,arquivo)=>createHash('sha256').update(/\.(?:html|js|json|css)$/.test(arquivo)?
 Buffer.from(bytes).toString('utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n'):bytes).digest('hex');
export async function criarManifesto(root=new URL('../../',import.meta.url)) {
 return Promise.all(arquivosPublicacao.map(async arquivo=>({arquivo,sha256:hash(await fs.readFile(new URL(arquivo,root)),arquivo)})));
}
export async function verificarPublicacao({base='https://vaiterforro.com.br/',manifesto,fetchImpl=fetch}={}) {
 const url=new URL(base);
 if(url.protocol!=='https:' && !(url.protocol==='http:' && ['127.0.0.1','localhost'].includes(url.hostname)))
  throw Error('Use HTTPS ou servidor local.');
 if(url.username || url.password || url.search || url.hash) throw Error('Endereco de publicacao invalido.');
 if(!Array.isArray(manifesto)||!manifesto.length)throw Error('Manifesto de publicacao vazio.');
 const arquivos=await Promise.all(manifesto.map(async item=>{
  try {
   const path=new URL(item.arquivo,url);path.searchParams.set('verificacao',item.sha256.slice(0,16));
   const response=await fetchImpl(path,{method:'GET',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!response.ok)return {arquivo:item.arquivo,igual:false,http:response.status};
   const atual=hash(new Uint8Array(await response.arrayBuffer()),item.arquivo);
   return {arquivo:item.arquivo,igual:atual===item.sha256,http:response.status};
  } catch {return {arquivo:item.arquivo,igual:false,erro:'recurso indisponivel'};}
 }));
 return {base:url.href,publicacaoConfirmada:arquivos.every(a=>a.igual),arquivos};
}
