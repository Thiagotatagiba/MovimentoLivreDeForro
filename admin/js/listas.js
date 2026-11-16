import {criarServicoListasVip} from '../../services/listasVipService.js';
import {obterUsuarioAtual,aoMudarAutenticacao} from '../../services/authService.js';
import {abrirModalLogin} from '../../components/loginModal.js';
import {acompanhantesDoTexto,criarSolicitadorVip,mensagemErroVip,estadosVip} from '../../js/utils/vipModelo.js';
import {eventoDaBusca,selecionarEventoLista} from './listaNoEventoModelo.js?v=1';
let eventoSolicitado=null,erroDestino=null;try{eventoSolicitado=eventoDaBusca(location.search);}catch(e){erroDestino=e;}
const $=id=>document.getElementById(id),service=criarServicoListasVip(),requests=criarSolicitadorVip();
if(eventoSolicitado){$('titulo-pagina-listas').textContent='Lista deste evento';$('ajuda-pagina-listas').textContent='A edição escolhida no evento fica preservada nesta tela. Gerencie a lista ou volte ao mesmo evento.';}
let eventos=[],atual=null,busy=false,epoch=0,confirmar=null;
const date=x=>new Date(x).toLocaleString('pt-BR');
function mensagem(text){$('mensagem').textContent=text;}
function travar(value){busy=value;$('campos-criar').disabled=value;$('evento').disabled=value||!!eventoSolicitado||!!erroDestino;$('atualizar').disabled=value;for(const id of ['encerrar','nova-data','exportar','copiar'])$(id).disabled=value;}
function limpar(){eventos=[];atual=null;requests.limpar();$('painel').hidden=true;$('grupos').replaceChildren();$('texto-exportacao').value='';$('texto-painel').hidden=true;$('url-publica').value='';$('conta').textContent='';$('contexto-evento').hidden=true;$('contexto-evento-titulo').textContent='';$('confirmacao').close();confirmar=null;}
function revisar(text,action){if(busy)return;confirmar=action;$('resumo').textContent=text;$('confirmacao').showModal();}
async function operar(action,params){const generation=epoch;travar(true);try{await requests.executar(action,params,p=>service[action](p));
 if(generation!==epoch)return;travar(false);await carregar();mensagem('Operação confirmada.');
 }catch(e){if(generation===epoch)mensagem(mensagemErroVip(e));}finally{if(generation===epoch)travar(false);}}
