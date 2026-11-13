export const PRODUCAO_REF='hpemkfzqbhbzjepbxvwh';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// This configuration is server/CLI-only. Never accept a target through the URL.
export function configurarHomologacao(env) {
  const ref=env.VTF_HOMOLOG_REF;
  if(!/^[a-z]{20}$/.test(ref??'') || ref===PRODUCAO_REF)
    throw Error('Informe um project ref de homologacao separado da producao.');
  const key=env.VTF_HOMOLOG_PUBLIC_KEY??'';
  let publicKey=key.startsWith('sb_publishable_') && key.length>25;
  if(key.split('.').length===3) {
    try {
      const payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());
      publicKey=payload.role==='anon' && payload.ref===ref;
    } catch { publicKey=false; }
  }
  if(!publicKey || /[\r\n]/.test(key)) throw Error('Use somente uma chave publica do ambiente de homologacao.');
  return {ref,url:`https://${ref}.supabase.co`,key};
}

export function configurarTeste(env,{escrita=false}={}) {
  const target=configurarHomologacao(env);
  const accounts=['EDITOR','PUBLICADOR','OUTRA_MARCA'].map(role=>{
    const email=env[`VTF_${role}_EMAIL`],password=env[`VTF_${role}_PASSWORD`];
    if(!email || !password) throw Error(`Falta a conta de teste ${role}.`);
    return {role,email,password};
  });
  if(new Set(accounts.map(a=>a.email.trim().toLowerCase())).size!==3)
    throw Error('Use tres contas distintas.');
  const evento=env.VTF_HOMOLOG_EVENTO,marca=env.VTF_HOMOLOG_MARCA;
  if(!uuid.test(evento??'') || !uuid.test(marca??'')) throw Error('Informe UUIDs da marca e do evento de teste.');
  if(escrita && env.VTF_HOMOLOG_CONFIRMAR_ESCRITA!==target.ref)
    throw Error('Confirme o ref de homologacao antes dos testes de escrita.');
  return {...target,accounts,evento,marca,escrita};
}

export function criarHttpHomologacao(config,{fetchImpl=fetch}={}) {
  const target=configurarHomologacao({VTF_HOMOLOG_REF:config.ref,VTF_HOMOLOG_PUBLIC_KEY:config.key});
  if(config.url!==target.url) throw Error('Destino de homologacao invalido.');
  return async function request(route,{token,method='GET',body}={}) {
    // Routes are fixed by the harness; forbid credentials leaving this origin.
    if(!route.startsWith('/') || route.startsWith('//') || route.includes('..')) throw Error('Rota de teste invalida.');
    let response;
    try {
      response=await fetchImpl(target.url+route,{method,redirect:'error',signal:AbortSignal.timeout(20000),
        headers:{apikey:config.key,...(token?{Authorization:`Bearer ${token}`}:
          config.key.startsWith('sb_publishable_')?{}:{Authorization:`Bearer ${config.key}`}),
          ...(body?{'Content-Type':'application/json'}:{})},
        ...(body?{body:JSON.stringify(body)}:{})});
    } catch { throw Error('Falha de rede no ambiente de homologacao.'); }
    if(response.status===204) return {ok:response.ok,status:response.status,data:null};
    let data;
    try {data=await response.json();} catch {throw Error('Resposta de homologacao invalida.');}
    return {ok:response.ok,status:response.status,data};
  };
}

function verificar(condition,message) {if(!condition) throw Error(message);}
function rows(result,label) {
  verificar(result.ok && Array.isArray(result.data),`Falha na leitura: ${label}.`);
  return result.data;
}
const query=(table,params)=>'/rest/v1/'+table+'?'+new URLSearchParams(params);
const snapshot=value=>JSON.stringify(value);

