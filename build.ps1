# KOJO Guide — сборка единого файла для рассылки (почта/мессенджер)
# Использование:  powershell -ExecutionPolicy Bypass -File build.ps1
# Результат: dist/kojo-guide.html — один самодостаточный файл

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Path $dist -Force | Out-Null

function Read-Utf8([string]$path) {
  return [System.IO.File]::ReadAllText((Join-Path $root $path), (New-Object System.Text.UTF8Encoding($false)))
}

$html = Read-Utf8 'index.html'
$css  = Read-Utf8 'css\styles.css'
$data = Read-Utf8 'js\data.js'
$accounts = Read-Utf8 'js\accounts.js'
$state = Read-Utf8 'js\state.js'
$sync = Read-Utf8 'js\sync.js'
$app  = Read-Utf8 'js\app.js'
$favicon = Read-Utf8 'icons\favicon.svg'

$html = $html -replace '<link rel="stylesheet" href="css/styles.css(\?v=\d+)?" />', "<style>`n$css`n</style>"
$html = $html -replace '<script src="js/data.js(\?v=\d+)?"></script>', "<script>`n$data`n</script>"
$html = $html -replace '<script src="js/accounts.js(\?v=\d+)?"></script>', "<script>`n$accounts`n</script>"
$html = $html -replace '<script src="js/state.js(\?v=\d+)?"></script>', "<script>`n$state`n</script>"
$html = $html -replace '<script src="js/sync.js(\?v=\d+)?"></script>', "<script>`n$sync`n</script>"
$html = $html -replace '<script src="js/app.js(\?v=\d+)?"></script>', "<script>`n$app`n</script>"
$html = $html.Replace('<link rel="manifest" href="manifest.webmanifest" />', '<link rel="manifest" href="data:application/json,{&quot;name&quot;:&quot;KOJO Guide&quot;,&quot;short_name&quot;:&quot;KOJO Guide&quot;,&quot;display&quot;:&quot;standalone&quot;}" />')
$html = $html.Replace('<link rel="icon" href="icons/favicon.svg" type="image/svg+xml" />', '<link rel="icon" href="data:image/svg+xml,' + [System.Uri]::EscapeDataString($favicon) + '" type="image/svg+xml" />')
$html = $html.Replace('<link rel="apple-touch-icon" href="icons/icon-192.png" />', '')

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$outPath = Join-Path $dist 'kojo-guide.html'
[System.IO.File]::WriteAllText($outPath, $html, $utf8NoBom)

$size = (Get-Item -LiteralPath $outPath).Length
Write-Host "OK: $outPath ($size bytes)"
