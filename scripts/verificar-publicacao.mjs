import {criarManifesto,verificarPublicacao} from './lib/verificacaoPublicacao.mjs';
try {
 const args=process.argv.slice(2);
 if(args.some(a=>a!=='--exigir' && !a.startsWith('--url=')))throw Error('Uso: verificar-publicacao.mjs [--url=https://...] [--exigir]');
 const base=args.find(a=>a.startsWith('--url='))?.slice(6)??'https://vaiterforro.com.br/';
 const report=await verificarPublicacao({base,manifesto:await criarManifesto()});
 console.log(JSON.stringify(report,null,2));
 if(args.includes('--exigir') && !report.publicacaoConfirmada)process.exitCode=1;
} catch(error){console.error(error.message);process.exitCode=1;}
