// Scheduler client: staging only, no service-role key, no HTTP retries.
import {pathToFileURL} from 'node:url';
const ref='qmhrlexpnnbjntpecjis';
export async function acionarFila({env=process.env,fetchImpl=fetch,agora=Date.now()}={}){
 if(env.VTF_EXECUCAO_CONVITES_ATIVA!=='true')return {estado:'agendamento_desativado'};
 if(env.VTF_CONVITES_PROJETO_AUTORIZADO!==ref)throw Error('projeto_nao_autorizado');
 const jwt=env.VTF_CONVITES_ANON_JWT??'',secret=env.VTF_CONVITES_WORKER_SECRET??'';
 let claims;
 try{const parts=jwt.split('.');if(parts.length!==3)throw Error();claims=JSON.parse(Buffer.from(parts[1],'base64url'));}catch{throw Error('jwt_publico_invalido');}
 // The gateway verifies the signature. Locally reject wrong/privileged credentials.
 if(claims.role!=='anon'||claims.ref!==ref||!Number.isFinite(claims.exp)||claims.exp*1000<=agora)throw Error('jwt_publico_invalido');
 if(secret.length<48||secret.length>256||/[\r\n\0]/.test(secret))throw Error('segredo_invalido');
 let response;
 try{response=await fetchImpl(`https://${ref}.supabase.co/functions/v1/enviar-convites`,{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(150000),
  headers:{apikey:jwt,Authorization:'Bearer '+jwt,'x-worker-secret':secret},
 });}catch{throw Error('resposta_ambigua_sem_repeticao');}
 // Never print the worker response verbatim: it may contain unexpected data.
 if(!response.ok)throw Error('worker_http_'+response.status);
 let data;try{data=await response.json();}catch{throw Error('resposta_invalida');}
 const count=value=>Number.isSafeInteger(value)&&value>=0;
 if(!data||!['enviados','falhas','cancelados','reservas_expiradas'].every(k=>count(data[k]))||
  !data.limpeza||!['expirados','cancelados','limite_seguro'].every(k=>count(data.limpeza[k]))||
  data.enviados+data.falhas+data.cancelados+data.reservas_expiradas>3||
  (data.envio!==undefined&&data.envio!=='desativado')||(data.pausado!==undefined&&typeof data.pausado!=='boolean'))throw Error('resposta_invalida');
 return {estado:'processado',enviados:data.enviados,falhas:data.falhas,cancelados:data.cancelados,
  reservas_expiradas:data.reservas_expiradas,limpeza:{expirados:data.limpeza.expirados,cancelados:data.limpeza.cancelados,
   limite_seguro:data.limpeza.limite_seguro},...(data.envio?{envio:data.envio}:{}),...(data.pausado?{pausado:true}:{})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{console.log(JSON.stringify(await acionarFila()));}
 catch(error){console.error(['projeto_nao_autorizado','jwt_publico_invalido','segredo_invalido','resposta_ambigua_sem_repeticao','resposta_invalida'].includes(error.message)||/^worker_http_\d{3}$/.test(error.message)?error.message:'acionamento_falhou');process.exitCode=1;}
}
