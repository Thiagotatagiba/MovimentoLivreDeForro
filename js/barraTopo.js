// js/barraTopo.js
// Fonte única da barra do topo — gerada aqui em vez de duplicada em cada
// página. Cada página só precisa de:
//   <script src="js/barraTopo.js"></script>   (primeira linha depois de <body>)
// e, opcionalmente, atributos no <body> pra customizar:
//   data-busca-topo          → mostra o botão de busca (só a Home usa)
//   data-voltar-topo="x.html" → fallback do ícone de voltar (padrão: index.html)
//
// Revisão 2026-10-28:
// - ícone de voltar virou chevron (antes era uma casa rotulada "Voltar", o que
//   confundia: parecia "início" mas voltava pro histórico);
// - "voltar" usa history.back() quando o referrer é do próprio site;
// - nav de desktop (Início / Agenda / Favoritos / Perfil) dentro da barra;
// - favicon entra como marca visual ao lado do nome.
//
// É um script CLÁSSICO (sem type="module") de propósito: precisa rodar de
// forma síncrona, bem no início do <body>, ANTES dos scripts de página
// (type="module", sempre adiados pelo navegador) tentarem usar #botao-busca.
(function () {
  var body = document.body;
  var temBusca = body.hasAttribute('data-busca-topo');
  var voltarPara = body.getAttribute('data-voltar-topo') || 'index.html';

  var pagina = location.pathname.split('/').pop() || 'index.html';
  function atual(alvo) {
    return pagina === alvo ? ' aria-current="page"' : '';
  }

  var svgBusca = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
  var svgVoltar = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
  var svgCoracao = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 21s-7.5-4.7-10-9.3C0.3 8.4 2 5 5.5 5c2 0 3.5 1.2 4.5 2.8C11 6.2 12.5 5 14.5 5 18 5 19.7 8.4 22 11.7 19.5 16.3 12 21 12 21z"/></svg>';

  var iconeDireita = temBusca
    ? '<button type="button" class="barra-topo-icone" id="botao-busca" aria-expanded="false" aria-controls="busca-container" aria-label="Buscar Marca, Local ou evento">' + svgBusca + '</button>'
    : '<a href="' + voltarPara + '" class="barra-topo-icone barra-topo-voltar" aria-label="Voltar">' + svgVoltar + '</a>';

  var html =
    '<div class="barra-topo">' +
      '<a class="barra-topo-marca" href="index.html" aria-label="Vai Ter Forró! — início">' +
        '<img src="assets/icons/logo-64.png" alt="" width="26" height="26">' +
        '<span>Vai Ter Forró!</span>' +
      '</a>' +
      '<span class="barra-topo-espaco"></span>' +
      '<nav class="barra-topo-nav" aria-label="Navegação principal">' +
        '<a href="index.html"' + atual('index.html') + '>Início</a>' +
        '<a href="agenda.html"' + atual('agenda.html') + '>Agenda</a>' +
        '<a href="favoritos.html"' + atual('favoritos.html') + '>Favoritos</a>' +
        '<a href="perfil.html"' + atual('perfil.html') + '>Perfil</a>' +
      '</nav>' +
      '<a href="favoritos.html" class="barra-topo-icone barra-topo-favoritos" aria-label="Ver favoritos">' + svgCoracao + '</a>' +
      iconeDireita +
    '</div>';

  body.insertAdjacentHTML('afterbegin', html);

  var voltar = document.querySelector('.barra-topo-voltar');
  if (voltar) {
    voltar.addEventListener('click', function (evento) {
      var veioDoSite = document.referrer && document.referrer.indexOf(location.origin) === 0;
      if (veioDoSite && history.length > 1) {
        evento.preventDefault();
        history.back();
      }
    });
  }
})();
