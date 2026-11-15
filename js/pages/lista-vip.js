import {criarServicoListasVip} from '../../services/listasVipService.js';
import {obterUsuarioAtual,aoMudarAutenticacao} from '../../services/authService.js';
import {abrirModalLogin} from '../../components/loginModal.js';
import {acompanhantesDoTexto,idListaDaUrl,criarSolicitadorVip,mensagemErroVip,estadosVip} from '../utils/vipModelo.js';
const $=id=>document.getElementById(id),service=criarServicoListasVip(),requests=criarSolicitadorVip(),id=idListaDaUrl(location.href);
let lista=null,minha=null,usuario=null,busy=false,epoch=0,confirmar=null;
const date=value=>new Date(value).toLocaleString('pt-BR');
function mensagem(text){$('mensagem').textContent=text;}
function travar(value){busy=value;$('campos').disabled=value||lista?.estado!=='aberta';$('atualizar').disabled=value;}
function limpar(){lista=null;minha=null;usuario=null;requests.limpar();$('form-inscricao').reset();$('inscricao').hidden=true;$('conta').textContent='';$('confirmacao').close();confirmar=null;}
function mostrarLista(data){lista=data;$('beneficio').hidden=!data;if(!data)return;
 $('titulo').textContent=data.titulo;$('estado').textContent=estadosVip[data.estado];$('termos').textContent=data.termos;
 $('datas').textContent='Inscrições até '+date(data.prazo_inscricao)+'. Benefício válido de '+date(data.beneficio_inicio)+' até '+date(data.beneficio_fim)+'. Horários deste dispositivo.';
 $('limite').textContent=data.max_acompanhantes?'Até '+data.max_acompanhantes+' acompanhantes além de você.':'Inscrição individual, sem acompanhantes.';
 $('acompanhantes').disabled=!data.max_acompanhantes;travar(busy);
}
async function carregar(){if(busy||!id){if(!id)mensagem('Link de lista inválido.');return;}const generation=++epoch;travar(true);
 try{const [data,user]=await Promise.all([service.consultar(id),obterUsuarioAtual()]);if(generation!==epoch)return;
  mostrarLista(data);usuario=user;$('entrar').hidden=!!user||!data;
  if(!data){$('inscricao').hidden=true;$('form-inscricao').reset();minha=null;mensagem('Lista indisponível.');return;}
  if(user){const own=await service.minha(id);if(generation!==epoch)return;minha=own;$('inscricao').hidden=false;$('conta').textContent='Conta atual: '+user.email;
   $('nome').value=own?.nome??user.user_metadata?.full_name??'';$('acompanhantes').value=own?.acompanhantes.join('\n')??'';$('aceite').checked=false;
   $('situacao-grupo').textContent=own?(own.ativa?'Sua inscrição está ativa.':'Sua inscrição foi cancelada. Você pode se reinscrever enquanto a lista estiver aberta.'):'Você ainda não se inscreveu.';
   $('cancelar').hidden=!own?.ativa;
  }else{$('inscricao').hidden=true;}
  mensagem('Confira os termos e a situação da lista. Apenas seu grupo é mostrado aqui.');
 }catch(e){if(generation===epoch)mensagem(mensagemErroVip(e));}finally{if(generation===epoch)travar(false);}
}
function revisar(text,action){if(busy)return;confirmar=action;$('resumo').textContent=text;$('confirmacao').showModal();}
async function executar(action,params){const generation=epoch;travar(true);try{
 await requests.executar(action,params,p=>service[action](p));if(generation!==epoch)return;travar(false);await carregar();mensagem('Solicitação confirmada.');
 }catch(e){if(generation===epoch)mensagem(mensagemErroVip(e));}finally{if(generation===epoch)travar(false);}}
$('form-inscricao').onsubmit=e=>{e.preventDefault();if(busy||!usuario||lista?.estado!=='aberta')return;try{
 const params={listaId:id,nome:$('nome').value.trim(),acompanhantes:acompanhantesDoTexto($('acompanhantes').value,lista.max_acompanhantes),aceitaTermos:$('aceite').checked,revisao:minha?.revisao??0};
 revisar('Titular: '+params.nome+'\nAcompanhantes: '+(params.acompanhantes.join(', ')||'nenhum')+'\n'+lista.termos,()=>executar('salvar',params));
 }catch(error){mensagem(error.message);}};
$('cancelar').onclick=()=>revisar('Cancelar sua inscrição e todos os acompanhantes deste grupo?',()=>executar('cancelar',{listaId:id,revisao:minha.revisao}));
$('voltar').onclick=()=>{$('confirmacao').close();confirmar=null;};$('confirmacao').addEventListener('cancel',()=>{confirmar=null;});
$('confirmar').onclick=()=>{const action=confirmar;confirmar=null;$('confirmacao').close();action?.();};
$('atualizar').onclick=carregar;$('entrar').onclick=()=>abrirModalLogin({subtitulo:'Entre na sua conta para inscrever seu grupo.'});
aoMudarAutenticacao(()=>{epoch++;limpar();travar(false);setTimeout(carregar,0);});
setInterval(async()=>{if(!id||busy||document.hidden||!lista)return;const generation=epoch;try{const fresh=await service.consultar(id);if(generation!==epoch)return;
 if(!fresh){limpar();$('beneficio').hidden=true;mensagem('Lista indisponível.');}else if(fresh.estado!==lista.estado){mostrarLista(fresh);$('confirmacao').close();confirmar=null;mensagem(estadosVip[fresh.estado]);}
 }catch{/* Keep edits; server rejects any invalid write. */}},5000);
carregar();
