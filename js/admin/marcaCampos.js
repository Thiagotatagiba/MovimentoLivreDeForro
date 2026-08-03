// Define os campos do formulário de Marca pro motor genérico
// (formularioGenerico.js). Reaproveita exatamente o mesmo motor usado por
// Evento (eventoCampos.js) — é a prova de que a arquitetura escala.

export function criarSchemaMarca({ locais }) {
  const opcoesLocal = [["", "Sem local principal"], ...locais.map((l) => [l.slug, l.nome])];

  return [
    { grupo: "Identificação", nome: "nome", label: "Nome", tipo: "text", obrigatorio: true },
    { grupo: "Identificação", nome: "slug", label: "Slug", tipo: "text", obrigatorio: true, hint: "Usado na URL e como referência dos eventos" },
    { grupo: "Identificação", nome: "id", label: "ID", tipo: "text", somenteLeitura: true, hint: "Gerado automaticamente a partir do slug" },
    { grupo: "Identificação", nome: "status", label: "Status", tipo: "select",
      opcoes: [["publicado", "Publicado"], ["rascunho", "Rascunho"]] },
    {
      grupo: "Identificação", nome: "ativoSelect", label: "Situação", tipo: "select",
      opcoes: [["true", "Ativa"], ["false", "Inativa"]],
      ler: (d) => String(d.ativo ?? true), escrever: (r, v) => { r.ativo = v === "true"; },
    },

    { grupo: "Sobre", nome: "descricao", label: "Descrição", tipo: "textarea" },
    { grupo: "Sobre", nome: "cidade", label: "Cidade", tipo: "text", obrigatorio: true },
    { grupo: "Sobre", nome: "frequencia", label: "Frequência", tipo: "select", obrigatorio: true,
      opcoes: [["semanal", "Semanal"], ["quinzenal", "Quinzenal"], ["mensal", "Mensal"], ["eventual", "Eventual"]] },
    {
      grupo: "Sobre", nome: "desde", label: "Desde (ano)", tipo: "number",
      ler: (d) => d.desde, escrever: (r, v) => { r.desde = v === "" ? null : Number(v); },
    },

    { grupo: "Local principal", nome: "localPrincipalSlug", label: "Local principal", tipo: "select", opcoes: opcoesLocal },

    {
      grupo: "Contato", nome: "instagram", label: "Instagram", tipo: "text", placeholder: "https://instagram.com/…",
      ler: (d) => d.instagram, escrever: (r, v) => { r.instagram = v || null; },
    },
    {
      grupo: "Contato", nome: "whatsapp", label: "WhatsApp", tipo: "text", placeholder: "https://wa.me/…",
      ler: (d) => d.whatsapp, escrever: (r, v) => { r.whatsapp = v || null; },
    },

    {
      grupo: "Imagens", nome: "logo", label: "Logo (URL)", tipo: "text",
      ler: (d) => d.logo, escrever: (r, v) => { r.logo = v || null; },
    },
    {
      grupo: "Imagens", nome: "banner", label: "Banner (URL)", tipo: "text", hint: "Se vazio, a página da marca usa a imagem do próximo evento",
      ler: (d) => d.banner, escrever: (r, v) => { r.banner = v || null; },
    },
  ];
}
