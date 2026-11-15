[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][string]$Diretorio,
 [string]$DestinoJson
)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
$root=(Resolve-Path -LiteralPath $Diretorio).Path
$meta=Get-Content -LiteralPath (Join-Path $root 'manifesto-backup.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$stream=New-Object IO.MemoryStream
try {
 for($i=1;$i -le $meta.partes;$i++) {
  $file=Join-Path $root ('parte-{0:D3}.dpapi' -f $i)
  $bytes=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($file),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $stream.Write($bytes,0,$bytes.Length)
 }
 $payload=$stream.ToArray()
 $texto=[Text.Encoding]::UTF8.GetString($payload)
 [uint64]$soma=5381
 foreach($c in $texto.ToCharArray()){$soma=(($soma*33) -bxor [int]$c) -band 4294967295}
 if($soma -ne $meta.checksum -or $texto.Length -ne $meta.caracteres){throw 'Partes de backup divergentes.'}
 $backup=$texto | ConvertFrom-Json
 if($backup.projeto -ne 'hpemkfzqbhbzjepbxvwh'){throw 'Projeto inesperado no backup.'}
 $contagens=@{}
 foreach($p in $meta.contagens.PSObject.Properties){
  $count=@($backup.dados.($p.Name)).Count
  if($count -ne $p.Value){throw 'Contagem de backup divergente.'}
  $contagens[$p.Name]=$count
 }
 $sha=[Security.Cryptography.SHA256]::Create()
 try{$hash=([BitConverter]::ToString($sha.ComputeHash($payload))).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}
 if($meta.sha256 -and $hash -ne $meta.sha256){throw 'Assinatura SHA-256 do backup divergente.'}
 if($DestinoJson){
  $output=[IO.Path]::GetFullPath($DestinoJson)
  $projectRoot=[IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd('\')+'\'
  if($output.StartsWith($projectRoot,[StringComparison]::OrdinalIgnoreCase)){throw 'Extraia dados pessoais somente fora do repositorio.'}
  if(Test-Path -LiteralPath $output){throw 'O destino de extracao ja existe; nao sera sobrescrito.'}
  [IO.File]::WriteAllBytes($output,$payload)
 }
 @{validado=$true;projeto=$backup.projeto;partes=$meta.partes;sha256=$hash;contagens=$contagens;extracaoSolicitada=[bool]$DestinoJson} | ConvertTo-Json -Depth 4
} finally {$stream.Dispose()}
