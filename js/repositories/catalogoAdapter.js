// Contrato público: UUIDs e metadados administrativos nunca saem desta camada.
const campos = {
  marcas: 'descricao frequencia diasSemana categorias cidadeBase instagram whatsapp site logo capa',
  locais: 'tipo mapsLink fotoCapa fotoPerfil instagram site telefone descricao origem criadoEm atualizadoEm',
  eventos: 'titulo data horario descricao ingresso lineup imagemUrl ativo condicoesEspeciais dataTermino horarioTermino terminoEstimado',
};
function selecionar(obj, lista) {
  return Object.fromEntries(lista.split(' ').filter(k => Object.hasOwn(obj ?? {}, k)).map(k => [k, obj[k]]));
}
function identidade(row) {
  if (!row.id_legado || !row.slug) throw new Error('Catálogo sem ID público ou slug');
  return { id: row.id_legado, slug: row.slug };
}
export function adaptarCatalogo({ marcas, locais, eventos }) {
  const locaisPorUuid = new Map(locais.filter(l => l.ativo).map(l => [l.id, l]));
  const marcasPorUuid = new Map(marcas.filter(m => m.ativo).map(m => [m.id, m]));
  const resultado = {
    locais: [...locaisPorUuid.values()].map(l => ({
      ...selecionar(l.dados, campos.locais), ...identidade(l), nome: l.nome,
      endereco: l.endereco, latitude: l.latitude, longitude: l.longitude, ativo: true,
    })),
    marcas: [...marcasPorUuid.values()].map(m => ({
      ...selecionar(m.dados, campos.marcas), ...identidade(m), nome: m.nome, ativo: true,
      localPadraoId: locaisPorUuid.get(m.local_padrao_id)?.id_legado ?? null,
    })),
    eventos: [],
  };
  for (const e of eventos) {
    if (e.estado_publicacao !== 'publicado') continue;
    const v = e.versao;
    if (!v || v.id !== e.versao_publicada_id || v.evento_id !== e.id) {
      throw new Error('Versão publicada ausente ou inconsistente');
    }
    const marca = marcasPorUuid.get(e.marca_id);
    const local = locaisPorUuid.get(e.local_id);
    if (!marca || !local || !v.conteudo.ativo) continue;
    const evento = {
      ...selecionar(v.conteudo, campos.eventos), ...identidade(e),
      marcaId: identidade(marca).id, localId: identidade(local).id,
      situacao: v.situacao, revisao: v.numero,
    };
    validarHorarios(evento);
    if (!['confirmado', 'adiado', 'cancelado', 'interrompido'].includes(evento.situacao)) {
      throw new Error('Situação de evento inválida');
    }
    resultado.eventos.push(evento);
  }
  for (const lista of Object.values(resultado)) {
    for (const campo of ['id', 'slug']) {
      if (new Set(lista.map(x => x[campo])).size !== lista.length) throw new Error('Identidade pública duplicada');
    }
  }
  return resultado;
}
export function validarHorarios(e) {
  const dataValida = d => /^\d{4}-\d{2}-\d{2}$/.test(d ?? '') &&
    !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d;
  const horaValida = h => /^([01]\d|2[0-3]):[0-5]\d$/.test(h ?? '');
  if (!dataValida(e.data) || !dataValida(e.dataTermino) ||
      !horaValida(e.horario) || !horaValida(e.horarioTermino) ||
      e.dataTermino + 'T' + e.horarioTermino <= e.data + 'T' + e.horario) {
    throw new Error('Início e término válidos são obrigatórios');
  }
}
export function catalogoPublico(c) {
  const marcas = c.marcas.filter(x => x.ativo);
  const locais = c.locais.filter(x => x.ativo);
  return { marcas, locais, eventos: c.eventos.filter(e => e.ativo &&
    marcas.some(m => m.id === e.marcaId) && locais.some(l => l.id === e.localId)) };
}
function canonico(valor) {
  if (Array.isArray(valor)) return valor.map(canonico);
  if (valor && typeof valor === 'object') return Object.fromEntries(
    Object.keys(valor).sort().map(k => [k, canonico(valor[k])]));
  return valor;
}
export function compararCatalogos(json, remoto) {
  const diferencas = [];
  const adicionais = [];
  const a = catalogoPublico(json);
  const b = catalogoPublico(remoto);
  for (const tipo of ['marcas', 'locais', 'eventos']) {
    const destino = new Map(b[tipo].map(x => [x.id, x]));
    for (const item of a[tipo]) {
      const outro = destino.get(item.id);
      if (!outro) { diferencas.push({ tipo, id: item.id, campo: 'ausenteNoSupabase' }); continue; }
      destino.delete(item.id);
      for (const campo of new Set([...Object.keys(item), ...Object.keys(outro)])) {
        if (!Object.hasOwn(item, campo) && tipo === 'eventos' &&
            ['dataTermino', 'horarioTermino', 'terminoEstimado', 'situacao', 'revisao'].includes(campo)) {
          adicionais.push({ tipo, id: item.id, campo });
          if (campo === 'situacao' && outro[campo] !== 'confirmado') diferencas.push({ tipo, id: item.id, campo });
          continue;
        }
        if (JSON.stringify(canonico(item[campo])) !== JSON.stringify(canonico(outro[campo]))) {
          diferencas.push({ tipo, id: item.id, campo });
        }
      }
    }
    for (const id of destino.keys()) diferencas.push({ tipo, id, campo: 'ausenteNoJson' });
  }
  return { compativel: diferencas.length === 0, diferencas, adicionais,
    contagens: Object.fromEntries(Object.keys(a).map(k => [k, { json: a[k].length, supabase: b[k].length }])) };
}
