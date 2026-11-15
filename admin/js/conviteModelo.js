export const permissoesConvite={editar_marca:'Editar a marca',gerenciar_eventos:'Editar eventos',
 publicar_eventos:'Publicar eventos',gerenciar_listas:'Gerenciar listas',consultar_listas:'Consultar listas'};
export const chaveEntradaConvite='vtf.convite.entrada';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function lerEntradaConvite(storage,agora=Date.now()) {
 try {
  const raw=storage.getItem(chaveEntradaConvite);if(!raw)return null;
  const entry=JSON.parse(raw),age=agora-entry.instante,params=new URLSearchParams(entry.fragmento.slice(1));
  const conviteId=params.get('convite'),token=params.get('token');
  if(!Number.isFinite(age)||age<0||age>15*60*1000||!uuid.test(conviteId??'')||!/^[a-f0-9]{64}$/.test(token??''))throw Error();
  return {conviteId,token};
 }catch{storage.removeItem(chaveEntradaConvite);return null;}
}
export function novoTokenConvite(gerador=crypto) {
 return [...gerador.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function linkConvite(base,conviteId,token) {
 if(!uuid.test(conviteId)||!/^[a-f0-9]{64}$/.test(token))throw Error('Convite inválido.');
 const url=new URL('convites.html',base);url.hash=new URLSearchParams({convite:conviteId,token}).toString();return url.href;
}
export function estadoConvite(convite,agora=Date.now()) {
 return convite.estado==='pendente'&&new Date(convite.expira_em).getTime()<=agora?'expirado':convite.estado;
}
