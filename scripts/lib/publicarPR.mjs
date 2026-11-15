import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const [branch, title, description, ...options] = process.argv.slice(2);
const updateFlag = options.includes('--atualizar') ? '--atualizar' : '';
const baseIndex = options.indexOf('--base');
const baseBranch = baseIndex >= 0 ? options[baseIndex+1] : 'main';
if (!baseBranch || branch === baseBranch) throw new Error('Distinct development and base branches are required.');
const repo = 'Thiagotatagiba/MovimentoLivreDeForro';
if (!branch || branch === 'main' || !title || !description) {
  throw new Error('Development branch, title and description are required.');
}
const env = {...process.env, GIT_TERMINAL_PROMPT:'0', GCM_INTERACTIVE:'never'};
const git = (args, extra = {}) => execFileSync('git', args, {encoding:'utf8',env,...extra});
if (git(['branch','--show-current']).trim() !== branch) throw new Error('Branch changed during validation.');
if (git(['status','--porcelain']).trim()) throw new Error('Uncommitted changes; publication aborted.');

// Use Git's configured credential helper, in memory only. Never print credentials.
let response;
try { response = git(['credential','fill'], {
  input:'protocol=https\nhost=github.com\npath='+repo+'.git\n\n',
  stdio:['pipe','pipe','pipe'],
}); } catch {
  throw new Error('Git authentication unavailable without interaction. Sign into Git and retry.');
}
const credential = Object.fromEntries(response.trim().split(/\r?\n/).map(line => {
  const index = line.indexOf('=');
  return [line.slice(0,index),line.slice(index+1)];
}));
if (!credential.password) throw new Error('GitHub authentication is not available in the Git credential manager.');
const base = 'https://api.github.com/repos/' + repo;
async function api(path, method = 'GET', body) {
  const r = await fetch(base + path, {
    method,signal:AbortSignal.timeout(30000),
    headers:{Authorization:'Bearer '+credential.password,Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
    ...(body ? {body:JSON.stringify(body)} : {}),
  });
  const data = await r.json();
  if (!r.ok) {
    const message = ('GitHub HTTP '+r.status+': '+(data.message ?? 'request failed'))
      .replaceAll(credential.password,'[redacted]');
    throw new Error(message);
  }
  return data;
}
try {
  const query = new URLSearchParams({state:'open',base:baseBranch,head:'Thiagotatagiba:'+branch});
  const existing = await api('/pulls?'+query);
  git(['push','-u','https://github.com/'+repo+'.git',branch],{stdio:'inherit'});
  let pr = existing[0] ?? await api('/pulls','POST',{
    title,body:fs.readFileSync(description,'utf8').replace(/^\uFEFF/,''),
    head:branch,base:baseBranch,draft:true,
  });
  if (existing[0] && updateFlag === '--atualizar') {
    pr = await api('/pulls/'+pr.number,'PATCH',{
      title,body:fs.readFileSync(description,'utf8').replace(/^﻿/,''),
    });
  }
  if (!pr.html_url) throw new Error('GitHub did not return a pull request URL.');
  console.log((existing[0] ? 'PR existente'+(updateFlag === '--atualizar' ? ' atualizado: ' : ': ') : 'PR criado em rascunho: ')+pr.html_url);
} finally {
  credential.password = undefined;
}
