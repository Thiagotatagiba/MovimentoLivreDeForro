export function validarCadastro(tipo,c){
 if(!['marca','local'].includes(tipo))throw Error('Tipo de cadastro inválido.');
 if(typeof c.nome!=='string'||c.nome.trim().length<2||c.nome.trim().length>160)throw Error('Informe um nome de 2 a 160 caracteres.');
 for(const key of ['instagram','whatsapp','site','logo','capa'])if(c[key]){
  let u;try{u=new URL(c[key]);}catch{throw Error('Confira o endereço de '+key+'.');}
  if(u.protocol!=='https:'||u.username||u.password||c[key].length>2000||/[\s\x00-\x1f\x7f]/.test(c[key]))throw Error('Use URL HTTPS pública em '+key+'.');
 }
 if(tipo==='local'){
  for(const key of ['logradouro','numero','bairro','cidade','estado'])if(!c.endereco?.[key]?.trim())throw Error('Complete o endereço do local.');
  if(!/^[A-Z]{2}$/.test(c.endereco.estado))throw Error('Informe a UF com duas letras.');
  if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||Math.abs(c.latitude)>90||Math.abs(c.longitude)>180)throw Error('Confirme o ponto do local no mapa.');
 }
 return c;
}
export function criarSolicitadorCadastro({servico,novaChave=()=>crypto.randomUUID()}){
 let pendente=null,busy=false;
 return {limpar(){pendente=null;},async salvar(tipo,conteudo){
  if(busy)throw Error('Aguarde o cadastro em andamento.');
  validarCadastro(tipo,conteudo);
  const fingerprint=JSON.stringify({tipo,conteudo});
  if(!pendente||pendente.fingerprint!==fingerprint)pendente={fingerprint,chave:novaChave()};
  busy=true;
  try{
   const result=await servico[tipo==='marca'?'criarMarca':'criarLocal']({conteudo:structuredClone(conteudo),chave:pendente.chave});
   pendente=null;return result;
  }catch(e){if(e.codigo&&e.codigo!=='INDISPONIVEL')pendente=null;throw e;}finally{busy=false;}
 }};
}
