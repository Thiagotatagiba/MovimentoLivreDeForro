// js/barraTopo.js
// Fonte única da barra do topo (logo + favoritos + busca/voltar) — gerada
// aqui em vez de duplicada em cada página. Cada página só precisa de:
//   <script src="js/barraTopo.js"></script>   (primeira linha depois de <body>)
// e, opcionalmente, atributos no <body> pra customizar:
//   data-busca-topo          → mostra o botão de busca (só a Home usa)
//   data-voltar-topo="x.html" → pra onde o ícone da direita volta (padrão: index.html)
//
// É um script CLÁSSICO (sem type="module") de propósito: precisa rodar de
// forma síncrona, bem no início do <body>, ANTES dos scripts de página
// (type="module", sempre adiados pelo navegador) tentarem usar elementos
// como #botao-busca. Um módulo ou um listener de DOMContentLoaded rodariam
// tarde demais pra isso.
(function () {
  var body = document.body;
  var temBusca = body.hasAttribute('data-busca-topo');
  var voltarPara = body.getAttribute('data-voltar-topo') || 'index.html';

  var iconeDireita = temBusca
    ? '<button type="button" class="barra-topo-icone" id="botao-busca" aria-expanded="false" aria-controls="busca-container" aria-label="Buscar Marca, Local ou evento">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
      '</button>'
    : '<a href="' + voltarPara + '" class="barra-topo-icone" aria-label="Voltar">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>' +
      '</a>';

  var html =
    '<div class="barra-topo">' +
      '<a href="favoritos.html" class="barra-topo-icone" aria-label="Ver favoritos">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7.5-4.7-10-9.3C0.3 8.4 2 5 5.5 5c2 0 3.5 1.2 4.5 2.8C11 6.2 12.5 5 14.5 5 18 5 19.7 8.4 22 11.7 19.5 16.3 12 21 12 21z"/></svg>' +
      '</a>' +
      '<span class="barra-topo-marca">Vai Ter Forró!</span>' +
      iconeDireita +
    '</div>';

  body.insertAdjacentHTML('afterbegin', html);
})();
