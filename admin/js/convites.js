import {administracao as servico,novaChaveAdministrativa} from '../../services/administracaoService.js';
import {obterUsuarioAtual,aoMudarAutenticacao} from '../../services/authService.js';
import {abrirModalLogin} from '../../components/loginModal.js';
import {permissoesConvite,chaveEntradaConvite,lerEntradaConvite,novoTokenConvite,linkConvite,estadoConvite} from './conviteModelo.js';
const $=id=>document.getElementById(id);
let usuario=null,marcas=[],busy=false,geracao=0,link=null,criacao=null,aceitacao=null,acaoConfirmada=null;
const revogacoes=new Map();
const data=value=>new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
const textoPermissoes=(papel,perms)=>papel==='administrador'?'Todas as permissões de administração desta marca.':
 (perms.map(p=>permissoesConvite[p]).join(', ')||'Sem permissões de operação.');
function mensagem(texto,erro=false){$('mensagem').textContent=texto;$('mensagem').classList.toggle('erro',erro);}
function travar(valor){
 busy=valor;$('campos-convite').disabled=valor;$('recarregar').disabled=valor;$('copiar').disabled=valor;
 for(const b of $('lista-convites').querySelectorAll('button'))b.disabled=valor;
 $('aceitar').disabled=valor||!$('aceitar').dataset.disponivel;
}
function erro(error){
 const textos={CONFLITO:'Este convite já mudou ou a pessoa já faz parte da marca. Atualize a lista antes de continuar.',
  SEM_PERMISSAO:'Esta conta não pode concluir a operação. Confira o e-mail verificado, o prazo e suas permissões.',
  VALIDACAO:'Confira o e-mail, o papel e as permissões do convite.',
  INDISPONIVEL:'Não foi possível confirmar a operação. Tente novamente sem mudar os dados; a mesma solicitação será usada.'};
 mensagem(textos[error.codigo]??'Não foi possível concluir a operação.',true);
}
function revisar(titulo,resumo,permissoes,executar){
 if(busy)return;$('titulo-confirmacao').textContent=titulo;$('resumo-confirmacao').textContent=resumo;
 $('permissoes-confirmacao').textContent=permissoes;acaoConfirmada=executar;$('confirmacao').showModal();
}
function fecharConfirmacao(){acaoConfirmada=null;$('confirmacao').close();}
$('cancelar-confirmacao').onclick=fecharConfirmacao;
$('confirmacao').addEventListener('cancel',()=>{acaoConfirmada=null;});
$('confirmar').onclick=()=>{const acao=acaoConfirmada;fecharConfirmacao();if(acao&&!busy)acao();};
for(const [valor,nome] of Object.entries(permissoesConvite)){
 const label=document.createElement('label');label.className='check';const input=document.createElement('input');
 input.type='checkbox';input.value=valor;label.append(input,document.createTextNode(nome));$('opcoes-permissoes').append(label);
}
$('papel').onchange=()=>{
 const admin=$('papel').value==='administrador';$('aviso-admin').hidden=!admin;$('permissoes').disabled=admin;
};
$('entrar').onclick=()=>abrirModalLogin({subtitulo:'Entre com o e-mail verificado que recebeu o convite.'});
$('recarregar').onclick=()=>{if(!busy)iniciar();};
$('copiar').onclick=async()=>{
 if(!link||busy)return;
 try{await navigator.clipboard.writeText(link);mensagem('Link copiado. Compartilhe somente com a pessoa convidada.');}
 catch{mensagem('Não foi possível copiar o link. Verifique a permissão de área de transferência do navegador.',true);}
};
function renderizarLista(convites){
 $('lista-convites').replaceChildren();
 if(!convites.length){$('lista-convites').textContent='Nenhum convite disponível para esta conta.';return;}
 for(const c of convites.sort((a,b)=>b.criado_em.localeCompare(a.criado_em))){
  const item=document.createElement('article');item.className='convite-item';
  const titulo=document.createElement('h3');titulo.textContent=c.email_destino;
  const info=document.createElement('p');info.textContent=(c.marca?.nome??'Marca indisponível')+' · '+(c.papel==='administrador'?'Administrador':'Equipe');
  const perms=document.createElement('p');perms.textContent=textoPermissoes(c.papel,c.permissoes);
  const estado=document.createElement('p');estado.className='estado';estado.textContent=estadoConvite(c)+' · validade até '+data(c.expira_em);
  item.append(titulo,info,perms,estado);
  if(estadoConvite(c)==='pendente'&&marcas.some(m=>m.id===c.marca_id)){
   const button=document.createElement('button');button.type='button';button.className='secundario';button.textContent='Revogar convite';
   button.onclick=()=>revisar('Revogar este convite?',c.email_destino+' · '+(c.marca?.nome??'Marca'),
    'O link deixará de permitir a entrada na marca. Pessoas que já aceitaram mantêm o vínculo.',()=>revogar(c));
   item.append(button);
  }
  $('lista-convites').append(item);
 }
}
async function revogar(c){
 const g=geracao,chave=revogacoes.get(c.id)??novaChaveAdministrativa();revogacoes.set(c.id,chave);travar(true);
 try{await servico.revogarConvite({conviteId:c.id,chave});if(g!==geracao)return;
  revogacoes.delete(c.id);
  if(link&&new URLSearchParams(new URL(link).hash.slice(1)).get('convite')===c.id){link=null;$('link-criado').hidden=true;}
  try{const lista=await servico.listarConvites();if(g!==geracao)return;renderizarLista(lista);}
  catch{if(g===geracao)mensagem('Convite revogado. Não foi possível atualizar a lista; use Atualizar lista.',true);return;}
  mensagem('Convite revogado.');
 }catch(e){if(g===geracao)erro(e);}finally{if(g===geracao)travar(false);}
}
$('form-convite').onsubmit=event=>{
 event.preventDefault();if(busy||!marcas.some(m=>m.id===$('marca').value))return;
 const dados={marcaId:$('marca').value,email:$('email').value.trim().toLowerCase(),papel:$('papel').value,
  permissoes:$('papel').value==='administrador'?[]:[...$('permissoes').querySelectorAll('input:checked')].map(i=>i.value).sort()};
 const marca=marcas.find(m=>m.id===dados.marcaId);
 revisar('Criar este convite?',dados.email+' · '+marca.nome+' · '+(dados.papel==='administrador'?'Administrador':'Equipe'),
  textoPermissoes(dados.papel,dados.permissoes),()=>criar(dados));
};
async function criar(dados){
 const g=geracao,assinatura=JSON.stringify(dados);link=null;$('link-criado').hidden=true;travar(true);
 if(!criacao||criacao.assinatura!==assinatura)criacao={assinatura,dados:{...dados,token:novoTokenConvite(),chave:novaChaveAdministrativa()}};
 const pedido=criacao.dados;
 try{
  const result=await servico.criarConvite(pedido);if(g!==geracao)return;
  link=linkConvite(location.href,result.convite_id,pedido.token);criacao=null;$('link-criado').hidden=false;
  try{const lista=await servico.listarConvites();if(g!==geracao)return;renderizarLista(lista);}
  catch{if(g===geracao)mensagem('Convite criado e link disponível. Não foi possível atualizar a lista.',true);return;}
  mensagem('Convite criado. O vínculo só será concedido depois da aceitação. Copie e compartilhe o link.');
 }catch(e){if(g===geracao)erro(e);}finally{if(g===geracao)travar(false);}
}
$('aceitar').onclick=()=>{
 if(busy||!$('aceitar').dataset.disponivel)return;
 revisar('Aceitar este convite?',$('resumo-recebido').textContent,$('permissoes-recebidas').textContent,aceitar);
};
async function aceitar(){
 const entrada=lerEntradaConvite(sessionStorage);if(!entrada){mensagem('Abra novamente o link do convite para continuar.',true);return;}
 const g=geracao;travar(true);
 if(!aceitacao||aceitacao.conviteId!==entrada.conviteId)aceitacao={...entrada,chave:novaChaveAdministrativa()};
 try{
  await servico.aceitarConvite(aceitacao);if(g!==geracao)return;
  sessionStorage.removeItem(chaveEntradaConvite);aceitacao=null;
  await iniciar();mensagem('Convite aceito. Seu acesso à marca está disponível.');
 }catch(e){if(g===geracao)erro(e);}finally{if(g===geracao)travar(false);}
}
async function iniciar(){
 const g=++geracao;travar(true);fecharConfirmacao();
 mensagem('Carregando seu acesso…');
 $('entrar').hidden=true;$('conta').hidden=true;$('criar-painel').hidden=true;$('lista-painel').hidden=true;
 $('recebido').hidden=true;$('link-criado').hidden=true;link=null;$('aceitar').dataset.disponivel='';
 try{
  const atual=await obterUsuarioAtual();if(g!==geracao)return;
  if(atual?.id!==usuario?.id){criacao=null;aceitacao=null;revogacoes.clear();}
  usuario=atual;
  if(!usuario){$('entrar').hidden=false;mensagem('Entre com o e-mail verificado correspondente para acompanhar ou aceitar convites.');return;}
  const [contexto,convites]=await Promise.all([servico.carregarContexto(),servico.listarConvites()]);if(g!==geracao)return;
  marcas=contexto.marcas.filter(m=>m.administrador);
  $('conta').textContent='Conta atual: '+usuario.email;$('conta').hidden=false;
  $('marca').replaceChildren(...marcas.map(m=>new Option(m.nome,m.id)));
  $('criar-painel').hidden=!marcas.length;$('lista-painel').hidden=false;renderizarLista(convites);
  const entrada=lerEntradaConvite(sessionStorage);
  if(entrada){
   const convite=await servico.carregarConvite(entrada.conviteId);if(g!==geracao)return;
   if(!convite){mensagem('Este convite não está disponível para esta conta. Confira o e-mail ou peça um novo link.',true);return;}
   if(estadoConvite(convite)!=='pendente'){sessionStorage.removeItem(chaveEntradaConvite);aceitacao=null;}
   $('recebido').hidden=false;
   $('resumo-recebido').textContent=(convite.marca?.nome??'Marca indisponível')+' · '+convite.email_destino+' · '+
    (convite.papel==='administrador'?'Administrador':'Equipe')+' · validade até '+data(convite.expira_em);
   $('permissoes-recebidas').textContent=textoPermissoes(convite.papel,convite.permissoes);
   const pode=estadoConvite(convite)==='pendente'&&usuario.email_confirmed_at&&!usuario.is_anonymous&&
    usuario.email?.trim().toLowerCase()===convite.email_destino;
   $('aceitar').dataset.disponivel=pode?'sim':'';
   const estados={aceito:'Este convite já foi aceito. Seu acesso atual pode ser consultado na gestão de eventos.',
    revogado:'Este convite foi revogado. Peça um novo convite ao administrador da marca.',
    expirado:'Este convite expirou. Peça um novo convite ao administrador da marca.'};
   mensagem(pode?'Confira o papel e as permissões. Aceitar é uma ação explícita.':
    estados[estadoConvite(convite)]??'Entre com o e-mail verificado correspondente para aceitar este convite.');
  }else mensagem(marcas.length?'Você pode criar e revogar convites das marcas que administra.':'Aqui estão os convites disponíveis para sua conta.');
 }catch(e){if(g===geracao)erro(e);}finally{if(g===geracao)travar(false);}
}
aoMudarAutenticacao(()=>setTimeout(()=>iniciar(),0));
window.addEventListener('pageshow',event=>{if(event.persisted)iniciar();});
window.addEventListener('convite-entrada',()=>iniciar());
iniciar();
