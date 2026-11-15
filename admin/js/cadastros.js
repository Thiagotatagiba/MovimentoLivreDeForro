import {administracao as servico} from '../../services/administracaoService.js?v=cadastros-1';
import {obterUsuarioAtual,aoMudarAutenticacao} from '../../services/authService.js';
import {abrirModalLogin} from '../../components/loginModal.js';
import {criarSolicitadorCadastro,validarCadastro} from './cadastroModelo.js';
import {criarMapaCadastro} from './mapaCadastro.js';
const $=id=>document.getElementById(id),solic=criarSolicitadorCadastro({servico});
let autorizado=false,busy=false,epoch=0,usuario=undefined,pendente=null,mapa=null,ponto=null,locais=[],verificacao=0;
let buscaEpoch=0,modificado=false,timerBusca=null;
function mensagem(t){$('mensagem').textContent=t;}
function controles(){for(const form of [$('form-local'),$('form-marca')])form.querySelector('fieldset').disabled=busy||!autorizado;
 $('aba-local').disabled=$('aba-marca').disabled=busy||!autorizado;}
function opcoes(){
 locais.sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
 const atual=$('local-padrao').value;
 $('local-padrao').replaceChildren(new Option('Sem local fixo',''),...locais.map(l=>new Option(l.nome,l.id)));
 if(locais.some(l=>l.id===atual))$('local-padrao').value=atual;
 $('locais-existentes').replaceChildren(new Option('Confira os nomes existentes',''),...locais.map(l=>new Option(l.nome,l.id)));
}
async function prepararMapa(atual){
 if(mapa){mapa.redimensionar();return;}
 try{
  const criado=await criarMapaCadastro({elemento:'mapa-local',aoMarcar:p=>{if(atual!==epoch)return;ponto=p;$('ponto-confirmado').checked=false;modificado=true;$('mapa-status').textContent='Ponto marcado. Confira o endereço e confirme abaixo.';},aoErro:t=>{if(atual===epoch)$('mapa-status').textContent=t;}});
  if(atual!==epoch){criado.destruir();return;}mapa=criado;$('mapa-status').textContent='Busque o endereço ou clique no mapa para marcar o local.';
 }catch{if(atual===epoch)$('mapa-status').textContent='Mapa indisponível. Atualize a página antes de cadastrar o local. A criação de marcas continua disponível.';}
}
function aba(tipo){
 $('form-local').hidden=tipo!=='local';$('form-marca').hidden=tipo!=='marca';
 for(const t of ['local','marca'])$('aba-'+t).setAttribute('aria-pressed',String(t===tipo));
 if(tipo==='local')prepararMapa(epoch);
}
async function iniciar(){
 const check=++verificacao;let user;
 try{user=await obterUsuarioAtual();}catch{if(check===verificacao)mensagem('Não foi possível verificar sua sessão. Atualize a página.');return;}
 if(check!==verificacao)return;
 const id=user?.id??null;if(id===usuario)return;usuario=id;
 const atual=++epoch;++buscaEpoch;clearTimeout(timerBusca);autorizado=false;busy=false;pendente=null;solic.limpar();modificado=false;
 if($('confirmacao').open)$('confirmacao').close();
 $('painel').hidden=true;controles();$('form-local').reset();$('form-marca').reset();$('resultados-endereco').replaceChildren();locais=[];opcoes();ponto=null;
 if(mapa){mapa.destruir();mapa=null;}
 mensagem('Verificando seu acesso…');
 try{
  $('entrar').hidden=!!usuario;
  if(!usuario){mensagem('Entre com a conta de administrador do sistema.');return;}
  const contexto=await servico.carregarContexto();if(atual!==epoch)return;
  if(!contexto.administradorSistema){mensagem('Somente o administrador do sistema pode criar marcas e locais oficiais.');return;}
  locais=await servico.listarLocais();if(atual!==epoch)return;
  autorizado=true;opcoes();$('painel').hidden=false;controles();mensagem('Escolha Novo local ou Nova marca.');aba('local');
 }catch{if(atual===epoch)mensagem('Não foi possível carregar os cadastros. Atualize a página.');}
}
function ler(tipo){
 const c=Object.fromEntries([...new FormData($('form-'+tipo))].map(([k,v])=>[k,v.trim()]));
 if(tipo==='local'){
  c.endereco={};for(const key of Object.keys(c))if(key.startsWith('endereco_')){c.endereco[key.slice(9)]=c[key];delete c[key];}
  if(!$('ponto-confirmado').checked||!ponto)throw Error('Marque e confirme o ponto do local no mapa.');Object.assign(c,ponto);
 }else for(const key of ['diasSemana','categorias'])c[key]=c[key].split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 return validarCadastro(tipo,c);
}
function resumoCadastro(tipo,c){
 const linhas=['Nome: '+c.nome];
 if(tipo==='local'){
  const e=c.endereco;linhas.push('Tipo: '+(c.tipo||'Não informado'),'Endereço: '+[e.logradouro,e.numero,e.complemento,e.bairro,e.cidade+' / '+e.estado,e.cep].filter(Boolean).join(', '),'Posição conferida no mapa');
 }else{
  linhas.push('Local padrão: '+(locais.find(l=>l.id===c.localPadraoId)?.nome??'Sem local fixo'));
  for(const [key,label] of [['cidadeBase','Cidade base'],['frequencia','Frequência'],['diasSemana','Dias da semana'],['categorias','Categorias']])if(c[key]?.length)linhas.push(label+': '+(Array.isArray(c[key])?c[key].join(', '):c[key]));
 }
 for(const [key,label] of [['descricao','Descrição'],['instagram','Instagram'],['whatsapp','WhatsApp'],['site','Site'],['telefone','Telefone'],['logo','Logo'],['capa','Capa']])if(c[key])linhas.push(label+': '+c[key]);
 return linhas.join('\n\n');
}
for(const tipo of ['local','marca']){
 $('aba-'+tipo).addEventListener('click',()=>{if(!busy&&autorizado)aba(tipo);});
 $('form-'+tipo).addEventListener('submit',event=>{
  event.preventDefault();if(busy||!autorizado)return;
  try{const conteudo=ler(tipo);pendente={tipo,conteudo};
   $('resumo-cadastro').textContent=resumoCadastro(tipo,conteudo);
   $('confirmacao').showModal();
  }catch(e){mensagem(e.message);}
 });
 $('form-'+tipo).addEventListener('input',e=>{
  modificado=true;if(tipo==='local'&&e.target.name?.startsWith('endereco_')){ponto=null;mapa?.limpar();$('ponto-confirmado').checked=false;$('mapa-status').textContent='Endereço alterado. Marque o ponto novamente no mapa.';}
 });
}
async function buscarEndereco(){
 clearTimeout(timerBusca);
 if(!autorizado||busy||!mapa)return;
 const atual=epoch,busca=++buscaEpoch;$('resultados-endereco').replaceChildren();
 try{
  const rows=await mapa.buscar($('busca-endereco').value);if(atual!==epoch||busca!==buscaEpoch)return;
  for(const row of rows){const b=document.createElement('button');b.type='button';b.className='secundario';b.textContent=row.nome;
   b.addEventListener('click',()=>{if(busy||atual!==epoch)return;for(const key of ['logradouro','numero','bairro','cidade','cep'])if(row[key])$(key).value=row[key];mapa.selecionar(row);$('resultados-endereco').replaceChildren();});$('resultados-endereco').append(b);}
  if(!rows.length)$('mapa-status').textContent='Nenhum resultado. Preencha o endereço e marque o ponto no mapa.';
 }catch(e){if(atual===epoch&&busca===buscaEpoch)$('mapa-status').textContent=e.message;}
}
$('buscar-endereco').addEventListener('click',buscarEndereco);
$('busca-endereco').addEventListener('input',()=>{
 ++buscaEpoch;clearTimeout(timerBusca);$('resultados-endereco').replaceChildren();
 if($('busca-endereco').value.trim().length>=4)timerBusca=setTimeout(buscarEndereco,1300);
});
$('confirmar').addEventListener('click',async()=>{
 if(!pendente||busy||!autorizado)return;const {tipo,conteudo}=pendente;pendente=null;$('confirmacao').close();const atual=epoch;busy=true;controles();mensagem('Cadastrando…');
 try{
  const result=await solic.salvar(tipo,conteudo);if(atual!==epoch)return;
  $('form-'+tipo).reset();modificado=false;
  if(tipo==='local'){locais.push(result);opcoes();$('local-padrao').value=result.id;ponto=null;mapa?.limpar();$('mapa-status').textContent='Local salvo. Você pode usá-lo como padrão em Nova marca.';}
  mensagem((tipo==='local'?'Local cadastrado: ':'Marca cadastrada: ')+result.nome+'. '+(tipo==='marca'?'Volte aos eventos e atualize a página para usar a nova marca. Nenhum acesso foi concedido.':'O local já está disponível para marcas e novos eventos.'));
 }catch(e){if(atual===epoch)mensagem(e.message+' Se a conexão falhou, tente novamente com os mesmos dados.');}
 finally{if(atual===epoch){busy=false;controles();}}
});
$('voltar').addEventListener('click',()=>{pendente=null;$('confirmacao').close();});
$('entrar').addEventListener('click',()=>abrirModalLogin({subtitulo:'Entre para cadastrar marcas e locais oficiais.'}));
aoMudarAutenticacao(()=>setTimeout(iniciar,0));
window.addEventListener('beforeunload',e=>{if(modificado){e.preventDefault();e.returnValue='';}});
iniciar();
