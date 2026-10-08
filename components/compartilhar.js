// components/compartilhar.js
// Liga um botão a "compartilhar um link". No celular abre o menu nativo de
// compartilhamento (WhatsApp, Instagram, etc.) via Web Share API; onde isso
// não existe (a maioria dos navegadores de computador), copia o link e avisa.
// Reutilizável: hoje usado em evento.html, serve igual pra Marca/Local.

export function ligarBotaoCompartilhar(botao, { titulo, texto, url }) {
  botao.addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, text: texto, url });
      } catch (erro) {
        // AbortError = a pessoa fechou o menu sem escolher nada; não é erro.
        if (erro.name !== 'AbortError') console.warn('Falha ao compartilhar:', erro);
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      mostrarAviso('Link copiado!');
    } catch (erro) {
      // Última alternativa (contexto sem permissão de área de transferência).
      window.prompt('Copie o link:', url);
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