function renderGrupos(data){
 $('grupos').replaceChildren();$('duplicados').hidden=!data.duplicados.length;$('duplicados').textContent='Nomes possivelmente duplicados (não bloqueados): '+data.duplicados.join(', ');
 let total=0;
 data.grupos.forEach((group,index)=>{total+=1+group.acompanhantes.length;const card=document.createElement('article');card.className='grupo';
  if(group.avatar_url?.startsWith('https://')){const img=document.createElement('img');img.className='avatar';img.src=group.avatar_url;img.alt='';img.referrerPolicy='no-referrer';img.loading='lazy';card.append(img);}
  else{const avatar=document.createElement('span');avatar.className='avatar avatar-inicial';avatar.textContent=group.nome.trim().slice(0,1).toUpperCase();avatar.setAttribute('aria-hidden','true');card.append(avatar);}
  const title=document.createElement('h3');title.textContent=(index+1)+'. '+group.nome;card.append(title);
  group.acompanhantes.forEach((name,i)=>{const p=document.createElement('p');p.textContent=String.fromCharCode(65+i)+'. '+name;card.append(p);});
  if(atual.gerenciar&&data.estado==='encerrada'){
   const form=document.createElement('form'),label=document.createElement('label'),name=document.createElement('input'),companionsLabel=document.createElement('label'),companions=document.createElement('textarea'),button=document.createElement('button');
   label.textContent='Corrigir nome do titular';name.value=group.nome;name.required=true;name.maxLength=120;label.append(name);
   companionsLabel.textContent='Corrigir acompanhantes (mesma quantidade: '+group.acompanhantes.length+')';companions.value=group.acompanhantes.join('\n');companionsLabel.append(companions);
   button.textContent='Revisar correção';button.type='submit';form.append(label,companionsLabel,button);
   form.onsubmit=e=>{e.preventDefault();if(busy)return;try{const values=acompanhantesDoTexto(companions.value);
    if(values.length!==group.acompanhantes.length)throw Error('A correção deve manter a quantidade de acompanhantes.');
    const params={inscricaoId:group.id,nome:name.value.trim(),acompanhantes:values,revisao:group.revisao};
    revisar('Corrigir '+group.nome+' para '+params.nome+'\nAcompanhantes: '+(values.join(', ')||'nenhum')+'\nA quantidade de pessoas será mantida. Cópias antigas não serão atualizadas.',()=>operar('corrigir',params));
   }catch(error){mensagem(error.message);}};card.append(form);
  }
  $('grupos').append(card);
 });$('total').textContent=data.grupos.length+' titulares · '+total+' pessoas no total';
}
async function selecionar(){
 atual=eventos.find(e=>e.evento_id===$('evento').value)??null;$('criar').hidden=!atual?.gerenciar||!!atual.lista||atual.situacao!=='confirmado';$('lista').hidden=!atual?.lista;
 $('texto-painel').hidden=true;$('texto-exportacao').value='';if(!atual?.lista)return;
 const list=atual.lista,generation=epoch;
 $('lista-titulo').textContent=list.titulo;$('lista-estado').textContent=estadosVip[list.estado];$('lista-termos').textContent=list.termos;
 $('lista-datas').textContent='Inscrições até '+date(list.prazo_inscricao)+' · Benefício: '+date(list.beneficio_inicio)+' a '+date(list.beneficio_fim);
 const url=new URL('../lista-vip.html',location.href);url.searchParams.set('id',list.id);$('link-publico').href=url.href;$('url-publica').value=url.href;
 $('encerrar').hidden=!atual.gerenciar||list.estado==='encerrada';$('nova-data').hidden=!atual.gerenciar||atual.situacao!=='adiado'||list.estado!=='suspensa';
 $('exportacao').hidden=list.estado!=='encerrada';
 const selected=list.id,data=await service.grupos(selected);if(generation===epoch&&atual?.lista?.id===selected)renderGrupos(data);
}
async function carregar(){if(busy)return;const generation=++epoch,selected=$('evento').value;travar(true);
 try{const user=await obterUsuarioAtual();if(generation!==epoch)return;$('entrar').hidden=!!user;if(!user){limpar();mensagem('Entre para gerenciar as listas das suas marcas.');return;}
  $('conta').textContent='Conta atual: '+user.email;if(erroDestino)throw erroDestino;const rows=await service.gestao();if(generation!==epoch)return;
  const escolhido=selecionarEventoLista(rows,eventoSolicitado,selected);eventos=eventoSolicitado?[escolhido]:rows;
  $('painel').hidden=!eventos.length;$('evento').replaceChildren(...eventos.map(e=>new Option(e.marca+' · '+e.titulo+' · '+e.data,e.evento_id)));
  $('evento').value=escolhido?.evento_id??'';
  $('contexto-evento').hidden=!eventoSolicitado;if(eventoSolicitado){$('contexto-evento-titulo').textContent='Lista do evento: '+escolhido.marca+' · '+escolhido.titulo+' · '+escolhido.data;const url=new URL('gestao.html',location.href);url.searchParams.set('evento',eventoSolicitado);$('voltar-evento').href=url.href;}
  await selecionar();if(generation!==epoch)return;
  mensagem(eventoSolicitado?'Você está gerenciando a lista desta edição.':rows.length?'Selecione a edição. Nomes ficam restritos a quem tem permissão de listas.':'Nenhuma edição disponível com permissão de listas.');
 }catch(e){if(generation===epoch){limpar();mensagem(mensagemErroVip(e));}}finally{if(generation===epoch)travar(false);}
}
$('form-criar').onsubmit=e=>{e.preventDefault();if(busy||!atual?.gerenciar)return;try{
 const params={eventoId:atual.evento_id,titulo:$('titulo').value.trim(),termos:$('termos').value.trim(),prazo:new Date($('prazo').value).toISOString(),inicio:new Date($('inicio').value).toISOString(),fim:new Date($('fim').value).toISOString(),maxAcompanhantes:Number($('maximo').value)};
 revisar(atual.titulo+'\n'+params.titulo+'\n'+params.termos+'\nPrazo: '+date(params.prazo)+'\nBenefício: '+date(params.inicio)+' a '+date(params.fim)+'\nMáximo de acompanhantes: '+params.maxAcompanhantes,()=>operar('criar',params));
 }catch{mensagem('Confira as datas e horários.');}};
