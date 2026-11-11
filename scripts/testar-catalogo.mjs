import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { adaptarCatalogo, compararCatalogos, validarHorarios, catalogoPublico } from '../js/repositories/catalogoAdapter.js';
import { criarLeitorCatalogo } from '../js/repositories/catalogoRepository.js';
import { lerCatalogoSupabase } from '../js/repositories/catalogoSupabase.js';
import { gerarICS, horarioEvento } from '../js/utils/eventoPublico.js';
import { cardEventoHtml } from '../js/utils/cardEvento.js';

const json = Object.fromEntries(['marcas', 'locais', 'eventos'].map(n =>
  [n, JSON.parse(fs.readFileSync(new URL('../data/' + n + '.json', import.meta.url)))]));
function fixture() {
  const locais = json.locais.map(l => ({ ...l, id: 'uuid-' + l.id, id_legado: l.id, dados: l }));
  const marcas = json.marcas.map(m => ({ ...m, id: 'uuid-' + m.id, id_legado: m.id,
    local_padrao_id: 'uuid-' + m.localPadraoId, dados: m }));
  const eventos = json.eventos.map(e => {
    const fim = new Date(e.data + 'T' + e.horario + ':00Z');
    fim.setUTCHours(fim.getUTCHours() + 4);
    return { id: 'uuid-' + e.id, id_legado: e.id, slug: e.slug, marca_id: 'uuid-' + e.marcaId,
      local_id: 'uuid-' + e.localId, estado_publicacao: 'publicado', versao_publicada_id: 'v-' + e.id,
      versao: { id: 'v-' + e.id, evento_id: 'uuid-' + e.id, numero: 1, situacao: 'confirmado',
        conteudo: { ...e, horarioTermino: fim.toISOString().slice(11,16),
          dataTermino: fim.toISOString().slice(0,10), terminoEstimado: true } } };
  });
  return { locais, marcas, eventos };
}
test('24 events: legacy identities, object lineup, references and full JSON parity', () => {
  const c = adaptarCatalogo(fixture());
  assert.equal(c.eventos.length, 24);
  assert.equal(c.locais.length, 15);
  assert.equal(c.marcas.length, 15);
  assert.equal(compararCatalogos(json, c).compativel, true);
  for (const e of c.eventos) {
    assert.match(e.id, /^evt-/); assert.match(e.marcaId, /^mrc-/); assert.match(e.localId, /^loc-/);
    assert.ok(Array.isArray(e.lineup.bandas)); assert.ok(Array.isArray(e.lineup.djs));
  }
});
test('inactive brand, venue and event are hidden; unpublished events are hidden', () => {
  for (const target of ['marca', 'local', 'evento', 'rascunho']) {
    const f = fixture(), e = f.eventos[0];
    if (target === 'marca') f.marcas.find(m => m.id === e.marca_id).ativo = false;
    if (target === 'local') f.locais.find(l => l.id === e.local_id).ativo = false;
    if (target === 'evento') e.versao.conteudo.ativo = false;
    if (target === 'rascunho') e.estado_publicacao = 'rascunho';
    assert.ok(!adaptarCatalogo(f).eventos.some(x => x.id === e.id_legado));
  }
});
test('wrong version or wrong event fails closed; no draft or internal metadata escapes', () => {
  for (const field of ['id', 'evento_id']) {
    const f = fixture(); f.eventos[0].versao[field] = 'old';
    assert.throws(() => adaptarCatalogo(f));
  }
  const f = fixture();
  f.eventos[0].versao.conteudo.tokenSecreto = 'secret';
  f.marcas[0].dados.admin = 'private';
  const c = adaptarCatalogo(f);
  assert.ok(!JSON.stringify(c).includes('secret'));
  assert.ok(!Object.hasOwn(c.marcas[0], 'admin'));
});
test('midnight end, required explicit times and impossible dates', () => {
  const e = { data:'2026-11-11', horario:'23:30', dataTermino:'2026-11-12', horarioTermino:'03:30' };
  validarHorarios(e);
  assert.match(horarioEvento(e), /03h30/);
  assert.match(horarioEvento({...e, terminoEstimado:true}), /estimado/);
  for (const bad of [{horarioTermino:null}, {dataTermino:'2026-11-11'}, {data:'2026-02-30'}, {horario:'24:00'}]) {
    assert.throws(() => validarHorarios({...e,...bad}));
  }
});
test('cancelled/postponed/interrupted remain visible with warnings and ICS status', () => {
  for (const situacao of ['cancelado','adiado','interrompido']) {
    const f = fixture(); f.eventos[0].versao.situacao = situacao;
    const e = adaptarCatalogo(f).eventos[0];
    assert.equal(e.situacao, situacao);
    assert.match(cardEventoHtml(e), /Evento (cancelado|adiado|interrompido)/);
    assert.match(gerarICS(e), situacao === 'adiado' ? /STATUS:TENTATIVE/ : /STATUS:CANCELLED/);
    assert.equal(compararCatalogos(json, adaptarCatalogo(f)).compativel, false);
  }
});
test('ICS uses actual end/date, stable legacy UID, revision and escaped lines', () => {
  const e = { ...adaptarCatalogo(fixture()).eventos[0], data:'2026-11-11', horario:'23:30',
    dataTermino:'2026-11-12', horarioTermino:'03:30', descricao:'a\nb\nc', revisao:3 };
  const ics = gerarICS(e);
  assert.ok(ics.includes('DTEND;TZID=America/Sao_Paulo:20261112T033000'));
  assert.ok(ics.includes('UID:' + e.id + '@vaiterforro.com.br'));
  assert.match(ics, /SEQUENCE:3/);
  assert.ok(!gerarICS(json.eventos[0]).includes('DTEND'));
});
test('comparison detects additions, removals, nested edits and slug changes', () => {
  for (const mutate of [
    c => c.eventos.pop(), c => c.eventos.push({...c.eventos[0],id:'evt-new'}),
    c => c.eventos[0].slug = 'changed', c => c.eventos[0].lineup.djs.push('changed'),
    c => c.eventos[0].horario = '01:00',
  ]) {
    const c = adaptarCatalogo(fixture()); mutate(c);
    assert.equal(compararCatalogos(json,c).compativel, false);
  }
});
const fetchJson = async path => ({ok:true,json:async()=>json[path.split('/')[1].split('.')[0]]});
test('JSON mode never loads SDK; concurrent calls share one read', async () => {
  let calls = 0;
  const ler = criarLeitorCatalogo({fonte:'json', fetchJson: async p => {calls++; return fetchJson(p);},
    obterCliente: () => {throw Error('must not load');} });
  const [a,b] = await Promise.all([ler(),ler()]);
  assert.strictEqual(a,b); assert.equal(calls,3);
});
test('Supabase failure never resurrects JSON and failed reads can retry', async () => {
  let tries = 0, jsonCalls = 0;
  const ler = criarLeitorCatalogo({fonte:'supabase',fetchJson:()=>{jsonCalls++;},
    obterCliente:async()=>{tries++; throw Error('offline');} });
  await assert.rejects(ler(),/offline/); await assert.rejects(ler(),/offline/);
  assert.equal(jsonCalls,0); assert.equal(tries,2);
});
test('comparison failure is reported and leaves JSON authoritative', async () => {
  let report;
  const ler = criarLeitorCatalogo({fonte:'comparacao',fetchJson,
    obterCliente:async()=>{throw Error('offline');},relatar:r=>{report=r;}});
  assert.deepEqual(await ler(),catalogoPublico(json)); assert.equal(report.compativel,false);
});
test('unknown source fails before I/O', async () => {
  await assert.rejects(criarLeitorCatalogo({fonte:'typo'})(),/inv/);
});
test('Supabase adapter propagates API failure', async () => {
  const q = { select(){return this;}, order(){return this;},range(){return this;},eq(){return Promise.resolve({error:{message:'denied'}});} };
  await assert.rejects(lerCatalogoSupabase({from:()=>q}), /denied/);
});

