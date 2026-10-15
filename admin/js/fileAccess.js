// fileAccess.js — única camada que fala com o disco via File System Access API.
// Nunca importado pelo site público — só o admin usa isso.

let dirHandle = null;

export function apiDisponivel() {
  return 'showDirectoryPicker' in window;
}

export function projetoAberto() {
  return dirHandle !== null;
}

export async function abrirPastaDoProjeto() {
  // Deixa o usuário escolher a pasta raiz do projeto (onde tem index.html, data/, etc).
  dirHandle = await window.showDirectoryPicker({ id: 'vai-ter-forro-admin', mode: 'readwrite' });

  // Confere logo se a pasta certa foi escolhida, pra não deixar o erro
  // aparecer só depois, na hora de salvar.
  try {
    await dirHandle.getDirectoryHandle('data');
  } catch {
    dirHandle = null;
    throw new Error('Essa pasta não parece ser a raiz do projeto — não encontrei uma pasta "data" dentro dela.');
  }

  return dirHandle;
}

async function obterHandleDoArquivo(nomeArquivo, { criar = false } = {}) {
  if (!dirHandle) throw new Error('Nenhuma pasta de projeto aberta ainda.');
  const dataHandle = await dirHandle.getDirectoryHandle('data', { create: criar });
  return dataHandle.getFileHandle(nomeArquivo, { create: criar });
}

export async function lerJSON(nomeArquivo) {
  const fileHandle = await obterHandleDoArquivo(nomeArquivo);
  const arquivo = await fileHandle.getFile();
  const texto = await arquivo.text();
  return JSON.parse(texto);
}

export async function salvarJSON(nomeArquivo, dados) {
  const fileHandle = await obterHandleDoArquivo(nomeArquivo, { criar: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(dados, null, 2) + '\n');
  await writable.close();
}

// ---- Arquivos soltos (ex: imagens) em subpastas do projeto ----

// caminhoPasta é uma lista, a partir da raiz do projeto: ['assets', 'marcas'].
async function obterPasta(caminhoPasta, { criar = false } = {}) {
  if (!dirHandle) throw new Error('Nenhuma pasta de projeto aberta ainda.');
  let atual = dirHandle;
  for (const nome of caminhoPasta) {
    atual = await atual.getDirectoryHandle(nome, { create: criar });
  }
  return atual;
}

// Grava um arquivo (File/Blob/texto) na subpasta, criando a pasta se preciso.
// Se já existir um arquivo com esse nome, ele é substituído.
export async function salvarArquivo(caminhoPasta, nomeArquivo, conteudo) {
  const pasta = await obterPasta(caminhoPasta, { criar: true });
  const fileHandle = await pasta.getFileHandle(nomeArquivo, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(conteudo);
  await writable.close();
}

// Nomes dos arquivos da subpasta (lista vazia se a pasta ainda não existe).
export async function listarArquivos(caminhoPasta) {
  let pasta;
  try {
    pasta = await obterPasta(caminhoPasta);
  } catch (erro) {
    if (erro.name === 'NotFoundError') return [];
    throw erro;
  }
  const nomes = [];
  for await (const [nome, handle] of pasta.entries()) {
    if (handle.kind === 'file') nomes.push(nome);
  }
  return nomes;
}

export async function removerArquivo(caminhoPasta, nomeArquivo) {
  const pasta = await obterPasta(caminhoPasta);
  await pasta.removeEntry(nomeArquivo);
}
