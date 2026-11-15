# Cadastro oficial de marcas e locais

Incremento em codex/cadastro-marcas-locais. Somente global cria; acesso de equipe continua por convite separado. Cadastro é público/ativo após revisão e confirmação; não há rascunho de marca/local nesta entrega, e não são alterados registros existentes. Identidades novas mrc-UUID/loc-UUID e slugs imutáveis com UUID são geradas no servidor.

Auditoria global em public.auditoria_catalogo; leitura só global, nenhuma escrita direta. public.criar_marca_catalogo/public.criar_local_catalogo são INVOKER, com helper privado que bloqueia a linha do administrador ativo, revalida autoridade em replay e usa idempotência por autor/chave. Nome duplicado de marca ou nome/endereço iguais de local são recusados. Local padrão, quando definido, deve estar ativo. Erro de auditoria desfaz a transação inteira.

Serviços de mapa separados em data/mapasConfig.json, sem chaves. Leaflet 1.9.4 fixado com SRI; mapas com atribuição visível, sem pré-download, sem geolocalização do usuário. Photon recebe apenas buscas de endereços públicos, com espera de 1,3s após digitação, botão alternativo, cache em memória, limite local e timeout. Sua disponibilidade não é garantida; a marca pode ser cadastrada mesmo se o mapa falhar. O local exige ponto confirmado, ajustável por mouse/toque/teclado. Campos do endereço permanecem editáveis; alterá-los invalida o ponto anterior.

Referências: [Photon e limites do servidor público](https://github.com/komoot/photon#demo-server), [política de tiles OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/). Uso restrito ao painel global; reavaliar provedor/proxy com crescimento do volume. Não utiliza a API pública Nominatim.

Testes SQL/modelo incluem autorização, identidade, links, endereço/ponto, replay, duplicidade, revogação e rollback. Harness scripts/homologar-cadastros.mjs só aceita projeto fictício e --rodada=UUID; cria um local de teste e encerra suas sessões. Navegador validou fluxo real e marca sem membros. Nenhum fixture deve ser importado em produção.

Ativação: comparar contagens/hashes atuais, aplicar apenas 20261115203953_cadastro_marcas_locais.sql, conferir permissões e arquivo público, publicar PR, verificar manifesto e catálogo. Reversão: revogar execução das duas novas RPCs e restaurar frontend; manter tabela de auditoria e cadastros, sem apagar eventos/favoritos/ingressos. O arquivo de pausa geral já inclui as RPCs.

Migração de homologação: 20261115204655. Papel global temporário removido com registros de início/fim; sessões fictícias encerradas. Prova de navegador: marca e local criados sem membros, formulário de evento recebeu o local padrão. Mobile 390px/documento 375px sem overflow. Harness concorrente criou um só local/auditoria.
