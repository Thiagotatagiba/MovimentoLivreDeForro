import {criarServicoAdministrativo,ErroAdministracao} from '../../services/administracaoService.js';
const perfil=new URLSearchParams(location.search).get('perfil')??'administrador';
async function api(path,body) {
 const r=await fetch('/__admin_demo/'+path,{method:body?'POST':'GET',cache:'no-store',
  headers:{'Content-Type':'application/json','X-Demo-Perfil':perfil},
  ...(body?{body:JSON.stringify(body)}:{})});
 return r.json();
}
async function ler(path) {
 const {data,error}=await api(path);
 if(error) throw new ErroAdministracao(error.code==='42501'?'SEM_PERMISSAO':'INDISPONIVEL','Demonstração indisponível.');
 return data;
}
const servico=criarServicoAdministrativo({obterCliente:async()=>({rpc:(nome,parametros)=>api('rpc',{nome,parametros})})});
servico.carregarContexto=()=>ler('contexto');
servico.listarEventos=marca=>ler('eventos?marca='+encodeURIComponent(marca));
servico.carregarEvento=id=>ler('evento?id='+encodeURIComponent(id));
export const dependencias={servico,demonstracao:true,perfil,
 obterUsuario:async()=>({id:'usuario-ficticio-'+perfil}),observarSessao:()=>({unsubscribe(){}}),
 entrar:()=>{},
};
