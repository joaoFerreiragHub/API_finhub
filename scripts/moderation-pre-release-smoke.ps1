param(
  [string]$BaseUrl = 'http://localhost:5000',
  [string]$AdminEmail = '',
  [string]$AdminPassword = '',
  [string]$ReporterEmail = '',
  [string]$ReporterPassword = '',
  [string]$TargetType = '',
  [string]$TargetId = '',
  [string]$ReportReason = 'spam'
)

$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')

function Import-DotEnvFile {
  param([string]$FilePath)

  if (-not (Test-Path -LiteralPath $FilePath)) {
    return
  }

  foreach ($rawLine in Get-Content -LiteralPath $FilePath) {
    $line = $rawLine.Trim()
    if ($line.Length -eq 0 -or $line.StartsWith('#')) {
      continue
    }

    $separatorIndex = $line.IndexOf('=')
    if ($separatorIndex -le 0) {
      continue
    }

    $name = $line.Substring(0, $separatorIndex).Trim()
    if ($name -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
      continue
    }

    $alreadySet = [Environment]::GetEnvironmentVariable($name, 'Process')
    if (-not [string]::IsNullOrWhiteSpace($alreadySet)) {
      continue
    }

    $value = $line.Substring($separatorIndex + 1)
    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}

function Load-SmokeEnvDefaults {
  $scriptDir = Split-Path -Parent $PSCommandPath
  $repoRoot = Resolve-Path (Join-Path $scriptDir '..')

  foreach ($candidate in @('.env', '.env.local')) {
    Import-DotEnvFile -FilePath (Join-Path $repoRoot $candidate)
  }
}

function Assert-Condition {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

function Get-JsonId {
  param($Obj)
  if ($null -eq $Obj) { return $null }
  if ($Obj.PSObject.Properties.Name -contains 'id') { return [string]$Obj.id }
  if ($Obj.PSObject.Properties.Name -contains '_id') { return [string]$Obj._id }
  return $null
}

function Test-IsJwtLike {
  param([string]$Token)
  if ([string]::IsNullOrWhiteSpace($Token)) { return $false }
  if ($Token.StartsWith('dev-')) { return $false }
  $parts = $Token.Split('.')
  return $parts.Count -eq 3
}

function Invoke-TestRequest {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [string]$Token = $null,
    [int[]]$ExpectedStatus = @(200)
  )

  $tmpOut = New-TemporaryFile
  $tmpBody = $null
  try {
    $curlArgs = @(
      '-sS', '-o', $tmpOut.FullName, '-w', '%{http_code}',
      '-X', $Method, "$BaseUrl$Path",
      '-H', 'Accept: application/json'
    )

    if (-not [string]::IsNullOrWhiteSpace($Token)) {
      $curlArgs += @('-H', "Authorization: Bearer $Token")
    }

    if ($null -ne $Body) {
      $tmpBody = New-TemporaryFile
      $jsonBody = $Body | ConvertTo-Json -Compress
      [System.IO.File]::WriteAllText($tmpBody.FullName, $jsonBody, [System.Text.Encoding]::UTF8)
      $curlArgs += @('-H', 'Content-Type: application/json', '--data', "@$($tmpBody.FullName)")
    }

    $statusText = & curl.exe @curlArgs
    $statusCode = [int]($statusText.Trim())
    $raw = Get-Content $tmpOut.FullName -Raw

    $json = $null
    $trim = if ($null -ne $raw) { $raw.Trim() } else { '' }
    if ($trim.StartsWith('{') -or $trim.StartsWith('[')) {
      try { $json = $raw | ConvertFrom-Json } catch {}
    }

    if ($ExpectedStatus -notcontains $statusCode) {
      throw "[$Method $Path] HTTP $statusCode (esperado: $($ExpectedStatus -join ','))`nResposta: $raw"
    }

    return [PSCustomObject]@{
      Status = $statusCode
      Raw = $raw
      Json = $json
    }
  }
  finally {
    Remove-Item $tmpOut.FullName -Force -ErrorAction SilentlyContinue
    if ($null -ne $tmpBody) { Remove-Item $tmpBody.FullName -Force -ErrorAction SilentlyContinue }
  }
}

Load-SmokeEnvDefaults

if ([string]::IsNullOrWhiteSpace($AdminEmail)) { $AdminEmail = $env:MODERATION_SMOKE_ADMIN_EMAIL }
if ([string]::IsNullOrWhiteSpace($AdminPassword)) { $AdminPassword = $env:MODERATION_SMOKE_ADMIN_PASSWORD }
if ([string]::IsNullOrWhiteSpace($ReporterEmail)) { $ReporterEmail = $env:MODERATION_SMOKE_REPORTER_EMAIL }
if ([string]::IsNullOrWhiteSpace($ReporterPassword)) { $ReporterPassword = $env:MODERATION_SMOKE_REPORTER_PASSWORD }
if ([string]::IsNullOrWhiteSpace($TargetType)) { $TargetType = $env:MODERATION_SMOKE_TARGET_TYPE }
if ([string]::IsNullOrWhiteSpace($TargetId)) { $TargetId = $env:MODERATION_SMOKE_TARGET_ID }
if ([string]::IsNullOrWhiteSpace($env:MODERATION_SMOKE_REPORT_REASON) -eq $false) {
  $ReportReason = $env:MODERATION_SMOKE_REPORT_REASON
}

Assert-Condition (-not [string]::IsNullOrWhiteSpace($AdminEmail)) 'MODERATION_SMOKE_ADMIN_EMAIL em falta.'
Assert-Condition (-not [string]::IsNullOrWhiteSpace($AdminPassword)) 'MODERATION_SMOKE_ADMIN_PASSWORD em falta.'
Assert-Condition (-not [string]::IsNullOrWhiteSpace($ReporterEmail)) 'MODERATION_SMOKE_REPORTER_EMAIL em falta.'
Assert-Condition (-not [string]::IsNullOrWhiteSpace($ReporterPassword)) 'MODERATION_SMOKE_REPORTER_PASSWORD em falta.'
Assert-Condition (-not [string]::IsNullOrWhiteSpace($TargetType)) 'MODERATION_SMOKE_TARGET_TYPE em falta.'
Assert-Condition (-not [string]::IsNullOrWhiteSpace($TargetId)) 'MODERATION_SMOKE_TARGET_ID em falta.'

Write-Host "1) Health check"
Invoke-TestRequest -Method 'GET' -Path '/healthz' -ExpectedStatus @(200) | Out-Null

Write-Host "2) Login admin e reporter com credenciais reais"
$adminLogin = Invoke-TestRequest -Method 'POST' -Path '/api/auth/login' -Body @{
  email = $AdminEmail
  password = $AdminPassword
} -ExpectedStatus @(200)

$reporterLogin = Invoke-TestRequest -Method 'POST' -Path '/api/auth/login' -Body @{
  email = $ReporterEmail
  password = $ReporterPassword
} -ExpectedStatus @(200)

$adminToken = [string]$adminLogin.Json.tokens.accessToken
$reporterToken = [string]$reporterLogin.Json.tokens.accessToken

Assert-Condition (Test-IsJwtLike $adminToken) 'Token admin invalido: esperado JWT real (nao dev-*).'
Assert-Condition (Test-IsJwtLike $reporterToken) 'Token reporter invalido: esperado JWT real (nao dev-*).'

Write-Host "3) Reporter cria/atualiza report de conteudo"
$reportCreate = Invoke-TestRequest -Method 'POST' -Path '/api/reports/content' -Token $reporterToken -Body @{
  contentType = $TargetType
  contentId = $TargetId
  reason = $ReportReason
  note = 'Smoke pre-release O1-08'
} -ExpectedStatus @(200, 201)

Assert-Condition ($reportCreate.Json.report -ne $null) 'Report nao devolvido no payload.'

Write-Host "4) Admin consulta queue com flaggedOnly"
$queue = Invoke-TestRequest -Method 'GET' -Path "/api/admin/content/queue?flaggedOnly=true&search=$TargetId&limit=25" -Token $adminToken -ExpectedStatus @(200)
$queueItems = @($queue.Json.items)
Assert-Condition ($queueItems.Count -ge 1) 'Queue sem itens flagged para o alvo de teste.'

Write-Host "5) Admin consulta reports do alvo"
$reportsBeforeAction = Invoke-TestRequest -Method 'GET' -Path "/api/admin/content/$TargetType/$TargetId/reports" -Token $adminToken -ExpectedStatus @(200)
Assert-Condition ((@($reportsBeforeAction.Json.items)).Count -ge 1) 'Historico de reports vazio para alvo reportado.'

Write-Host "6) Admin executa hide-fast"
$hideFast = Invoke-TestRequest -Method 'POST' -Path "/api/admin/content/$TargetType/$TargetId/hide-fast" -Token $adminToken -Body @{
  reason = 'Smoke pre-release: contencao inicial'
  note = 'validacao O1-08'
} -ExpectedStatus @(200)

Assert-Condition ($hideFast.Json.toStatus -eq 'hidden' -or $hideFast.Json.content.moderationStatus -eq 'hidden') 'Hide-fast nao colocou alvo em hidden.'

Write-Host "7) Admin consulta historico para rollback review"
$history = Invoke-TestRequest -Method 'GET' -Path "/api/admin/content/$TargetType/$TargetId/history?limit=20" -Token $adminToken -ExpectedStatus @(200)
$historyItems = @($history.Json.items)
Assert-Condition ($historyItems.Count -ge 1) 'Historico de moderacao vazio apos hide-fast.'

$latestEventId = Get-JsonId $historyItems[0]
Assert-Condition (-not [string]::IsNullOrWhiteSpace($latestEventId)) 'Nao foi possivel resolver eventId de moderacao.'

$rollbackReview = Invoke-TestRequest -Method 'GET' -Path "/api/admin/content/$TargetType/$TargetId/rollback-review?eventId=$latestEventId" -Token $adminToken -ExpectedStatus @(200)
Assert-Condition ($rollbackReview.Json.canRollback -eq $true) 'Rollback review bloqueado para o evento de teste.'

Write-Host "8) Admin executa rollback (simulacao de appeal operacional)"
$rollback = Invoke-TestRequest -Method 'POST' -Path "/api/admin/content/$TargetType/$TargetId/rollback" -Token $adminToken -Body @{
  eventId = $latestEventId
  reason = 'Smoke pre-release: reversao controlada'
  note = 'validacao O1-08 rollback assistido'
  confirm = $true
  markFalsePositive = $true
} -ExpectedStatus @(200)

Assert-Condition ($rollback.Json.rollbacked -eq $true -or $rollback.Json.toStatus -eq 'visible') 'Rollback nao foi aplicado com sucesso.'

Write-Host "9) Worker status e alerts internos"
Invoke-TestRequest -Method 'GET' -Path '/api/admin/content/jobs/worker-status' -Token $adminToken -ExpectedStatus @(200) | Out-Null
Invoke-TestRequest -Method 'GET' -Path '/api/admin/alerts/internal' -Token $adminToken -ExpectedStatus @(200) | Out-Null

Write-Host ""
Write-Host "MODERATION PRE-RELEASE SMOKE PASS (O1-08 fase backend)." -ForegroundColor Green
