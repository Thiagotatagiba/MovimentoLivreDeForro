// Staging-only, short-lived operator utility; not a frontend or production API.
// Deploy with verify_jwt=true, substitute only a SHA-256 capability digest,
// invoke once, then replace the deployment with a disabled (410) handler.
// No service credential is returned, logged or supplied by the caller.
const CAPABILITY_HASH='__CAPABILITY_HASH__';
const REF='qmhrlexpnnbjntpecjis';
const ROLES=['EDITOR','PUBLICADOR','OUTRA_MARCA'];
const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{
  status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
});
Deno.serve(async(req:Request)=>{
  if(CAPABILITY_HASH.startsWith('__')) return reply(410,{disabled:true});
  if(req.method!=='POST') return reply(405,{error:'method'});
  const url=Deno.env.get('SUPABASE_URL');
  if(url!==`https://${REF}.supabase.co`) return reply(403,{error:'target'});
  const token=req.headers.get('x-provision-token')??'';
  if(token.length<48 || token.length>128) return reply(403,{error:'authorization'});
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))))
    .map(b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==CAPABILITY_HASH) return reply(403,{error:'authorization'});
  try {
    const raw=await req.text();
    if(raw.length>8192) return reply(413,{error:'size'});
    const accounts=JSON.parse(raw);
    if(!Array.isArray(accounts) || accounts.length!==3 ||
      accounts.some((a,i)=>a.role!==ROLES[i] || a.email!==`${ROLES[i].toLowerCase()}.${REF}@homologacao.invalid` ||
        typeof a.password!=='string' || a.password.length<32 || a.password.length>128))
      return reply(400,{error:'fixture'});
    const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!secret) return reply(503,{error:'configuration'});
    const created=[];
    for(const account of accounts) {
      const result=await fetch(url+'/auth/v1/admin/users',{
        method:'POST',redirect:'error',headers:{apikey:secret,Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},
        body:JSON.stringify({email:account.email,password:account.password,email_confirm:true,
          user_metadata:{homologacao_fixture:true}}),
      });
      if(!result.ok) return reply(502,{error:'provision',created});
      const data=await result.json();
      created.push({role:account.role,id:data.id??data.user?.id});
    }
    return reply(200,{created});
  } catch {return reply(500,{error:'provision'});}
});
