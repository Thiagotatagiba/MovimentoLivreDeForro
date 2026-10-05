// js/pages/favoritos.js
import { obterUsuarioAtual, aoMudarAutenticacao } from '../../services/authService.js';
import { listarFavoritos, listarSeguindo } from '../../services/interacaoService.js';
import { listarEventosPorIds } from '../services/eventoService.js';
import { listarMarcasPorIds } from '../services/marcaService.js';
import { cardEventoHtml } from '../utils/cardEvento.js';
import { abrirModalLogin } from '../../components/loginModal.js';

const secaoBloqueada = document.getElementById('favoritos-bloqueado');
const secaoCarregando = document.getElementById('favoritos-carregando');
const conteudo = document.getElementById('favoritos-conteudo');
const botaoEntrar = document.getElementById('favoritos-botao-entrar');

const listaEventos = document.getElementById('lista-eventos-favoritos');
const vazioEventos = document.getElementById('vazio-eventos-favoritos');
const listaMarcas = document.getElementById('lista-marcas-seguindo');
const vazioMarcas = document.getElementById('vazio-marcas-seguindo');

function mostrarEstado(estado) {
  secaoBloqueada.hidden = estado !== 'bloqueado';
  secaoCarregando.hidden = estado !== 'carregando';
  conteudo.hidden = estado !== 'conteudo';
}

async function carregar() {
  mostrarEstado('carregando');
  const usuario = await obterUsuarioAtual();

  if (!usuario) {
    mostrarEstado('bloqueado');
    return;
  }

  try {
    const [idsEventos, idsMarcas] = await Promise.all([
      listarFavoritos(usuario.id),
      listarSeguindo(usuario.id),
    ]);

    const [eventos, marcas] = await Promise.all([
      listarEventosPorIds(idsEventos),
      listarMarcasPorIds(idsMarcas),
    ]);

    renderizarEventos(eventos);
    renderizarMarcas(marcas);
    mostrarEstado('conteudo');
  } catch (erro) {
    console.error('Não foi possível carregar seus favoritos:', erro);
    mostrarEstado('conteudo');
    listaEventos.innerHTML = '<div class="estado-vazio">Não foi possível carregar agora. Tenta recarregar a página.</div>';
  }
}

function renderizarEventos(eventos) {
  if (eventos.length === 0) {
    listaEventos.innerHTML = '';
    vazioEventos.hidden = false;
    return;
  }
  vazioEventos.hidden = true;
  listaEventos.innerHTML = eventos.map((e) => cardEventoHtml(e)).join('');
}

function renderizarMarcas(marcas) {
  if (marcas.length === 0) {
    listaMarcas.innerHTML = '';
    vazioMarcas.hidden = false;
    return;
  }
  vazioMarcas.hidden = true;
  listaMarcas.innerHTML = marcas
    .map((m) => `
      <div class="local-mini">
        <div>
          <p style="font-weight: 600;">${m.nome}</p>
        </div>
        <a href="marca.html?slug=${m.slug}">Ver Marca</a>
      </div>
    `)
    .join('');
}

botaoEntrar.addEventListener('click', () => abrirModalLogin());

let jaCarregouLogado = false;
aoMudarAutenticacao((usuario) => {
  if (usuario && !jaCarregouLogado) {
    jaCarregouLogado = true;
    carregar();
  }
});

carregar();
