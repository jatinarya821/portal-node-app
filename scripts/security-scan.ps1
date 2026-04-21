$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$repoRoot = (git rev-parse --show-toplevel).Trim()
Set-Location $repoRoot
$trackedEnv = git ls-files -- .env .env.*
if ($trackedEnv) { Write-Host "Blocked: tracked .env files." -ForegroundColor Red; exit 1 }
$patterns = @(
  "(?i)\bMONGODB_URI\b\s*[=:]\s*[''\""]?mongodb(?:\+srv)?:\/\/[^:\s\/@]+:(?!REPLACE_WITH_STRONG_PASSWORD|CHANGE_ME|YOUR_PASSWORD)[^@\s]+@",
  "-----BEGIN (?:RSA|EC|OPENSSH|DSA|PRIVATE) KEY-----"
)
foreach ($pattern in $patterns) {
  $output = & git grep -nEIP -- "$pattern" -- . ":(exclude).env.example" ":(exclude)README.md" ":(exclude)docs/**" 2>$null
  if ($LASTEXITCODE -eq 0 -and $output) {
    Write-Host "Blocked: potential secret leak: $output" -ForegroundColor Red
    exit 1
  }
}
Write-Host "Security scan passed." -ForegroundColor Green
exit 0
