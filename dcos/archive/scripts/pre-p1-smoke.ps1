param(
  [string]$BaseUrl = 'http://localhost:5000'
)

$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')

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

function Get-CollectionCount {
  param($Value)
  if ($null -eq $Value) { return 0 }
  if ($Value -is [System.Array]) { return $Value.Count }
  if ($Value.PSObject.Properties.Name -contains 'Count') { return [int]$Value.Count }
  return 1
}

function Invoke-TestRequest {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [string]$Token = $null,
    [int[]]$ExpectedStatus = @(200)
  )

  $tmpOut  = New-TemporaryFile
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
      # Write JSON to a temp file to avoid shell quoting/encoding issues on Windows PS 5.1
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
      Raw    = $raw
      Json   = $json
    }
  }
  finally {
    Remove-Item $tmpOut.FullName  -Force -ErrorAction SilentlyContinue
    if ($null -ne $tmpBody) { Remove-Item $tmpBody.FullName -Force -ErrorAction SilentlyContinue }
  }
}

function Get-UnreadCount {
  param([string]$Token)
  $res = Invoke-TestRequest -Method 'GET' -Path '/api/notifications/count' -Token $Token -ExpectedStatus @(200)
  return [int]$res.Json.unreadCount
}

function Wait-UnreadAtLeast {
  param(
    [string]$Token,
    [int]$Expected,
    [string]$Label,
    [int]$TimeoutSec = 20
  )

  $start = Get-Date
  while ((New-TimeSpan -Start $start -End (Get-Date)).TotalSeconds -lt $TimeoutSec) {
    $current = Get-UnreadCount -Token $Token
    if ($current -ge $Expected) { return $current }
    Start-Sleep -Milliseconds 700
  }

  throw "Timeout no check de notificacoes: $Label (esperado >= $Expected)"
}

function Assert-UnreadStable {
  param(
    [string]$Token,
    [int]$Expected,
    [string]$Label,
    [int]$TimeoutSec = 6
  )

  $start = Get-Date
  while ((New-TimeSpan -Start $start -End (Get-Date)).TotalSeconds -lt $TimeoutSec) {
    $current = Get-UnreadCount -Token $Token
    if ($current -gt $Expected) {
      throw "Unread aumentou inesperadamente em $Label (esperado <= $Expected, atual: $current)"
    }
    Start-Sleep -Milliseconds 700
  }

  return $Expected
}

Write-Host "1) Health/ready/metrics/openapi"
Invoke-TestRequest -Method 'GET' -Path '/healthz' -ExpectedStatus @(200) | Out-Null
Invoke-TestRequest -Method 'GET' -Path '/readyz' -ExpectedStatus @(200) | Out-Null
$metricsText = Invoke-TestRequest -Method 'GET' -Path '/metrics' -ExpectedStatus @(200)
Assert-Condition ($metricsText.Raw -match 'finhub_http_requests_total') "Metricas Prometheus em falta."
$metricsJson = Invoke-TestRequest -Method 'GET' -Path '/metrics.json' -ExpectedStatus @(200)
Assert-Condition ([int]$metricsJson.Json.totalRequests -ge 0) "metrics.json invalido."
$openapi = Invoke-TestRequest -Method 'GET' -Path '/openapi/openapi.json' -ExpectedStatus @(200)
Assert-Condition ($openapi.Json.openapi -like '3.*') "OpenAPI invalido."

Write-Host "2) Seguranca basica sem token"
Invoke-TestRequest -Method 'GET' -Path '/api/notifications' -ExpectedStatus @(401) | Out-Null

Write-Host "3) Criar utilizadores de teste"
$suffix = [Guid]::NewGuid().ToString('N').Substring(0, 8)

$creatorReg = Invoke-TestRequest -Method 'POST' -Path '/api/auth/register' -Body @{
  email = "creator_$suffix@test.com"
  password = 'Test1234!'
  name = "Creator $suffix"
  username = "creator_$suffix"
  role = 'creator'
} -ExpectedStatus @(201)

