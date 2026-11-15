// Shared by Deno Edge Functions and Node tests. No SDK or third-party dependency.
export class ErroFila extends Error {constructor(codigo){super(codigo);this.codigo=codigo;}}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={editar_marca:'Editar a marca',gerenciar_eventos:'Editar eventos',publicar_eventos:'Publicar eventos',
 gerenciar_listas:'Gerenciar listas',consultar_listas:'Consultar listas'};
export function configuracaoEnvio(env){
 const ativo=env('VTF_CONVITES_ENVIO_ATIVO')==='true',limpeza=env('VTF_CONVITES_LIMPEZA_ATIVA')==='true';
 if(!ativo&&!limpeza)return {ativo:false,limpeza:false};
 const url=new URL(env('SUPABASE_URL')??'');
 const ref=url.hostname.split('.')[0];
 if(url.href!==`https://${ref}.supabase.co/`||!/^[a-z]{20}$/.test(ref)||env('VTF_CONVITES_PROJETO_AUTORIZADO')!==ref)
  throw new ErroFila('projeto_nao_autorizado');
 const key=env('SUPABASE_SERVICE_ROLE_KEY')??'',secret=env('VTF_CONVITES_WORKER_SECRET')??'';
 if(secret.length<48||secret.length>256)throw new ErroFila('segredo_nao_configurado');
 let jwt=false;
 if(key.split('.').length===3){try{const p=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  jwt=p.role==='service_role'&&p.ref===ref;}catch{}}
 if(!jwt&&!/^sb_secret_[A-Za-z0-9_-]{20,}$/.test(key))throw new ErroFila('credencial_de_servico_invalida');
 const result={ativo,limpeza:true,url:url.origin,ref,key,secret,jwt};
 if(!ativo)return result;
 const provider=env('VTF_CONVITES_PROVEDOR');
 if(provider!=='resend')throw new ErroFila('provedor_nao_configurado');
 const providerKey=env('RESEND_API_KEY')??'',from=env('VTF_CONVITES_REMETENTE')??'';
 if(!/^re_[A-Za-z0-9_-]{16,}$/.test(providerKey)||!from||from.length>254||/[\r\n\0]/.test(from))
  throw new ErroFila('remetente_ou_provedor_invalido');
 const app=new URL(env('VTF_CONVITES_APP_URL')??'');
 if(app.protocol!=='https:'||app.username||app.password||app.search||app.hash||app.pathname!=='/')throw new ErroFila('url_do_app_invalida');
 return {...result,providerKey,from,appUrl:app.origin};
}
export function montarMensagem(job,config){
 if(!uuid.test(job.convite_id??'')||!/^[a-f0-9]{64}$/.test(job.token??'')||!Array.isArray(job.permissoes))throw new ErroFila('convite_invalido');
 const role=job.papel==='administrador'?'Administrador da marca':'Equipe';
 const permissions=job.papel==='administrador'?'Todas as permissões de administração desta marca.':
  job.permissoes.map(p=>labels[p]).filter(Boolean).join(', ')||'Sem permissões de operação.';
 const link=new URL('/admin/convites.html',config.appUrl);link.hash=new URLSearchParams({convite:job.convite_id,token:job.token}).toString();
 const expiry=new Date(job.expira_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
 return {from:config.from,to:[job.email],subject:'Convite para uma marca — Vai Ter Forró!',
  text:`Você recebeu um convite para ${job.marca}.\nPapel: ${role}.\nPermissões: ${permissions}\nValidade: ${expiry} (horário de Brasília).\n\n${link.href}\n\nEntre com este e-mail verificado e confirme a aceitação. O link não concede acesso antes da confirmação. Se não esperava este convite, ignore esta mensagem.`,
  html:`<h1>Você recebeu um convite</h1><p>Marca: <strong>${escape(job.marca)}</strong></p><p>Papel: ${escape(role)}</p><p>Permissões: ${escape(permissions)}</p><p>Validade: ${escape(expiry)} (horário de Brasília).</p><p><a href="${escape(link.href)}">Revisar convite</a></p><p>Entre com este e-mail verificado e confirme a aceitação. O link não concede acesso antes da confirmação. Se não esperava este convite, ignore esta mensagem.</p>`};
}
export function criarApiFila(config,fetchImpl=fetch){
 const nomes=['limpar_entregas_convites','reservar_entrega_convite','iniciar_entrega_convite','finalizar_entrega_convite'];
 return async(nome,parametros={})=>{
  if(!nomes.includes(nome))throw new ErroFila('operacao_invalida');
  let r;
  try{r=await fetchImpl(config.url+'/rest/v1/rpc/'+nome,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
   headers:{apikey:config.key,...(config.jwt?{Authorization:'Bearer '+config.key}:{}),'Content-Type':'application/json'},body:JSON.stringify(parametros)});}
  catch{throw new ErroFila('fila_indisponivel');}
  if(!r.ok)throw new ErroFila(r.status===409?'reserva_expirada':'fila_indisponivel');
  try{return await r.json();}catch{throw new ErroFila('fila_indisponivel');}
 };
}
export async function enviarResend(payload,outboxId,config,fetchImpl=fetch){
 if(!uuid.test(outboxId))throw new ErroFila('identificador_invalido');
 let r;
 try{r=await fetchImpl('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
  headers:{Authorization:'Bearer '+config.providerKey,'Content-Type':'application/json','Idempotency-Key':'convite-marca/'+outboxId},body:JSON.stringify(payload)});}
 catch{return {resultado:'transitorio',codigo:'sem_resposta',provedorId:null};}
 let data;try{data=await r.json();}catch{data=null;}
 if(r.ok){return typeof data?.id==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(data.id)?
  {resultado:'enviado',provedorId:data.id,codigo:null}:{resultado:'transitorio',provedorId:null,codigo:'resposta_invalida'};}
 if(r.status===409)return {resultado:data?.name==='concurrent_idempotent_requests'?'transitorio':'permanente',provedorId:null,codigo:'conflito_provedor'};
 const retry=[408,429].includes(r.status)||r.status>=500||[401,403].includes(r.status);
 return {resultado:retry?'transitorio':'permanente',provedorId:null,codigo:'http_'+r.status,pausar:[401,403].includes(r.status)};
}
export async function processarFila({config,api,enviar,maximo=3}){
 if(!Number.isInteger(maximo)||maximo<1||maximo>3)throw new ErroFila('lote_invalido');
 const resumo={limpeza:await api('limpar_entregas_convites'),enviados:0,falhas:0,cancelados:0,reservas_expiradas:0};
 if(!config.ativo)return {...resumo,envio:'desativado'};
 for(let i=0;i<maximo;i++){
  const job=await api('reservar_entrega_convite');if(!job)break;
  let payload;
  try{payload=await api('iniciar_entrega_convite',{p_outbox:job.outbox_id,p_reserva:job.reserva_id,p_payload:job.payload??montarMensagem(job,config)});}
  catch(e){if(e.codigo==='reserva_expirada'){resumo.reservas_expiradas++;continue;}throw e;}
  if(!payload){resumo.cancelados++;continue;}
  const result=await enviar(payload,job.outbox_id);
  // If acknowledgement fails, do not report a send failure or alter the key.
  // The next lease replays the same frozen payload within the dedupe window.
  const ack=await api('finalizar_entrega_convite',{p_outbox:job.outbox_id,p_reserva:job.reserva_id,p_resultado:result.resultado,
   p_provedor_id:result.provedorId??null,p_codigo:result.codigo??null});
  if(!ack?.registrado){resumo.reservas_expiradas++;continue;}
  if(result.resultado==='enviado')resumo.enviados++;else resumo.falhas++;
  if(result.pausar){resumo.pausado=true;break;}
 }
 return resumo;
}
async function segredoIgual(recebido,esperado){
 if(typeof recebido!=='string'||recebido.length<48||recebido.length>256)return false;
 const bytes=new TextEncoder(),[a,b]=await Promise.all([recebido,esperado].map(s=>crypto.subtle.digest('SHA-256',bytes.encode(s))));
 const x=new Uint8Array(a),y=new Uint8Array(b);let difference=0;for(let i=0;i<x.length;i++)difference|=x[i]^y[i];return difference===0;
}
export function criarHandlerEnvio({env,fetchImpl=fetch}={}){
 const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 return async req=>{
  if(req.method!=='POST')return reply(405,{erro:'metodo_nao_permitido'});
  let config;try{config=configuracaoEnvio(env);}catch{return reply(503,{erro:'configuracao_incompleta'});}
  if(!config.ativo&&!config.limpeza)return reply(503,{estado:'desativado'});
  if(!await segredoIgual(req.headers.get('x-worker-secret'),config.secret))return reply(401,{erro:'nao_autorizado'});
  try{
   const result=await processarFila({config,api:criarApiFila(config,fetchImpl),enviar:(payload,id)=>enviarResend(payload,id,config,fetchImpl)});
   return reply(200,result);
  }catch{return reply(503,{erro:'processamento_interrompido'});}
 };
}
