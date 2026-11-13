# Homologação Auth/PostgREST — incremento B3

Estado atualizado em 13/11/2026: projeto separado qmhrlexpnnbjntpecjis criado
no plano Free, cotação US$ 0/mês. Auth/PostgREST e painel foram verificados
com contas fictícias. Evidências, correção PT409 e limitações atuais em
docs/HOMOLOGACAO_SUPABASE.md. As instruções abaixo descrevem a preparação
e o verificador; nenhuma alteração foi executada em produção.

## Destino de homologação

Projeto separado **Vai Ter Forró! — Homologação**, ref qmhrlexpnnbjntpecjis,
na região sa-east-1 e PostgreSQL 17.11. Não reaplicar o bootstrap nesse projeto: ele
já está preparado; os timestamps de instalação estão registrados no relatório real.
Não copiar usuários, favoritos, ingressos nem senhas de produção.
Uma branch Supabase também exige avaliação de custo antes da criação.

O operador deve preparar nesse ambiente o esquema legado necessário, as sete
migrações históricas já aplicadas em produção e a migração administrativa B1.
Os snapshots históricos não constituem um bootstrap completo de um banco vazio;
não executar db reset/push contra produção para tentar criar homologação.
Conferir previamente tabelas, RLS, grants, relacionamento publicado e Advisors.
O schema app_private deve continuar fora dos schemas expostos na Data API.

Criar três contas fictícias com e-mails confirmados, sem administrador global:

- Editor: membro equipe na marca A, somente gerenciar_eventos.
- Publicador: membro equipe na marca A, somente publicar_eventos.
- Outra marca: membro ativo somente na marca B.

Preparar marca/local ativos e um evento publicado fictício na marca A. Seu
id_legado deve começar por **evt-homologacao-**. Os horários de início/término
devem ser explícitos, válidos e terminoEstimado=false. Um administrador deve
preparar esses vínculos pelo mecanismo autorizado do ambiente; o verificador
não promove contas nem burla o fluxo futuro de convites.

## Configuração fora do repositório

Usar variáveis de ambiente ou um arquivo .env externo ao checkout. Não enviar
senhas pelo chat, não versionar esse arquivo e não usar service_role/secret key.
O CLI usa somente a chave pública e login normal das contas de teste.

Variáveis necessárias:

| Variável | Conteúdo |
| --- | --- |
| VTF_HOMOLOG_REF | Ref de 20 letras do projeto separado |
| VTF_HOMOLOG_PUBLIC_KEY | sb_publishable_… ou JWT anon do mesmo ref |
| VTF_HOMOLOG_MARCA | UUID da marca A fictícia |
| VTF_HOMOLOG_EVENTO | UUID do evento fictício |
| VTF_EDITOR_EMAIL / VTF_EDITOR_PASSWORD | Conta editor |
| VTF_PUBLICADOR_EMAIL / VTF_PUBLICADOR_PASSWORD | Conta publicador |
| VTF_OUTRA_MARCA_EMAIL / VTF_OUTRA_MARCA_PASSWORD | Conta da marca B |

Com Node 24, carregar o arquivo externo sem imprimir seu conteúdo:

```powershell
node --env-file=C:\caminho-fora-do-repositorio\vtf-homologacao.env scripts/homologar-auth.mjs
```

O modo padrão faz login normal e leitura, sem RPCs administrativas. Login e
logout criam/encerram sessões no ambiente de teste. Confere identidade no Auth,
e-mail confirmado, contas distintas, papéis no banco, ausência de administrador
global, relacionamento publicado, leitura de rascunhos e isolamento entre marcas.
Tokens permanecem em memória e não são exibidos. Logout usa scope=local para
encerrar somente a sessão criada pelo teste. Falhas no encerramento geram aviso.

## Teste de escrita opcional

Somente depois de preparar o evento descartável, definir no arquivo externo
VTF_HOMOLOG_CONFIRMAR_ESCRITA com o mesmo ref de homologação e executar:

```powershell
node --env-file=C:\caminho-fora-do-repositorio\vtf-homologacao.env scripts/homologar-auth.mjs --escrita
```

O teste recusa o ref conhecido de produção, URLs customizadas, chave
administrativa, confirmação ausente e evento sem o prefixo fictício. Envia dois
salvamentos concorrentes na mesma revisão por requisições HTTP independentes:
exige um sucesso e um conflito HTTP 409/PT409. Confere replay idempotente, incremento único
da revisão e versão pública intacta até publicar. Publicador e outra marca não
podem salvar; editor não pode publicar. A publicação pelo publicador deve trocar
a versão pública, confirmar o título fictício e preservar a situação operacional.

O evento fica alterado para inspeção, com nova versão e auditoria; não há exclusão
automática nem rollback destrutivo. Falhas podem deixar um rascunho ou publicação
válidos. Inspecionar o resultado antes de repetir. Não usar dados reais nesse teste.
O prefixo é uma proteção adicional, não uma comprovação de que o projeto é staging;
o operador deve conferir o ref independente antes de fornecer a configuração.

## Abrir o painel contra homologação

```powershell
node --env-file=C:\caminho-fora-do-repositorio\vtf-homologacao.env scripts/servidor-homologacao.mjs --supabase-homologacao --fonte=supabase --porta=8768
```

Abrir http://127.0.0.1:8768/admin/gestao.html. O servidor substitui apenas a
configuração do cliente compartilhado, com URL derivada do ref e chave pública.
Não inclui senhas nem tokens nas respostas. O SDK mantém a sessão em uma chave
de armazenamento específica desse projeto. Não aceita destino pela query string,
não combina esse modo com --admin-demo e só escuta em 127.0.0.1.
Sem a flag, a configuração versionada continua a mesma. Nenhuma configuração de
homologação é gravada nos arquivos do frontend ou publicada no site.

Depois dos testes CLI, validar no navegador login, troca de conta, resolução de
conflitos e encerramento de sessão. A validação visual com Auth real e contas fictícias foi executada no B4;
Google e Magic Link ainda precisam de verificações próprias.

## Evidências desta entrega

Executar npm test: **56 testes**, incluindo sete novos testes do verificador e
da substituição HTTP local. As APIs Auth/PostgREST desses sete testes são
simuladas: validam o verificador, seus bloqueios, o cenário e a limpeza de sessões;
não constituem por si só evidência de autenticação real nem concorrência remota;
as execuções reais posteriores estão registradas em docs/HOMOLOGACAO_SUPABASE.md.
Os 16 testes SQL existentes continuam executando as funções reais em PGlite.
O verificador não testa envio de e-mails, OAuth, atualização de PWA, entrega do
outbox, convites, revogação concorrente nem comportamento de múltiplas conexões
até ser executado no destino real.

Referências consultadas: [login com senha](https://supabase.com/docs/reference/javascript/auth-signinwithpassword),
[segurança da Data API](https://supabase.com/docs/guides/api/securing-your-api) e
[mudanças do CLI v3](https://supabase.com/changelog/supabase-cli-v3).