test('repository/service/search compatibility with the JSON catalog', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchJson;
  try {
    const repo = await import('../js/repositories/eventoRepository.js');
    const service = await import('../js/services/eventoService.js');
    const search = await import('../js/services/buscaService.js');
    const all = await repo.listarEventos();
    assert.equal(all.length,24);
    const e = all[0];
    assert.equal((await repo.buscarEventoPorId(e.id)).slug,e.slug);
    assert.equal((await repo.buscarEventoPorSlug(e.slug)).id,e.id);
    assert.equal((await service.obterEventoCompleto(e.slug)).marca.id,e.marcaId);
    assert.equal((await service.listarEventosPorIds([e.id]))[0].id,e.id);
    const agenda = await service.listarAgendaOrdenada();
    assert.ok(agenda.every((x,i)=>!i || agenda[i-1].data <= x.data));
    const results = await search.buscar('forro');
    assert.ok(results.length > 0 && results.length <= 8);
  } finally { globalThis.fetch = previous; }
});
test('reader paginates all entities and uses explicit published FK and filters', async () => {
  const f = fixture(), calls = [];
  const tables = {marcas:f.marcas.filter(x=>x.ativo),locais:f.locais.filter(x=>x.ativo),eventos:f.eventos};
  const client = {from(table) {
    let start=0, columns;
    return {
      select(s){columns=s;return this;},order(){return this;},
      range(a){start=a;return this;},
      eq(k,v){calls.push({table,k,v,columns,start});
        const rows = start === 0 ? Array.from({length:500},(_,i)=>tables[table][i%tables[table].length]) : [];
        // Unique extra identities make pagination check independent of duplicate detection.
        return Promise.resolve({data:rows.map((r,i)=> table==='eventos' ? {
          ...r,id:'event-'+i,id_legado:'evt-page-'+i,slug:'event-page-'+i,
          versao:{...r.versao,evento_id:'event-'+i}
        } : {...r,id_legado:r.id_legado+'-'+i,slug:r.slug+'-'+i}),error:null});
      }
    };
  }};
  // Pagination is checked even though synthetic repeated internal IDs collapse brands/venues.
  await lerCatalogoSupabase(client);
  for (const table of Object.keys(tables)) {
    assert.deepEqual(calls.filter(c=>c.table===table).map(c=>c.start),[0,500]);
  }
  const call = calls.find(c=>c.table==='eventos');
  assert.equal(call.k,'estado_publicacao'); assert.equal(call.v,'publicado');
  assert.ok(call.columns.includes('!eventos_versao_publicada_do_mesmo_evento'));
  assert.ok(!call.columns.includes('publicado_por'));
});
test('service worker precaches new modules and bypasses cross-origin data', async () => {
  const {runInNewContext} = await import('node:vm');
  const handlers = {};
  const source = fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  const self = {location:{hostname:'example.com',origin:'https://example.com'},
    addEventListener:(name,fn)=>{handlers[name]=fn;}};
  let calls=0;
  runInNewContext(source,{self,URL,Response,console,fetch:async()=>{calls++;throw Error('offline');}});
  handlers.fetch({request:{method:'GET',url:'https://project.supabase.co/rest/v1/eventos'},respondWith:()=>assert.fail('cross-origin cached')});
  assert.equal(calls,0);
  let promise;
  handlers.fetch({request:{method:'GET',url:'https://example.com/data/eventos.json'},respondWith:p=>{promise=p;}});
  await assert.rejects(promise,/offline/);
  const paths = [...source.matchAll(/^  '([^']+)',/gm)].map(m=>m[1]);
  for (const path of paths) assert.ok(fs.existsSync(new URL('../'+path,import.meta.url)),path);
  assert.ok(paths.includes('js/repositories/catalogoConfig.js'));
  assert.ok(paths.includes('js/utils/eventoPublico.js'));
});

