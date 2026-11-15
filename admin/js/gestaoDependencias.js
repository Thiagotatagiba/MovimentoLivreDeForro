import {administracao} from '../../services/administracaoService.js?v=criacao-eventos-1';
import {obterUsuarioAtual,aoMudarAutenticacao} from '../../services/authService.js';
import {abrirModalLogin} from '../../components/loginModal.js';
export const dependencias={
 servico:administracao,demonstracao:false,
 obterUsuario:obterUsuarioAtual,
 observarSessao:fn=>aoMudarAutenticacao(()=>setTimeout(fn,0)),
 entrar:()=>abrirModalLogin({subtitulo:'Entre para gerenciar os eventos das suas marcas.'}),
};
