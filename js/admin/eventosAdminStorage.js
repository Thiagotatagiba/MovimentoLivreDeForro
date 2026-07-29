// Camada de persistência do painel administrativo de Eventos.
//
// Hoje: carregar/baixar arquivo local, tudo em memória, nada é salvo
// automaticamente. A lógica genérica de arquivo mora em arquivoStorage.js
// (compartilhada com o painel de Locais); este arquivo só nomeia o
// contrato específico de Eventos, mesmo espírito dos repositórios do
// site público (js/repositories/*.js).

import { carregarArrayDeArquivo, exportarArrayParaArquivo } from "./arquivoStorage.js";

export const eventosAdminStorage = {
  async carregarDeArquivo(arquivo) {
    return carregarArrayDeArquivo(arquivo);
  },
  exportarParaArquivo(eventos, nomeArquivo = "eventos.json") {
    exportarArrayParaArquivo(eventos, nomeArquivo);
  },
};
