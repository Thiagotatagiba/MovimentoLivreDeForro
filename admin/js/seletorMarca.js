const normalizar=valor=>valor.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
export function filtrarMarcas(opcoes,busca){
 const termos=normalizar(busca).split(/\s+/).filter(Boolean);
 return opcoes.filter(opcao=>termos.every(termo=>normalizar(opcao.textContent).includes(termo)));
}

export function criarSeletorMarca({raiz,select,botao,busca,painel,lista,vazio,status,singular='marca',plural='marcas',aoEscolher=()=>{}}){
 let resultados=[],ativo=-1;
 function fechar(devolverFoco=false){painel.hidden=true;botao.setAttribute('aria-expanded','false');busca.setAttribute('aria-expanded','false');busca.removeAttribute('aria-activedescendant');if(devolverFoco)botao.focus();}
 function sincronizar(){botao.querySelector('span').textContent=select.selectedOptions[0]?.textContent??'Selecione uma marca';}
 function destacar(indice){
  ativo=indice;
  [...lista.children].forEach((el,i)=>el.classList.toggle('em-foco',i===ativo));
  if(ativo>=0){busca.setAttribute('aria-activedescendant',lista.children[ativo].id);lista.children[ativo].scrollIntoView({block:'nearest'});}else busca.removeAttribute('aria-activedescendant');
 }
 function escolher(opcao){
  if(select.matches(':disabled')||opcao.disabled)return;
  fechar(true);
  if(select.value!==opcao.value){select.value=opcao.value;select.dispatchEvent(new Event('change',{bubbles:true}));aoEscolher();}
  sincronizar();
 }
 function filtrar(){
  resultados=filtrarMarcas([...select.options].filter(o=>!o.disabled),busca.value);lista.replaceChildren();
  resultados.forEach((opcao,i)=>{
   const item=document.createElement('button');item.type='button';item.role='option';item.tabIndex=-1;item.id=lista.id+'-opcao-'+i;
   item.textContent=opcao.textContent;item.setAttribute('aria-selected',String(opcao.value===select.value));
   item.addEventListener('click',()=>escolher(opcao));lista.append(item);
  });
  vazio.hidden=resultados.length>0;status.textContent=resultados.length+' '+(resultados.length===1?singular+' disponível':plural+' disponíveis');
  destacar(-1);
 }
 function abrir(){
  if(select.matches(':disabled')||!select.options.length)return;
  painel.hidden=false;botao.setAttribute('aria-expanded','true');busca.setAttribute('aria-expanded','true');busca.value='';filtrar();busca.focus();
 }
 botao.addEventListener('click',()=>painel.hidden?abrir():fechar(true));
 botao.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();abrir();destacar(event.key==='ArrowDown'?0:resultados.length-1);}});
 busca.addEventListener('input',event=>{event.stopPropagation();filtrar();});
 busca.addEventListener('keydown',event=>{
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(resultados.length)destacar(event.key==='ArrowDown'?(ativo+1)%resultados.length:(ativo<=0?resultados.length:ativo)-1);}
  if(event.key==='Enter'){event.preventDefault();if(ativo>=0)escolher(resultados[ativo]);else if(resultados.length===1)escolher(resultados[0]);}
 });
 raiz.addEventListener('keydown',event=>{if(event.key==='Escape'&&!painel.hidden){event.preventDefault();event.stopPropagation();fechar(true);}});
 raiz.addEventListener('focusout',event=>{if(!raiz.contains(event.relatedTarget))fechar();});
 document.addEventListener('pointerdown',event=>{if(!raiz.contains(event.target))fechar();});
 return {sincronizar,fechar,desabilitar(valor){botao.disabled=busca.disabled=valor;if(valor)fechar();}};
}

// Keep the native select as the source of values, form data and validation.
export function melhorarSelect(select,{singular,plural,buscar,vazio:semResultados,marcarAlteracao=false}){
 const id=select.id,rotulo=document.querySelector('label[for="'+id+'"]');
 const raiz=document.createElement('div');raiz.className='seletor-marca';
 const botao=document.createElement('button');botao.type='button';botao.id=id+'-abrir';botao.className='marca-abrir';
 const nome=document.createElement('span');nome.id=id+'-selecionado';botao.append(nome);
 const seta=document.createElement('span');seta.textContent='⌄';seta.setAttribute('aria-hidden','true');botao.append(seta);
 const painel=document.createElement('div');painel.id=id+'-painel';painel.className='marca-painel';painel.hidden=true;
 const label=document.createElement('label'),busca=document.createElement('input');busca.type='search';busca.id=id+'-busca';busca.placeholder='Digite o nome…';busca.autocomplete='off';label.htmlFor=busca.id;label.textContent=buscar;
 const lista=document.createElement('div');lista.id=id+'-opcoes';lista.className='marcas-opcoes';lista.role='listbox';lista.setAttribute('aria-label',plural);
 busca.role='combobox';busca.setAttribute('aria-autocomplete','list');busca.setAttribute('aria-expanded','false');busca.setAttribute('aria-controls',lista.id);
 botao.setAttribute('aria-expanded','false');botao.setAttribute('aria-controls',painel.id);
 if(rotulo){rotulo.id||=id+'-rotulo';rotulo.htmlFor=botao.id;botao.setAttribute('aria-labelledby',rotulo.id+' '+nome.id);}
 const vazio=document.createElement('p');vazio.className='apoio';vazio.textContent=semResultados;vazio.hidden=true;
 const status=document.createElement('small');status.role='status';status.setAttribute('aria-live','polite');
 painel.append(label,busca,lista,vazio,status);raiz.append(botao,painel);select.before(raiz);select.hidden=true;select.setAttribute('aria-hidden','true');select.tabIndex=-1;
 const controle=criarSeletorMarca({raiz,select,botao,busca,painel,lista,vazio,status,singular,plural,aoEscolher:()=>{if(marcarAlteracao)select.dispatchEvent(new Event('input',{bubbles:true}));}});
 function sincronizar(){controle.sincronizar();controle.desabilitar(select.matches(':disabled')||!select.options.length);}
 select.addEventListener('change',()=>queueMicrotask(sincronizar));
 select.addEventListener('invalid',event=>{event.preventDefault();if(painel.hidden)botao.click();busca.focus();status.textContent='Escolha uma opção para continuar.';});
 new MutationObserver(sincronizar).observe(select,{childList:true,subtree:true,attributes:true});
 select.form?.addEventListener('reset',()=>queueMicrotask(sincronizar));
 sincronizar();return {...controle,sincronizar};
}
