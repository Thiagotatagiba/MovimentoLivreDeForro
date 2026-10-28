// js/utils/ui.js
// Pequenos construtores de UI reutilizados por mais de uma página.
// Funções puras: montam string, não tocam no DOM.

import { escaparHtml } from './format.js';

// Estado vazio com ícone + CTA. Antes cada página repetia um
// <div class="estado-vazio">texto</div> sem ação nenhuma.
export function estadoVazioHtml({ icone = '🪗', titulo, texto, ctaHref, ctaTexto }) {
  return `
    <div class="estado-vazio">
      <span class="estado-vazio-icone" aria-hidden="true">${icone}</span>
      <p><strong>${escaparHtml(titulo)}</strong></p>
      ${texto ? `<p>${escaparHtml(texto)}</p>` : ''}
      ${ctaHref && ctaTexto ? `<a class="botao botao-secundario" href="${escaparHtml(ctaHref)}">${escaparHtml(ctaTexto)}</a>` : ''}
    </div>
  `;
}

// Grade de esqueletos enquanto os dados carregam (evita o "pulo" de layout).
export function esqueletosGradeHtml(quantidade = 3) {
  return Array.from({ length: quantidade }, () => '<div class="esqueleto esqueleto-card"></div>').join('');
}
