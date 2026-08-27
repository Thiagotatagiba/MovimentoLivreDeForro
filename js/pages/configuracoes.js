// configuracoes.js — script não-módulo (sem dependência de import/export).
// Usa o prompt de instalação capturado globalmente em js/pwa.js.

const botaoInstalar = document.getElementById('botao-instalar');
const statusInstalado = document.getElementById('status-instalado');
const statusIndisponivel = document.getElementById('status-indisponivel');

function jaInstalado() {
  const rodandoStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = window.navigator.standalone === true; // Safari iOS
  return rodandoStandalone || iosStandalone;
}

function atualizarInterface() {
  if (jaInstalado()) {
    botaoInstalar.hidden = true;
    statusIndisponivel.hidden = true;
    statusInstalado.hidden = false;
    return;
  }

  const promptDisponivel = !!window.deferredInstallPrompt;
  botaoInstalar.hidden = !promptDisponivel;
  statusIndisponivel.hidden = promptDisponivel;
  statusInstalado.hidden = true;
}

window.addEventListener('pwa-instalavel', atualizarInterface);
window.addEventListener('pwa-instalado', atualizarInterface);

botaoInstalar.addEventListener('click', async () => {
  const prompt = window.deferredInstallPrompt;
  if (!prompt) return;

  prompt.prompt();
  const escolha = await prompt.userChoice;

  if (escolha.outcome === 'accepted') {
    window.deferredInstallPrompt = null;
    atualizarInterface();
  }
});

atualizarInterface();
