// Read-only verification against the anonymous REST API. No admin credentials.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { lerCatalogoSupabase } from '../js/repositories/catalogoSupabase.js';
import { compararCatalogos } from '../js/repositories/catalogoAdapter.js';
import { api, client } from './lib/catalogoRemoto.mjs';
const json = Object.fromEntries(await Promise.all(['marcas','locais','eventos'].map(async n => {
  if (!process.argv.includes('--site')) return [n,JSON.parse(fs.readFileSync(new URL('../data/'+n+'.json',import.meta.url)))];
  const r = await fetch('https://vaiterforro.com.br/data/'+n+'.json', {cache:'no-store',signal:AbortSignal.timeout(15000)});
  assert.ok(r.ok,'Production JSON unavailable: '+n);
  return [n,await r.json()];
})));
const remoto = await lerCatalogoSupabase(client);
const relatorio = compararCatalogos(json,remoto);
console.log(JSON.stringify({...relatorio, adicionais: {
  total:relatorio.adicionais.length, campos:[...new Set(relatorio.adicionais.map(x=>x.campo))]
}},null,2));
assert.equal(relatorio.compativel,true,'JSON and Supabase diverge: cutover blocked');
for (const table of ['rascunhos_evento','perfis','ingressos']) {
  const r = await api(table,new URLSearchParams({select:'*',limit:'1'}));
  const body = await r.json();
  assert.ok([401,403].includes(r.status) || (r.ok && Array.isArray(body) && body.length === 0),
    'Private data exposed: '+table);
  console.log(table + ': anonymous access denied or no visible rows');
}
const versions = await api('versoes_evento',new URLSearchParams({select:'id,evento_id',limit:'1000'}));
assert.ok(versions.ok);
console.log('Visible published versions:',(await versions.json()).length);
console.log('Parity and anonymous read checks passed. No writes performed.');
