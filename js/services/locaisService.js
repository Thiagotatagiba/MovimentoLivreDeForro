import { locaisRepository } from "../repositories/locaisRepository.js";

export const locaisService = {
  async listarTodos() {
    return locaisRepository.listar();
  },

  async buscarPorSlug(slug) {
    return locaisRepository.buscarPorSlug(slug);
  },

  /** Mapa slug -> local, conveniente para montar cards em lote sem N buscas sequenciais. */
  async mapaPorSlug() {
    const locais = await this.listarTodos();
    return new Map(locais.map((l) => [l.slug, l]));
  },
};
