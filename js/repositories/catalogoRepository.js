import { FONTE_CATALOGO } from './catalogoConfig.js';
import { catalogoPublico, compararCatalogos } from './catalogoAdapter.js';
import { lerCatalogoSupabase } from './catalogoSupabase.js';

export function criarLeitorCatalogo({
  fonte = FONTE_CATALOGO, fetchJson = caminho => fetch(caminho, { cache: 'no-store' }),
  obterCliente = async () => (await import('../../data/supabaseClient.js')).supabase,
  relatar = relatorio => console.info('[comparação catálogo]', relatorio),
} = {}) {
  let pendente;
  async function json() {
    const pares = await Promise.all(['marcas', 'locais', 'eventos'].map(async tipo => {
      const resposta = await fetchJson('data/' + tipo + '.json');
      if (!resposta.ok) throw new Error('Não foi possível carregar ' + tipo);
      return [tipo, await resposta.json()];
    }));
    return catalogoPublico(Object.fromEntries(pares));
  }
  async function carregar() {
    if (!['json', 'comparacao', 'supabase'].includes(fonte)) throw new Error('Fonte de catálogo inválida');
    if (fonte === 'json') return json();
    if (fonte === 'supabase') return lerCatalogoSupabase(await obterCliente());
    const original = await json();
    // Falha da comparação é explícita; JSON continua sendo a origem neste estágio.
    try { relatar(compararCatalogos(original, await lerCatalogoSupabase(await obterCliente()))); }
    catch (erro) { relatar({ compativel: false, erro: erro.message }); }
    return original;
  }
  return () => {
    if (!pendente) pendente = carregar().catch(erro => { pendente = null; throw erro; });
    return pendente;
  };
}
export const lerCatalogo = criarLeitorCatalogo();
