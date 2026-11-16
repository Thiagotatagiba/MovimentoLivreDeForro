const normalizar=valor=>valor.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
export function filtrarMarcas(opcoes,busca){
 const termos=normalizar(busca).split(/\s+/).filter(Boolean);
 return opcoes.filter(opcao=>termos.every(termo=>normalizar(opcao.textContent).includes(termo)));
}

export function criarSeletorMarca({raiz,select,botao,busca,painel,lista,vazio,status}){
 let resultados=[],ativo=-1;
 function fechar(devolverFoco=false){painel.hidden=true;botao.setAttribute('aria-expanded','false');busca.setAttribute('aria-expanded','false');busca.removeAttribute('aria-activedescendant');if(devolverFoco)botao.focus();}
 function sincronizar(){botao.querySelector('span').textContent=select.selectedOptions[0]?.textContent??'Selecione uma marca';}
 function destacar(indice){
  ativo=indice;
  [...lista.children].forEach((el,i)=>el.classList.toggle('em-foco',i===ativo));
  if(ativo>=0){busca.setAttribute('aria-activedescendant',lista.children[ativo].id);lista.children[ativo].scrollIntoView({block:'nearest'});}else busca.removeAttribute('aria-activedescendant');
 }
 function escolher(opcao){
  if(select.disabled)return;
  fechar(true);
  if(select.value!==opcao.value){select.value=opcao.value;select.dispatchEvent(new Event('change',{bubbles:true}));}
  sincronizar();
 }
 function filtrar(){
  resultados=filtrarMarcas([...select.options],busca.value);lista.replaceChildren();
  resultados.forEach((opcao,i)=>{
   const item=document.createElement('button');item.type='button';item.role='option';item.tabIndex=-1;item.id='marca-opcao-'+i;
   item.textContent=opcao.textContent;item.setAttribute('aria-selected',String(opcao.value===select.value));
   item.addEventListener('click',()=>escolher(opcao));lista.append(item);
  });
  vazio.hidden=resultados.length>0;status.textContent=resultados.length+' marca'+(resultados.length===1?' disponível':'s disponíveis');
  destacar(-1);
 }
 function abrir(){
  if(select.disabled||!select.options.length)return;
  painel.hidden=false;botao.setAttribute('aria-expanded','true');busca.setAttribute('aria-expanded','true');busca.value='';filtrar();busca.focus();
 }
 botao.addEventListener('click',()=>painel.hidden?abrir():fechar(true));
 botao.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();abrir();destacar(event.key==='ArrowDown'?0:resultados.length-1);}});
 busca.addEventListener('input',filtrar);
 busca.addEventListener('keydown',event=>{
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(resultados.length)destacar(event.key==='ArrowDown'?(ativo+1)%resultados.length:(ativo<=0?resultados.length:ativo)-1);}
  if(event.key==='Enter'){event.preventDefault();if(ativo>=0)escolher(resultados[ativo]);else if(resultados.length===1)escolher(resultados[0]);}
 });
 raiz.addEventListener('keydown',event=>{if(event.key==='Escape'&&!painel.hidden){event.preventDefault();event.stopPropagation();fechar(true);}});
 raiz.addEventListener('focusout',event=>{if(!raiz.contains(event.relatedTarget))fechar();});
 document.addEventListener('pointerdown',event=>{if(!raiz.contains(event.target))fechar();});
 return {sincronizar,fechar,desabilitar(valor){botao.disabled=busca.disabled=valor;if(valor)fechar();}};
}
