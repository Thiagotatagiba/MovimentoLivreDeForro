export function acessosMenu(contexto){
 const global=contexto?.administradorSistema===true,marcas=contexto?.acessos??contexto?.marcas??[];
 const pode=p=>global||marcas.some(m=>m.permissoes?.includes(p));
 return {eventos:pode('gerenciar_eventos')||pode('publicar_eventos'),novoEvento:pode('gerenciar_eventos'),
  locais:global,marcas:global,listas:pode('gerenciar_listas')||pode('consultar_listas'),novaLista:pode('gerenciar_listas'),
  gerentes:global||marcas.some(m=>m.administrador===true)};
}
export const itensGestao=[
 {id:'eventos',nome:'Eventos',url:'gestao.html',acao:'Cadastrar evento',novo:'gestao.html?acao=novo',descricao:'Crie uma edição com data, horário, atrações e ingresso. Depois revise e publique.'},
 {id:'locais',nome:'Locais',url:'cadastros.html?aba=local',acao:'Cadastrar local',novo:'cadastros.html?aba=local',descricao:'Cadastre o espaço, confira o endereço no mapa ou edite um local existente.'},
 {id:'marcas',nome:'Marcas',url:'cadastros.html?aba=marca',acao:'Cadastrar marca',novo:'cadastros.html?aba=marca',descricao:'Cadastre a marca do baile e escolha seu local padrão.'},
 {id:'listas',nome:'Listas',url:'listas.html',acao:'Gerenciar listas',novo:'listas.html',descricao:'Acompanhe listas e inscrições de todos os eventos. Para criar uma lista, abra o evento publicado.'},
 {id:'gerentes',nome:'Gerentes de marcas',url:'convites.html?acao=convidar-gerente',acao:'Convidar gerente de marca',novo:'convites.html?acao=convidar-gerente',descricao:'Convide quem vai administrar uma marca. O acesso começa após a aceitação do convite.'},
];
export function destinoAtalho(item,permissoes){
 if(item.id==='eventos'&&!permissoes.novoEvento)return {texto:'Gerenciar eventos',url:item.url};
 if(item.id==='listas'&&!permissoes.novaLista)return {texto:'Consultar listas',url:item.url};
 return {texto:item.acao,url:item.novo};
}
