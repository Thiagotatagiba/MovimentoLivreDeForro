# Leitura publica Supabase - entrega A (11/11/2026)

Branch: `codex/supabase-leitura-publica`. Base verificada: `60e87d4`.
A fonte de producao continua JSON. Esta entrega nao executa DDL, nao altera
usuarios/interacoes/ingressos e nao habilita escrita administrativa.

## Diagnostico confirmado

- Checkout limpo na subpasta Movimento-Livre-de-Forr-, origin com nome antigo.
  O main do repositorio solicitado tem o mesmo commit.
- Supabase: 15 marcas, 16 locais (15 ativos), 24 eventos e 24 versoes.
  Sem referencias invalidas; 17 terminos atravessam a meia-noite.
- SELECT anon/authenticated do catalogo apenas; policies de ativos/publicados,
  versao apontada por FK composta. Rascunhos sem SELECT publico.
- Historico remoto: catalogo_base_seguro, horarios_termino_obrigatorios,
  corrige_validacao_horarios, leitura_publica_rls (20261111). Nao reaplicados.
  Reconciliar DDL remoto com migracoes locais antes da entrega administrativa.
- Avisos preexistentes continuam: rascunhos com RLS sem policy (intencional),
  rls_auto_enable SECURITY DEFINER executavel por anon/authenticated e
  leaked password protection desligada. Esta entrega nao os resolve.
- API anonima confirmou paridade 15/15/24, com zero divergencias nos campos
  legados. Supabase adiciona termino/dataTermino, estimativa, situacao e revisao.
- Validador aceitava apenas URL WhatsApp, apesar da UI ja aceitar telefone.
  Validacao alinhada sem alterar nenhum registro JSON ou remoto.
- Sete previas estavam ausentes; geradas localmente com as demais.

## Implementacao

catalogoAdapter limita o contrato publico, preserva id_legado e slug, traduz
relacionamentos UUID, exige inicio/termino validos e rejeita versao incorreta.
catalogoSupabase usa colunas explicitas, FK composta da versao publicada e
paginacao de 500 registros; nunca consulta rascunhos ou dados de usuario.
catalogoRepository compartilha uma leitura em memoria por pagina, elimina
referencias inativas tambem em busca/contagens e permite retry apos erro.
O unico cliente Supabase existente e carregado sob demanda, sem duplicacao.

Cancelados/adiados/interrompidos continuam acessiveis com aviso em detalhe,
cards e Stories, texto de compartilhamento e ICS; a compra fica indisponivel.
Inativos saem das consultas. Situacao operacional vem da versao publicada.
Datas/horas sao exibidas como horario local, com data do fim quando diferente
e rotulo de estimativa nos registros historicos. Nenhum fim e inventado para
novos registros. O ICS usa UID legado, revisao, fuso America/Sao_Paulo e
termino real; JSON legado sem fim nao gera DTEND.

## Verificacao reproduzivel

Na raiz do checkout, Node 24, sem instalar dependencias:

```text
node --test scripts/testar-catalogo.mjs
node scripts/comparar-catalogo.mjs
node scripts/comparar-catalogo.mjs --site
node scripts/gerar-compartilhamento.js
node scripts/validar-dados.js
git diff --check
```

O comparador usa exclusivamente a chave anon publica ja existente. Nao imprime
a chave nem faz escritas. --site compara os JSONs do dominio com o Supabase.
Verifica paridade de conteudo (ordem das chaves nao importa), referencias,
IDs/slugs e leitura anonima; acrescimos esperados sao relatados separadamente.
Mudanca de situacao operacional nao e tratada como acrescimo inofensivo.
Testes sinteticos cobrem versao errada, publicacao, inatividade, meia-noite,
datas impossiveis, cancelamento/adiamento, falha de rede sem fallback, retry,
busca/servicos, paginacao e bypass de cache de dados/cross-origin.

Homologacao visual/mobile retomada apos autorizacao posterior: Home, Stories,
busca, agenda/filtro Festival, detalhe, marca e local usando Supabase real
confirmados no navegador. Detalhe em 320/390/1280 px sem overflow horizontal;
sem erros/warnings no console da pagina inspecionada. Favoritar sem sessao
abriu login sem escrita. ICS baixado confirmou UID evt-015, revisao 1, inicio
13/11/2026 22h e termino 14/11/2026 02h. Login com conta real e
instalacao/atualizacao real do PWA permanecem pendentes.
Os testes anonimos com tabelas privadas vazias nao substituem os futuros testes
de isolamento com usuarios de marcas diferentes.

