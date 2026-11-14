# assets/eventos/

Coloque aqui as imagens referenciadas em `imagemUrl` nos eventos de
`data/eventos.json`.

O caminho no JSON é relativo à raiz do projeto (onde ficam index.html,
agenda.html etc.), então:

```json
"imagemUrl": "assets/eventos/deck-16-agosto-2026.jpg"
```

...precisa ter o arquivo em:

```
vai-ter-forro/assets/eventos/deck-16-agosto-2026.jpg
```

Atenção a maiúsculas/minúsculas no nome do arquivo — em servidores Linux
(a maioria das hospedagens) o nome é case-sensitive, mesmo que no Windows
não faça diferença testando localmente.

Se o arquivo não existir ou o caminho estiver errado, o card cai de volta
pro fundo sólido padrão (nunca fica quebrado ou com ícone de imagem
faltando).

## Festival Praca Viva - arte recuperada em 11/11/2026

- Arquivo: festival-praca-viva-2026-12.jpg (1088 x 1344, JPEG original).
- Origem publica do organizador: https://www.instagram.com/p/DfHluSKx7pf/
- Arquivo de origem: 880189607_18054198119813716_4883937518527682192_n.jpg.
- A URL CDN presente no JSON e Supabase retornou HTTP 403 "URL signature expired".
  A imagem nao foi perdida na migracao; a assinatura temporaria expirou.
- Copia original recuperada pelo post publico, sem edicao, recriacao ou recorte.
- js/utils/midiasLocais.js resolve somente esse arquivo de origem para a copia
  estavel, em exibicao e geracao de previas. Uma nova imagem publicada tem
  precedencia e nao e substituida pela copia antiga.
- Nenhum registro JSON, versao publicada Supabase ou ID foi alterado.
