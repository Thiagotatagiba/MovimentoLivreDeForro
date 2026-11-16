import {administracao as servico} from '../../services/administracaoService.js?v=menu-1';
import {obterUsuarioAtual,aoMudarAutenticacao} from '../../services/authService.js';
import {abrirModalLogin} from '../../components/loginModal.js';
import {criarSolicitadorCadastro,validarCadastro,conteudoCadastro,mudouEndereco} from './cadastroModelo.js?v=edicao-1';
import {criarMapaCadastro} from './mapaCadastro.js';
const $=id=>document.getElementById(id),solic=criarSolicitadorCadastro({servico});
let autorizado=false,busy=false,epoch=0,usuario=undefined,pendente=null,mapa=null,ponto=null,locais=[],marcas=[],verificacao=0;
let buscaEpoch=0,timerBusca=null,filaMapa=Promise.resolve(),suprimirMapa=false;
const edicoes={local:null,marca:null},bases={local:null,marca:null},alterados=new Set();
const registros=tipo=>tipo==='local'?locais:marcas;
const rotuloLocal=l=>l.nome+' — '+[l.endereco?.cidade,l.endereco?.logradouro,l.endereco?.numero].filter(Boolean).join(', ')+(l.ativo?'':' (inativo)');
function mensagem(t){$('mensagem').textContent=t;}
function controles(){
 for(const tipo of ['local','marca']){const form=$('form-'+tipo);form.querySelector('fieldset').disabled=busy||!autorizado;
  for(const prefix of ['aba-','editar-','novo-','recarregar-'])$(prefix+tipo).disabled=busy||!autorizado;}
}
function opcoes(padrao=null){
 locais.sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));marcas.sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
 const atual=padrao??$('local-padrao').value;
 $('local-padrao').replaceChildren(new Option('Sem local fixo',''),...locais.filter(l=>l.ativo||l.id===atual).map(l=>new Option(rotuloLocal(l),l.id)));
 if(locais.some(l=>l.id===atual))$('local-padrao').value=atual;
 for(const tipo of ['local','marca']){$('editar-'+tipo).replaceChildren(new Option(tipo==='local'?'Escolha um local cadastrado':'Escolha uma marca cadastrada',''),...registros(tipo).map(r=>new Option(tipo==='local'?rotuloLocal(r):r.nome+(r.ativo?'':' (inativa)'),r.id)));$('editar-'+tipo).value=edicoes[tipo]?.id??'';}
}
function prepararMapa(atual){
 filaMapa=filaMapa.catch(()=>{}).then(async()=>{
  if(atual!==epoch)return null;if(mapa){mapa.redimensionar();return mapa;}
  try{
   const criado=await criarMapaCadastro({elemento:'mapa-local',aoMarcar:p=>{if(atual!==epoch)return;ponto=p;if(suprimirMapa)return;$('ponto-confirmado').checked=false;alterados.add('local');$('mapa-status').textContent='Ponto marcado. Confira o endereço e confirme abaixo.';},aoErro:t=>{if(atual===epoch)$('mapa-status').textContent=t;}});
   if(atual!==epoch){criado.destruir();return null;}mapa=criado;$('mapa-status').textContent='Busque o endereço ou clique no mapa para marcar o local.';return mapa;
  }catch{if(atual===epoch)$('mapa-status').textContent='Mapa indisponível. Atualize para mudar o endereço. Os outros dados podem ser editados sem alterar o ponto existente.';return null;}
 });return filaMapa;
}
function aba(tipo){$('form-local').hidden=tipo!=='local';$('form-marca').hidden=tipo!=='marca';for(const t of ['local','marca']){$('aba-'+t).setAttribute('aria-pressed',String(t===tipo));$('aba-'+t).classList.toggle('secundario',t!==tipo);}window.dispatchEvent(new CustomEvent('gestao-aba',{detail:tipo}));if(tipo==='local')prepararMapa(epoch);}
function descartar(tipo){return !alterados.has(tipo)||window.confirm('Há alterações não salvas neste cadastro. Deseja descartá-las?');}
function limpar(tipo){
 edicoes[tipo]=bases[tipo]=null;alterados.delete(tipo);solic.limpar();$('form-'+tipo).reset();$('editar-'+tipo).value='';$('estado-'+tipo).hidden=true;$('recarregar-'+tipo).hidden=true;
 $('titulo-'+tipo).textContent=tipo==='local'?'Novo local':'Nova marca';$('form-'+tipo).querySelector('[type=submit]').textContent=tipo==='local'?'Revisar cadastro do local':'Revisar cadastro da marca';
 if(tipo==='local'){++buscaEpoch;clearTimeout(timerBusca);ponto=null;mapa?.limpar();$('resultados-endereco').replaceChildren();$('ponto-confirmado').required=true;}
}
async function carregarFormulario(tipo,row){
 const atual=epoch;const base=conteudoCadastro(tipo,row);edicoes[tipo]={id:row.id,revisao:row.revisao,base};bases[tipo]=base;
 const form=$('form-'+tipo);form.reset();
 for(const input of form.elements){const key=input.name;if(!key)continue;if(key.startsWith('endereco_'))input.value=base.endereco?.[key.slice(9)]??'';else if(Object.hasOwn(base,key))input.value=Array.isArray(base[key])?base[key].join('\n'):base[key];}
 if(tipo==='marca'){opcoes(base.localPadraoId);$('local-padrao').value=base.localPadraoId;}
 $('ativo-'+tipo).checked=base.ativo;$('estado-'+tipo).hidden=false;$('recarregar-'+tipo).hidden=false;$('editar-'+tipo).value=row.id;
 $('titulo-'+tipo).textContent='Editar: '+row.nome;form.querySelector('[type=submit]').textContent='Revisar alterações';alterados.delete(tipo);
 if(tipo==='local'){
  ++buscaEpoch;clearTimeout(timerBusca);$('resultados-endereco').replaceChildren();ponto=Number.isFinite(base.latitude)&&Number.isFinite(base.longitude)?{latitude:base.latitude,longitude:base.longitude}:null;
  $('ponto-confirmado').required=false;$('ponto-confirmado').checked=!!ponto;
  const m=await prepararMapa(atual);if(atual!==epoch||edicoes.local?.id!==row.id||alterados.has('local'))return;
  m?.limpar();if(ponto&&m){suprimirMapa=true;try{m.selecionar(ponto);}finally{suprimirMapa=false;}$('ponto-confirmado').checked=true;}
  $('mapa-status').textContent=row.tem_publicacao?'Endereço com publicação: mudanças serão salvas em um novo local para usos futuros.':'Confira os dados e ajuste o mapa somente se o endereço mudar.';
 }
}
async function iniciar(){
 const check=++verificacao;let user;try{user=await obterUsuarioAtual();}catch{if(check===verificacao)mensagem('Não foi possível verificar sua sessão. Atualize a página.');return;}
 if(check!==verificacao)return;const id=user?.id??null;if(id===usuario)return;usuario=id;
 const atual=++epoch;++buscaEpoch;clearTimeout(timerBusca);autorizado=false;busy=false;pendente=null;solic.limpar();alterados.clear();
 if($('confirmacao').open)$('confirmacao').close();$('painel').hidden=true;controles();locais=[];marcas=[];limpar('local');limpar('marca');opcoes();if(mapa){mapa.destruir();mapa=null;}
 mensagem('Verificando seu acesso…');$('entrar').hidden=!!usuario;if(!usuario){mensagem('Entre com a conta de administrador do sistema.');return;}
 try{
  const contexto=await servico.carregarContexto();if(atual!==epoch)return;if(!contexto.administradorSistema){mensagem('Somente o administrador do sistema pode gerenciar marcas e locais oficiais.');return;}
  const dados=await servico.consultarCadastros();if(atual!==epoch)return;locais=dados.locais;marcas=dados.marcas;autorizado=true;opcoes();$('painel').hidden=false;controles();mensagem('Selecione um cadastro para editar ou preencha um novo.');aba(new URLSearchParams(location.search).get('aba')==='marca'?'marca':'local');
 }catch{if(atual===epoch)mensagem('Não foi possível carregar os cadastros. Atualize a página.');}
}
function ler(tipo){
 const c=Object.fromEntries([...new FormData($('form-'+tipo))].map(([k,v])=>[k,v.trim()]));const base=bases[tipo];
 if(edicoes[tipo])c.ativo=$('ativo-'+tipo).checked;
 if(tipo==='local'){
  c.endereco={};for(const key of Object.keys(c))if(key.startsWith('endereco_')){c.endereco[key.slice(9)]=c[key];delete c[key];}
  c.latitude=ponto?.latitude??null;c.longitude=ponto?.longitude??null;
  if(base&&mudouEndereco(c,base)&&c.ativo!==base.ativo&&locais.find(l=>l.id===edicoes.local?.id)?.tem_publicacao)throw Error('Altere a situação em uma operação separada da mudança de endereço.');
  if(mudouEndereco(c,base)&&(!$('ponto-confirmado').checked||!ponto))throw Error('Marque e confirme o ponto do local no mapa.');
 }else{c.localPadraoId=$('local-padrao').value;for(const key of ['diasSemana','categorias'])c[key]=c[key].split(/\r?\n/).map(s=>s.trim()).filter(Boolean);}
 return validarCadastro(tipo,c,base);
}
function resumoCadastro(tipo,c){
 const linhas=['Nome: '+c.nome];if(tipo==='local'){const e=c.endereco;linhas.push('Tipo: '+(c.tipo||'Não informado'),'Endereço: '+[e.logradouro,e.numero,e.complemento,e.bairro,e.cidade+' / '+e.estado,e.cep].filter(Boolean).join(', '));}
 else{linhas.push('Local padrão: '+(locais.find(l=>l.id===c.localPadraoId)?rotuloLocal(locais.find(l=>l.id===c.localPadraoId)):'Sem local fixo'));for(const [key,label] of [['cidadeBase','Cidade base'],['frequencia','Frequência'],['diasSemana','Dias da semana'],['categorias','Categorias']])if(c[key]?.length)linhas.push(label+': '+(Array.isArray(c[key])?c[key].join(', '):c[key]));}
 for(const [key,label] of [['descricao','Descrição'],['instagram','Instagram'],['whatsapp','WhatsApp'],['site','Site'],['telefone','Telefone'],['logo','Logo'],['capa','Capa']])if(c[key])linhas.push(label+': '+c[key]);
 if(edicoes[tipo])linhas.push('Situação: '+(c.ativo?'Ativo':'Inativo'));return linhas.join('\n\n');
}
for(const tipo of ['local','marca']){
 $('aba-'+tipo).addEventListener('click',()=>{if(!busy&&autorizado)aba(tipo);});
 $('novo-'+tipo).addEventListener('click',()=>{if(!busy&&descartar(tipo)){limpar(tipo);mensagem('Preencha o novo cadastro.');}});
 $('editar-'+tipo).addEventListener('change',()=>{if(busy)return;const row=registros(tipo).find(r=>r.id===$('editar-'+tipo).value);if(!descartar(tipo)){$('editar-'+tipo).value=edicoes[tipo]?.id??'';return;}if(row)carregarFormulario(tipo,row);else limpar(tipo);});
 $('recarregar-'+tipo).addEventListener('click',async()=>{
  if(busy||!edicoes[tipo]||!descartar(tipo))return;const atual=epoch,id=edicoes[tipo].id;busy=true;controles();
  try{const dados=await servico.consultarCadastros();if(atual!==epoch)return;locais=dados.locais;marcas=dados.marcas;opcoes();const row=registros(tipo).find(r=>r.id===id);if(row)await carregarFormulario(tipo,row);mensagem('Versão atual carregada.');}catch{if(atual===epoch)mensagem('Não foi possível recarregar. Seus dados permanecem no formulário.');}finally{if(atual===epoch){busy=false;controles();}}
 });
 $('form-'+tipo).addEventListener('submit',event=>{
  event.preventDefault();if(busy||!autorizado)return;
  try{const conteudo=ler(tipo);pendente={tipo,conteudo,edicao:edicoes[tipo]?structuredClone(edicoes[tipo]):null};$('resumo-cadastro').textContent=resumoCadastro(tipo,conteudo);
   const copia=tipo==='local'&&edicoes.local&&mudouEndereco(conteudo,bases.local)&&locais.find(l=>l.id===edicoes.local.id)?.tem_publicacao;
   $('impacto-edicao').hidden=!copia&&conteudo.ativo!==false;$('impacto-edicao').textContent=copia?'O endereço anterior continuará nos eventos publicados. Será criado um novo local; depois você poderá escolhê-lo como padrão da marca.':conteudo.ativo===false?'Ao desativar, este cadastro e os eventos vinculados deixam de aparecer no catálogo. Os registros serão preservados.':'';
   $('titulo-confirmacao').textContent=edicoes[tipo]?'Confirmar alterações':'Confirmar cadastro público';$('confirmar').textContent=edicoes[tipo]?'Salvar alterações':'Cadastrar agora';$('confirmacao').showModal();
  }catch(e){mensagem(e.message);}
 });
 $('form-'+tipo).addEventListener('input',e=>{if(['editar-'+tipo,'locais-existentes','busca-endereco'].includes(e.target.id))return;alterados.add(tipo);if(tipo==='local'&&e.target.name?.startsWith('endereco_')){ponto=null;mapa?.limpar();$('ponto-confirmado').checked=false;$('ponto-confirmado').required=true;$('mapa-status').textContent='Endereço alterado. Marque o ponto novamente no mapa.';}});
}
async function buscarEndereco(){
 clearTimeout(timerBusca);if(!autorizado||busy||!mapa)return;const atual=epoch,busca=++buscaEpoch;$('resultados-endereco').replaceChildren();
 try{const rows=await mapa.buscar($('busca-endereco').value);if(atual!==epoch||busca!==buscaEpoch)return;
  for(const row of rows){const b=document.createElement('button');b.type='button';b.className='secundario';b.textContent=row.nome;b.addEventListener('click',()=>{if(busy||atual!==epoch)return;for(const key of ['logradouro','numero','bairro','cidade','cep'])if(row[key])$(key).value=row[key];mapa.selecionar(row);$('resultados-endereco').replaceChildren();});$('resultados-endereco').append(b);}
  if(!rows.length)$('mapa-status').textContent='Nenhum resultado. Preencha o endereço e marque o ponto no mapa.';
 }catch(e){if(atual===epoch&&busca===buscaEpoch)$('mapa-status').textContent=e.message;}
}
$('buscar-endereco').addEventListener('click',buscarEndereco);$('busca-endereco').addEventListener('input',()=>{++buscaEpoch;clearTimeout(timerBusca);$('resultados-endereco').replaceChildren();if($('busca-endereco').value.trim().length>=4)timerBusca=setTimeout(buscarEndereco,1300);});
$('confirmar').addEventListener('click',async()=>{
 if(!pendente||busy||!autorizado)return;const {tipo,conteudo,edicao}=pendente;pendente=null;$('confirmacao').close();const atual=epoch;busy=true;controles();mensagem('Salvando…');
 try{
  const result=await solic.salvar(tipo,conteudo,edicao);if(atual!==epoch)return;
  let row=result.registro;if(!row){const dados={...conteudo};for(const k of ['nome','localPadraoId','endereco','latitude','longitude','ativo'])delete dados[k];row={...result,revisao:1,ativo:true,dados,...(tipo==='local'?{endereco:conteudo.endereco,latitude:conteudo.latitude,longitude:conteudo.longitude,tem_publicacao:false}:{local_padrao_id:conteudo.localPadraoId||null})};}
  const rows=registros(tipo),index=rows.findIndex(r=>r.id===row.id);if(index<0)rows.push(row);else rows[index]=row;
  if(result.novo_endereco){const old=locais.find(l=>l.id===result.anterior_id);if(old)old.revisao=result.anterior_revisao;}
  alterados.delete(tipo);opcoes();await carregarFormulario(tipo,row);if(atual!==epoch)return;
  mensagem(result.novo_endereco?'Novo endereço salvo em um novo local. Os eventos e o cadastro anterior foram preservados. Se desejar, selecione o novo local na edição da marca.':(tipo==='local'?'Local salvo: ':'Marca salva: ')+row.nome+'. Atualize as outras páginas abertas para conferir.');
 }catch(e){if(atual===epoch)mensagem(e.codigo==='CONFLITO'?'Outra pessoa alterou este cadastro. Suas alterações estão preservadas no formulário. Use Recarregar cadastro para conferir a versão atual antes de editar novamente.':e.message+' Em falha de conexão, tente novamente com os mesmos dados.');}
 finally{if(atual===epoch){busy=false;controles();}}
});
$('voltar').addEventListener('click',()=>{pendente=null;$('confirmacao').close();});$('entrar').addEventListener('click',()=>abrirModalLogin({subtitulo:'Entre para gerenciar marcas e locais oficiais.'}));
aoMudarAutenticacao(()=>setTimeout(iniciar,0));window.addEventListener('beforeunload',e=>{if(alterados.size){e.preventDefault();e.returnValue='';}});iniciar();
