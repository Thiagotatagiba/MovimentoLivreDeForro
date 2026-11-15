const igual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function alteracoesCadastro(conteudo,base){return Object.fromEntries(Object.entries(conteudo).filter(([k,v])=>!igual(v,base[k])));}
export function mudouEndereco(c,base){return !base||['endereco','latitude','longitude'].some(k=>!igual(c[k],base[k]));}
export function conteudoCadastro(tipo,row){
 const keys=tipo==='marca'?['descricao','frequencia','cidadeBase','instagram','whatsapp','site','logo','capa']:['tipo','descricao','instagram','site','telefone'];
 const c={nome:row.nome,ativo:row.ativo,...Object.fromEntries(keys.map(k=>[k,row.dados?.[k]??'']))};
 if(tipo==='marca')Object.assign(c,{localPadraoId:row.local_padrao_id??'',diasSemana:row.dados?.diasSemana??[],categorias:row.dados?.categorias??[]});
 else Object.assign(c,{endereco:Object.fromEntries(['logradouro','numero','bairro','complemento','cidade','estado','cep'].map(k=>[k,row.endereco?.[k]??''])),latitude:row.latitude??null,longitude:row.longitude??null});
 return c;
}
export function validarCadastro(tipo,c,base=null){
 if(!['marca','local'].includes(tipo))throw Error('Tipo de cadastro inválido.');
 if(typeof c.nome!=='string'||c.nome.trim().length<2||c.nome.trim().length>160)throw Error('Informe um nome de 2 a 160 caracteres.');
 for(const key of ['instagram','whatsapp','site','logo','capa'])if(c[key]&&c[key]!==base?.[key]){
  let u;try{u=new URL(c[key]);}catch{throw Error('Confira o endereço de '+key+'.');}
  if(u.protocol!=='https:'||u.username||u.password||c[key].length>2000||/[\s\x00-\x1f\x7f]/.test(c[key]))throw Error('Use URL HTTPS pública em '+key+'.');
 }
 if(tipo==='local'&&mudouEndereco(c,base)){
  for(const key of ['logradouro','numero','bairro','cidade','estado'])if(!c.endereco?.[key]?.trim())throw Error('Complete o endereço do local.');
  if(!/^[A-Z]{2}$/.test(c.endereco.estado))throw Error('Informe a UF com duas letras.');
  if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||Math.abs(c.latitude)>90||Math.abs(c.longitude)>180)throw Error('Confirme o ponto do local no mapa.');
 }
 return c;
}
export function criarSolicitadorCadastro({servico,novaChave=()=>crypto.randomUUID()}){
 let pendente=null,busy=false;
 return {limpar(){pendente=null;},async salvar(tipo,conteudo,edicao=null){
  if(busy)throw Error('Aguarde o cadastro em andamento.');
  validarCadastro(tipo,conteudo,edicao?.base);
  const dados=edicao?alteracoesCadastro(conteudo,edicao.base):conteudo;
  if(edicao&&!Object.keys(dados).length)throw Error('Nenhuma alteração para salvar.');
  const fingerprint=JSON.stringify({tipo,conteudo:dados,id:edicao?.id,revisao:edicao?.revisao});
  if(!pendente||pendente.fingerprint!==fingerprint)pendente={fingerprint,chave:novaChave()};
  busy=true;
  try{
   const metodo=(edicao?'editar':'criar')+(tipo==='marca'?'Marca':'Local');
   const result=await servico[metodo]({conteudo:structuredClone(dados),chave:pendente.chave,...(edicao?{id:edicao.id,revisao:edicao.revisao}:{})});
   pendente=null;return result;
  }catch(e){if(e.codigo&&e.codigo!=='INDISPONIVEL')pendente=null;throw e;}finally{busy=false;}
 }};
}
