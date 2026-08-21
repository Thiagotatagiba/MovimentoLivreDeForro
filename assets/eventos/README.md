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
