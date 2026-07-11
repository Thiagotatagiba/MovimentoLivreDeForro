// Repositório de marcas. Mesmo contrato e mesma lógica de troca futura de
// fonte de dados descrita em eventosRepository.js.

let _cache = null;

export const marcasRepository = {
  async listar() {
    if (_cache) return _cache;
    const res = await fetch("data/marcas.json");
    if (!res.ok) throw new Error("Falha ao carregar data/marcas.json");
    _cache = await res.json();
    return _cache;
  },

  async buscarPorSlug(slug) {
    const marcas = await this.listar();
    return marcas.find((m) => m.slug === slug) ?? null;
  },
};
