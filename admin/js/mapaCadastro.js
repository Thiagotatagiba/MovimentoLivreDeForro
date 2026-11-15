// Public venue search only. No geolocation, bulk requests or offline tile downloads.
export function criarBuscaEnderecos({url,fetchImpl=fetch,agora=()=>Date.now()}){
 const cache=new Map();let ultimo=-Infinity,busy=false;
 return async texto=>{
  texto=texto.trim();if(texto.length<4)return [];
  if(cache.has(texto))return structuredClone(cache.get(texto));
  if(busy||agora()-ultimo<1100)throw Error('Aguarde um instante antes de buscar novamente.');
  const endpoint=new URL(url);if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password)throw Error('Busca de endereços indisponível.');
  endpoint.searchParams.set('q',texto);endpoint.searchParams.set('limit','5');
  busy=true;ultimo=agora();
  try{
   const response=await fetchImpl(endpoint,{signal:AbortSignal.timeout(12000),redirect:'error'});
   if(!response.ok)throw Error('Busca indisponível. Você ainda pode marcar o ponto no mapa.');
   const data=await response.json();
   const rows=(data.features??[]).filter(f=>f.geometry?.type==='Point'&&f.geometry.coordinates?.length===2&&f.geometry.coordinates.every(Number.isFinite)).map(f=>{
    const p=f.properties??{};return {nome:[p.name,p.street,p.housenumber,p.district,p.city,p.state,p.country].filter(Boolean).join(', '),
     latitude:f.geometry.coordinates[1],longitude:f.geometry.coordinates[0],logradouro:p.street??'',numero:p.housenumber??'',bairro:p.district??'',cidade:p.city??'',cep:p.postcode??''};
   });
   cache.set(texto,rows);return structuredClone(rows);
  }finally{busy=false;}
 };
}
export async function criarMapaCadastro({elemento,aoMarcar,aoErro}){
 const config=await (await fetch('../data/mapasConfig.json',{cache:'no-store'})).json();
 if(!window.L)throw Error('Não foi possível carregar o mapa. Atualize a página.');
 const tiles=new URL(config.tiles.replace('{z}','0').replace('{x}','0').replace('{y}','0'));
 if(tiles.protocol!=='https:')throw Error('Configuração do mapa inválida.');
 const map=L.map(elemento).setView(config.centro,12);
 L.tileLayer(config.tiles,{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map).on('tileerror',()=>aoErro('Algumas imagens do mapa não carregaram. Tente atualizar a página.'));
 let marker=null;
 function marcar(lat,lon){
  if(!marker){marker=L.marker([lat,lon],{draggable:true,alt:'Pino do local. Use as setas do teclado para ajustar.'}).addTo(map);marker.on('dragend',()=>{const p=marker.getLatLng();aoMarcar({latitude:p.lat,longitude:p.lng});});
   marker.getElement().addEventListener('keydown',e=>{const delta={ArrowUp:[0.0001,0],ArrowDown:[-0.0001,0],ArrowLeft:[0,-0.0001],ArrowRight:[0,0.0001]}[e.key];if(!delta)return;e.preventDefault();e.stopPropagation();const p=marker.getLatLng();marcar(Math.max(-90,Math.min(90,p.lat+delta[0])),Math.max(-180,Math.min(180,p.lng+delta[1])));});
  }
  else marker.setLatLng([lat,lon]);
  aoMarcar({latitude:lat,longitude:lon});
 }
 map.on('click',e=>marcar(e.latlng.lat,e.latlng.lng));
 return {buscar:criarBuscaEnderecos({url:config.busca}),selecionar(p){marcar(p.latitude,p.longitude);map.setView([p.latitude,p.longitude],17);},
  limpar(){if(marker){map.removeLayer(marker);marker=null;}},redimensionar:()=>map.invalidateSize(),destruir:()=>map.remove()};
}
