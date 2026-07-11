import { marcasRepository } from "../repositories/marcasRepository.js";

// Camada de serviço de marcas. Hoje serve principalmente para enriquecer os
// cards de evento com a identidade do baile. Quando a página da Marca for
// construída (Etapa 3), os métodos que ela vai precisar — histórico e
// próximos eventos — já existem do lado de eventosService.listarPorMarca().

export const marcasService = {
  async listarTodos() {
    const marcas = await marcasRepository.listar();
    return marcas.filter((m) => m.status === "publicado");
  },

  async buscarPorSlug(slug) {
    return marcasRepository.buscarPorSlug(slug);
  },

  /** Mapa slug -> marca, conveniente para montar cards em lote sem N buscas sequenciais. */
  async mapaPorSlug() {
    const marcas = await this.listarTodos();
    return new Map(marcas.map((m) => [m.slug, m]));
  },
};
