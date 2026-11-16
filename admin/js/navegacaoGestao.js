import {dependencias as deps} from './gestaoDependencias.js?v=menu-1';
import {acessosMenu,itensGestao,destinoAtalho} from './navegacaoModelo.js?v=lista-evento-1';
const menu=document.getElementById('menu-gestao'),atalhos=document.getElementById('atalhos-gestao');
let geracao=0,abaAtual=new URLSearchParams(location.search).get('aba')==='marca'?'marca':'local';
function paginaAtual(){const path=location.pathname;return path.endsWith('cadastros.html')?(abaAtual==='marca'?'marcas':'locais'):path.endsWith('listas.html')?'listas':path.endsWith('convites.html')?'gerentes':'eventos';}
function marcarAtual(){for(const a of menu.querySelectorAll('a')){if(a.dataset.secao===paginaAtual())a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}}
async function atualizar(){
 const atual=++geracao;menu.replaceChildren();menu.hidden=true;if(atalhos){atalhos.replaceChildren();atalhos.hidden=true;}
 try{
  const user=await deps.obterUsuario();if(atual!==geracao||!user)return;
  const contexto=await deps.servico.carregarContexto();if(atual!==geracao)return;const permissoes=acessosMenu(contexto);
  const itens=itensGestao.filter(item=>permissoes[item.id]);if(!itens.length)return;
  for(const item of itens){const a=document.createElement('a');a.href=item.url;a.textContent=item.nome;a.dataset.secao=item.id;menu.append(a);}
  menu.hidden=false;marcarAtual();
  if(atalhos){
   const titulo=document.createElement('h2');titulo.textContent='O que você precisa fazer?';
   const ajuda=document.createElement('p');ajuda.className='apoio';ajuda.textContent=permissoes.marcas?'Para começar do zero: cadastre o local, a marca, o evento e depois a lista. Convide gerentes para cuidar das marcas.':'Use os atalhos para cadastrar ou o menu acima para gerenciar o que já existe.';
   const grid=document.createElement('div');grid.className='gestao-atalhos-grid';
   for(const item of itens){const destino=destinoAtalho(item,permissoes),card=document.createElement('article'),h=document.createElement('h3'),p=document.createElement('p'),a=document.createElement('a');
    card.className='gestao-atalho';h.textContent=item.nome;p.textContent=item.id==='eventos'&&!permissoes.novoEvento?'Revise e publique os rascunhos das marcas que autorizaram sua conta.':item.id==='listas'&&!permissoes.novaLista?'Consulte as inscrições das listas às quais sua conta tem acesso.':item.descricao;a.href=destino.url;a.textContent=destino.texto;card.append(h,p,a);grid.append(card);}
   atalhos.append(titulo,ajuda,grid);atalhos.hidden=false;
  }
 }catch{if(atual===geracao){const p=document.createElement('p');p.textContent='Não foi possível carregar o menu. Atualize a página para conferir seus acessos.';menu.append(p);menu.hidden=false;}}
}
window.addEventListener('gestao-aba',event=>{abaAtual=event.detail;marcarAtual();});
deps.observarSessao(()=>setTimeout(atualizar,0));window.addEventListener('pageshow',atualizar);atualizar();