$('encerrar').onclick=()=>{const list=atual.lista;revisar('Encerrar definitivamente as inscrições de '+list.titulo+'? As inscrições serão preservadas. Não será possível reabrir.',()=>operar('encerrar',{listaId:list.id,revisao:list.revisao}));};
$('nova-data').onclick=()=>{const item=atual,list=item.lista;revisar('Confirmo com o produtor que a nova data publicada é '+item.data+' às '+item.horario+'.\nOs prazos e a validade do benefício continuam: '+date(list.prazo_inscricao)+' / '+date(list.beneficio_fim)+'.\nSó confirme se essas condições continuam válidas para a nova data.',()=>operar('confirmarData',{listaId:list.id,versaoId:item.versao_id,revisao:list.revisao}));};
$('exportar').onclick=async()=>{if(busy)return;const generation=epoch,listId=atual.lista.id;travar(true);try{const text=await service.exportar(listId);if(generation!==epoch||atual?.lista?.id!==listId)return;$('texto-exportacao').value=text;$('texto-painel').hidden=false;mensagem('Texto preparado. Confira antes de compartilhar.');}catch(e){if(generation===epoch)mensagem(mensagemErroVip(e));}finally{if(generation===epoch)travar(false);}};
$('copiar').onclick=async()=>{try{await navigator.clipboard.writeText($('texto-exportacao').value);mensagem('Texto copiado. Confira a colagem antes de enviar.');}catch{$('texto-exportacao').focus();$('texto-exportacao').select();mensagem('Selecione e copie o texto manualmente.');}};
$('evento').onchange=async()=>{epoch++;$('grupos').replaceChildren();try{await selecionar();}catch(e){mensagem(mensagemErroVip(e));}};
$('atualizar').onclick=carregar;$('entrar').onclick=()=>abrirModalLogin({subtitulo:'Entre para gerenciar as listas das suas marcas.'});
$('voltar').onclick=()=>{$('confirmacao').close();confirmar=null;};$('confirmacao').addEventListener('cancel',()=>{confirmar=null;});$('confirmar').onclick=()=>{const action=confirmar;confirmar=null;$('confirmacao').close();action?.();};
aoMudarAutenticacao(()=>{epoch++;limpar();travar(false);setTimeout(carregar,0);});
setInterval(async()=>{if(busy||document.hidden||!atual?.lista||$('confirmacao').open||$('grupos').contains(document.activeElement)||!$('texto-painel').hidden)return;
 const generation=epoch,selected=atual.evento_id;try{const rows=await service.gestao();if(generation!==epoch)return;
 const fresh=rows.find(e=>e.evento_id===selected);if(!fresh){limpar();mensagem('Acesso à lista indisponível.');return;}
 atual=fresh;eventos=eventoSolicitado?[fresh]:rows;await selecionar();}catch(e){if(generation===epoch){$('grupos').replaceChildren();mensagem(mensagemErroVip(e));}}
},5000);
carregar();
