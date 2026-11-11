[CmdletBinding(SupportsShouldProcess)]
param(
  [string]$Titulo = 'Integra leitura publica gradual do catalogo Supabase',
  [string]$Descricao = 'docs/PR_CATALOGO_SUPABASE.md',
  [switch]$CompararRemoto
)
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $raiz
$oldPrompt = $env:GIT_TERMINAL_PROMPT
$oldInteractive = $env:GCM_INTERACTIVE
$headers = $null
$credenciais = $null
try {
  function Executar-Node([string[]]$Argumentos) {
    & node @Argumentos
    if ($LASTEXITCODE -ne 0) { throw "Validacao falhou: node $($Argumentos -join ' ')" }
  }
  $branch = (& git branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or !$branch -or $branch -eq 'main') {
    throw 'Use uma branch de desenvolvimento, fora de main.'
  }
  $alteracoes = & git status --porcelain
  if ($LASTEXITCODE -ne 0 -or $alteracoes) {
    throw 'Registre as alteracoes em commit antes de publicar a branch.'
  }
  if (!(Test-Path -LiteralPath $Descricao -PathType Leaf)) { throw 'Descricao do PR nao encontrada.' }
  Executar-Node -Argumentos @('--test', 'scripts/testar-catalogo.mjs')
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
  $env:GIT_TERMINAL_PROMPT = '0'
  $env:GCM_INTERACTIVE = 'never'
  $repo = 'Thiagotatagiba/MovimentoLivreDeForro'
  # Reuse the configured credential helper. Capture only in memory; never print/store.
  $saidaCredencial = "protocol=https`nhost=github.com`npath=$repo.git`n`n" | & git credential fill 2>$null
  if ($LASTEXITCODE -ne 0) { throw 'Git nao tem uma credencial disponivel sem interacao. Autentique o Git no VS Code e execute novamente.' }
  $credenciais = @{}
  foreach ($linha in $saidaCredencial) {
    $partes = $linha -split '=', 2
    if ($partes.Count -eq 2) { $credenciais[$partes[0]] = $partes[1] }
  }
  $saidaCredencial = $null
  if (!$credenciais.password) { throw 'Credencial GitHub ausente no gerenciador do Git.' }
  $headers = @{
    Authorization = "Bearer $($credenciais.password)"
    Accept = 'application/vnd.github+json'
    'X-GitHub-Api-Version' = '2022-11-28'
  }
  $baseUri = "https://api.github.com/repos/$repo"
  $filtroHead = [Uri]::EscapeDataString("Thiagotatagiba:$branch")
  $respostaLista = Invoke-RestMethod -Uri "$baseUri/pulls?state=open&base=main&head=$filtroHead" -Headers $headers
  $existentes = @($respostaLista | ForEach-Object { $_ } | Where-Object { $_.html_url })
  & git push -u "https://github.com/$repo.git" $branch
  if ($LASTEXITCODE -ne 0) { throw 'Falha no push; nenhum PR foi criado.' }
  if ($existentes.Count -gt 0) {
    Write-Output "PR existente: $($existentes[0].html_url)"
    return
  }
  $body = @{
    title = $Titulo
    body = Get-Content -LiteralPath $Descricao -Raw -Encoding UTF8
    head = $branch
    base = 'main'
    draft = $true
  } | ConvertTo-Json -Depth 5
  $pr = Invoke-RestMethod -Uri "$baseUri/pulls" -Headers $headers -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
  Write-Output "PR criado em rascunho: $($pr.html_url)"
} catch {
  # Never serialize headers, credential objects or HTTP request objects.
  if ($_.Exception.Response) {
    if ($_.ErrorDetails.Message) {
      try {
        $detalhes = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Warning $detalhes.message
        foreach ($falha in $detalhes.errors) {
          Write-Warning ("resource={0}, field={1}, code={2}, message={3}" -f $falha.resource,$falha.field,$falha.code,$falha.message)
        }
      } catch { Write-Warning 'Resposta HTTP sem detalhes JSON.' }
    }
    throw "GitHub recusou a operacao HTTP ($([int]$_.Exception.Response.StatusCode)). A branch pode ter sido enviada; confirme o acesso a Pull requests da conta usada pelo Git."
  }
  throw
} finally {
  if ($credenciais) { $credenciais.Clear() }
  if ($headers) { $headers.Clear() }
  $env:GIT_TERMINAL_PROMPT = $oldPrompt
  $env:GCM_INTERACTIVE = $oldInteractive
  Pop-Location
}



