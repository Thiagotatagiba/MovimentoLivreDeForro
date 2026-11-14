/**
 * Stable local copies of original public artwork.
 * Match the source file, never the event ID: a newly published artwork URL wins.
 * Provenance: assets/eventos/README.md.
 */
const copies = new Map([
  ['880189607_18054198119813716_4883937518527682192_n.jpg',
    'assets/eventos/festival-praca-viva-2026-12.jpg'],
]);

export function imagemPersistida(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('.cdninstagram.com')) return url;
    const name = parsed.pathname.split('/').pop();
    return copies.get(name) ?? url;
  } catch {
    return url;
  }
}
