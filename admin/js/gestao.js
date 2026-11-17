import {dependencias as deps} from './gestaoDependencias.js?v=menu-1';
import {criarEditor,validarParaPublicar} from './editorModelo.js?v=menu-1';
import {imagemDoEvento} from '../../js/utils/format.js';
import {criarNovoEvento,conteudoNovoEvento,errosNovoEvento,resumoNovoEvento} from './novoEventoModelo.js?v=revisao-1';
import {criarServicoListasVip} from '../../services/listasVipService.js';
import {criarSolicitadorVip,mensagemErroVip} from '../../js/utils/vipModelo.js';
import {eventoDaBusca,estadoListaNoEvento} from './listaNoEventoModelo.js?v=1';
import {criarSeletorMarca,melhorarSelect} from './seletorMarca.js?v=2';
import {estadoTipoEntrada,lerTipoEntrada} from './entradaEvento.js?v=1';
const $=id=>document.getElementById(id);
const seletorMarca=criarSeletorMarca({raiz:$('seletor-marca'),select:$('marca'),botao:$('marca-abrir'),busca:$('marca-busca'),painel:$('marca-painel'),lista:$('marcas-opcoes'),vazio:$('marca-vazia'),status:$('marca-resultados')});
const seletorLocal=melhorarSelect($('local-novo'),{singular:'local',plural:'locais',buscar:'Buscar local',vazio:'Nenhum local encontrado.',marcarAlteracao:true});
function atualizarTipoEntrada(){const outro=$('tipo-entrada').value==='__outro__';$('entrada-personalizada').hidden=!outro;$('tipo-entrada-outro').disabled=!outro;$('tipo-entrada-outro').required=outro;}
$('tipo-entrada').addEventListener('input',atualizarTipoEntrada);
$('tipo-entrada').addEventListener('change',atualizarTipoEntrada);