$followerReg = Invoke-TestRequest -Method 'POST' -Path '/api/auth/register' -Body @{
  email = "follower_$suffix@test.com"
  password = 'Test1234!'
  name = "Follower $suffix"
  username = "follower_$suffix"
  role = 'free'
} -ExpectedStatus @(201)

$freeReg = Invoke-TestRequest -Method 'POST' -Path '/api/auth/register' -Body @{
  email = "free_$suffix@test.com"
  password = 'Test1234!'
  name = "Free $suffix"
  username = "free_$suffix"
  role = 'free'
} -ExpectedStatus @(201)

$creatorToken = [string]$creatorReg.Json.tokens.accessToken
$followerToken = [string]$followerReg.Json.tokens.accessToken
$freeToken = [string]$freeReg.Json.tokens.accessToken

$creatorId = [string]$creatorReg.Json.user.id
$followerId = [string]$followerReg.Json.user.id

Assert-Condition (-not [string]::IsNullOrWhiteSpace($creatorToken)) "creator token vazio"
Assert-Condition (-not [string]::IsNullOrWhiteSpace($followerToken)) "follower token vazio"
Assert-Condition (-not [string]::IsNullOrWhiteSpace($freeToken)) "free token vazio"
Assert-Condition (-not [string]::IsNullOrWhiteSpace($creatorId)) "creator id vazio"
Assert-Condition (-not [string]::IsNullOrWhiteSpace($followerId)) "follower id vazio"

Write-Host "4) Auth /me"
Invoke-TestRequest -Method 'GET' -Path '/api/auth/me' -Token $creatorToken -ExpectedStatus @(200) | Out-Null
Invoke-TestRequest -Method 'GET' -Path '/api/auth/me' -Token $followerToken -ExpectedStatus @(200) | Out-Null

Write-Host "5) Guard de role (free nao pode criar artigo)"
Invoke-TestRequest -Method 'POST' -Path '/api/articles' -Token $freeToken -Body @{
  title = "Artigo free $suffix"
  description = 'desc'
  content = 'conteudo'
  category = 'finance'
} -ExpectedStatus @(403) | Out-Null

Write-Host "6) Criar artigo principal (creator)"
$articleCreate = Invoke-TestRequest -Method 'POST' -Path '/api/articles' -Token $creatorToken -Body @{
  title = "Artigo principal $suffix"
  description = 'Descricao principal'
  content = 'Conteudo principal'
  category = 'finance'
  tags = @('pre-p1', 'social')
  status = 'published'
} -ExpectedStatus @(201)

$articleId = Get-JsonId $articleCreate.Json
Assert-Condition (-not [string]::IsNullOrWhiteSpace($articleId)) "articleId vazio"

Write-Host "7) Follow idempotente"
$follow1 = Invoke-TestRequest -Method 'POST' -Path "/api/follow/$creatorId" -Token $followerToken -ExpectedStatus @(201)
Assert-Condition ($follow1.Json.created -eq $true) "1o follow devia criar."

$follow2 = Invoke-TestRequest -Method 'POST' -Path "/api/follow/$creatorId" -Token $followerToken -ExpectedStatus @(200)
Assert-Condition ($follow2.Json.created -eq $false) "2o follow devia ser idempotente."

$checkFollow = Invoke-TestRequest -Method 'GET' -Path "/api/follow/check/$creatorId" -Token $followerToken -ExpectedStatus @(200)
Assert-Condition ($checkFollow.Json.isFollowing -eq $true) "isFollowing devia ser true."

$unfollow1 = Invoke-TestRequest -Method 'DELETE' -Path "/api/follow/$creatorId" -Token $followerToken -ExpectedStatus @(200)
Assert-Condition ($unfollow1.Json.removed -eq $true) "1o unfollow devia remover."

$unfollow2 = Invoke-TestRequest -Method 'DELETE' -Path "/api/follow/$creatorId" -Token $followerToken -ExpectedStatus @(200)
Assert-Condition ($unfollow2.Json.removed -eq $false) "2o unfollow devia ser idempotente."

Invoke-TestRequest -Method 'POST' -Path "/api/follow/$creatorId" -Token $followerToken -ExpectedStatus @(201) | Out-Null