test('local staging server selects source without changing committed flag and blocks private paths', async () => {
  const {spawn} = await import('node:child_process');
  const {fileURLToPath} = await import('node:url');
  const before = fs.readFileSync(new URL('../js/repositories/catalogoConfig.js',import.meta.url),'utf8');
  const server = spawn(process.execPath,[fileURLToPath(new URL('./servidor-homologacao.mjs',import.meta.url)),'--fonte=supabase','--porta=0'],
    {cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','pipe']});
  try {
    const address = await new Promise((resolve,reject)=>{
      let text='';
      const timeout=setTimeout(()=>reject(Error('Server startup timeout')),10000);
      server.once('error',e=>{clearTimeout(timeout);reject(e);});
      server.once('exit',code=>{clearTimeout(timeout);reject(Error('Server exited '+code));});
      server.stdout.on('data',chunk=>{
        text+=chunk;
        const match=text.match(/http:\/\/127\.0\.0\.1:\d+/);
        if(match){clearTimeout(timeout);resolve(match[0]);}
      });
    });
    const config = await fetch(address+'/js/repositories/catalogoConfig.js');
    assert.equal(config.headers.get('cache-control'),'no-store');
    assert.match(await config.text(),/FONTE_CATALOGO = "supabase"/);
    assert.equal((await fetch(address+'/.git/config')).status,403);
    assert.equal((await fetch(address+'/js/pages/evento.js',{method:'POST'})).status,405);
    assert.equal((await fetch(address+'/missing-file')).status,404);
    assert.equal((await fetch(address+'/')).status,200);
    assert.equal(fs.readFileSync(new URL('../js/repositories/catalogoConfig.js',import.meta.url),'utf8'),before);
  } finally { server.kill(); }
});
