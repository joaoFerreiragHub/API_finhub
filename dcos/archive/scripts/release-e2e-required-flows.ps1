param(
  [string]$BaseUrl = 'http://localhost:5000',
  [string]$CreatorEmail = '',
  [string]$CreatorPassword = '',
  [string]$AdminEmail = '',
  [string]$AdminPassword = '',
  [string]$CaptchaToken = ''
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

function Load-EnvDefaults {
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
      $jsonBody = $Body | ConvertTo-Json -Compress -Depth 8
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

function Build-LegalAcceptancePayload {
  return @{
    termsAccepted = $true
    privacyAccepted = $true
    financialDisclaimerAccepted = $true
    version = 'v1'
  }
}

function Build-CookieConsentPayload {
  return @{
    analytics = $true
    marketing = $false
    preferences = $true
    version = 'v1'
  }
}

function Build-RegisterPayload {
  param(
    [string]$Email,
    [string]$Password,
    [string]$Name,
    [string]$Username
  )

  $payload = @{
    email = $Email
    password = $Password
    name = $Name
    username = $Username
    role = 'free'
    legalAcceptance = Build-LegalAcceptancePayload
    cookieConsent = Build-CookieConsentPayload
  }

  if (-not [string]::IsNullOrWhiteSpace($CaptchaToken)) {
    $payload.captchaToken = $CaptchaToken
  }

  return $payload
}

function Build-LoginPayload {
  param(
    [string]$Email,
    [string]$Password
  )

  $payload = @{
    email = $Email
    password = $Password
  }

  if (-not [string]::IsNullOrWhiteSpace($CaptchaToken)) {
    $payload.captchaToken = $CaptchaToken
  }

  return $payload
}

Load-EnvDefaults

if ([string]::IsNullOrWhiteSpace($CreatorEmail)) { $CreatorEmail = $env:RELEASE_E2E_CREATOR_EMAIL }
if ([string]::IsNullOrWhiteSpace($CreatorPassword)) { $CreatorPassword = $env:RELEASE_E2E_CREATOR_PASSWORD }
if ([string]::IsNullOrWhiteSpace($AdminEmail)) { $AdminEmail = $env:RELEASE_E2E_ADMIN_EMAIL }
if ([string]::IsNullOrWhiteSpace($AdminPassword)) { $AdminPassword = $env:RELEASE_E2E_ADMIN_PASSWORD }
if ([string]::IsNullOrWhiteSpace($CaptchaToken)) { $CaptchaToken = $env:RELEASE_E2E_CAPTCHA_TOKEN }

Assert-Condition (-not [string]::IsNullOrWhiteSpace($CreatorEmail)) 'RELEASE_E2E_CREATOR_EMAIL em falta.'
Assert-Condition (-not [string]::IsNullOrWhiteSpace($CreatorPassword)) 'RELEASE_E2E_CREATOR_PASSWORD em falta.'
Assert-Condition (-not [string]::IsNullOrWhiteSpace($AdminEmail)) 'RELEASE_E2E_ADMIN_EMAIL em falta.'
Assert-Condition (-not [string]::IsNullOrWhiteSpace($AdminPassword)) 'RELEASE_E2E_ADMIN_PASSWORD em falta.'

Write-Host '1) Health check'
Invoke-TestRequest -Method 'GET' -Path '/healthz' -ExpectedStatus @(200) | Out-Null

Write-Host '2) Registo de consumidor release'
$suffix = [Guid]::NewGuid().ToString('N').Substring(0, 10)
$consumerEmail = "release_consumer_$suffix@finhub.test"
$consumerPassword = 'Release123!'
$consumerUsername = "release_consumer_$suffix"

$registerResponse = Invoke-TestRequest -Method 'POST' -Path '/api/auth/register' -Body (
  Build-RegisterPayload -Email $consumerEmail -Password $consumerPassword -Name "Release Consumer $suffix" -Username $consumerUsername
) -ExpectedStatus @(201)

$consumerId = [string]$registerResponse.Json.user.id
Assert-Condition (-not [string]::IsNullOrWhiteSpace($consumerId)) 'Registo nao devolveu user.id.'

Write-Host '3) Login consumidor + creator + admin'
$consumerLogin = Invoke-TestRequest -Method 'POST' -Path '/api/auth/login' -Body (
  Build-LoginPayload -Email $consumerEmail -Password $consumerPassword
) -ExpectedStatus @(200)

$creatorLogin = Invoke-TestRequest -Method 'POST' -Path '/api/auth/login' -Body (
  Build-LoginPayload -Email $CreatorEmail -Password $CreatorPassword
) -ExpectedStatus @(200)

$adminLogin = Invoke-TestRequest -Method 'POST' -Path '/api/auth/login' -Body (
  Build-LoginPayload -Email $AdminEmail -Password $AdminPassword
) -ExpectedStatus @(200)

$consumerToken = [string]$consumerLogin.Json.tokens.accessToken
$creatorToken = [string]$creatorLogin.Json.tokens.accessToken
$adminToken = [string]$adminLogin.Json.tokens.accessToken

Assert-Condition (Test-IsJwtLike $consumerToken) 'Token consumidor invalido: esperado JWT real.'
Assert-Condition (Test-IsJwtLike $creatorToken) 'Token creator invalido: esperado JWT real.'
Assert-Condition (Test-IsJwtLike $adminToken) 'Token admin invalido: esperado JWT real.'

Write-Host '4) Criador cria draft + publica artigo'
$createArticle = Invoke-TestRequest -Method 'POST' -Path '/api/articles' -Token $creatorToken -Body @{
  title = "Release article $suffix"
  description = 'Fluxo obrigatorio de release O3-07'
  content = '<p>Conteudo de validacao release O3-07</p>'
  category = 'finance'
  tags = @('release', 'o3-07')
  status = 'draft'
} -ExpectedStatus @(201)

$articleId = Get-JsonId $createArticle.Json
$articleSlug = [string]$createArticle.Json.slug
Assert-Condition (-not [string]::IsNullOrWhiteSpace($articleId)) 'Criacao de artigo nao devolveu id.'
Assert-Condition (-not [string]::IsNullOrWhiteSpace($articleSlug)) 'Criacao de artigo nao devolveu slug.'

Invoke-TestRequest -Method 'PATCH' -Path "/api/articles/$articleId/publish" -Token $creatorToken -ExpectedStatus @(200) | Out-Null

Write-Host '5) Consumidor consome conteudo publicado'
$articlePublic = Invoke-TestRequest -Method 'GET' -Path "/api/articles/$articleSlug" -ExpectedStatus @(200)
Assert-Condition ($articlePublic.Json.status -eq 'published') 'Artigo nao aparece como published no endpoint publico.'

Invoke-TestRequest -Method 'POST' -Path '/api/favorites' -Token $consumerToken -Body @{
  targetType = 'article'
  targetId = $articleId
} -ExpectedStatus @(200, 201) | Out-Null

Invoke-TestRequest -Method 'POST' -Path '/api/reports/content' -Token $consumerToken -Body @{
  contentType = 'article'
  contentId = $articleId
  reason = 'spam'
  note = 'Release flow O3-07'
} -ExpectedStatus @(200, 201) | Out-Null

Write-Host '6) Admin modera com hide-fast + rollback'
Invoke-TestRequest -Method 'POST' -Path "/api/admin/content/article/$articleId/hide-fast" -Token $adminToken -Body @{
  reason = 'Release O3-07: moderacao inicial'
  note = 'Validacao de fluxo obrigatorio'
} -ExpectedStatus @(200) | Out-Null

$history = Invoke-TestRequest -Method 'GET' -Path "/api/admin/content/article/$articleId/history?limit=10" -Token $adminToken -ExpectedStatus @(200)
$historyItems = @($history.Json.items)
Assert-Condition ($historyItems.Count -ge 1) 'Historico de moderacao vazio apos hide-fast.'

$eventId = Get-JsonId $historyItems[0]
Assert-Condition (-not [string]::IsNullOrWhiteSpace($eventId)) 'Nao foi possivel resolver eventId de moderacao.'

$rollbackReview = Invoke-TestRequest -Method 'GET' -Path "/api/admin/content/article/$articleId/rollback-review?eventId=$eventId" -Token $adminToken -ExpectedStatus @(200)
Assert-Condition ($rollbackReview.Json.rollback.canRollback -eq $true) 'Rollback review devolveu canRollback=false.'

$rollback = Invoke-TestRequest -Method 'POST' -Path "/api/admin/content/article/$articleId/rollback" -Token $adminToken -Body @{
  eventId = $eventId
  reason = 'Release O3-07: rollback controlado'
  note = 'Fluxo obrigatorio de release validado'
  confirm = $true
  markFalsePositive = $true
} -ExpectedStatus @(200)

Assert-Condition ($rollback.Json.rollbacked -eq $true -or $rollback.Json.toStatus -eq 'visible') 'Rollback nao foi aplicado com sucesso.'

Write-Host ''
Write-Host 'RELEASE E2E PASS: fluxos obrigatorios de release validados.' -ForegroundColor Green
