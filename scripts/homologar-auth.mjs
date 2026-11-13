import {configurarTeste,executarHomologacao} from './lib/homologacaoAuth.mjs';

try {
  const args=process.argv.slice(2);
  if(args.some(a=>a!=='--escrita')) throw Error('Uso: node scripts/homologar-auth.mjs [--escrita]');
  const config=configurarTeste(process.env,{escrita:args.includes('--escrita')});
  console.log('Homologacao Auth/PostgREST: '+config.ref+' / '+(config.escrita?'escrita em fixture':'somente leitura'));
  const checks=await executarHomologacao(config,{report:label=>console.log(label.startsWith('Aviso:')?label:'OK: '+label)});
  console.log(checks.length+' verificacoes confirmadas.');
} catch(error) {
  // Never print server responses, account details, request bodies or stack traces.
  console.error('Homologacao interrompida: '+error.message);
  process.exitCode=1;
}
