$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
$target = Join-Path $projectRoot 'Iniciar Talonario.cmd'
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'Talonario.lnk'

if (-not (Test-Path -LiteralPath $target)) {
  Write-Host "No se encontro: $target" -ForegroundColor Red
  Read-Host "Presiona Enter para cerrar"
  exit 1
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $target
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = 'Abrir Talonario'
$shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,1"
$shortcut.Save()

Write-Host "Acceso directo creado en el Escritorio: Talonario" -ForegroundColor Green
Read-Host "Presiona Enter para cerrar"
