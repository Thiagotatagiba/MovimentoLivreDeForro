// js/utils/dom.js
// Cria elementos DOM usando textContent. Os textos da Carteira de ingressos
// (nome do evento etc.) são digitados pelo usuário — nunca podem entrar como HTML.

export function criar(tag, { classe, texto, attrs = {}, aoClicar, filhos = [] } = {}) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  for (const [nome, valor] of Object.entries(attrs)) {
    if (valor === false || valor === null || valor === undefined) continue;
    el.setAttribute(nome, valor === true ? '' : valor);
  }
  if (aoClicar) el.addEventListener('click', aoClicar);
  for (const filho of filhos) if (filho) el.append(filho);
  return el;
}

// Mantém o Tab dentro do modal enquanto ele está aberto (acessibilidade).
// Devolve a função que desliga isso.
export function prenderFoco(container) {
  function aoTeclar(evento) {
    if (evento.key !== 'Tab') return;
    const focaveis = [...container.querySelectorAll('button, input, a[href]')]
      .filter((el) => !el.disabled && !el.closest('[hidden]'));
    if (focaveis.length === 0) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  }
  container.addEventListener('keydown', aoTeclar);
  return () => container.removeEventListener('keydown', aoTeclar);
}