Write-Host "8) Favorites idempotente"
$fav1 = Invoke-TestRequest -Method 'POST' -Path '/api/favorites' -Token $followerToken -Body @{
  targetType = 'article'
  targetId = $articleId
} -ExpectedStatus @(201)
Assert-Condition ($fav1.Json.created -eq $true) "1o favorite devia criar."

$fav2 = Invoke-TestRequest -Method 'POST' -Path '/api/favorites' -Token $followerToken -Body @{
  targetType = 'article'
  targetId = $articleId
} -ExpectedStatus @(200)
Assert-Condition ($fav2.Json.created -eq $false) "2o favorite devia ser idempotente."

$checkFav = Invoke-TestRequest -Method 'GET' -Path "/api/favorites/check?targetType=article&targetId=$articleId" -Token $followerToken -ExpectedStatus @(200)
Assert-Condition ($checkFav.Json.isFavorite -eq $true) "isFavorite devia ser true."

$rmFav1 = Invoke-TestRequest -Method 'DELETE' -Path '/api/favorites' -Token $followerToken -Body @{
  targetType = 'article'
  targetId = $articleId
} -ExpectedStatus @(200)
Assert-Condition ($rmFav1.Json.removed -eq $true) "1o remove favorite devia remover."

$rmFav2 = Invoke-TestRequest -Method 'DELETE' -Path '/api/favorites' -Token $followerToken -Body @{
  targetType = 'article'
  targetId = $articleId
} -ExpectedStatus @(200)
Assert-Condition ($rmFav2.Json.removed -eq $false) "2o remove favorite devia ser idempotente."

Write-Host "9) Ratings + Comments + Notificacoes (eventos)"
$creatorBase = Get-UnreadCount -Token $creatorToken

Invoke-TestRequest -Method 'POST' -Path '/api/ratings' -Token $followerToken -Body @{
  targetType = 'article'
  targetId = $articleId
  rating = 5
  review = 'Muito bom'
} -ExpectedStatus @(201) | Out-Null
Wait-UnreadAtLeast -Token $creatorToken -Expected ($creatorBase + 1) -Label 'rating' | Out-Null

Invoke-TestRequest -Method 'GET' -Path "/api/ratings/article/$articleId/stats" -ExpectedStatus @(200) | Out-Null
Invoke-TestRequest -Method 'GET' -Path "/api/ratings/article/$articleId" -ExpectedStatus @(200) | Out-Null

$followerComment = Invoke-TestRequest -Method 'POST' -Path '/api/comments' -Token $followerToken -Body @{
  targetType = 'article'
  targetId = $articleId
  content = 'Comentario do follower'
} -ExpectedStatus @(201)
$followerCommentId = Get-JsonId $followerComment.Json
Assert-Condition (-not [string]::IsNullOrWhiteSpace($followerCommentId)) "commentId follower vazio"
Wait-UnreadAtLeast -Token $creatorToken -Expected ($creatorBase + 2) -Label 'comment' | Out-Null

$creatorComment = Invoke-TestRequest -Method 'POST' -Path '/api/comments' -Token $creatorToken -Body @{
  targetType = 'article'
  targetId = $articleId
  content = 'Comentario do creator'
} -ExpectedStatus @(201)
$creatorCommentId = Get-JsonId $creatorComment.Json
Assert-Condition (-not [string]::IsNullOrWhiteSpace($creatorCommentId)) "commentId creator vazio"

Invoke-TestRequest -Method 'POST' -Path '/api/comments' -Token $followerToken -Body @{
  targetType = 'article'
  targetId = $articleId
  content = 'Reply ao creator'
  parentCommentId = $creatorCommentId
} -ExpectedStatus @(201) | Out-Null
Wait-UnreadAtLeast -Token $creatorToken -Expected ($creatorBase + 3) -Label 'reply' | Out-Null

