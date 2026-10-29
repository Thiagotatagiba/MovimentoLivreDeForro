// components/compartilhar.js
// Liga um botão a "compartilhar um link". No celular abre o menu nativo de
// compartilhamento (WhatsApp, Instagram, etc.) via Web Share API; onde isso
// não existe (a maioria dos navegadores de computador), copia o link e avisa.
// Reutilizável: hoje usado em evento.html, serve igual pra Marca/Local.
//
// 2026-10-29: quando o evento tem arte, ela é pré-carregada e enviada junto no
// compartilhamento nativo (Web Share com `files`). Isso faz a própria imagem
// aparecer no WhatsApp, além da prévia do link (que é resolvida pela página
// estática de compartilhamento — ver scripts/gerar-compartilhamento.js).

export function ligarBotaoCompartilhar(botao, { titulo, texto, url, imagem }) {
  // `url` pode ser uma função: a página troca para a URL estática de
  // compartilhamento assim que confirma que ela existe.
  const obterUrl = typeof url === 'function' ? url : () => url;

  let arquivo = null;

  if (imagem) {
    fetch(imagem)
      .then((resposta) => (resposta.ok ? resposta.blob() : null))
      .then((blob) => {
        if (!blob || !blob.type.startsWith('image/')) return;
        const nome = (imagem.split('/').pop() || 'evento').split('?')[0];
        arquivo = new File([blob], nome.includes('.') ? nome : `${nome}.webp`, {
          type: blob.type,
        });
      })
      .catch(() => {});
  }

  botao.addEventListener('click', async () => {
    const destino = obterUrl();

    if (navigator.share) {
      try {
        const podeComArquivo = arquivo && navigator.canShare?.({ files: [arquivo] });

        if (podeComArquivo) {
          // Com arquivo, o link vai no texto (alguns apps ignoram `url` junto
          // de `files`). A imagem aparece como anexo e o link fica na legenda.
          await navigator.share({ title: titulo, text: `${texto}\n${destino}`, files: [arquivo] });
        } else {
          await navigator.share({ title: titulo, text: texto, url: destino });
        }
      } catch (erro) {
        // AbortError = a pessoa fechou o menu sem escolher nada; não é erro.
        if (erro.name !== 'AbortError') {
          console.warn('Falha ao compartilhar:', erro);
          // Se o envio com arquivo falhou, ainda tenta o link simples.
          if (arquivo) {
            try {
              await navigator.share({ title: titulo, text: texto, url: destino });
            } catch (erroLink) {
              if (erroLink.name !== 'AbortError') console.warn('Falha ao compartilhar link:', erroLink);
            }
          }
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(destino);
      mostrarAviso('Link copiado!');
    } catch (erro) {
      // Última alternativa (contexto sem permissão de área de transferência).
      window.prompt('Copie o link:', destino);
    }
  });
}

function mostrarAviso(mensagem) {
  const aviso = document.createElement('div');
  aviso.className = 'aviso-flutuante';
  aviso.setAttribute('role', 'status');
  aviso.textContent = mensagem;
  document.body.appendChild(aviso);

  // dois frames: garante que a transição de entrada acontece
  requestAnimationFrame(() => requestAnimationFrame(() => aviso.classList.add('visivel')));

  setTimeout(() => {
    aviso.classList.remove('visivel');
    setTimeout(() => aviso.remove(), 250);
  }, 2000);
}
