$ErrorActionPreference = 'Continue'

Set-Location -LiteralPath $PSScriptRoot

function Stop-WithMessage([string]$Message) {
  Write-Host ""
  Write-Host $Message -ForegroundColor Red
  Read-Host "Presiona Enter para cerrar"
  exit 1
}

# Node es obligatorio.
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Stop-WithMessage "No se encontro Node.js. Instalalo desde https://nodejs.org y vuelve a intentar."
}

# Elegir gestor de paquetes disponible.
$pm = $null
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
  $pm = 'pnpm'
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
  $pm = 'npm'
} else {
  Stop-WithMessage "No se encontro pnpm ni npm."
}

# Instalar dependencias la primera vez.
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules'))) {
  Write-Host "Instalando dependencias por primera vez..." -ForegroundColor Yellow
  & $pm install
  if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "Fallo la instalacion de dependencias."
  }
}

Write-Host ""
Write-Host "Iniciando Talonario... el navegador se abrira solo." -ForegroundColor Green
Write-Host "Cierra esta ventana para detener el programa." -ForegroundColor DarkGray
Write-Host ""

& $pm run start
$code = $LASTEXITCODE

if ($code -ne 0) {
  Write-Host ""
  Write-Host "El servidor termino con codigo $code." -ForegroundColor Red
  Read-Host "Presiona Enter para cerrar"
}

exit $code
