# assets/icons/

Ícones do PWA — hoje em branco (cor de fundo da paleta Terra Acesa), só como
placeholder. Substitua os arquivos abaixo pelo ícone real, mantendo os nomes e
tamanhos exatos (o `manifest.json` e as tags `<link>` das páginas apontam pra
esses nomes específicos):

| Arquivo                     | Tamanho | Uso                                              |
|------------------------------|---------|---------------------------------------------------|
| `icon-192.png`               | 192×192 | Ícone padrão do PWA (Android, tela inicial)        |
| `icon-512.png`                | 512×512 | Ícone de alta resolução (splash screen, stores)    |
| `icon-maskable-512.png`      | 512×512 | Versão "maskable" — deixe uma margem de segurança de ~10% em volta do conteúdo, porque o Android pode recortar em círculo, quadrado arredondado, etc |
| `apple-touch-icon-180.png`   | 180×180 | Ícone quando adicionado à tela inicial no iOS       |
| `favicon-32.png`             | 32×32   | Ícone da aba do navegador                          |

Se quiser gerar todos de uma vez a partir de uma imagem só, qualquer gerador de
favicon/PWA icon (ex. realfavicongenerator.net) resolve — só garanta que os
nomes finais batem com a tabela acima.
