export const estadosVip={aberta:'Lista aberta',suspensa:'Inscrições suspensas',encerrada:'Lista encerrada'};
export function acompanhantesDoTexto(texto,maximo=10){
 const nomes=texto.split(/\r?\n/).map(n=>n.trim()).filter(Boolean);
 if(nomes.length>maximo||nomes.some(n=>n.length>120||/[\x00-\x1f\x7f]/.test(n)))throw Error('Confira os nomes e o limite de acompanhantes.');
 return nomes;
}
export function idListaDaUrl(url){const id=new URL(url).searchParams.get('id');return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id??'')?id:null;}
export function criarSolicitadorVip(gerar=()=>crypto.randomUUID()){
 const pendentes=new Map();let ocupado=false;
 return {
  async executar(acao,parametros,executar){
   if(ocupado)throw Error('Aguarde a operação em andamento.');
   const fingerprint=JSON.stringify([acao,parametros]);
   if(!pendentes.has(fingerprint))pendentes.set(fingerprint,gerar());
   ocupado=true;
   try{const result=await executar({...parametros,chave:pendentes.get(fingerprint)});pendentes.delete(fingerprint);return result;}
   catch(e){if(e.codigo&&e.codigo!=='INDISPONIVEL')pendentes.delete(fingerprint);throw e;}
   finally{ocupado=false;}
  },limpar(){pendentes.clear();},
 };
}
export function mensagemErroVip(erro){
 return {CONFLITO:'A lista ou inscrição mudou. Use Atualizar e confira os dados antes de tentar novamente.',
  SEM_PERMISSAO:'Sua conta não tem acesso a esta operação.',VALIDACAO:'Confira nomes, termos, datas e limite de acompanhantes.',
  INDISPONIVEL:'Não foi possível confirmar a operação. Tente novamente sem mudar os dados.'}[erro.codigo]??erro.message??'Não foi possível concluir.';
}
