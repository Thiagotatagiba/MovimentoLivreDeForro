# Gestão de eventos — incremento B2

Branch codex/painel-eventos, baseada em codex/administracao-base. Interface
implementada e homologada em demonstração local; migração administrativa ainda
não aplicada no Supabase. Não habilita escrita em produção por si só.

## Fluxo entregue

admin/gestao.html lista as marcas autorizadas e seus eventos. O formulário
preserva identidade, local, imagem e condições especiais existentes; edita
título, descrição, início/término, atrações, ingresso e visibilidade.
Novos eventos, troca de local, upload de imagem e edição de condições especiais
não fazem parte deste incremento.

Salvar cria/atualiza o rascunho, sem alterar a versão publicada. Publicar é uma
operação separada, com revisão explícita de título, horários, situação preservada,
visibilidade e ingresso. Horários históricos estimados precisam ser confirmados.
Um publicador não pode editar conteúdo; um editor sem publicar_eventos não pode
publicar ou alterar a situação. O backend do PR anterior continua sendo a
autoridade em todas as operações.

Em conflito de revisão, o texto local é preservado. A tela compara o conteúdo
quando o editor abriu, sua alteração e a revisão atual da equipe. Campos
conflitantes exigem escolha; campos sem disputa mostram sugestão. Confirmar
a comparação apenas prepara o formulário — salvar continua sendo explícito.
A comparação normaliza a ordem das chaves JSONB, sem perder a ordem das atrações.

Cancelamento, adiamento e interrupção usam a RPC de situação, com revisão da
versão publicada e confirmação separada. Não são gravados dentro do rascunho.
A página mostra a versão e situação atuais, e não oferece republicação sem
mudanças de conteúdo.

Chaves de operação são mantidas em memória para repetir a mesma solicitação
após uma falha ambígua de rede. Mudança de conteúdo ou revisão gera nova chave.
Não existe retry que sobrescreva conflito, nem fallback administrativo para JSON.
O estado não é persistido em localStorage. Há aviso ao sair com alterações
não salvas; troca de conta limpa a tela e invalida respostas antigas.

## Demonstração local segura

    npm ci --ignore-scripts
    node scripts/servidor-homologacao.mjs --admin-demo --porta=8767

Abrir http://127.0.0.1:8767/admin/gestao.html. O banner identifica que são dados
fictícios. Perfis disponíveis: administrador, editor, publicador e outra marca.
Todos os comandos executam as mesmas funções SQL do incremento B1, num
PostgreSQL/PGlite descartável em memória. Reiniciar o servidor apaga esses dados.
O fixture compartilhado com os testes não importa cliente ou credencial Supabase.

O servidor substitui somente a dependência da página quando --admin-demo foi
explicitamente informado. Sem essa opção, /__admin_demo/ retorna 404 e a
dependência real exige sessão e permissões no Supabase. ?perfil=administrador
é ignorado fora da demonstração e não concede acesso. A API local exige um
perfil fictício válido, rejeita outra origem, limita o tamanho das requisições
e permite somente operações predefinidas, sem SQL arbitrário.

O parâmetro --fonte do catálogo não habilita a demonstração nem a administração.

## Verificações executadas

48 testes no total: catálogo/PWA (17), SQL/RLS administrativo (16), serviço (6)
e editor/API de demonstração (9). Executar npm test.

Também verificado no navegador:
- Duas abas na mesma revisão: o segundo salvamento foi recusado, mantendo o
  texto; escolha explícita e novo salvamento avançaram a revisão.
- Editor sem publicação: ações públicas bloqueadas.
- Publicador: formulário e salvamento bloqueados; revisão e publicação do
  rascunho confirmaram nova versão sem editar o conteúdo.
- Alteração de situação confirmou Cancelado e incrementou a versão publicada.
- Navegação da outra marca exibiu somente a Marca B e seu evento.
- Fora da demonstração, a página permaneceu na exigência de login mesmo com
  ?perfil=administrador; nenhum comando administrativo remoto foi executado.
- Layouts efetivamente medidos em 390 e 1280 px sem overflow horizontal.
- Requisição de outra origem ao demo: HTTP 403; rota no modo normal: HTTP 404.

O service worker v7 trata /admin/, /__admin_demo/ e o serviço administrativo
como network-only. Nenhum módulo administrativo foi incluído no pré-cache
público. As leituras Supabase continuam fora do cache.

## Limitações e próxima etapa

A homologação usa usuários fictícios e não substitui o teste real de Auth,
PostgREST, permissões e concorrência entre conexões no ambiente de staging.
A migração B1 permanece pendente; não há bootstrap de administrador no cliente.
O editor local admin/index.html foi preservado.

Ainda faltam convites com e-mail verificado, solicitações, criação de eventos e
locais provisórios, upload, worker do outbox e listas VIP. Login/PWA reais e
ativação comunicada da leitura Supabase continuam sendo pré-condições para
habilitar a escrita administrativa em produção.

Para reverter esta entrega basta retirar a página/serviço novo e restaurar o
service worker anterior. Não há alteração de dados remotos a desfazer.
