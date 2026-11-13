[CmdletBinding(SupportsShouldProcess)]
param(
  [string]$Base = 'main',
  [string]$Titulo = 'Integra leitura publica gradual do catalogo Supabase',
  [string]$Descricao = 'docs/PR_CATALOGO_SUPABASE.md',
  [switch]$CompararRemoto,
  [switch]$AtualizarDescricao
)
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $raiz
try {
  function Executar-Node([string[]]$Argumentos) {
    & node @Argumentos
    if ($LASTEXITCODE -ne 0) { throw "Validacao falhou: node $($Argumentos -join ' ')" }
  }
  $branch = (& git branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or !$branch -or ($branch -eq 'main' -or $branch -eq $Base)) {
    throw 'Use uma branch de desenvolvimento, fora de main.'
  }
  $alteracoes = & git status --porcelain
  if ($LASTEXITCODE -ne 0 -or $alteracoes) {
    throw 'Registre as alteracoes em commit antes de publicar a branch.'
  }
  if (!(Test-Path -LiteralPath $Descricao -PathType Leaf)) { throw 'Descricao do PR nao encontrada.' }
  & npm ci --ignore-scripts
  if ($LASTEXITCODE -ne 0) { throw 'Instalacao das dependencias de teste falhou.' }
  Executar-Node -Argumentos @('--test', 'scripts/testar-catalogo.mjs', 'scripts/testar-administracao.mjs', 'scripts/testar-servico-administrativo.mjs', 'scripts/testar-editor-gestao.mjs', 'scripts/testar-homologacao-auth.mjs')
  Executar-Node -Argumentos @('scripts/validar-dados.js')
  Executar-Node -Argumentos @('--check', 'js/pages/home.js')
  Executar-Node -Argumentos @('--check', 'js/pages/evento.js')
  Executar-Node -Argumentos @('--check', 'scripts/gerar-compartilhamento.js')
  & git diff --check
  if ($LASTEXITCODE -ne 0) { throw 'Diff invalido.' }
  Executar-Node -Argumentos @('scripts/gerar-compartilhamento.js')
  & git diff --exit-code -- compartilhar
  if ($LASTEXITCODE -ne 0 -or (& git ls-files --others --exclude-standard compartilhar)) {
    throw 'Previas mudaram. Revise e registre as paginas geradas antes de publicar.'
  }
  if ($CompararRemoto) {
    Executar-Node -Argumentos @('scripts/comparar-catalogo.mjs')
    Executar-Node -Argumentos @('scripts/comparar-catalogo.mjs', '--site')
  }
  if (!$PSCmdlet.ShouldProcess("Thiagotatagiba/MovimentoLivreDeForro ($branch)", 'Enviar branch e abrir/reutilizar PR em rascunho')) {
    return
  }
  $argsPublicacao = @('scripts/lib/publicarPR.mjs', $branch, $Titulo, $Descricao, '--base', $Base)
  if ($AtualizarDescricao) { $argsPublicacao += '--atualizar' }
  Executar-Node -Argumentos $argsPublicacao
} finally {
  Pop-Location
}





