// estado.js — estado compartilhado em memória. Sem framework, sem store
// complexo: só um objeto mutável que os 3 módulos de aba importam e leem/escrevem.

export const estado = {
  eventos: [],
  marcas: [],
  locais: [],
};
