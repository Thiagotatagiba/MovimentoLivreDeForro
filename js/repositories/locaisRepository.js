// Repositório de locais. Mesmo contrato e mesma lógica de troca futura de
// fonte de dados descrita em eventosRepository.js.

let _cache = null;

export const locaisRepository = {
  async listar() {
    if (_cache) return _cache;
    const res = await fetch("data/locais.json");
    if (!res.ok) throw new Error("Falha ao carregar data/locais.json");
    _cache = await res.json();
    return _cache;
  },

  async buscarPorSlug(slug) {
    const locais = await this.listar();
    return locais.find((l) => l.slug === slug) ?? null;
  },
};
