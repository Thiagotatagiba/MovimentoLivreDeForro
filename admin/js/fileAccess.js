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
