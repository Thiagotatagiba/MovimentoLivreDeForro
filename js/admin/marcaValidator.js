function urlValida(valor) {
  if (!valor) return true;
  return /^https?:\/\//.test(valor) || valor.startsWith("assets/");
}

export function validarMarca(marca, contexto = {}) {
  const { outrasMarcas = [], locaisValidos = [] } = contexto;
  const erros = {};

  if (!marca.nome?.trim()) erros.nome = "Nome é obrigatório.";

  if (!marca.slug?.trim()) {
    erros.slug = "Slug é obrigatório.";
  } else if (!/^[a-z0-9-]+$/.test(marca.slug)) {
    erros.slug = "Use só letras minúsculas, números e hífen.";
  } else if (outrasMarcas.some((m) => m.slug === marca.slug)) {
    erros.slug = "Já existe outra marca com esse slug.";
  }

  if (!marca.cidade?.trim()) erros.cidade = "Cidade é obrigatória.";
  if (!marca.frequencia) erros.frequencia = "Selecione a frequência.";

  if (marca.localPrincipalSlug && locaisValidos.length > 0 && !locaisValidos.includes(marca.localPrincipalSlug)) {
    erros.localPrincipalSlug = "Esse local não existe em locais.json.";
  }

  if (!urlValida(marca.instagram)) erros.instagram = "Use um link começando com http(s)://";
  if (!urlValida(marca.whatsapp)) erros.whatsapp = "Use um link começando com http(s)://";
  if (!urlValida(marca.logo)) erros.logo = "Use uma URL começando com http(s)://";
  if (!urlValida(marca.banner)) erros.banner = "Use uma URL começando com http(s)://";

  return { valido: Object.keys(erros).length === 0, erros };
}
