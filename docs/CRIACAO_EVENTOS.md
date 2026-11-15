# Novo evento — 15/11/2026

Incremento em `codex/criacao-eventos`, baseado na main publicada. Implementado e validado em homologação; **ativado em produção em 15/11/2026, com autorização do responsável**. Resolve a falta de criação de edições no painel, especialmente para o administrador global que ainda não possui produtores/equipes cadastrados.

## Fluxo entregue

Selecionar uma marca existente → **Novo evento** → escolher local ativo e preencher título, início/término explícitos e demais dados → **Criar rascunho** → revisar → **Revisar publicação** → **Publicar agora** → **Ver evento no site**.

O administrador global pode criar para qualquer marca ativa, sem vínculo em membros_marca e sem conta de produtor. Administrador de marca/equipe com gerenciar_eventos pode criar somente nas marcas autorizadas. Permissão de publicação ou de listas isoladamente não permite criar. Criação não concede acesso a outra pessoa.

Inclui descrição, bandas/DJs, ingresso, preço, visibilidade e **imagem opcional por URL HTTPS pública**. Não há upload de arquivo, criação de marcas/locais ou troca de marca/local de uma edição existente neste incremento. A substituição de imagens em eventos existentes também permanece fora deste escopo. Data/hora de término e confirmação dos horários são obrigatórias; não há estimativa automática de quatro horas.

## Contrato e integridade

Migração local `20261115180643_criacao_eventos_rascunho.sql`, instalada somente em `qmhrlexpnnbjntpecjis` como `20261115181715`. Homologação tem 17 migrações; produção continua com 14 e sem essa RPC na verificação desta rodada. Não usar db push/reset sem reconciliar históricos.

RPC pública criar_evento_rascunho é SECURITY INVOKER, com entrada privada SECURITY DEFINER, search_path vazio e EXECUTE somente authenticated. A identidade vem de auth.uid() e a autorização é revalidada no banco. Marca é bloqueada antes de conferir permissão e o local ativo é conferido sob lock compartilhado. Reutiliza a serialização/idempotência por autor/chave.

O servidor gera UUID, ID público legado evt-UUID e slug com título normalizado/data/sufixo UUID. Cliente não escolhe IDs, slug, situação, publicação ou metadados internos. A identidade permanece estável se título/data mudarem depois. O formato do conteúdo é compatível com o catálogo atual, favoritos, ingressos e calendário; IDs antigos não são alterados.

Uma transação cria evento em estado rascunho, rascunho revisão 1, auditoria e resposta de idempotência. Não cria versão pública ou tarefa de prévia. Mesma chave/dados retorna o mesmo evento; chave reutilizada com outro conteúdo é recusada. Publicação explícita usa a RPC existente e cria a versão 1. RLS mantém o rascunho invisível ao visitante.

O modelo reutiliza a chave em falha ambígua e bloqueia duplo clique. A resposta canônica alimenta imediatamente o editor, sem depender de uma segunda leitura para saber qual evento foi criado. O estado sai do modo de criação antes de atualizar a interface, evitando recriação se a atualização visual falhar. Troca de conta limpa estado; trocar marca/evento com dados pendentes pede confirmação.

O painel lista títulos de rascunhos, desativa controles durante carregamento e distingue primeira publicação de substituição. Campos exclusivos da criação ficam desabilitados depois de salvar, sem impedir publicação de eventos existentes.

## Validações

- **172 testes:** 154 anteriores, 12 SQL de criação, cinco de modelo e um contrato de serviço novo. Cobrem permissão global sem equipe, isolamento, horários, imagem HTTPS, IDs, idempotência, publicação separada, falha atômica de auditoria, preservação e pausa da RPC.
- Auth/PostgREST reais: scripts/homologar-criacao-evento.mjs exige --rodada=UUID, projeto e confirmação de escrita de homologação. Duas chamadas concorrentes retornaram o mesmo evento e uma auditoria; payload diferente com a mesma chave recusado; publisher sem edição recusado; rascunho oculto para anon.
- Navegador: administrador fictício recebeu papel global temporário e criou na marca A onde não tinha equipe. Preencheu dados/imagem, criou rascunho, recarregou, publicou versão 1 e abriu o link público, com título/local/imagem e término na madrugada. A checagem anon antes de publicar não via o evento.
- Mobile: formulário em viewport 390px, documento/conteúdo 375px, sem transbordamento. O primeiro ensaio de viewport mirou outra aba; a validação foi refeita na aba correta. Sessões encerradas e papel global temporário removido, com registros de início/fim no ledger.
- Permanecem em homologação um evento fictício publicado pelo navegador e um rascunho da corrida; não importar esses dados em produção. Contas reais e produção não foram modificadas.

Capturas locais da sessão: novo-evento-publicado-homologacao.png, novo-evento-mobile.png e novo-evento-pagina-publica.png.

## Ativação e reversão

Após revisão/autorização, verificar o histórico e preservar estado atual de produção; aplicar **somente esta nova migração** antes de publicar as telas. Não reaplicar as sete da publicação anterior. O arquivo não cria eventos automaticamente nem modifica registros existentes. Produção deverá passar de 14 para 15 migrações, com timestamp real registrado na execução.

Validar **38 arquivos críticos**, incluindo admin/js/novoEventoModelo.js. Shell e módulos administrativos já são online-only no worker v9; não houve alteração do catálogo público, flag Supabase ou worker nesta rodada. Usuários com painel aberto devem atualizar. E-mail/agendamento permanecem desativados.

Em incidente, revogar EXECUTE apenas da nova RPC pública e restaurar o frontend anterior, preservando eventos, versões, auditoria, favoritos e ingressos. A pausa administrativa geral também inclui essa RPC. Não apagar edições para reverter interface.

Guia em [GUIA_USO_PAINEL.md](GUIA_USO_PAINEL.md). Próximo passo: publicar o incremento revisado em produção.

## Publicacao confirmada

PR #15 integrado em ce6775ee3e318fb02ae7d6af2d13606b22a93273. Migracao de producao 20261115190551 (criacao_eventos_rascunho); historico passou de 14 para 15. As referencias anteriores a producao pendente descrevem a validacao antes da ativacao.

Conferidos 38 arquivos criticos por hash, sem divergencias. Catalogo publico: 24 eventos, 15 marcas e 15 locais ativos, compativel com o legado. Contagens e hashes de eventos, versoes, perfis, interacoes e ingressos permaneceram iguais antes/depois. RPC publica INVOKER, sem EXECUTE para anon e com EXECUTE para authenticated; autorizacao de marca validada no banco. Advisors sem novos alertas.

Painel HTTPS abriu sem erro, solicitando login autorizado. Criacao/publicacao autenticada foi validada em homologacao; nao foram criados eventos ficticios ou sessoes da conta do responsavel em producao. E-mail e agendamento continuam desativados.
