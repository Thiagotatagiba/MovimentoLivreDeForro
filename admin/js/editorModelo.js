import {validarHorarios} from '../../js/repositories/catalogoAdapter.js';
const clone=value=>structuredClone(value);
const canonical=value=>Array.isArray(value)?value.map(canonical):
 value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function normalizarConteudoEditor(c) {
 return {...c,titulo:c.titulo??'',data:c.data??'',horario:c.horario??'',
  dataTermino:c.dataTermino??'',horarioTermino:c.horarioTermino??'',descricao:c.descricao??'',
  terminoEstimado:!!c.terminoEstimado,
  lineup:{bandas:c.lineup?.bandas??[],djs:c.lineup?.djs??[]},
  ingresso:{...c.ingresso,tipoEntrada:c.ingresso?.tipoEntrada??'',
   precoAPartirDe:c.ingresso?.precoAPartirDe??null,link:c.ingresso?.link||'em breve'},ativo:!!c.ativo};
}
export const CAMPOS_EDITAVEIS=[
 ['titulo','Título'],['data','Data de início'],['horario','Horário de início'],
 ['dataTermino','Data de término'],['horarioTermino','Horário de término'],
 ['terminoEstimado','Confirmação de término'],['descricao','Descrição'],['ingresso','Ingresso'],
 ['lineup','Atrações'],['imagemUrl','Imagem'],['ativo','Visibilidade'],
];
export function compararEdicoes(base,local,remoto) {
 return CAMPOS_EDITAVEIS.filter(([campo])=>!equal(local[campo],remoto[campo])).map(([campo,rotulo])=>({
  campo,rotulo,base:clone(base[campo]),local:clone(local[campo]),remoto:clone(remoto[campo]),
  conflito:!equal(base[campo],local[campo]) && !equal(base[campo],remoto[campo]),
  sugerido:equal(base[campo],local[campo])?'remoto':'local',
 }));
}
export function validarParaPublicar(conteudo) {
 if(!String(conteudo.titulo??'').trim()) throw Error('Informe o título do evento.');
 validarHorarios(conteudo);
 if(conteudo.terminoEstimado) throw Error('Confirme o horário de término com o produtor antes de publicar.');
 if(conteudo.ingresso?.precoAPartirDe!=null && (!Number.isFinite(conteudo.ingresso.precoAPartirDe) || conteudo.ingresso.precoAPartirDe<0))
  throw Error('Informe um preço válido ou deixe o valor em branco.');
}
export function criarEditor({servico,novaChave=()=>crypto.randomUUID()}) {
 let snapshot=null,conteudo=null,conflito=null,pendente=null,busy=false;
 const estado=()=>({snapshot:clone(snapshot),conteudo:clone(conteudo),conflito:clone(conflito),busy,
   alterado:snapshot? !equal(conteudo,snapshot.conteudo):false,
   publicacaoPendente:!!snapshot?.rascunho && !equal(normalizarConteudoEditor(snapshot.evento.versao?.conteudo??{}),snapshot.conteudo)});
 function carregar(value) {snapshot=clone(value);snapshot.conteudo=normalizarConteudoEditor(snapshot.conteudo);conteudo=clone(snapshot.conteudo);conflito=null;pendente=null;}
 function editar(value) {if(busy)throw Error('Aguarde a operação atual.');conteudo=clone(value);}
 async function executar(tipo,args) {
  if(busy) throw Error('Aguarde a operação atual.');
  if(!snapshot) throw Error('Selecione um evento.');
  busy=true;
  try {
   const fingerprint=JSON.stringify({tipo,args});
   if(!pendente || pendente.fingerprint!==fingerprint) pendente={fingerprint,chave:novaChave()};
   const result=await servico[tipo]({...args,chave:pendente.chave});
   // RPC succeeded: update the local revision before any refresh can fail.
   if(tipo==='salvarRascunho') {
    snapshot={...snapshot,conteudo:clone(conteudo),rascunho:{conteudo:clone(conteudo),revisao:result.revisao},revisao:result.revisao};
   } else if(tipo==='publicarEvento') {
    snapshot={...snapshot,revisao:result.revisao,rascunho:{conteudo:clone(conteudo),revisao:result.revisao},
      evento:{...snapshot.evento,versao_publicada_id:result.versao_id,
        versao:{conteudo:clone(conteudo),numero:result.numero,situacao:snapshot.evento.versao?.situacao??'confirmado'}}};
   } else if(tipo==='alterarSituacao') {
    snapshot.evento.versao_publicada_id=result.versao_id;
    snapshot.evento.versao={...snapshot.evento.versao,numero:result.numero,situacao:result.situacao};
   }
   pendente=null;conflito=null;
   return result;
  } catch(error) {
   if(error.codigo==='CONFLITO') {
    const atual=await servico.carregarEvento(snapshot.evento.id);
    atual.conteudo=normalizarConteudoEditor(atual.conteudo);
    conflito={atual,linhas:compararEdicoes(snapshot.conteudo,conteudo,atual.conteudo)};
    pendente=null;
   }
   throw error;
  } finally {busy=false;}
 }
 return {
  estado,carregar,editar,
  salvar:()=>executar('salvarRascunho',{eventoId:snapshot?.evento.id,conteudo:clone(conteudo),revisao:snapshot?.revisao}),
  publicar:()=>{
   if(!snapshot?.rascunho) throw Error('Salve um rascunho antes de publicar.');
   if(estado().alterado) throw Error('Salve suas alterações antes de publicar.');
   validarParaPublicar(conteudo);
   return executar('publicarEvento',{eventoId:snapshot.evento.id,revisao:snapshot.revisao});
  },
  alterarSituacao:situacao=>{
   if(!snapshot?.evento.versao_publicada_id) throw Error('Este evento ainda não foi publicado.');
   if(estado().alterado) throw Error('Salve suas alterações antes de alterar a situação.');
   return executar('alterarSituacao',{eventoId:snapshot.evento.id,situacao,versaoId:snapshot.evento.versao_publicada_id});
  },
  resolver:escolhas=>{
   if(!conflito) throw Error('Não existe conflito aberto.');
   const mesclado=clone(conflito.atual.conteudo);
   for(const linha of conflito.linhas) {
    const escolha=escolhas[linha.campo];
    if(!['local','remoto'].includes(escolha)) throw Error('Escolha qual versão manter em cada campo.');
    if(escolha==='local') {
     if(linha.local===undefined) delete mesclado[linha.campo]; else mesclado[linha.campo]=clone(linha.local);
    }
   }
   snapshot=clone(conflito.atual);conteudo=mesclado;conflito=null;pendente=null;
   return estado();
  },
 };
}
