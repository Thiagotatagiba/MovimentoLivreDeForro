// js/pages/perfil.js
import { obterUsuarioAtual, aoMudarAutenticacao } from '../../services/authService.js';
import { obterPerfil, salvarPerfil, enviarAvatar } from '../../services/perfilService.js';
import { abrirModalLogin } from '../../components/loginModal.js';

const secaoBloqueada = document.getElementById('perfil-bloqueado');
const secaoCarregando = document.getElementById('perfil-carregando');
const form = document.getElementById('perfil-form');
const botaoEntrar = document.getElementById('perfil-botao-entrar');
const botaoSalvar = document.getElementById('perfil-botao-salvar');
const status = document.getElementById('perfil-status');

const avatarPreview = document.getElementById('perfil-avatar-preview');
const avatarArquivo = document.getElementById('perfil-avatar-arquivo');
const avatarBotao = document.getElementById('perfil-avatar-botao');

const AVATAR_PADRAO = 'assets/icons/avatar-padrao.svg';

const campos = {
  nome: document.getElementById('perfil-nome'),
  sobrenome: document.getElementById('perfil-sobrenome'),
  apelido: document.getElementById('perfil-apelido'),
  email: document.getElementById('perfil-email'),
  cidade: document.getElementById('perfil-cidade'),
  estado: document.getElementById('perfil-estado'),
  pais: document.getElementById('perfil-pais'),
  instagram: document.getElementById('perfil-instagram'),
  telefone: document.getElementById('perfil-telefone'),
  data_nascimento: document.getElementById('perfil-nascimento'),
  genero: document.getElementById('perfil-genero'),
  bio: document.getElementById('perfil-bio')
};

let usuarioAtual = null;
let avatarUrlAtual = '';

function mostrarEstado(estado) {
  secaoBloqueada.hidden = estado !== 'bloqueado';
  secaoCarregando.hidden = estado !== 'carregando';
  form.hidden = estado !== 'form';
}

function preencherFormulario(usuario, perfil) {
  campos.email.value = usuario.email || '';
  campos.nome.value = perfil?.nome || '';
  campos.sobrenome.value = perfil?.sobrenome || '';
  // "Como gostaria de ser chamado" nasce igual ao Nome quando ainda não existe.
  campos.apelido.value = perfil?.apelido || perfil?.nome || '';
  campos.cidade.value = perfil?.cidade || '';
  campos.estado.value = perfil?.estado || '';
  campos.pais.value = perfil?.pais || 'Brasil';
  campos.instagram.value = perfil?.instagram || '';
  campos.telefone.value = perfil?.telefone || '';
  campos.data_nascimento.value = perfil?.data_nascimento || '';
  campos.genero.value = perfil?.genero || '';
  campos.bio.value = perfil?.bio || '';

  avatarUrlAtual = perfil?.avatar_url || '';
  avatarPreview.src = avatarUrlAtual || AVATAR_PADRAO;
}

async function carregar() {
  mostrarEstado('carregando');
  usuarioAtual = await obterUsuarioAtual();

  if (!usuarioAtual) {
    mostrarEstado('bloqueado');
    return;
  }

  try {
    const perfil = await obterPerfil(usuarioAtual.id);
    preencherFormulario(usuarioAtual, perfil);
    mostrarEstado('form');
  } catch (erro) {
    console.error('Não foi possível carregar o perfil:', erro);
    mostrarStatus('Não foi possível carregar seu perfil. Tenta recarregar a página.', true);
    mostrarEstado('form');
  }
}

function mostrarStatus(mensagem, ehErro) {
  status.textContent = mensagem;
  status.hidden = false;
  status.classList.toggle('form-perfil-status-erro', !!ehErro);
}

botaoEntrar.addEventListener('click', () => abrirModalLogin());

avatarBotao.addEventListener('click', () => avatarArquivo.click());

avatarArquivo.addEventListener('change', async () => {
  const arquivo = avatarArquivo.files[0];
  if (!arquivo || !usuarioAtual) return;

  // Preview imediato, antes mesmo do upload terminar.
  avatarPreview.src = URL.createObjectURL(arquivo);
  avatarBotao.disabled = true;
  avatarBotao.textContent = 'Enviando...';

  try {
    avatarUrlAtual = await enviarAvatar(usuarioAtual.id, arquivo);
    await salvarPerfil(usuarioAtual.id, { avatar_url: avatarUrlAtual });
    avatarPreview.src = avatarUrlAtual;
  } catch (erro) {
    console.error('Não foi possível enviar a foto:', erro);
    mostrarStatus('Não foi possível enviar a foto. Tenta de novo.', true);
    avatarPreview.src = avatarUrlAtual || AVATAR_PADRAO;
  } finally {
    avatarBotao.disabled = false;
    avatarBotao.textContent = 'Alterar foto';
  }
});

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!usuarioAtual) return;

  botaoSalvar.disabled = true;
  botaoSalvar.textContent = 'Salvando...';
  status.hidden = true;

  const dados = {
    nome: campos.nome.value.trim() || null,
    sobrenome: campos.sobrenome.value.trim() || null,
    apelido: campos.apelido.value.trim() || campos.nome.value.trim() || null,
    cidade: campos.cidade.value.trim() || null,
    estado: campos.estado.value.trim() || null,
    pais: campos.pais.value.trim() || null,
    instagram: campos.instagram.value.trim() || null,
    telefone: campos.telefone.value.trim() || null,
    data_nascimento: campos.data_nascimento.value || null,
    genero: campos.genero.value || null,
    bio: campos.bio.value.trim() || null
  };

  try {
    await salvarPerfil(usuarioAtual.id, dados);
    mostrarStatus('Perfil salvo!', false);
  } catch (erro) {
    console.error('Não foi possível salvar o perfil:', erro);
    mostrarStatus('Não foi possível salvar. Tenta de novo em instantes.', true);
  } finally {
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = 'Salvar';
  }
});

// Se a pessoa logar nessa mesma aba (via modal, sem ter recarregado),
// recarrega os dados do perfil automaticamente.
aoMudarAutenticacao((usuario) => {
  if (usuario && !usuarioAtual) {
    carregar();
  }
});

carregar();
