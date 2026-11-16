import {acessosMenu} from '../admin/js/navegacaoModelo.js?v=lista-evento-1';

export function destinoGestao(contexto) {
  const acesso=acessosMenu(contexto);
  if(acesso.eventos||acesso.marcas) return 'admin/gestao.html';
  if(acesso.listas) return 'admin/listas.html';
  if(acesso.gerentes) return 'admin/convites.html';
  return null;
}

// Every new session invalidates pending reads, including logout and account changes.
export function criarAtalhoGestao({elemento,carregarContexto}) {
  let geracao=0;
  return async function atualizar(usuario) {
    const atual=++geracao;
    if(!elemento)return;
    elemento.hidden=true;
    elemento.removeAttribute('href');
    if(!usuario)return;
    try {
      const contexto=await carregarContexto();
      if(atual!==geracao)return;
      const destino=destinoGestao(contexto);
      if(destino){elemento.href=destino;elemento.hidden=false;}
    } catch { /* Unconfirmed permissions keep the shortcut hidden. */ }
  };
}
