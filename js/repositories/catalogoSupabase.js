import { adaptarCatalogo } from './catalogoAdapter.js';

// FK composta escolhe a versão atual em uma única consulta de eventos.
// A paginação evita truncamento silencioso do limite padrão da Data API.
export async function lerCatalogoSupabase(client) {
  async function todas(tabela, colunas, filtro) {
    const linhas = [];
    const tamanho = 500;
    for (let inicio = 0; ; inicio += tamanho) {
      let query = client.from(tabela).select(colunas).order('id').range(inicio, inicio + tamanho - 1);
      query = filtro(query);
      const { data, error } = await query;
      if (error) throw new Error('Não foi possível ler catálogo Supabase: ' + error.message);
      if (!Array.isArray(data)) throw new Error('Resposta de catálogo inválida');
      linhas.push(...data);
      if (data.length < tamanho) return linhas;
    }
  }
  const [marcas, locais, eventos] = await Promise.all([
    todas('marcas', 'id,id_legado,slug,nome,local_padrao_id,dados,ativo', q => q.eq('ativo', true)),
    todas('locais', 'id,id_legado,slug,nome,endereco,latitude,longitude,dados,ativo', q => q.eq('ativo', true)),
    todas('eventos', 'id,id_legado,slug,marca_id,local_id,estado_publicacao,versao_publicada_id,versao:versoes_evento!eventos_versao_publicada_do_mesmo_evento(id,evento_id,numero,conteudo,situacao)',
      q => q.eq('estado_publicacao', 'publicado')),
  ]);
  return adaptarCatalogo({ marcas, locais, eventos });
}
