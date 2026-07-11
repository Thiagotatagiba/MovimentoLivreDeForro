// Módulo de geolocalização — hoje só monta o link "Abrir no Google Maps".
// Quando entrarmos na Etapa 4 (mapa interativo), este arquivo cresce para
// incluir o cálculo usado pelos marcadores do mapa; a página de evento não
// precisa mudar.

/**
 * Prioridade: coordenadas do local cadastrado > coordenadas do próprio
 * evento (útil para eventos futuros importados sem local cadastrado,
 * ex. via Google Calendar) > busca por texto do endereço/cidade.
 */
export function linkGoogleMaps(evento, local) {
  const lat = local?.latitude ?? evento?.coordenadas?.latitude;
  const lng = local?.longitude ?? evento?.coordenadas?.longitude;

  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  const endereco = local?.endereco || evento?.enderecoTexto || evento?.cidade || "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
}