export async function executarHomologacao(config,{fetchImpl=fetch,report=()=>{}}={}) {
  const http=criarHttpHomologacao(config,{fetchImpl}),sessions=[];
  const select=(table,params,token)=>http(query(table,params),{token});
  const rpc=(name,body,token)=>http('/rest/v1/rpc/'+name,{method:'POST',body,token});
  const checks=[];
  const pass=label=>{checks.push(label);report(label);};
  try {
    for(const account of config.accounts) {
      const login=await http('/auth/v1/token?grant_type=password',{method:'POST',body:{email:account.email,password:account.password}});
      verificar(login.ok && login.data.access_token,'Login recusado para '+account.role+'.');
      const token=login.data.access_token;
      sessions.push({role:account.role,token});
      const user=await http('/auth/v1/user',{token});
      verificar(user.ok && uuid.test(user.data.id??'') && user.data.email_confirmed_at && !user.data.is_anonymous,
        'A conta precisa de identidade e email confirmado: '+account.role+'.');
      sessions.at(-1).id=user.data.id;
      const global=rows(await select('administradores_sistema',{select:'ativo',usuario_id:'eq.'+user.data.id},token),'administrador global');
      verificar(!global.some(r=>r.ativo),'As contas de teste nao podem ser administradores globais.');
      const members=rows(await select('membros_marca',{select:'id,marca_id,papel,permissoes:permissoes_membro(permissao)',
        usuario_id:'eq.'+user.data.id,ativo:'eq.true'},token),'membros');
      const member=members.find(m=>m.marca_id===config.marca);
      if(account.role==='OUTRA_MARCA') {
        verificar(!member && members.length>0,'A terceira conta deve pertencer somente a outra marca.');
      } else {
        const permission=account.role==='EDITOR'?'gerenciar_eventos':'publicar_eventos';
        const denied=account.role==='EDITOR'?'publicar_eventos':'gerenciar_eventos';
        verificar(member?.papel==='equipe' && member.permissoes.some(p=>p.permissao===permission) &&
          !member.permissoes.some(p=>p.permissao===denied),'Permissoes de teste incorretas: '+account.role+'.');
      }
      pass('Auth e permissoes: '+account.role);
    }
    verificar(new Set(sessions.map(s=>s.id)).size===3,'As sessoes devem identificar tres usuarios distintos.');
    const [editor,publisher,other]=sessions;
    const eventParams={select:'id,id_legado,marca_id,versao_publicada_id,versao:versoes_evento!eventos_versao_publicada_do_mesmo_evento(numero,conteudo,situacao)',id:'eq.'+config.evento};
    const publicBefore=rows(await select('eventos',eventParams),'evento publico');
    verificar(publicBefore.length===1 && publicBefore[0].marca_id===config.marca,'Evento publicado de teste indisponivel.');
    const event=publicBefore[0];
    const draftParams={select:'evento_id,conteudo,revisao',evento_id:'eq.'+config.evento};
    const anonymous=await select('rascunhos_evento',draftParams);
    verificar((anonymous.ok && Array.isArray(anonymous.data) && anonymous.data.length===0) || [401,403].includes(anonymous.status),
      'Rascunho acessivel anonimamente ou erro inesperado.');
    const isolated=rows(await select('rascunhos_evento',draftParams,other.token),'isolamento entre marcas');
    verificar(isolated.length===0,'Outra marca consegue ler o rascunho.');
    const draft=rows(await select('rascunhos_evento',draftParams,editor.token),'rascunho do editor')[0];
    rows(await select('rascunhos_evento',draftParams,publisher.token),'rascunho do publicador');
    pass('PostgREST: relacao publicada, rascunhos e isolamento entre marcas');
    if(!config.escrita) {pass('Somente leitura: nenhum comando administrativo executado');return checks;}
    verificar(event.id_legado.startsWith('evt-homologacao-'),'Escrita exige evento ficticio com ID legado evt-homologacao-.');
    const content=structuredClone(draft?.conteudo??event.versao?.conteudo);
    verificar(content && content.dataTermino && content.horarioTermino && content.terminoEstimado===false,
      'Prepare horarios explicitos e confirmados no evento ficticio antes do teste.');
    content.titulo='Homologacao de concorrencia '+crypto.randomUUID();
    const revision=draft?.revisao??0;
    const command={p_evento:config.evento,p_conteudo:content,p_revisao:revision,p_chave:crypto.randomUUID()};
    for(const s of [publisher,other]) {
      const denied=await rpc('salvar_rascunho_evento',{...command,p_chave:crypto.randomUUID()},s.token);
      verificar(!denied.ok && denied.data.code==='42501','Salvamento nao autorizado nao foi recusado corretamente.');
    }
    const competitor={...command,p_chave:crypto.randomUUID()};
    const race=await Promise.all([rpc('salvar_rascunho_evento',command,editor.token),rpc('salvar_rascunho_evento',competitor,editor.token)]);
    verificar(race.filter(r=>r.ok).length===1 && race.some(r=>!r.ok && r.data.code==='40001'),
      'Concorrencia nao produziu um sucesso e um conflito.');
    const winning=race[0].ok?command:competitor,successful=race.find(r=>r.ok);
    const replay=await rpc('salvar_rascunho_evento',winning,editor.token);
    verificar(replay.ok && snapshot(replay.data)===snapshot(successful.data),'Replay idempotente divergiu.');
    const publicAfter=rows(await select('eventos',eventParams),'publicacao depois do rascunho');
    verificar(snapshot(publicBefore)===snapshot(publicAfter),'Salvar rascunho alterou a versao publica.');
    const saved=rows(await select('rascunhos_evento',draftParams,editor.token),'revisao salva')[0];
    verificar(saved?.revisao===revision+1 && saved.conteudo.titulo===content.titulo,'Revisao apos concorrencia incorreta.');
    pass('Escrita: permissoes, concorrencia CAS, replay e preservacao publica');
    const publication={p_evento:config.evento,p_revisao:saved.revisao,p_chave:crypto.randomUUID()};
    const denied=await rpc('publicar_evento',publication,editor.token);
    verificar(!denied.ok && denied.data.code==='42501','Editor conseguiu publicar ou erro inesperado.');
    const published=await rpc('publicar_evento',{...publication,p_chave:crypto.randomUUID()},publisher.token);
    verificar(published.ok,'Publicacao pelo publicador falhou.');
    const final=rows(await select('eventos',eventParams),'versao final')[0];
    verificar(final?.versao_publicada_id!==event.versao_publicada_id && final.versao?.conteudo.titulo===content.titulo &&
      final.versao.situacao===event.versao.situacao,'Publicacao nao confirmou novo conteudo e situacao preservada.');
    pass('Publicacao: editor recusado, publicador autorizado e versao publica confirmada');
    return checks;
  } finally {
    // Revoke only the test session, never all sessions belonging to the account.
    const results=await Promise.allSettled(sessions.map(s=>http('/auth/v1/logout?scope=local',{method:'POST',token:s.token})));
    // Cleanup failures are surfaced without logging tokens, emails or response bodies.
    if(results.some(r=>r.status==='rejected' || !r.value.ok)) report('Aviso: confirme o encerramento das sessoes de teste.');
  }
}
