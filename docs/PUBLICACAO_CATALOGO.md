# Candidata à primeira publicação — 14/11/2026

Branch codex/publicacao-catalogo, baseada exclusivamente na leitura pública
codex/supabase-leitura-publica (b94c2f7). Não inclui a base, as páginas ou as
migrações administrativas dos PRs #3–#6. A fonte candidata é Supabase e o cache v8.
Nenhum merge ou deploy foi executado nesta preparação.

## Escopo e mecanismo real de publicação

Esta candidata inclui a entrega pública do PR #2 e sua ativação. Ao publicar,
usar este PR como alternativa completa ao #2; não é necessário publicar o #2
primeiro com JSON para depois publicar a ativação. Não fechar ou retargetar os
outros PRs automaticamente durante a preparação.

GitHub Pages foi consultado pelo Git autenticado: source=main, path=/,
build_type=legacy, status=built. O último build publicado está no commit
60e87d4be852dca7cab996815b49575417b35950. O domínio responde via GitHub.com.
Push em branch de desenvolvimento/PR não publica o site; merge autorizado em
main inicia o build/deployment do Pages. A conclusão desse build e a resposta
do domínio precisam ser conferidas, não presumidas.

A consulta também encontrou https_enforced=false, embora HTTPS funcione com
certificado válido. Essa configuração preexistente não foi alterada; habilitar
HTTPS obrigatório deve ser tratado explicitamente na publicação aprovada ou em
ajuste separado. Não expor sessões por novos links HTTP; as URLs canônicas
continuam HTTPS. A leitura pública não modifica Auth, o cliente SDK, as tabelas
de usuários, favoritos ou ingressos.

## Verificações de 14/11

- 19 testes locais: 17 do catálogo e 2 da verificação de publicação.
- Comparação somente leitura contra JSON local e JSON servido no domínio:
  15 marcas, 15 locais ativos e 24 eventos, sem divergências; 24 versões públicas.
  Campos novos esperados: início/término, estimativa, situação e revisão.
- Rascunhos, perfis e ingressos não retornaram dados para o cliente anônimo.
- O domínio continua com worker v4, sem os novos módulos e sem a cópia local
  da arte do Festival. Isso confirma que as branches ainda não foram publicadas.
- Service worker real no navegador, origem local pwa.localhost:8769 (secure
  context): registro da versão v4 publicada, atualização para a candidata v8,
  remoção de v4, pré-cache dos módulos novos e fonte Supabase. Sem resposta
  privada nos caches inspecionados. O servidor usa o sw.js anterior obtido do
  commit publicado e o sw.js candidato, sem substituir o código do worker.
- Favoritos e carteira com Auth real e conta fictícia em qmhrlexpnnbjntpecjis:
  favorito salvo pelo botão e exibido na lista; ingresso associado por
  evt-homologacao-concorrencia mostrou título/data do catálogo publicado em vez
  da cópia de segurança. A imagem PNG sintética no bucket privado carregou por
  URL assinada. O ingresso foi criado por API com a sessão da própria conta,
  sem chave administrativa. Logout foi confirmado na tela.
- Esses testes autenticados usaram o servidor B4 na porta 8768 e o código
  público compartilhado. Não são um teste de OAuth/Magic Link de produção.
- A verificação visual encontrou um problema preexistente: display:flex da
  classe estado-vazio ignorava hidden. A candidata adiciona uma regra específica
  para ocultá-la. O navegador confirmou estadoVazioOculto=true com o CSS candidato.
- O manifesto, Auth/SDK e os arquivos de dados JSON permanecem iguais à main.

Limites: a atualização real do worker foi testada, mas instalação pelo sistema
operacional/Android/iOS não foi executada. Os testes offline de contrato são
automatizados, não um teste físico de perda de rede. Google e link mágico não
foram reexecutados nesta entrega. Essas limitações precisam ser consideradas na
autorização; a candidata não muda a configuração ou implementação desses logins.
O painel administrativo e as listas VIP permanecem para publicações posteriores.

## Reproduzir verificações

Na raiz do worktree publicacao-catalogo, com Node 24:

```powershell
node --test scripts/testar-catalogo.mjs scripts/testar-publicacao.mjs
node scripts/comparar-catalogo.mjs
node scripts/comparar-catalogo.mjs --site
node scripts/servidor-pwa.mjs --porta=8769
```

Abrir http://pwa.localhost:8769/, clicar Registrar versão anterior, conferir v4,
Atualizar para candidata e conferir v8. A origem é descartável e só escuta em
loopback. O POST que avança a fase exige Origin exato e não é uma API de produção.
Para repetir a partir de uma origem limpa, usar outra porta. O registro do worker
não instala o aplicativo no sistema operacional. O cache é próprio dessa origem.

## Conferência da publicação e reversão

```powershell
# Antes: relatório deve indicar que a candidata ainda não está publicada.
node scripts/verificar-publicacao.mjs
# Depois: exige todos os arquivos críticos correspondentes à candidata.
node scripts/verificar-publicacao.mjs --exigir
```

O verificador só faz GET, confere 19 arquivos críticos com SHA-256 (normaliza
CRLF/BOM em texto; imagem é comparada byte a byte), não segue redirects e retorna
erro com --exigir se faltar arquivo, houver falha de rede ou mistura de versões.
Configuração, módulos, CSS, worker e foto precisam corresponder; uma home HTTP
200 não basta. Não testa sozinho cookies, login, instalação, HTML renderizado
ou toda a árvore do site.

Antes do merge autorizado, repetir paridade --site e conferir ausência de escrita
administrativa remota. Após o merge, acompanhar o Pages até status built para
o SHA esperado, executar o verificador e abrir agenda/busca/detalhe/Festival no
domínio. Conferir em sessão instalada/conta real quando o usuário estiver disponível.
Se houver falha, não aplicar fallback silencioso nem editar linhas do banco.

Enquanto não houver escrita administrativa e a paridade continuar válida, a
reversão preferida é novo commit mudando FONTE_CATALOGO para json e aumentando
CACHE_NOME (ex.: v9), preservando os adaptadores e a imagem recuperada. Aprovar
e publicar esse commit, conferir Pages e domínio. Não reverter simplesmente para
o worker v4: manter cache com versão nova evita resíduos da tentativa anterior.
Após primeira escrita administrativa, JSON deixa de ser reversão segura sem
exportação/reconciliação. Os futuros PRs administrativos devem preservar a fonte
Supabase e avançar o cache, resolvendo o conflito com a antiga versão v7 deles.

## Riscos relevantes da ativação

A disponibilidade do catálogo passa a depender da rede/API Supabase. Falhas
precisam mostrar indisponibilidade, sem ressuscitar JSON desatualizado. Horários
históricos estimados serão indicados como tais. A mudança de cache atualiza a
casca do PWA; uma aba aberta durante o deploy pode precisar recarregar. Prévia de
compartilhamento/cache de WhatsApp não atualiza imediatamente. Não há migração,
escrita administrativa ou troca de credenciais nesta publicação.
