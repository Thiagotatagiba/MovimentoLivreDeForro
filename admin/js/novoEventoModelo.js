import {validarParaPublicar} from './editorModelo.js?v=condicoes-1';
export function conteudoNovoEvento(){return {titulo:'',data:'',horario:'',dataTermino:'',horarioTermino:'',
 terminoEstimado:true,descricao:'',lineup:{bandas:[],djs:[]},ingresso:{tipoEntrada:'',precoAPartirDe:null,link:'em breve'},ativo:true};}
export function validarImagemNova(value){
 if(!value)return;
 let url;try{url=new URL(value);}catch{throw Error('Informe uma URL HTTPS válida para a imagem ou deixe em branco.');}
 if(url.protocol!=='https:'||url.username||url.password||value.length>2000||url.href.length>2000||/[\s\x00-\x1f\x7f]/.test(value))throw Error('Use uma URL HTTPS sem usuário ou senha para a imagem.');
 return url.href;
}
export function snapshotCriado(result){return {
 evento:{id:result.evento_id,id_legado:result.id_legado,slug:result.slug,marca_id:result.marca_id,local_id:result.local_id,estado_publicacao:'rascunho',versao_publicada_id:null,versao:null},
 rascunho:{conteudo:result.conteudo,revisao:result.revisao},conteudo:result.conteudo,revisao:result.revisao,
};}
export function criarNovoEvento({servico,novaChave=()=>crypto.randomUUID()}){
 let pendente=null,busy=false;
 return {async salvar({marcaId,localId,conteudo}){
  if(busy)throw Error('Aguarde a criação em andamento.');
  if(!marcaId||!localId)throw Error('Escolha a marca e o local desta edição.');
  validarParaPublicar(conteudo);validarImagemNova(conteudo.imagemUrl);
  const args={marcaId,localId,conteudo:structuredClone(conteudo)};
  if(args.conteudo.imagemUrl)args.conteudo.imagemUrl=validarImagemNova(args.conteudo.imagemUrl);
  const fingerprint=JSON.stringify(args);
  if(!pendente||pendente.fingerprint!==fingerprint)pendente={fingerprint,chave:novaChave()};
  busy=true;
  try{const result=await servico.criarEvento({...args,chave:pendente.chave});pendente=null;return snapshotCriado(result);}
  catch(error){if(error.codigo&&error.codigo!=='INDISPONIVEL')pendente=null;throw error;}
  finally{busy=false;}
 },limpar(){pendente=null;}};
}
