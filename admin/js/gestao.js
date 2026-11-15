import {dependencias as deps} from './gestaoDependencias.js?v=busca-marcas-1';
import {criarEditor,validarParaPublicar} from './editorModelo.js';
import {imagemDoEvento} from '../../js/utils/format.js';
import {criarNovoEvento,conteudoNovoEvento} from './novoEventoModelo.js';
const $=id=>document.getElementById(id);
$('link-equipe').hidden=deps.demonstracao;
let contexto=null,marca=null,editor=null,busy=false,epoch=0,verificacaoSessao=0,usuarioId=null,confirmarAcao=null;
let novo=false,criacao=null;
const pode=p=>!!marca?.permissoes.includes(p);
const rotuloSituacao=s=>({confirmado:'Confirmado',adiado:'Adiado',cancelado:'Cancelado',interrompido:'Interrompido'})[s]??'Não publicado';
function mensagem(texto,erro=false){$('mensagem').textContent=texto;$('mensagem').classList.toggle('erro',erro);}
function listaLinhas(value){return value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);}
function lerForm(){
 const base=editor.estado().conteudo;
 const conteudo={...base,titulo:$('titulo').value,data:$('data').value,horario:$('horario').value,
  dataTermino:$('dataTermino').value,horarioTermino:$('horarioTermino').value,
  terminoEstimado:!$('horarios-confirmados').checked,descricao:$('descricao').value,
  lineup:{bandas:listaLinhas($('bandas').value),djs:listaLinhas($('djs').value)},
  ingresso:{...base.ingresso,tipoEntrada:$('tipo-entrada').value,
   precoAPartirDe:$('preco').value===''?null:Number($('preco').value),
   link:$('link-ingresso').value.trim()||'em breve'},ativo:$('ativo').checked};
 if(novo){const url=$('imagem-url-nova').value.trim();if(url)conteudo.imagemUrl=url;else delete conteudo.imagemUrl;}
 return conteudo;
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
 $('marca').disabled=busy;$('marca-busca').disabled=busy;
 $('novo-evento').hidden=deps.demonstracao||!pode('gerenciar_eventos');$('novo-evento').disabled=busy;
 $('dados-novos').hidden=!novo;$('imagem-nova').hidden=!novo;$('cancelar-novo').hidden=!novo;$('cancelar-novo').disabled=busy;
 $('salvar').textContent=novo?'Criar rascunho':'Salvar rascunho';$('recarregar').hidden=novo;
 for(const button of $('eventos').querySelectorAll('button')) button.disabled=busy;
 const state=editor?.estado();
 if(!state?.snapshot) return;
 const s=state.snapshot,travado=busy||!!state.conflito;
 for(const b of $('eventos').querySelectorAll('button'))if(b.dataset.id===s.evento.id)
  b.textContent=s.evento.versao?.conteudo.titulo??s.conteudo.titulo??s.evento.slug;
 $('campos').disabled=travado||!pode('gerenciar_eventos');
 $('local-novo').disabled=!novo||travado||!pode('gerenciar_eventos');$('imagem-url-nova').disabled=$('local-novo').disabled;
 $('salvar').disabled=travado||!pode('gerenciar_eventos');
 $('publicar').disabled=travado||!pode('publicar_eventos')||state.alterado||!state.publicacaoPendente;
 $('recarregar').disabled=busy;
 $('situacao').disabled=travado||!pode('publicar_eventos')||!s.evento.versao_publicada_id||state.alterado;
 $('alterar-situacao').disabled=$('situacao').disabled;
 $('titulo-editor').textContent=state.conteudo.titulo||s.evento.slug;
 $('estado-editor').textContent=novo?'Novo evento · ainda não salvo':s.rascunho?'Rascunho · revisão '+s.revisao:'Versão publicada · sem rascunho';
 $('publicado').textContent=s.evento.versao?
  'Publicada: '+s.evento.versao.conteudo.titulo+' · versão '+s.evento.versao.numero+' · '+rotuloSituacao(s.evento.versao.situacao):
  'Este evento ainda não tem versão publicada.';
 $('situacao').value=s.evento.versao?.situacao??'confirmado';
 $('situacao-painel').hidden=novo||!s.evento.versao_publicada_id;
 $('ver-publico').hidden=s.evento.estado_publicacao!=='publicado'||!s.evento.versao_publicada_id;
 if(!$('ver-publico').hidden){const url=new URL('../evento.html',location.href);url.searchParams.set('slug',s.evento.slug);$('ver-publico').href=url.href;}
 $('papel').textContent=pode('gerenciar_eventos')?
  (pode('publicar_eventos')?'Você pode editar rascunhos e publicar.':'Você pode editar rascunhos. A publicação depende de alguém com essa permissão.'):
  'Você pode publicar e alterar a situação. A edição do conteúdo fica com a equipe autorizada.';
 $('alteracoes').textContent=novo?'Informe início e término confirmados. Criar o rascunho ainda não publica o evento.':state.alterado?'Há alterações ainda não salvas.':
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
 return (!editor?.estado().alterado&&!(novo&&$('local-novo').value))||window.confirm('Há alterações não salvas. Deseja descartá-las e continuar?');
}
function sairModoNovo(){novo=false;criacao?.limpar();criacao=null;}
function botaoEvento(e){
 const b=document.createElement('button');b.type='button';b.dataset.id=e.id;b.setAttribute('aria-pressed','false');
 b.textContent=e.versao?.conteudo.titulo??e.rascunho?.conteudo?.titulo??e.slug;b.addEventListener('click',()=>abrirEvento(e.id));return b;
}
async function abrirNovoEvento(){
 if(busy||!pode('gerenciar_eventos')||!aceitarTroca())return;
 const atual=++epoch;busy=true;editor=null;sairModoNovo();$('editor').hidden=true;$('conflito').hidden=true;mensagem('Preparando novo evento…');atualizar();
 try{const locais=await deps.servico.listarLocais();if(atual!==epoch)return;
  if(!locais.length)throw Error('Não há locais ativos disponíveis. Cadastre ou reative um local antes de criar esta edição.');
  $('local-novo').replaceChildren(new Option('Escolha um local',''),...locais.sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).map(l=>new Option(l.nome,l.id)));
  $('local-novo').value=locais.some(l=>l.id===marca.local_padrao_id)?marca.local_padrao_id:'';
  novo=true;criacao=criarNovoEvento({servico:deps.servico});editor=criarEditor({servico:deps.servico});
  editor.carregar({evento:{id:null,slug:'Novo evento',versao_publicada_id:null,versao:null},rascunho:null,conteudo:conteudoNovoEvento(),revisao:0});
  escreverForm(editor.estado().conteudo);$('imagem-url-nova').value='';$('editor').hidden=false;
  for(const b of $('eventos').querySelectorAll('button'))b.setAttribute('aria-pressed','false');
  mensagem('Preencha os dados para criar uma nova edição como rascunho.');$('titulo').focus();
 }catch(e){if(atual===epoch)mensagem(e.message||'Não foi possível preparar o novo evento.',true);}
 finally{if(atual===epoch){busy=false;atualizar();}}
}
async function abrirEvento(id,force=false){
 if(busy||(!force&&!aceitarTroca()))return;
 const atual=++epoch;sairModoNovo();editor=null;busy=true;$('editor').hidden=true;$('conflito').hidden=true;mensagem('Carregando evento…');atualizar();
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
 if(!aceitarTroca()){$('marca').value=marca.id;sincronizarMarca();return;}
 const atual=++epoch;sairModoNovo();marca=contexto.marcas.find(m=>m.id===id);sincronizarMarca();editor=null;busy=true;
 $('editor').hidden=true;$('conflito').hidden=true;$('eventos').replaceChildren();mensagem('Carregando eventos…');atualizar();
 try{
  const eventos=await deps.servico.listarEventos(marca.id);
  if(atual!==epoch)return;
  for(const e of eventos){
   $('eventos').append(botaoEvento(e));
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
 ++epoch;busy=false;sairModoNovo();confirmarAcao=null;if($('confirmacao').open)$('confirmacao').close();usuarioId=user?.id??null;contexto=null;marca=null;editor=null;
 $('form-evento').reset();$('local-novo').replaceChildren();$('imagem').removeAttribute('src');
 $('painel').hidden=true;$('editor').hidden=true;$('conflito').hidden=true;$('entrar').hidden=!!user;
 $('marca').replaceChildren();$('marcas-opcoes').replaceChildren();$('marca-busca').value='';$('eventos').replaceChildren();
 if(!user){mensagem('Entre com a conta autorizada pela sua marca.');return;}
 const atual=epoch;
 try{
  const novoContexto=await deps.servico.carregarContexto();if(atual!==epoch)return;contexto=novoContexto;
  if(!contexto.marcas.length){mensagem('Sua conta ainda não tem acesso à gestão de eventos.');return;}
  for(const m of contexto.marcas){
   const nome=contexto.marcas.filter(x=>x.nome===m.nome).length>1?m.nome+' ('+m.slug+')':m.nome;
   $('marca').append(new Option(nome,m.id));$('marcas-opcoes').append(new Option(nome,nome));
  }
  $('painel').hidden=false;await escolherMarca();
 }catch(e){if(atual===epoch){contexto=null;mensagem(e.codigo==='SEM_PERMISSAO'?e.message:'A gestão de eventos está indisponível no momento. Tente novamente mais tarde.',true);}}
}
function sincronizarMarca(){ $('marca-busca').value=$('marca').selectedOptions[0]?.textContent??''; }
$('marca-busca').addEventListener('input',()=>{
 if(busy)return;
 const opcao=[...$('marca').options].find(o=>o.textContent===$('marca-busca').value);
 if(opcao&&opcao.value!==$('marca').value){$('marca').value=opcao.value;escolherMarca();}
});
$('marca-busca').addEventListener('blur',sincronizarMarca);
$('marca-busca').addEventListener('focus',()=>{if(!busy)$('marca-busca').select();});
$('marca').addEventListener('change',escolherMarca);
$('novo-evento').addEventListener('click',abrirNovoEvento);
$('cancelar-novo').addEventListener('click',()=>{if(busy||!aceitarTroca())return;sairModoNovo();editor=null;escolherMarca();});
$('entrar').addEventListener('click',deps.entrar);
$('recarregar').addEventListener('click',()=>{if(aceitarTroca())abrirEvento(editor.estado().snapshot.evento.id,true);});
$('form-evento').addEventListener('input',()=>{
 if(!editor||busy||!pode('gerenciar_eventos'))return;
 editor.editar(lerForm());atualizar();
});
$('form-evento').addEventListener('submit',event=>{
 event.preventDefault();if(!pode('gerenciar_eventos'))return;
 if(novo){
  if(!$('form-evento').reportValidity())return;editor.editar(lerForm());const atual=epoch;
  rodar(async()=>{
   const data=await criacao.salvar({marcaId:marca.id,localId:$('local-novo').value,conteudo:editor.estado().conteudo});
   if(atual!==epoch)return;
   editor.carregar(data);sairModoNovo();escreverForm(data.conteudo);
   const button=botaoEvento({...data.evento,rascunho:data.rascunho});button.setAttribute('aria-pressed','true');$('eventos').prepend(button);
  },'Novo evento criado como rascunho. Confira os dados e use Revisar publicação para colocá-lo no site.');
  return;
 }
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
   (state.snapshot.evento.versao_publicada_id?'O conteúdo abaixo substituirá a versão pública. A situação operacional atual será preservada.':
    'O conteúdo abaixo será a primeira versão pública deste evento. Confira os dados antes de publicar.'):
   'Esta alteração ficará visível ao público e será registrada no histórico.';
  $('resumo-confirmacao').replaceChildren();
  const linhas=tipo==='publicar'?
   [['Evento',state.conteudo.titulo],['Início',state.conteudo.data+' às '+state.conteudo.horario],
    ['Término',state.conteudo.dataTermino+' às '+state.conteudo.horarioTermino],
    [state.snapshot.evento.versao_publicada_id?'Situação preservada':'Situação inicial',rotuloSituacao(state.snapshot.evento.versao?.situacao??'confirmado')],
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
 if(editor?.estado().alterado||(novo&&$('local-novo').value)){event.preventDefault();event.returnValue='';}
});
if(deps.demonstracao){$('demo').hidden=false;$('perfil-demo').textContent='Perfil fictício atual: '+deps.perfil;}
window.addEventListener('pageshow',iniciar);
deps.observarSessao(iniciar);
iniciar();
