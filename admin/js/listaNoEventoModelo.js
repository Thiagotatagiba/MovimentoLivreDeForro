export function eventoDaBusca(search){
 const value=new URLSearchParams(search).get('evento');if(value===null)return null;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw Error('Link de evento inválido. Abra a lista pelo evento novamente.');
 return value.toLowerCase();
}
export function selecionarEventoLista(rows,solicitado,anterior){
 if(solicitado){const row=rows.find(r=>r.evento_id===solicitado);if(!row)throw Error('O evento solicitado não está disponível para listas nesta conta. Nenhuma outra edição foi selecionada.');return row;}
 return rows.find(r=>r.evento_id===anterior)??rows[0]??null;
}
export function estadoListaNoEvento({evento,podeGerenciar,podeConsultar,alterado,publicacaoPendente,registro,carregando,erro}){
 if(!evento?.id||!evento.versao_publicada_id||evento.estado_publicacao!=='publicado')return {texto:'Salve e publique este evento para criar sua lista VIP ou de desconto.'};
 if(!podeGerenciar&&!podeConsultar)return {texto:'Sua conta não tem permissão de listas nesta marca.'};
 if(alterado)return {texto:'Salve as alterações do evento antes de continuar. A lista permanece vinculada à versão publicada.'};
 if(carregando)return {texto:'Conferindo a lista deste evento…'};
 if(erro)return {texto:'Não foi possível conferir a lista. Tente atualizar esta seção.',erro:true};
 if(!registro)return {texto:'Esta edição não está disponível para listas. Confira se o evento, a marca e o local estão ativos.'};
 if(registro.lista)return {texto:'Lista: '+registro.lista.titulo,acao:podeGerenciar?'Gerenciar lista deste evento':'Consultar lista deste evento',gerenciar:true};
 if(publicacaoPendente)return {texto:'Publique as alterações salvas do evento antes de criar sua lista.'};
 if(!podeGerenciar||!registro.gerenciar)return {texto:'Este evento ainda não tem lista. Sua conta possui apenas acesso de consulta.'};
 if((evento.versao?.situacao??registro.situacao)!=='confirmado'||evento.versao?.conteudo?.ativo===false)return {texto:'A criação de lista exige um evento publicado e confirmado.'};
 return {texto:'Este evento ainda não tem lista. Você pode criar uma agora.',acao:'Criar lista deste evento',criar:true};
}