## Ativacao e reversao

1. Manter FONTE_CATALOGO='json' em js/repositories/catalogoConfig.js nesta entrega.
2. Apos revisao, usar 'comparacao' num ambiente de homologacao: JSON continua
   publico e um relatorio de paridade/erro e emitido. Esse modo aguarda a
   consulta comparativa; nao e modo para operacao permanente.
3. Reexecutar comparador local e --site imediatamente antes de ativar. Se
   divergirem, bloquear a troca e conciliar a fonte vigente. Nao importar
   por cima do banco automaticamente.
4. Validar manualmente agenda/busca/detalhe, favoritos/ingressos com conta
   real, mobile, rede indisponivel e atualizacao do service worker.
5. Avisar alvo e riscos do deploy. Entao alterar a flag para 'supabase',
   incrementar CACHE_NOME e publicar pelo processo real do repositorio.
   Nao presumir que push/PR atualiza o dominio.
6. Para gerar previas a partir da fonte nova:
   node scripts/gerar-compartilhamento.js --supabase
   Esse comando le apenas versoes publicadas e grava HTML local; nunca muda JSON.
   No modo Supabase o botao compartilha o endereco real com texto/aviso atuais
   em vez de escolher uma previa estatica potencialmente desatualizada. A previa
   automatica pode ser generica. Reuso seguro de previa por revisao e atualizacao
   apos republicacao dependem do futuro outbox/CI. Cache do WhatsApp nao e imediato.
7. Reversao explicita antes de escritas administrativas: comparar novamente,
   restaurar flag 'json', incrementar cache e fazer novo deploy. Nunca fallback
   automatico apos erro Supabase. Apos a primeira escrita administrativa,
   JSON deixa de ser rollback seguro: exportar/reconciliar catalogo publicado
   ou reverter codigo mantendo Supabase como fonte.

A versao CDN @2 do cliente preexistente nao foi trocada nesta entrega para
nao misturar atualizacao de Auth com a integracao. Fixar versao em entrega
separada com regressao de login.

## Proximo trabalho concreto

Concluir homologacao visual/PWA e ativacao comunicada. Depois reconciliar
migracoes remotas e implementar governanca multi-marca, permissoes e rascunho
com revisao otimista, publicacao transacional/auditoria/outbox. Somente depois,
listas VIP conforme o handoff, sem CSV e com acesso por titular/produtor.

## Automacao de testes e publicacao da branch

Os workflows em .github/workflows/catalogo.yml executam os 16 testes,
integridade, sintaxe e reproducibilidade das previas a cada push em main/codex/**
e PR para main. Nao recebem segredos administrativos nem fazem deploy.
A comparacao com Supabase/dominio e opcional no disparo manual, depois que o
workflow existir na branch principal.

No Windows, com Node 24 e Git ja autenticado:

    powershell -NoProfile -File scripts/publicar-branch.ps1 -CompararRemoto

O comando exige branch de desenvolvimento e commits sem alteracoes pendentes,
valida antes de enviar, reutiliza PR aberto ou cria rascunho e mostra o link.
Nao instala GitHub CLI, nao grava tokens e nao faz merge/deploy. Para verificar
sem enviar nada, adicione -WhatIf (os testes locais ainda sao executados).
Se a conta usada pelo Git nao puder criar PR, o erro e explicito. A descricao
padrao fica em docs/PR_CATALOGO_SUPABASE.md; use -Descricao e -Titulo para outras
entregas. A opcao -CompararRemoto e adequada ao catalogo nesta fase de transicao.

## Servidor de homologacao sem trocar a flag do projeto

    node scripts/servidor-homologacao.mjs --fonte=supabase --porta=8766

Aceita json/comparacao/supabase e serve somente em 127.0.0.1. Substitui
catalogoConfig.js apenas na resposta HTTP; nao escreve na configuracao ou no
banco. Cache-Control no-store, metodos somente GET/HEAD e caminhos ocultos
bloqueados. Teste automatizado usa porta efemera e confirma que a flag em disco
nao muda. Serve para desenvolvimento; nao substitui hosting/PWA em producao.

A publicacao aceita -AtualizarDescricao para sincronizar titulo/corpo de um PR
existente com os arquivos revisados, sem duplicar PR:

    powershell -NoProfile -File scripts/publicar-branch.ps1 -CompararRemoto -AtualizarDescricao

O PR permanece em rascunho. Nao ha aprovacao/merge/deploy automatico.
