param(
  [string]$BaseUrl = 'http://localhost:5000',
  [switch]$IncludeReleaseE2E
)

$ErrorActionPreference = 'Stop'

function Invoke-Step {
  param([string]$Title, [scriptblock]$Action)
  Write-Host ""
  Write-Host "==> $Title" -ForegroundColor Cyan
  & $Action
}

function Assert-ZeroDevTokensInSrc {
  $matches = & rg -n "dev-" src -S
  if ($LASTEXITCODE -eq 1) {
    Write-Host "OK: nenhum token dev-* encontrado em src/"
    return
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Falha a pesquisar dev-* no src/."
  }

  throw "Encontrados tokens dev-* no src/:`n$matches"
}

function Print-TodoSummary {
  $matches = & rg -n "TODO|FIXME" src -S
  if ($LASTEXITCODE -eq 1) {
    Write-Host "TODO/FIXME em src/: 0"
    return
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Falha a pesquisar TODO/FIXME no src/."
  }

  $lines = @($matches -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  Write-Host "TODO/FIXME em src/: $($lines.Count)"
}

Invoke-Step -Title "Typecheck" -Action { npm run typecheck }
Invoke-Step -Title "Build" -Action { npm run build }
Invoke-Step -Title "OpenAPI contract" -Action { npm run contract:openapi }
Invoke-Step -Title "Mock/dev token audit" -Action { Assert-ZeroDevTokensInSrc }
Invoke-Step -Title "TODO/FIXME summary" -Action { Print-TodoSummary }

if ($IncludeReleaseE2E) {
  Invoke-Step -Title "Release E2E mandatory flows" -Action {
    powershell -ExecutionPolicy Bypass -File scripts/release-e2e-required-flows.ps1 -BaseUrl $BaseUrl
  }
}

Write-Host ""
Write-Host "O3 FINAL AUDIT PASS (backend)." -ForegroundColor Green
