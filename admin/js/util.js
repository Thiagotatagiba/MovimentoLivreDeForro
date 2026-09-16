// util.js

export function paraSlug(texto) {
  return texto
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Gera o próximo ID no padrão "prefixo-NNN" (ex: mrc-006), olhando o maior
// número já usado na lista — não depende de contagem, só de sequência real.
export function proximoId(lista, prefixo) {
  const numeros = lista
    .map((item) => item.id?.match(new RegExp(`^${prefixo}-(\\d+)$`)))
    .filter(Boolean)
    .map((m) => Number(m[1]));

  const proximo = numeros.length ? Math.max(...numeros) + 1 : 1;
  return `${prefixo}-${String(proximo).padStart(3, '0')}`;
}

export function textoParaLista(texto) {
  return texto
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function listaParaTexto(lista) {
  return (lista ?? []).join(', ');
}
