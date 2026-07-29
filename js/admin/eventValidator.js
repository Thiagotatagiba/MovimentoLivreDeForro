// Validação do evento — puramente sobre dados, nunca toca no DOM. O
// formulário mostra os erros; quem decide o que é erro é só este arquivo.

const TIPOS_INGRESSO_VALIDOS = ["antecipado", "gratuito", "couvert", "local", "lista", "esgotado"];
const TIPOS_EVENTO_VALIDOS = ["Baile", "Aula", "Festival", "Workshop"];

function urlValida(valor) {
  if (!valor) return true; // campo opcional vazio não é erro de formato
  return /^https?:\/\//.test(valor) || valor.startsWith("assets/");
}

function dataHoraValida(valor) {
  if (!valor) return false;
  return !Number.isNaN(new Date(valor).getTime());
}

/**
 * Valida um evento. `contexto` traz o necessário pra checar unicidade e
 * referências sem o validador precisar conhecer repositório nenhum.
 */
export function validarEvento(evento, contexto = {}) {
  const { outrosEventos = [], marcasValidas = [], locaisValidos = [] } = contexto;
  const erros = {};

  if (!evento.titulo?.trim()) erros.titulo = "Título é obrigatório.";

  if (!evento.slug?.trim()) {
    erros.slug = "Slug é obrigatório.";
  } else if (!/^[a-z0-9-]+$/.test(evento.slug)) {
    erros.slug = "Use só letras minúsculas, números e hífen.";
  } else if (outrosEventos.some((e) => e.slug === evento.slug)) {
    erros.slug = "Já existe outro evento com esse slug.";
  }

  if (!evento.id?.trim()) {
    erros.id = "ID é obrigatório.";
  } else if (outrosEventos.some((e) => e.id === evento.id)) {
    erros.id = "Já existe outro evento com esse ID.";
  }

  if (!dataHoraValida(evento.inicio)) erros.inicio = "Data e horário de início inválidos.";
  if (evento.fim && !dataHoraValida(evento.fim)) erros.fim = "Data e horário de término inválidos.";

  if (!evento.cidade?.trim()) erros.cidade = "Cidade é obrigatória.";

  if (!evento.marcaSlug) {
    erros.marcaSlug = "Selecione uma marca.";
  } else if (marcasValidas.length > 0 && !marcasValidas.includes(evento.marcaSlug)) {
    erros.marcaSlug = "Essa marca não existe em marcas.json.";
  }

  if (evento.localSlug && locaisValidos.length > 0 && !locaisValidos.includes(evento.localSlug)) {
    erros.localSlug = "Esse local não existe em locais.json.";
  }
  if (!evento.localSlug && !evento.enderecoTexto?.trim()) {
    erros.enderecoTexto = "Selecione um local ou informe um endereço.";
  }

  if (!evento.tipo || !TIPOS_EVENTO_VALIDOS.includes(evento.tipo)) {
    erros.tipo = "Selecione um tipo válido.";
  }

  if (!urlValida(evento.imagem)) erros.imagem = "Use uma URL (https://…) ou um caminho em assets/.";

  const ingresso = evento.ingresso ?? {};
  if (!TIPOS_INGRESSO_VALIDOS.includes(ingresso.tipo)) {
    erros.ingressoTipo = "Selecione um tipo de acesso válido.";
  }
  if (ingresso.tipo === "antecipado" && !ingresso.link?.trim()) {
    erros.ingressoLink = "Ingresso antecipado precisa de um link de compra.";
  }
  if (ingresso.link && !urlValida(ingresso.link)) {
    erros.ingressoLink = "Link de ingresso inválido.";
  }

  if (evento.linkExterno && !urlValida(evento.linkExterno)) {
    erros.linkExterno = "Link externo inválido.";
  }

  return { valido: Object.keys(erros).length === 0, erros };
}
