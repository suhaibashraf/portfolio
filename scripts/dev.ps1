# Uses a normal Node.js installation, or the portable runtime prepared locally.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $portableNode = Get-ChildItem -LiteralPath (Join-Path $projectRoot '.tools') -Directory -Filter 'node-*-win-x64' -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | Select-Object -First 1
    if (-not $portableNode) { throw 'Install Node.js 24 LTS, then run npm ci and npm run dev.' }
    $env:PATH = $portableNode.FullName + ';' + $env:PATH
}
Push-Location $projectRoot
try {
    if (-not (Test-Path -LiteralPath 'node_modules/astro')) {
        throw 'Dependencies are missing. Run npm ci before starting the site.'
    }
    & node scripts/dev.mjs @args
} finally {
    Pop-Location
}