let contexto=null,marca=null,editor=null,busy=false,epoch=0,verificacaoSessao=0,usuarioId=null,confirmarAcao=null;
let novo=false,criacao=null;
let tentouCriar=false,mensagemConfirmacao='Alteração publicada com histórico.';
function escreverResumo(destino,linhas){destino.replaceChildren();for(const [rotulo,texto] of linhas){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=rotulo;dd.textContent=texto;destino.append(dt,dd);}}
function linhasNovoEvento(c){return resumoNovoEvento({conteudo:c,marca:marca?.nome,local:$('local-novo').value?$('local-novo').selectedOptions[0]?.textContent:null});}
function errosCadastro(c,focar=false){
 const erros=novo&&tentouCriar?errosNovoEvento(c,$('local-novo').value):[];
 for(const id of ['local-novo','titulo','data','horario','dataTermino','horarioTermino','horarios-confirmados','preco','imagem-url-nova']){const el=$(id==='local-novo'?'local-novo-abrir':id);el.removeAttribute('aria-invalid');el.removeAttribute('aria-describedby');}
 $('lista-erros-evento').replaceChildren();
 for(const [i,erro] of erros.entries()){
  const alvo=erro.campo==='local-novo'?$('local-novo-abrir'):$(erro.campo),li=document.createElement('li'),a=document.createElement('a');li.id='erro-evento-'+i;a.href='#'+alvo.id;a.textContent=erro.mensagem;a.onclick=event=>{event.preventDefault();alvo.focus();};li.append(a);$('lista-erros-evento').append(li);alvo.setAttribute('aria-invalid','true');alvo.setAttribute('aria-describedby',li.id);
 }
 $('erros-novo-evento').hidden=!erros.length;if(focar&&erros.length)$('titulo-erros-evento').focus();return erros;
}
const pode=p=>!!marca?.permissoes.includes(p);
const servicoListas=criarServicoListasVip(),solicitacoesLista=criarSolicitadorVip();
let listaEvento={geracao:-1,id:null,registro:null,carregando:false,erro:false},listaFormAberto=false,listaFormAlterado=false,acaoLista=null;
function limparListaDoEvento(){
 listaEvento={geracao:epoch,id:null,registro:null,carregando:false,erro:false};listaFormAberto=listaFormAlterado=false;acaoLista=null;solicitacoesLista.limpar();$('form-lista-evento').reset();if($('confirmacao-lista-evento').open)$('confirmacao-lista-evento').close();
}
async function conferirListaDoEvento(id){
 const geracao=epoch,versao=editor?.estado().snapshot?.evento.versao_publicada_id;listaEvento.id=id;listaEvento.versao=versao;listaEvento.carregando=true;listaEvento.erro=false;
 try{const rows=await servicoListas.gestao();if(geracao!==epoch||listaEvento.id!==id||listaEvento.versao!==versao)return;listaEvento.registro=rows.find(r=>r.evento_id===id)??null;}
 catch{if(geracao===epoch&&listaEvento.id===id&&listaEvento.versao===versao)listaEvento.erro=true;}
 finally{if(geracao===epoch&&listaEvento.id===id&&listaEvento.versao===versao){listaEvento.carregando=false;atualizar();}}
}
function atualizarListaDoEvento(state){
 if(listaEvento.geracao!==epoch)limparListaDoEvento();
 const e=state?.snapshot?.evento;$('lista-do-evento').hidden=!e;if(!e)return;
 const permitido=pode('gerenciar_listas')||pode('consultar_listas');
 if(e.id&&e.versao_publicada_id&&permitido&&(listaEvento.id!==e.id||listaEvento.versao!==e.versao_publicada_id)&&!deps.demonstracao)conferirListaDoEvento(e.id);
 const view=estadoListaNoEvento({evento:e,podeGerenciar:pode('gerenciar_listas'),podeConsultar:pode('consultar_listas'),alterado:state.alterado,publicacaoPendente:state.publicacaoPendente,registro:listaEvento.registro,carregando:listaEvento.carregando,erro:listaEvento.erro});
 $('lista-evento-status').textContent=deps.demonstracao?'Listas integradas disponíveis no ambiente Supabase. Nenhuma operação de lista é executada nesta demonstração local.':view.texto;
 $('abrir-lista-evento').hidden=deps.demonstracao||!view.criar||listaFormAberto;$('abrir-lista-evento').disabled=busy;
 $('gerenciar-lista-evento').hidden=deps.demonstracao||!view.gerenciar||busy;
 if(view.gerenciar){const url=new URL('listas.html',location.href);url.searchParams.set('evento',e.id);$('gerenciar-lista-evento').href=url.href;$('gerenciar-lista-evento').textContent=view.acao;}else $('gerenciar-lista-evento').removeAttribute('href');
 $('atualizar-lista-evento').hidden=deps.demonstracao||!e.id||!e.versao_publicada_id||!permitido;$('atualizar-lista-evento').disabled=busy||listaEvento.carregando;
 $('form-lista-evento').hidden=!view.criar||!listaFormAberto||deps.demonstracao;$('campos-lista-evento').disabled=busy;
}
$('abrir-lista-evento').onclick=()=>{if(busy)return;listaFormAberto=true;atualizar();$('lista-titulo').focus();};
$('cancelar-lista-evento').onclick=()=>{if(busy||listaFormAlterado&&!window.confirm('Descartar os dados ainda não salvos da lista?'))return;listaFormAberto=listaFormAlterado=false;$('form-lista-evento').reset();atualizar();};
$('form-lista-evento').addEventListener('input',()=>{listaFormAlterado=true;});
$('atualizar-lista-evento').onclick=()=>{const id=editor?.estado().snapshot?.evento.id;if(!busy&&id)conferirListaDoEvento(id);};
$('gerenciar-lista-evento').onclick=e=>{if(busy||!aceitarTroca())e.preventDefault();};
$('form-lista-evento').onsubmit=event=>{
 event.preventDefault();if(busy||!pode('gerenciar_listas'))return;const state=editor?.estado(),e=state?.snapshot?.evento;
 if(!e?.versao_publicada_id||state.alterado||listaEvento.registro?.lista)return;
 try{
  const params={eventoId:e.id,titulo:$('lista-titulo').value.trim(),termos:$('lista-termos').value.trim(),prazo:new Date($('lista-prazo').value).toISOString(),inicio:new Date($('lista-inicio').value).toISOString(),fim:new Date($('lista-fim').value).toISOString(),maxAcompanhantes:Number($('lista-maximo').value)};
  if(!params.titulo||!params.termos)throw Error('Informe o título e os termos da lista.');
  const publicado=e.versao?.conteudo??state.conteudo,date=x=>new Date(x).toLocaleString('pt-BR');
  $('resumo-lista-evento').textContent='Evento: '+publicado.titulo+' · '+publicado.data+' às '+publicado.horario+'\n\nLista: '+params.titulo+'\n'+params.termos+'\n\nPrazo: '+date(params.prazo)+'\nBenefício: '+date(params.inicio)+' a '+date(params.fim)+'\nAcompanhantes por titular: '+params.maxAcompanhantes;
  const geracao=epoch;
  acaoLista=async()=>{
   try{
    const result=await solicitacoesLista.executar('criar',params,p=>servicoListas.criar(p));if(geracao!==epoch)return;
    listaEvento.registro={...listaEvento.registro,lista:{id:result.lista_id,titulo:params.titulo,estado:'aberta',revisao:result.revisao}};listaFormAberto=listaFormAlterado=false;$('form-lista-evento').reset();
    await conferirListaDoEvento(e.id);
   }catch(error){if(geracao===epoch&&error.codigo!=='INDISPONIVEL')await conferirListaDoEvento(e.id);throw Error(mensagemErroVip(error));}
  };$('confirmacao-lista-evento').showModal();
 }catch(error){mensagem(error instanceof RangeError?'Confira as datas e horários da lista.':error.message,true);}
};
$('voltar-lista-evento').onclick=()=>{acaoLista=null;$('confirmacao-lista-evento').close();};
$('confirmacao-lista-evento').addEventListener('cancel',()=>{acaoLista=null;});
$('confirmar-lista-evento').onclick=()=>{const fn=acaoLista;acaoLista=null;$('confirmacao-lista-evento').close();if(fn)rodar(fn,'Lista criada para este evento.');};
const rotuloSituacao=s=>({confirmado:'Confirmado',adiado:'Adiado',cancelado:'Cancelado',interrompido:'Interrompido'})[s]??'Não publicado';
function mensagem(texto,erro=false){$('mensagem').textContent=texto;$('mensagem').classList.toggle('erro',erro);}
function listaLinhas(value){return value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);}
function lerForm(){
 const base=editor.estado().conteudo;
 const conteudo={...base,titulo:$('titulo').value,data:$('data').value,horario:$('horario').value,
  dataTermino:$('dataTermino').value,horarioTermino:$('horarioTermino').value,
  terminoEstimado:!$('horarios-confirmados').checked,descricao:$('descricao').value,
  condicoesEspeciais:[...$('condicoes-lista').children].map(row=>({tipo:row.querySelector('select').value,descricao:row.querySelector('textarea').value})).filter(c=>c.descricao.trim()),
  lineup:{bandas:listaLinhas($('bandas').value),djs:listaLinhas($('djs').value)},
  ingresso:{...base.ingresso,tipoEntrada:lerTipoEntrada($('tipo-entrada').value,$('tipo-entrada-outro').value),
   precoAPartirDe:$('preco').value===''?null:Number($('preco').value),
   link:$('link-ingresso').value.trim()||'em breve'},ativo:$('ativo').checked};
 if(novo){const url=$('imagem-url-nova').value.trim();if(url)conteudo.imagemUrl=url;else delete conteudo.imagemUrl;}
 return conteudo;
}
function adicionarCondicao(c={tipo:'aniversariante',descricao:''}){
 const row=document.createElement('div');row.className='condicao-editor';
 const tipo=document.createElement('select');tipo.setAttribute('aria-label','Tipo da condição');tipo.append(new Option('Aniversariante','aniversariante'),new Option('Outros','outros'));tipo.value=c.tipo;
 const descricao=document.createElement('textarea');descricao.setAttribute('aria-label','Descrição da condição');descricao.rows=3;descricao.value=c.descricao??'';
 const remover=document.createElement('button');remover.type='button';remover.className='secundario';remover.textContent='Remover condição';remover.addEventListener('click',()=>{row.remove();$('form-evento').dispatchEvent(new Event('input',{bubbles:true}));});
 row.append(tipo,descricao,remover);$('condicoes-lista').append(row);return descricao;
}
$('adicionar-condicao').addEventListener('click',()=>{if(!busy&&pode('gerenciar_eventos'))adicionarCondicao().focus();});
function escreverForm(c){
 $('condicoes-lista').replaceChildren();for(const condicao of c.condicoesEspeciais??[])adicionarCondicao(condicao);
 for(const id of ['titulo','data','horario','dataTermino','horarioTermino','descricao']) $(id).value=c[id]??'';
 $('horarios-confirmados').checked=!c.terminoEstimado;
 $('bandas').value=(c.lineup?.bandas??[]).join('\n');$('djs').value=(c.lineup?.djs??[]).join('\n');
 const entrada=estadoTipoEntrada(c.ingresso?.tipoEntrada??'');$('tipo-entrada').value=entrada.opcao;$('tipo-entrada-outro').value=entrada.outro;atualizarTipoEntrada();$('preco').value=c.ingresso?.precoAPartirDe??'';
 $('link-ingresso').value=c.ingresso?.link==='em breve'?'':c.ingresso?.link??'';$('ativo').checked=!!c.ativo;
 const imagem=imagemDoEvento(c);$('imagem').hidden=!imagem;$('sem-imagem').hidden=!!imagem;
 if(imagem) $('imagem').src=new URL(imagem,new URL('../',location.href)).href; else $('imagem').removeAttribute('src');
}
function atualizar(){
 $('marca').disabled=busy;seletorMarca.desabilitar(busy);
 $('novo-evento').hidden=deps.demonstracao||!pode('gerenciar_eventos');$('novo-evento').disabled=busy;
 $('dados-novos').hidden=!novo;$('imagem-nova').hidden=!novo;$('cancelar-novo').hidden=!novo;$('cancelar-novo').disabled=busy;
 $('salvar').textContent=novo?'Revisar novo evento':'Salvar rascunho';$('recarregar').hidden=novo;
 for(const button of $('eventos').querySelectorAll('button')) button.disabled=busy;
 const state=editor?.estado();
 $('resumo-novo-evento').hidden=!novo;$('duracao-evento').hidden=!novo;
 if(novo&&state){const linhas=linhasNovoEvento(state.conteudo);escreverResumo($('dados-resumo-evento'),linhas.slice(0,8));$('duracao-evento').textContent='Duração desta edição: '+linhas.find(([r])=>r==='Duração')[1]+'. Horários de Brasília.';errosCadastro(state.conteudo);}
 atualizarListaDoEvento(state);
 if(!state?.snapshot) return;
 const s=state.snapshot,travado=busy||!!state.conflito;
 if(!deps.demonstracao){const url=new URL(location.href);if(s.evento.id){url.searchParams.set('evento',s.evento.id);url.searchParams.delete('acao');}else if(novo){url.searchParams.delete('evento');url.searchParams.set('acao','novo');}if(url.href!==location.href)history.replaceState(null,'',url.href);}
 for(const b of $('eventos').querySelectorAll('button'))if(b.dataset.id===s.evento.id)
  b.textContent=s.evento.versao?.conteudo.titulo??s.conteudo.titulo??s.evento.slug;
 $('campos').disabled=travado||!pode('gerenciar_eventos');
 $('local-novo').disabled=!novo||travado||!pode('gerenciar_eventos');$('imagem-url-nova').disabled=$('local-novo').disabled;
 seletorLocal.sincronizar();
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
 if(campo==='condicoesEspeciais')return value.map(c=>(c.tipo==='aniversariante'?'Aniversariante':'Outros')+': '+c.descricao).join('\n')||'Nenhuma condição especial';
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
 return (!listaFormAlterado&&!editor?.estado().alterado&&!(novo&&$('local-novo').value))||window.confirm('Há alterações não salvas. Deseja descartá-las e continuar?');
}
function sairModoNovo(){novo=false;tentouCriar=false;errosCadastro({});criacao?.limpar();criacao=null;}
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
 ++epoch;busy=false;limparListaDoEvento();sairModoNovo();confirmarAcao=null;if($('confirmacao').open)$('confirmacao').close();usuarioId=user?.id??null;contexto=null;marca=null;editor=null;
 $('form-evento').reset();$('local-novo').replaceChildren();$('imagem').removeAttribute('src');
 $('painel').hidden=true;$('editor').hidden=true;$('conflito').hidden=true;$('entrar').hidden=!!user;
 $('marca').replaceChildren();seletorMarca.fechar();sincronizarMarca();$('eventos').replaceChildren();
 if(!user){mensagem('Entre com a conta autorizada pela sua marca.');return;}
 const atual=epoch;
 try{
  const novoContexto=await deps.servico.carregarContexto();if(atual!==epoch)return;contexto=novoContexto;
  if(!contexto.marcas.length){mensagem('Sua conta ainda não tem acesso à gestão de eventos.');return;}
  for(const m of contexto.marcas){
   const nome=contexto.marcas.filter(x=>x.nome===m.nome).length>1?m.nome+' ('+m.slug+')':m.nome;
   $('marca').append(new Option(nome,m.id));
  }
  const solicitado=eventoDaBusca(location.search);
  if(solicitado){const destino=await deps.servico.carregarEvento(solicitado);if(atual!==epoch)return;if(!contexto.marcas.some(m=>m.id===destino.evento.marca_id))throw Error('Evento solicitado indisponível para sua conta.');$('marca').value=destino.evento.marca_id;}
  $('painel').hidden=false;await escolherMarca();
  if(solicitado)await abrirEvento(solicitado);
  if(!solicitado&&new URLSearchParams(location.search).get('acao')==='novo'&&pode('gerenciar_eventos')&&!deps.demonstracao)await abrirNovoEvento();
 }catch(e){if(atual===epoch){contexto=null;mensagem(e.codigo==='SEM_PERMISSAO'?e.message:'A gestão de eventos está indisponível no momento. Tente novamente mais tarde.',true);}}
}
function sincronizarMarca(){seletorMarca.sincronizar();}
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
  if(busy)return;editor.editar(lerForm());tentouCriar=true;const conteudo=editor.estado().conteudo;
  if(errosCadastro(conteudo,true).length)return;
  if(!$('form-evento').reportValidity())return;
  const atual=epoch,args={marcaId:marca.id,localId:$('local-novo').value,conteudo:structuredClone(conteudo)};
  confirmarAcao=async()=>{
   if(atual!==epoch||!novo)throw Error('O evento em edição mudou. Confira os dados novamente.');
   const data=await criacao.salvar(args);if(atual!==epoch)return;
   editor.carregar(data);sairModoNovo();escreverForm(data.conteudo);
   const button=botaoEvento({...data.evento,rascunho:data.rascunho});button.setAttribute('aria-pressed','true');$('eventos').prepend(button);
  };
  mensagemConfirmacao='Novo evento criado como rascunho. Confira os dados e use Revisar publicação para colocá-lo no site.';
  $('titulo-confirmacao').textContent='Criar o rascunho deste evento?';$('texto-confirmacao').textContent='Confira a marca, o local e os horários de Brasília. Confirmar salva um rascunho; o evento só entra no site após Revisar publicação.';
  escreverResumo($('resumo-confirmacao'),linhasNovoEvento(conteudo));$('confirmar').textContent='Criar rascunho';$('confirmacao').showModal();$('titulo-confirmacao').focus();$('confirmacao').scrollTop=0;
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
  mensagemConfirmacao='Alteração publicada com histórico.';
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
$('cancelar-confirmacao').addEventListener('click',()=>{confirmarAcao=null;$('confirmacao').close();});
$('confirmacao').addEventListener('cancel',()=>{confirmarAcao=null;});
$('confirmar').addEventListener('click',()=>{
 const fn=confirmarAcao,sucesso=mensagemConfirmacao;confirmarAcao=null;$('confirmacao').close();
 if(fn)rodar(fn,sucesso);
});
$('form-conflito').addEventListener('submit',event=>{
 event.preventDefault();
 const escolhas=Object.fromEntries([...new FormData(event.target)].map(([k,v])=>[k.replace('escolha-',''),v]));
 try{const state=editor.resolver(escolhas);escreverForm(state.conteudo);mostrarConflito();atualizar();
  mensagem('Comparação preparada. Revise o formulário e salve o rascunho quando estiver pronto.');
 }catch(e){mensagem(e.message,true);}
});
window.addEventListener('beforeunload',event=>{
 if(listaFormAlterado||editor?.estado().alterado||(novo&&$('local-novo').value)){event.preventDefault();event.returnValue='';}
});
if(deps.demonstracao){$('demo').hidden=false;$('perfil-demo').textContent='Perfil fictício atual: '+deps.perfil;}
window.addEventListener('pageshow',iniciar);
deps.observarSessao(iniciar);
iniciar();
