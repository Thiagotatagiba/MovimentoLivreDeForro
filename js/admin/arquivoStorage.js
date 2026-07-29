// Carregar/exportar arquivo JSON local — usado por qualquer cadastro do
// painel administrativo (Eventos, Locais, e os que vierem depois).
// Deliberadamente genérico: não sabe se o array é de eventos ou de locais.

export async function carregarArrayDeArquivo(arquivo) {
  const texto = await arquivo.text();
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error("o arquivo não é um JSON válido.");
  }
  if (!Array.isArray(dados)) {
    throw new Error("o arquivo precisa conter uma lista.");
  }
  return dados;
}

export function exportarArrayParaArquivo(dados, nomeArquivo) {
  const conteudo = JSON.stringify(dados, null, 2) + "\n";
  const blob = new Blob([conteudo], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
