import {dependencias as deps} from './gestaoDependencias.js';
import {criarEditor,validarParaPublicar} from './editorModelo.js';
import {imagemDoEvento} from '../../js/utils/format.js';
const $=id=>document.getElementById(id);
let contexto=null,marca=null,editor=null,busy=false,epoch=0,verificacaoSessao=0,usuarioId=null,confirmarAcao=null;
const pode=p=>!!marca?.permissoes.includes(p);
const rotuloSituacao=s=>({confirmado:'Confirmado',adiado:'Adiado',cancelado:'Cancelado',interrompido:'Interrompido'})[s]??'Não publicado';
function mensagem(texto,erro=false){$('mensagem').textContent=texto;$('mensagem').classList.toggle('erro',erro);}
function listaLinhas(value){return value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);}
function lerForm(){
 const base=editor.estado().conteudo;
 return {...base,titulo:$('titulo').value,data:$('data').value,horario:$('horario').value,
  dataTermino:$('dataTermino').value,horarioTermino:$('horarioTermino').value,
  terminoEstimado:!$('horarios-confirmados').checked,descricao:$('descricao').value,
  lineup:{bandas:listaLinhas($('bandas').value),djs:listaLinhas($('djs').value)},
  ingresso:{...base.ingresso,tipoEntrada:$('tipo-entrada').value,
   precoAPartirDe:$('preco').value===''?null:Number($('preco').value),
   link:$('link-ingresso').value.trim()||'em breve'},ativo:$('ativo').checked};
}
function escreverForm(c){
 for(const id of ['titulo','data','horario','dataTermino','horarioTermino','descricao']) $(id).value=c[id]??'';
 $('horarios-confirmados').checked=!c.terminoEstimado;
 $('bandas').value=(c.lineup?.bandas??[]).join('\n');$('djs').value=(c.lineup?.djs??[]).join('\n');
 $('tipo-entrada').value=c.ingresso?.tipoEntrada??'';$('preco').value=c.ingresso?.precoAPartirDe??'';
 $('link-ingresso').value=c.ingresso?.link==='em breve'?'':c.ingresso?.link??'';$('ativo').checked=!!c.ativo;
 const imagem=imagemDoEvento(c);$('imagem').hidden=!imagem;$('sem-imagem').hidden=!!imagem;
 if(imagem) $('imagem').src=new URL(imagem,new URL('../',location.href)).href; else $('imagem').removeAttribute('src');
}
function atualizar(){
 $('marca').disabled=busy;
 for(const button of $('eventos').querySelectorAll('button')) button.disabled=busy;
 const state=editor?.estado();
 if(!state?.snapshot) return;
 const s=state.snapshot,travado=busy||!!state.conflito;
 for(const b of $('eventos').querySelectorAll('button'))if(b.dataset.id===s.evento.id)
  b.textContent=s.evento.versao?.conteudo.titulo??s.evento.slug;
 $('campos').disabled=travado||!pode('gerenciar_eventos');
 $('salvar').disabled=travado||!pode('gerenciar_eventos');
 $('publicar').disabled=travado||!pode('publicar_eventos')||state.alterado||!state.publicacaoPendente;
 $('recarregar').disabled=busy;
 $('situacao').disabled=travado||!pode('publicar_eventos')||!s.evento.versao_publicada_id||state.alterado;
 $('alterar-situacao').disabled=$('situacao').disabled;
 $('titulo-editor').textContent=state.conteudo.titulo||s.evento.slug;
 $('estado-editor').textContent=s.rascunho?'Rascunho · revisão '+s.revisao:'Versão publicada · sem rascunho';
 $('publicado').textContent=s.evento.versao?
  'Publicada: '+s.evento.versao.conteudo.titulo+' · versão '+s.evento.versao.numero+' · '+rotuloSituacao(s.evento.versao.situacao):
  'Este evento ainda não tem versão publicada.';
 $('situacao').value=s.evento.versao?.situacao??'confirmado';
 $('papel').textContent=pode('gerenciar_eventos')?
  (pode('publicar_eventos')?'Você pode editar rascunhos e publicar.':'Você pode editar rascunhos. A publicação depende de alguém com essa permissão.'):
  'Você pode publicar e alterar a situação. A edição do conteúdo fica com a equipe autorizada.';
 $('alteracoes').textContent=state.alterado?'Há alterações ainda não salvas.':
  (state.publicacaoPendente?'Rascunho salvo. Publicar é uma ação separada.':s.rascunho?'O rascunho corresponde à versão pública.':'Crie um rascunho para preparar alterações.');
}
function valor(campo,value){
 if(value==null||value==='')return 'Não informado';
 if(campo==='ativo')return value?'Visível':'Oculto';
 if(campo==='terminoEstimado')return value?'Horário estimado':'Horário confirmado';
 if(campo==='lineup')return [...(value.bandas??[]),...(value.djs??[])].join('\n')||'Nenhuma atração informada';
 if(campo==='ingresso')return [value.tipoEntrada,value.precoAPartirDe==null?'Valor não informado':
  Number(value.precoAPartirDe).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),value.link].filter(Boolean).join('\n');
 return String(value);
}
function mostrarConflito(){
 const state=editor.estado();$('conflito').hidden=!state.conflito;
 if(!state.conflito)return;
 $('comparacao').replaceChildren();
 for(const linha of state.conflito.linhas){
  const card=document.createElement('article');card.className='campo-conflito';
  const title=document.createElement('h3');title.textContent=linha.rotulo+(linha.conflito?' · alterado dos dois lados':'');
  const base=document.createElement('p');base.className='base-conflito';base.textContent='Quando você abriu: '+valor(linha.campo,linha.base);
  const sides=document.createElement('div');sides.className='versoes';
  for(const [origem,label] of [['local','Minha alteração'],['remoto','Versão atual da equipe']]){
   const option=document.createElement('label'),radio=document.createElement('input');radio.type='radio';
   radio.name='escolha-'+linha.campo;radio.value=origem;radio.required=true;
   radio.checked=!linha.conflito && origem===linha.sugerido;
   option.append(radio,document.createTextNode(' '+label));
   const text=document.createElement('p');text.textContent=valor(linha.campo,linha[origem]);option.append(text);sides.append(option);
  }
  card.append(title,base,sides);$('comparacao').append(card);
 }
 if(!state.conflito.linhas.length){
  const p=document.createElement('p');p.textContent='O conteúdo é igual, mas a revisão mudou. Use a revisão atual antes de tentar novamente.';$('comparacao').append(p);
 }
 $('conflito').scrollIntoView({behavior:'smooth',block:'start'});
}
async function rodar(fn,texto){
 if(busy)return;
 const atual=epoch;busy=true;atualizar();mensagem('Concluindo operação…');
 try {
  await fn();
  if(atual!==epoch)return;
  mostrarConflito();mensagem(texto);
 }catch(error){
  if(atual!==epoch)return;
  mostrarConflito();mensagem(error.message||'Não foi possível concluir a operação.',true);
 }finally{if(atual===epoch){busy=false;atualizar();}}
}
function aceitarTroca(){
 return !editor?.estado().alterado||window.confirm('Há alterações não salvas. Deseja descartá-las e continuar?');
}
async function abrirEvento(id,force=false){
 if(busy||(!force&&!aceitarTroca()))return;
 const atual=++epoch;editor=null;busy=true;$('editor').hidden=true;$('conflito').hidden=true;mensagem('Carregando evento…');
 try{
  const data=await deps.servico.carregarEvento(id);
  if(atual!==epoch)return;
  editor=criarEditor({servico:deps.servico});editor.carregar(data);escreverForm(data.conteudo);
  $('editor').hidden=false;mensagem('Evento carregado.');
  for(const b of $('eventos').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.id===id));
 }catch(e){if(atual===epoch)mensagem(e.message||'Não foi possível carregar o evento.',true);}
 finally{if(atual===epoch){busy=false;atualizar();}}
}
async function escolherMarca(){
 if(busy)return;
 const id=$('marca').value;
 if(!aceitarTroca()){$('marca').value=marca.id;return;}
 const atual=++epoch;marca=contexto.marcas.find(m=>m.id===id);editor=null;busy=true;
 $('editor').hidden=true;$('conflito').hidden=true;$('eventos').replaceChildren();mensagem('Carregando eventos…');
 try{
  const eventos=await deps.servico.listarEventos(marca.id);
  if(atual!==epoch)return;
  for(const e of eventos){
   const b=document.createElement('button');b.type='button';b.dataset.id=e.id;b.setAttribute('aria-pressed','false');
   b.textContent=e.versao?.conteudo.titulo??e.slug;b.addEventListener('click',()=>abrirEvento(e.id));$('eventos').append(b);
  }
  mensagem(eventos.length?'Escolha um evento para revisar.':'Nenhum evento disponível para esta marca.');
 }catch(e){if(atual===epoch)mensagem(e.message||'Não foi possível carregar os eventos.',true);}
 finally{if(atual===epoch){busy=false;atualizar();}}
}
async function iniciar(){
 const verificacao=++verificacaoSessao;
 let user;
 try{user=await deps.obterUsuario();}catch{if(verificacao===verificacaoSessao)mensagem('Não foi possível verificar sua sessão. Tente recarregar.',true);return;}
 if(verificacao!==verificacaoSessao)return;
 if(user?.id===usuarioId&&contexto)return;
 ++epoch;busy=false;confirmarAcao=null;if($('confirmacao').open)$('confirmacao').close();usuarioId=user?.id??null;contexto=null;marca=null;editor=null;
 $('painel').hidden=true;$('editor').hidden=true;$('conflito').hidden=true;$('entrar').hidden=!!user;
 $('marca').replaceChildren();$('eventos').replaceChildren();
 if(!user){mensagem('Entre com a conta autorizada pela sua marca.');return;}
 const atual=epoch;
 try{
  const novoContexto=await deps.servico.carregarContexto();if(atual!==epoch)return;contexto=novoContexto;
  if(!contexto.marcas.length){mensagem('Sua conta ainda não tem acesso à gestão de eventos.');return;}
  for(const m of contexto.marcas)$('marca').append(new Option(m.nome,m.id));
  $('painel').hidden=false;await escolherMarca();
 }catch(e){if(atual===epoch){contexto=null;mensagem(e.codigo==='SEM_PERMISSAO'?e.message:'A gestão de eventos está indisponível no momento. Tente novamente mais tarde.',true);}}
}
$('marca').addEventListener('change',escolherMarca);
$('entrar').addEventListener('click',deps.entrar);
$('recarregar').addEventListener('click',()=>{if(aceitarTroca())abrirEvento(editor.estado().snapshot.evento.id,true);});
$('form-evento').addEventListener('input',()=>{
 if(!editor||busy||!pode('gerenciar_eventos'))return;
 editor.editar(lerForm());atualizar();
});
$('form-evento').addEventListener('submit',event=>{
 event.preventDefault();if(!pode('gerenciar_eventos'))return;
 editor.editar(lerForm());rodar(()=>editor.salvar(),'Rascunho salvo. A versão pública não mudou.');
});
function revisar(tipo){
 if(busy||!pode('publicar_eventos'))return;
 try{
  const state=editor.estado();if(state.alterado)throw Error('Salve suas alterações antes de continuar.');
  if(tipo==='publicar'){
   if(!$('form-evento').reportValidity())return;
   validarParaPublicar(state.conteudo);
  }
  const situacaoEscolhida=$('situacao').value;
  confirmarAcao=tipo==='publicar'?()=>editor.publicar():()=>editor.alterarSituacao(situacaoEscolhida);
  $('titulo-confirmacao').textContent=tipo==='publicar'?'Publicar este rascunho?':'Atualizar a situação pública?';
  $('texto-confirmacao').textContent=tipo==='publicar'?
   'O conteúdo abaixo substituirá a versão pública. A situação operacional atual será preservada.':
   'Esta alteração ficará visível ao público e será registrada no histórico.';
  $('resumo-confirmacao').replaceChildren();
  const linhas=tipo==='publicar'?
   [['Evento',state.conteudo.titulo],['Início',state.conteudo.data+' às '+state.conteudo.horario],
    ['Término',state.conteudo.dataTermino+' às '+state.conteudo.horarioTermino],
    ['Situação preservada',rotuloSituacao(state.snapshot.evento.versao?.situacao??'confirmado')],
    ['Visibilidade',state.conteudo.ativo?'Visível no catálogo':'Oculto do catálogo'],
    ['Ingresso',valor('ingresso',state.conteudo.ingresso)]]:
   [['Evento',state.snapshot.evento.versao?.conteudo.titulo??state.conteudo.titulo],
    ['Situação anterior',rotuloSituacao(state.snapshot.evento.versao?.situacao)],
    ['Nova situação',rotuloSituacao($('situacao').value)]];
  for(const [label,value]of linhas){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('resumo-confirmacao').append(dt,dd);}
  $('confirmar').textContent=tipo==='publicar'?'Publicar agora':'Atualizar situação';
  $('confirmacao').showModal();
 }catch(e){mensagem(e.message,true);}
}
$('publicar').addEventListener('click',()=>revisar('publicar'));
$('alterar-situacao').addEventListener('click',()=>revisar('situacao'));
$('cancelar-confirmacao').addEventListener('click',()=>$('confirmacao').close());
$('confirmar').addEventListener('click',()=>{
 const fn=confirmarAcao;confirmarAcao=null;$('confirmacao').close();
 if(fn)rodar(fn,'Alteração publicada com histórico.');
});
$('form-conflito').addEventListener('submit',event=>{
 event.preventDefault();
 const escolhas=Object.fromEntries([...new FormData(event.target)].map(([k,v])=>[k.replace('escolha-',''),v]));
 try{const state=editor.resolver(escolhas);escreverForm(state.conteudo);mostrarConflito();atualizar();
  mensagem('Comparação preparada. Revise o formulário e salve o rascunho quando estiver pronto.');
 }catch(e){mensagem(e.message,true);}
});
window.addEventListener('beforeunload',event=>{
 if(editor?.estado().alterado){event.preventDefault();event.returnValue='';}
});
if(deps.demonstracao){$('demo').hidden=false;$('perfil-demo').textContent='Perfil fictício atual: '+deps.perfil;}
window.addEventListener('pageshow',iniciar);
deps.observarSessao(iniciar);
iniciar();