Invoke-TestRequest -Method 'POST' -Path "/api/comments/$creatorCommentId/like" -Token $followerToken -ExpectedStatus @(200) | Out-Null
$countAfterLike = Wait-UnreadAtLeast -Token $creatorToken -Expected ($creatorBase + 4) -Label 'like'
Invoke-TestRequest -Method 'POST' -Path "/api/comments/$creatorCommentId/like" -Token $followerToken -ExpectedStatus @(200) | Out-Null
Start-Sleep -Milliseconds 1200
$countAfterUnlike = Get-UnreadCount -Token $creatorToken
Assert-Condition ($countAfterUnlike -eq $countAfterLike) "Unlike gerou notificacao indevida."

Invoke-TestRequest -Method 'GET' -Path "/api/comments/article/$articleId/tree" -ExpectedStatus @(200) | Out-Null

Write-Host "10) Endpoints de notificacao (read/read-all/delete)"
$creatorUnread = Invoke-TestRequest -Method 'GET' -Path '/api/notifications/unread' -Token $creatorToken -ExpectedStatus @(200)
$creatorList = Invoke-TestRequest -Method 'GET' -Path '/api/notifications' -Token $creatorToken -ExpectedStatus @(200)
$creatorNotifCount = Get-CollectionCount $creatorList.Json.notifications
Assert-Condition ($creatorNotifCount -gt 0) "Sem notificacoes para testar read."

$firstCreatorNotif = if ($creatorList.Json.notifications -is [System.Array]) {
  $creatorList.Json.notifications[0]
} else {
  $creatorList.Json.notifications
}
$firstCreatorNotifId = Get-JsonId $firstCreatorNotif
Assert-Condition (-not [string]::IsNullOrWhiteSpace($firstCreatorNotifId)) "notificationId vazio"

Invoke-TestRequest -Method 'PATCH' -Path "/api/notifications/$firstCreatorNotifId/read" -Token $creatorToken -ExpectedStatus @(200) | Out-Null
Invoke-TestRequest -Method 'PATCH' -Path '/api/notifications/read-all' -Token $creatorToken -ExpectedStatus @(200) | Out-Null
$creatorCountAfterReadAll = Get-UnreadCount -Token $creatorToken
Assert-Condition ($creatorCountAfterReadAll -eq 0) "Unread count devia ser 0 apos read-all."

Invoke-TestRequest -Method 'DELETE' -Path '/api/notifications/read' -Token $creatorToken -ExpectedStatus @(200) | Out-Null

Write-Host "11) Preferencias e subscriptions por creator"
$prefsBefore = Invoke-TestRequest -Method 'GET' -Path '/api/notifications/preferences' -Token $followerToken -ExpectedStatus @(200)
Assert-Condition ($prefsBefore.Json.notificationPreferences.content_published -in @($true, $false)) "preferences invalidas"

$prefsOff = Invoke-TestRequest -Method 'PATCH' -Path '/api/notifications/preferences' -Token $followerToken -Body @{
  content_published = $false
} -ExpectedStatus @(200)
Assert-Condition ($prefsOff.Json.notificationPreferences.content_published -eq $false) "nao desativou content_published"

$prefsOn = Invoke-TestRequest -Method 'PATCH' -Path '/api/notifications/preferences' -Token $followerToken -Body @{
  content_published = $true
} -ExpectedStatus @(200)
Assert-Condition ($prefsOn.Json.notificationPreferences.content_published -eq $true) "nao reativou content_published"

$subscriptionInitial = Invoke-TestRequest -Method 'GET' -Path "/api/notifications/subscriptions/$creatorId" -Token $followerToken -ExpectedStatus @(200)
Assert-Condition ($subscriptionInitial.Json.isFollowing -eq $true) "status subscription devia indicar isFollowing=true"
Assert-Condition ($subscriptionInitial.Json.isSubscribed -eq $true) "status subscription default devia estar ativo"

$subscriptionList = Invoke-TestRequest -Method 'GET' -Path '/api/notifications/subscriptions' -Token $followerToken -ExpectedStatus @(200)
Assert-Condition ((Get-CollectionCount $subscriptionList.Json.items) -ge 1) "lista de subscriptions devia conter pelo menos 1 item"

