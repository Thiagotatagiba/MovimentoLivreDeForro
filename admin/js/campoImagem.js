// campoImagem.js — campo "Enviar imagem" do formulário de Marca (logo e capa).
// NÃO grava nada no disco: guarda a escolha em memória e mostra uma prévia.
// A gravação só acontece quando o formulário é salvo (ver marcas.js) — assim,
// cancelar o formulário nunca altera arquivos.

import { extensaoDaImagem, nomeDaImagem, FORMATOS_ACEITOS } from './imagensMarca.js';

const AVISO_PESO_BYTES = 2 * 1024 * 1024;

function formatarTamanho(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

// A página do admin fica em /admin/, então caminhos do projeto precisam de "../".
function urlDaPrevia(valor) {
  return /^https?:/i.test(valor) ? valor : `../${valor}`;
}

// tipo: 'logo' | 'capa' (define os ids: mr-{tipo}-previa, -escolher, ...)
// obterSlug: função que devolve o slug da marca em edição (ou '' se ainda não há)
export function criarCampoImagem({ tipo, obterSlug }) {
  const previaEl = document.getElementById(`mr-${tipo}-previa`);
  const escolherEl = document.getElementById(`mr-${tipo}-escolher`);
  const removerEl = document.getElementById(`mr-${tipo}-remover`);
  const arquivoEl = document.getElementById(`mr-${tipo}-arquivo`);
  const infoEl = document.getElementById(`mr-${tipo}-info`);

  let valorAtual = null;   // o que está salvo hoje no JSON
  let arquivo = null;      // imagem escolhida, ainda não gravada
  let remover = false;     // pediu pra tirar a imagem atual
  let urlTemporaria = null;

  function liberarUrlTemporaria() {
    if (urlTemporaria) {
      URL.revokeObjectURL(urlTemporaria);
      urlTemporaria = null;
    }
  }

  function mostrarPrevia(src) {
    if (src) {
      previaEl.src = src;
      previaEl.hidden = false;
    } else {
      previaEl.removeAttribute('src');
      previaEl.hidden = true;
    }
  }

  function atualizarInfo() {
    if (arquivo) {
      const slug = obterSlug();
      const destino = slug
        ? nomeDaImagem(slug, tipo, extensaoDaImagem(arquivo))
        : `(slug da marca)-${tipo}.${extensaoDaImagem(arquivo)}`;
      let texto = `${arquivo.name} (${formatarTamanho(arquivo.size)}) — será copiada como ${destino} ao salvar a marca.`;
      if (arquivo.size > AVISO_PESO_BYTES) {
        texto += ' ⚠ Arquivo pesado: pode deixar o site lento no celular — considere reduzir antes.';
      }
      infoEl.textContent = texto;
    } else if (remover) {
      infoEl.textContent = 'A imagem será removida ao salvar a marca.';
    } else if (valorAtual) {
      infoEl.textContent = 'Imagem atual. Enviar outra substitui esta.';
    } else {
      infoEl.textContent = 'Nenhuma imagem ainda.';
    }

    removerEl.hidden = remover || !(valorAtual || arquivo);
  }

  escolherEl.addEventListener('click', () => arquivoEl.click());

  arquivoEl.addEventListener('change', () => {
    const escolhido = arquivoEl.files[0];
    arquivoEl.value = ''; // permite escolher o mesmo arquivo de novo depois
    if (!escolhido) return;

    if (!extensaoDaImagem(escolhido)) {
      infoEl.textContent = `Formato não suportado. Use ${FORMATOS_ACEITOS}.`;
      return;
    }

    arquivo = escolhido;
    remover = false;
    liberarUrlTemporaria();
    urlTemporaria = URL.createObjectURL(escolhido);
    mostrarPrevia(urlTemporaria);
    atualizarInfo();
  });

  removerEl.addEventListener('click', () => {
    arquivo = null;
    remover = Boolean(valorAtual); // se não havia imagem salva, é só descartar a escolha
    liberarUrlTemporaria();
    mostrarPrevia(null);
    atualizarInfo();
  });

  return {
    // Chamado ao abrir o formulário: zera a escolha e mostra a imagem salva.
    carregar(valor) {
      valorAtual = valor || null;
      arquivo = null;
      remover = false;
      liberarUrlTemporaria();
      mostrarPrevia(valorAtual ? urlDaPrevia(valorAtual) : null);
      atualizarInfo();
    },
    // Chamado ao salvar: o que a pessoa decidiu fazer com essa imagem.
    pendente() {
      return { arquivo, remover };
    },
    atualizarInfo,
  };
}
