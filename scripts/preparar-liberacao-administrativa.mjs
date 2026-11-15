// Local artifact preparation only. Never connects, applies migrations or merges.
import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';import {randomUUID} from 'node:crypto';
import {manifestoAdministrativo,sqlPreflight,sqlBootstrap,sqlPosflight} from './lib/liberacaoAdministrativa.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),args=process.argv.slice(2);
if(args.some(x=>!x.startsWith('--saida='))||args.length>1)throw Error('Uso: [--saida=DIRETORIO_FORA_DO_REPOSITORIO]');
const migrations=await manifestoAdministrativo(),sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const manifest={repositorio:'Thiagotatagiba/MovimentoLivreDeForro',projeto:'hpemkfzqbhbzjepbxvwh',commit:sha,
 somentePreparacao:true,origemPublicada:'671efef597a4e94f5d3e4ac820b2e2bf9d824a65',
 migracoes:migrations.map(({sql,...item})=>item),envioEmail:false,agendamento:false};
if(args.length){
 if(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim())throw Error('Registre os arquivos antes de preparar artefatos de liberação.');
 const output=path.resolve(args[0].slice(8)),relative=path.relative(path.resolve(root),output);
 if(!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative))throw Error('Use destino fora do repositório para o bootstrap privado.');
 try{await fs.access(path.join(output,'manifesto.json'));throw Error('Destino já preparado; escolha outro diretório para preservar os artefatos anteriores.');}catch(error){if(error.code!=='ENOENT')throw error;}
 const preflight=sqlPreflight(process.env.VTF_ADMIN_INICIAL_EMAIL),bootstrap=sqlBootstrap(process.env.VTF_ADMIN_INICIAL_EMAIL,randomUUID());
 await fs.mkdir(output,{recursive:true});
 await fs.writeFile(path.join(output,'manifesto.json'),JSON.stringify(manifest,null,2),{flag:'wx'});
 await fs.writeFile(path.join(output,'01-preflight.sql'),preflight,{flag:'wx'});
 for(const [index,item] of migrations.entries())await fs.writeFile(path.join(output,String(index+2).padStart(2,'0')+'-'+item.arquivo),item.sql,{flag:'wx'});
 await fs.writeFile(path.join(output,'09-bootstrap.sql'),bootstrap,{flag:'wx'});
 await fs.writeFile(path.join(output,'10-posflight.sql'),sqlPosflight,{flag:'wx'});
 console.log('Artefatos privados preparados fora do repositório. Nenhuma ação remota foi executada.');
}
console.log(JSON.stringify(manifest,null,2));
