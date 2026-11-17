import {validarParaPublicar} from './editorModelo.js?v=condicoes-1';
export function errosNovoEvento(c,localId){
 const erros=[];const add=(campo,mensagem)=>erros.push({campo,mensagem});
 if(!localId)add('local-novo','Escolha o local desta edição.');
 if(!String(c.titulo??'').trim())add('titulo','Informe o título do evento.');
 else if(c.titulo.length>200)add('titulo','Use até 200 caracteres no título.');
 const dataValida=d=>/^\d{4}-\d{2}-\d{2}$/.test(d??'')&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 const horaValida=h=>/^([01]\d|2[0-3]):[0-5]\d$/.test(h??'');
 for(const [campo,rotulo,validar] of [['data','a data de início',dataValida],['horario','o horário de início',horaValida],['dataTermino','a data de término',dataValida],['horarioTermino','o horário de término',horaValida]])if(!validar(c[campo]))add(campo,'Informe '+rotulo+' '+(campo.startsWith('data')?'válida.':'válido.'));
 if(dataValida(c.data)&&dataValida(c.dataTermino)&&horaValida(c.horario)&&horaValida(c.horarioTermino)&&c.dataTermino+'T'+c.horarioTermino<=c.data+'T'+c.horario)add('dataTermino','O término deve ser depois do início. Se o baile atravessa a meia-noite, escolha a data do dia seguinte.');
 if(c.terminoEstimado)add('horarios-confirmados','Confirme os horários de início e término com o produtor.');
 if(c.ingresso?.precoAPartirDe!=null&&(!Number.isFinite(c.ingresso.precoAPartirDe)||c.ingresso.precoAPartirDe<0))add('preco','Informe um preço válido ou deixe em branco.');
 try{validarImagemNova(c.imagemUrl);}catch(error){add('imagem-url-nova',error.message);}
 return erros;
}
export function resumoNovoEvento({conteudo:c,marca,local}){
 const data=d=>/^\d{4}-\d{2}-\d{2}$/.test(d??'')?d.split('-').reverse().join('/'):'Não informada';
 const inicio=data(c.data)+' às '+(c.horario||'—'),fim=data(c.dataTermino)+' às '+(c.horarioTermino||'—');
 let duracao='Informe início e término';
 if(!errosNovoEvento(c,'local').some(e=>['data','horario','dataTermino','horarioTermino'].includes(e.campo))){const minutos=(Date.parse(c.dataTermino+'T'+c.horarioTermino+':00Z')-Date.parse(c.data+'T'+c.horario+':00Z'))/60000;duracao=Math.floor(minutos/60)+'h'+(minutos%60?' '+minutos%60+'min':'');}
 const ingresso=c.ingresso??{},preco=ingresso.precoAPartirDe;
 return [['Evento',c.titulo?.trim()||'Título não informado'],['Marca',marca||'Não selecionada'],['Local',local||'Não selecionado'],['Início',inicio],['Término',fim],['Duração',duracao],['Atrações',[...(c.lineup?.bandas??[]),...(c.lineup?.djs??[])].join(' · ')||'Não informadas'],['Ingresso',(ingresso.tipoEntrada||'Tipo não informado')+(Number.isFinite(preco)?' · a partir de '+preco.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'')],['Link do ingresso',ingresso.link&&ingresso.link!=='em breve'?ingresso.link:'Não informado'],['Descrição',c.descricao?.trim()||'Não informada'],['Condições especiais',(c.condicoesEspeciais??[]).map(x=>(x.tipo==='aniversariante'?'Aniversariante':'Outros')+': '+x.descricao).join('\n')||'Não informadas'],['Imagem',c.imagemUrl||'Não informada'],['Após publicar',c.ativo?'Visível no catálogo':'Oculto do catálogo']];
}
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
