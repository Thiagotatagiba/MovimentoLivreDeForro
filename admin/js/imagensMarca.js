// imagensMarca.js — nomes e gravação das imagens (logo/capa) de uma Marca.
// Convenção: assets/marcas/{slug}-logo.{ext} e assets/marcas/{slug}-capa.{ext}
// (a mesma que já existia: assets/marcas/forro-deck-16-logo.jpg).

import { salvarArquivo, listarArquivos, removerArquivo } from './fileAccess.js';

const PASTA = ['assets', 'marcas'];

const EXTENSOES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
};

export const FORMATOS_ACEITOS = 'JPG, PNG, WebP, GIF, SVG ou AVIF';

export function extensaoDaImagem(arquivo) {
  return EXTENSOES[arquivo.type] ?? null;
}

export function nomeDaImagem(slug, tipo, extensao) {
  return `${slug}-${tipo}.${extensao}`;
}

// "forro-deck-16-logo.png" é uma versão da logo de "forro-deck-16"; já
// "forro-deck-16-logo-antiga.png" ou a logo de outra marca não são.
export function ehVersaoDaImagem(nomeArquivo, slug, tipo) {
  const prefixo = `${slug}-${tipo}.`;
  if (!nomeArquivo.toLowerCase().startsWith(prefixo.toLowerCase())) return false;
  return /^[a-z0-9]+$/i.test(nomeArquivo.slice(prefixo.length));
}

// Passo 1 do salvamento: grava o arquivo novo. Ainda NÃO apaga as versões
// antigas — isso só acontece depois que o JSON foi salvo com sucesso
// (limparOutrasVersoes), pra nunca ficar uma referência apontando pro nada.
export async function gravarImagem({ slug, tipo, arquivo }) {
  if (!slug) {
    throw new Error('Preencha o nome da marca antes de enviar imagens — o nome do arquivo usa o slug dela.');
  }
  const extensao = extensaoDaImagem(arquivo);
  if (!extensao) {
    throw new Error(`Formato de imagem não suportado. Use ${FORMATOS_ACEITOS}.`);
  }

  const nome = nomeDaImagem(slug, tipo, extensao);

  // Windows não diferencia maiúsculas de minúsculas, mas o GitHub Pages sim:
  // se já existir "x-logo.JPG" e gravarmos "x-logo.jpg", o arquivo manteria o
  // nome antigo no disco e o site publicado não o encontraria. Remove antes.
  const existentes = await listarArquivos(PASTA);
  for (const existente of existentes) {
    if (existente !== nome && existente.toLowerCase() === nome.toLowerCase()) {
      await removerArquivo(PASTA, existente);
    }
  }

  await salvarArquivo(PASTA, nome, arquivo);

  // "?v=" muda a cada envio: o site publicado guarda imagens em cache, e sem
  // isso quem já visitou continuaria vendo a imagem antiga (mesmo nome de arquivo).
  return { nome, caminho: `assets/marcas/${nome}?v=${Date.now()}` };
}

// Passo 2 (depois de salvar o JSON): apaga as outras versões da imagem — ex:
// ao trocar uma logo .jpg por uma .png, sobra a .jpg velha. Com manterNome
// = null, apaga todas (usado quando a imagem é removida).
export async function limparOutrasVersoes(slug, tipo, manterNome) {
  const nomes = await listarArquivos(PASTA);
  for (const nome of nomes) {
    if (!ehVersaoDaImagem(nome, slug, tipo)) continue;
    if (manterNome && nome.toLowerCase() === manterNome.toLowerCase()) continue;
    await removerArquivo(PASTA, nome);
  }
}
