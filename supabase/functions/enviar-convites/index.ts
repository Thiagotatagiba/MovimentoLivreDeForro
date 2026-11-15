import {criarHandlerEnvio} from './worker.mjs';
Deno.serve(criarHandlerEnvio({env:(name:string)=>Deno.env.get(name)}));
