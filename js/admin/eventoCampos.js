// Define os campos do formulário de Evento pro motor genérico
// (formularioGenerico.js). Cobre todos os atributos do modelo atual —
// ver docs/MODELO_DE_DADOS.md.

function paraArray(texto) {
  return texto.split(",").map((s) => s.trim()).filter(Boolean);
}
function paraLinhas(texto) {
  return texto.split("\n").map((s) => s.trim()).filter(Boolean);
}
// datetime-local não aceita offset nem segundos — o projeto todo assume
// America/Sao_Paulo (-03:00), então só cortamos/completamos a string, sem
// nenhuma conversão de fuso via Date (que reinterpretaria o horário errado).
function paraDatetimeLocal(iso) {
  return iso ? iso.slice(0, 16) : "";
}
function deDatetimeLocal(valor) {
  return valor ? `${valor}:00-03:00` : "";
}

export function criarSchemaEvento({ marcas, locais }) {
  const opcoesMarca = [["", "Selecione…"], ...marcas.map((m) => [m.slug, m.nome])];
  const opcoesLocal = [["", "Sem local cadastrado"], ...locais.map((l) => [l.slug, l.nome])];

  return [
    { grupo: "Identificação", nome: "titulo", label: "Título", tipo: "text", obrigatorio: true },
    { grupo: "Identificação", nome: "slug", label: "Slug", tipo: "text", obrigatorio: true, hint: "Usado na URL — ex.: forro-de-quinta-nicinha" },
    { grupo: "Identificação", nome: "id", label: "ID", tipo: "text", somenteLeitura: true, hint: "Gerado automaticamente a partir do slug" },
    {
      grupo: "Identificação", nome: "status", label: "Status", tipo: "select", obrigatorio: true,
      opcoes: [["publicado", "Publicado"], ["rascunho", "Rascunho"], ["cancelado", "Cancelado"]],
    },

    {
      grupo: "Quando", nome: "inicio", label: "Início", tipo: "datetime-local", obrigatorio: true,
      ler: (d) => paraDatetimeLocal(d.inicio), escrever: (r, v) => { r.inicio = deDatetimeLocal(v); },
    },
    {
      grupo: "Quando", nome: "fim", label: "Término (opcional)", tipo: "datetime-local",
      ler: (d) => paraDatetimeLocal(d.fim), escrever: (r, v) => { r.fim = v ? deDatetimeLocal(v) : null; },
    },

    { grupo: "Onde", nome: "cidade", label: "Cidade", tipo: "text", obrigatorio: true },
    { grupo: "Onde", nome: "marcaSlug", label: "Marca", tipo: "select", obrigatorio: true, opcoes: opcoesMarca },
    { grupo: "Onde", nome: "localSlug", label: "Local", tipo: "select", opcoes: opcoesLocal },
    { grupo: "Onde", nome: "enderecoTexto", label: "Endereço (se não houver local)", tipo: "text",
      ler: (d) => d.enderecoTexto, escrever: (r, v) => { r.enderecoTexto = v || null; } },

    {
      grupo: "Sobre", nome: "tipo", label: "Tipo", tipo: "select", obrigatorio: true,
      opcoes: [["Baile", "Baile"], ["Aula", "Aula"], ["Festival", "Festival"], ["Workshop", "Workshop"]],
    },
    { grupo: "Sobre", nome: "descricao", label: "Descrição", tipo: "textarea",
      ler: (d) => d.descricao, escrever: (r, v) => { r.descricao = v; } },
    { grupo: "Sobre", nome: "imagem", label: "URL da imagem", tipo: "text", hint: "Caminho em assets/ ou URL completa",
      ler: (d) => d.imagem, escrever: (r, v) => { r.imagem = v || null; } },

    {
      grupo: "Ingresso", nome: "ingressoTipo", label: "Tipo de acesso", tipo: "select", obrigatorio: true,
      opcoes: [["antecipado", "Ingresso antecipado"], ["gratuito", "Gratuito"], ["couvert", "Couvert"], ["local", "Pagamento no local"], ["lista", "Lista de convidados"], ["esgotado", "Esgotado"]],
      ler: (d) => d.ingresso?.tipo, escrever: (r, v) => { (r.ingresso ??= {}).tipo = v; },
    },
    {
      grupo: "Ingresso", nome: "ingressoPreco", label: "Preço a partir de (R$)", tipo: "number",
      ler: (d) => d.ingresso?.precoAPartirDe, escrever: (r, v) => { (r.ingresso ??= {}).precoAPartirDe = v === "" ? null : Number(v); },
    },
    {
      grupo: "Ingresso", nome: "ingressoLink", label: "Link de compra", tipo: "text",
      ler: (d) => d.ingresso?.link, escrever: (r, v) => { (r.ingresso ??= {}).link = v || null; },
    },
    {
      grupo: "Ingresso", nome: "ingressoPlataforma", label: "Plataforma", tipo: "text", placeholder: "Sympla, OnTicket…",
      ler: (d) => d.ingresso?.plataforma, escrever: (r, v) => { (r.ingresso ??= {}).plataforma = v || null; },
    },

    {
      grupo: "Atrações (line-up)", nome: "bandas", label: "Bandas", tipo: "text", hint: "Separadas por vírgula",
      ler: (d) => (d.lineup?.bandas ?? []).join(", "),
      escrever: (r, v) => { const arr = paraArray(v); if (arr.length) (r.lineup ??= {}).bandas = arr; },
    },
    {
      grupo: "Atrações (line-up)", nome: "djs", label: "DJs", tipo: "text", hint: "Separados por vírgula",
      ler: (d) => (d.lineup?.djs ?? []).join(", "),
      escrever: (r, v) => { const arr = paraArray(v); if (arr.length) (r.lineup ??= {}).djs = arr; },
    },

    {
      grupo: "Aniversariantes (opcional)", nome: "aniversariantesTitulo", label: "Título", tipo: "text",
      ler: (d) => d.aniversariantes?.titulo, escrever: (r, v) => { if (v) (r.aniversariantes ??= {}).titulo = v; },
    },
    {
      grupo: "Aniversariantes (opcional)", nome: "aniversariantesDescricao", label: "Descrição", tipo: "textarea",
      ler: (d) => d.aniversariantes?.descricao, escrever: (r, v) => { if (v) (r.aniversariantes ??= {}).descricao = v; },
    },
    {
      grupo: "Aniversariantes (opcional)", nome: "aniversariantesRegras", label: "Regras", tipo: "textarea", hint: "Uma por linha",
      ler: (d) => (d.aniversariantes?.regras ?? []).join("\n"),
      escrever: (r, v) => { const arr = paraLinhas(v); if (arr.length) (r.aniversariantes ??= {}).regras = arr; },
    },

    { grupo: "Avançado", nome: "linkExterno", label: "Link externo", tipo: "text",
      ler: (d) => d.linkExterno, escrever: (r, v) => { r.linkExterno = v || null; } },
    { grupo: "Avançado", nome: "idExterno", label: "ID externo", tipo: "text",
      ler: (d) => d.idExterno, escrever: (r, v) => { r.idExterno = v || null; } },
    {
      grupo: "Avançado", nome: "latitude", label: "Latitude", tipo: "text",
      ler: (d) => d.coordenadas?.latitude, escrever: (r, v) => { (r.coordenadas ??= {}).latitude = v === "" ? null : Number(v); },
    },
    {
      grupo: "Avançado", nome: "longitude", label: "Longitude", tipo: "text",
      ler: (d) => d.coordenadas?.longitude, escrever: (r, v) => { (r.coordenadas ??= {}).longitude = v === "" ? null : Number(v); },
    },
  ];
}
