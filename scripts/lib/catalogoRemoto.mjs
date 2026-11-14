import fs from 'node:fs';
import assert from 'node:assert/strict';
const config = fs.readFileSync(new URL('../../data/supabaseClient.js', import.meta.url), 'utf8');
const url = config.match(/const SUPABASE_URL = '([^']+)'/)[1];
const key = config.match(/const SUPABASE_ANON_KEY = '([^']+)'/)[1];
assert.equal(JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role,'anon');
const headers = {apikey:key,Authorization:'Bearer ' + key};
export const api = (table, params) => fetch(url + '/rest/v1/' + table + '?' + params,
  { headers, signal:AbortSignal.timeout(15000), cache:'no-store' });
// Thin test transport exercises exactly the columns, FK hint, filters and pagination
// selected by the production reader without importing the browser CDN client in Node.
export const client = {from(table) {
  const params = new URLSearchParams();
  return {
    select(s){params.set('select',s);return this;},
    order(s){params.set('order',s + '.asc');return this;},
    range(a,b){params.set('offset',a);params.set('limit',b-a+1);return this;},
    eq(k,v){params.set(k,'eq.'+v);return this;},
    async then(resolve,reject) {
      try {const r = await api(table,params);const body = await r.json();
        return resolve(r.ok ? {data:body,error:null} : {data:null,error:{message:body.message ?? 'HTTP '+r.status}});}
      catch(e) { return reject(e); }
    },
  };
}};