$followerBaseMuted = Get-UnreadCount -Token $followerToken
Invoke-TestRequest -Method 'DELETE' -Path "/api/notifications/subscriptions/$creatorId" -Token $followerToken -ExpectedStatus @(200) | Out-Null
$subscriptionMuted = Invoke-TestRequest -Method 'GET' -Path "/api/notifications/subscriptions/$creatorId" -Token $followerToken -ExpectedStatus @(200)
Assert-Condition ($subscriptionMuted.Json.isSubscribed -eq $false) "subscription devia ficar desativada"

$draftArticleMuted = Invoke-TestRequest -Method 'POST' -Path '/api/articles' -Token $creatorToken -Body @{
  title = "Artigo muted publish $suffix"
  description = 'Descricao muted'
  content = 'Conteudo muted'
  category = 'finance'
  tags = @('publish-event', 'muted')
  status = 'draft'
} -ExpectedStatus @(201)
$draftArticleMutedId = Get-JsonId $draftArticleMuted.Json
Assert-Condition (-not [string]::IsNullOrWhiteSpace($draftArticleMutedId)) "draftArticleMutedId vazio"

Invoke-TestRequest -Method 'PATCH' -Path "/api/articles/$draftArticleMutedId/publish" -Token $creatorToken -ExpectedStatus @(200) | Out-Null
Assert-UnreadStable -Token $followerToken -Expected $followerBaseMuted -Label 'content_published muted' | Out-Null

Invoke-TestRequest -Method 'PUT' -Path "/api/notifications/subscriptions/$creatorId" -Token $followerToken -ExpectedStatus @(200, 201) | Out-Null
$subscriptionEnabled = Invoke-TestRequest -Method 'GET' -Path "/api/notifications/subscriptions/$creatorId" -Token $followerToken -ExpectedStatus @(200)
Assert-Condition ($subscriptionEnabled.Json.isSubscribed -eq $true) "subscription devia ficar ativa"

Write-Host "12) Evento content_published para follower"
$followerBase = Get-UnreadCount -Token $followerToken

$draftArticle = Invoke-TestRequest -Method 'POST' -Path '/api/articles' -Token $creatorToken -Body @{
  title = "Artigo draft publish $suffix"
  description = 'Descricao draft'
  content = 'Conteudo draft'
  category = 'finance'
  tags = @('publish-event')
  status = 'draft'
} -ExpectedStatus @(201)
$draftArticleId = Get-JsonId $draftArticle.Json
Assert-Condition (-not [string]::IsNullOrWhiteSpace($draftArticleId)) "draftArticleId vazio"

Invoke-TestRequest -Method 'PATCH' -Path "/api/articles/$draftArticleId/publish" -Token $creatorToken -ExpectedStatus @(200) | Out-Null
Wait-UnreadAtLeast -Token $followerToken -Expected ($followerBase + 1) -Label 'content_published' | Out-Null

$followerNotifications = Invoke-TestRequest -Method 'GET' -Path '/api/notifications' -Token $followerToken -ExpectedStatus @(200)
$publishedNotifId = $null
$notifItems = if ($followerNotifications.Json.notifications -is [System.Array]) {
  $followerNotifications.Json.notifications
} else {
  @($followerNotifications.Json.notifications)
}
foreach ($n in $notifItems) {
  $targetValue = [string]$n.targetId
  if ($n.type -eq 'content_published' -and $targetValue -eq $draftArticleId) {
    $publishedNotifId = Get-JsonId $n
    break
  }
}
Assert-Condition (-not [string]::IsNullOrWhiteSpace($publishedNotifId)) "Nao encontrou notificacao content_published esperada."

Invoke-TestRequest -Method 'DELETE' -Path "/api/notifications/$publishedNotifId" -Token $followerToken -ExpectedStatus @(200) | Out-Null

Write-Host "13) Contrato legado removido"
Invoke-TestRequest -Method 'GET' -Path "/api/users/$creatorId/visibility" -ExpectedStatus @(404) | Out-Null

Write-Host ""
Write-Host "PRE-P1 PASS: suite completa validada com sucesso." -ForegroundColor Green
