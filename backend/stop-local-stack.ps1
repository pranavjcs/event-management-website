$ErrorActionPreference = "SilentlyContinue"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$stateDir = Join-Path $workspaceRoot ".runtime"
$mysqlPidFile = Join-Path $stateDir "mysql.pid"
$backendPidFile = Join-Path $stateDir "backend.pid"

function Stop-ByPidFile($path, $label) {
  if (-not (Test-Path $path)) {
    Write-Output "$label PID file not found"
    return
  }

  $pid = Get-Content $path | Select-Object -First 1
  if (-not $pid) {
    Write-Output "$label PID file empty"
    Remove-Item $path -Force
    return
  }

  $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
  if ($proc) {
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Write-Output "$label stopped (PID $pid)"
  } else {
    Write-Output "$label process not running (PID $pid)"
  }

  Remove-Item $path -Force -ErrorAction SilentlyContinue
}

Stop-ByPidFile $backendPidFile "Backend"
Stop-ByPidFile $mysqlPidFile "MySQL"

Write-Output "STACK_STOPPED"
