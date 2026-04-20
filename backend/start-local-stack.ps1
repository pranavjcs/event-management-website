param(
  [int]$MySqlPort = 3306,
  [int]$BackendPort = 5000
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$mysqlRoot = "C:\Program Files\MySQL\MySQL Server 8.0"
$mysqldPath = Join-Path $mysqlRoot "bin\mysqld.exe"
$mysqlCliPath = Join-Path $mysqlRoot "bin\mysql.exe"
$mysqlBaseDir = $mysqlRoot
$mysqlDataDir = Join-Path $workspaceRoot "mysql-local\data"

$logDir = Join-Path $workspaceRoot "logs"
$mysqlOutLog = Join-Path $logDir "mysql-stdout.log"
$mysqlErrLog = Join-Path $logDir "mysql-stderr.log"
$backendOutLog = Join-Path $logDir "backend-stdout.log"
$backendErrLog = Join-Path $logDir "backend-stderr.log"
$stateDir = Join-Path $workspaceRoot ".runtime"
$mysqlPidFile = Join-Path $stateDir "mysql.pid"
$backendPidFile = Join-Path $stateDir "backend.pid"

function Ensure-Directory($path) {
  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
  }
}

function Is-PortOpen($port) {
  try {
    $tnc = Test-NetConnection -ComputerName "127.0.0.1" -Port $port -WarningAction SilentlyContinue
    return [bool]$tnc.TcpTestSucceeded
  } catch {
    return $false
  }
}

function Wait-ForPort($port, $seconds) {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $seconds) {
    if (Is-PortOpen $port) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

function Invoke-MySqlBestEffort([string]$sql) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & $mysqlCliPath --host=127.0.0.1 --port=$MySqlPort --user=root -e $sql 2>$null
    if ($LASTEXITCODE -eq 0) {
      return $true
    }

    & $mysqlCliPath --host=127.0.0.1 --port=$MySqlPort --user=root --password=root -e $sql 2>$null
    if ($LASTEXITCODE -eq 0) {
      return $true
    }

    return $false
  } finally {
    $ErrorActionPreference = $prev
  }
}

Ensure-Directory $logDir
Ensure-Directory $stateDir
Ensure-Directory (Split-Path -Parent $mysqlDataDir)

if (-not (Test-Path $mysqldPath)) {
  throw "mysqld.exe not found at $mysqldPath"
}
if (-not (Test-Path $mysqlCliPath)) {
  throw "mysql.exe not found at $mysqlCliPath"
}

# Initialize user-writable MySQL datadir once.
if (-not (Test-Path (Join-Path $mysqlDataDir "mysql"))) {
  Ensure-Directory $mysqlDataDir
  & $mysqldPath --initialize-insecure --basedir="$mysqlBaseDir" --datadir="$mysqlDataDir" --console
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to initialize local MySQL data directory"
  }
}

# Start MySQL only if port is not already open.
if (-not (Is-PortOpen $MySqlPort)) {
  if (Test-Path $mysqlOutLog) { Remove-Item $mysqlOutLog -Force }
  if (Test-Path $mysqlErrLog) { Remove-Item $mysqlErrLog -Force }

  $mysqlProc = Start-Process -FilePath $mysqldPath -ArgumentList @(
    "--basedir=$mysqlBaseDir",
    "--datadir=$mysqlDataDir",
    "--port=$MySqlPort",
    "--console"
  ) -RedirectStandardOutput $mysqlOutLog -RedirectStandardError $mysqlErrLog -PassThru

  Set-Content -Path $mysqlPidFile -Value $mysqlProc.Id

  if (-not (Wait-ForPort $MySqlPort 30)) {
    throw "MySQL did not start on port $MySqlPort. Check $mysqlErrLog"
  }
}

# Ensure root password and database exist.
$setPwdSql = "ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';"
$createDbSql = "CREATE DATABASE IF NOT EXISTS event_data;"

if (-not (Invoke-MySqlBestEffort "SELECT 1;")) {
  throw "Cannot connect to MySQL on 127.0.0.1:$MySqlPort"
}

Invoke-MySqlBestEffort $setPwdSql | Out-Null
if (-not (Invoke-MySqlBestEffort $createDbSql)) {
  throw "Failed to create or verify database event_data"
}

# Start backend.
if (Test-Path $backendOutLog) { Remove-Item $backendOutLog -Force }
if (Test-Path $backendErrLog) { Remove-Item $backendErrLog -Force }

$backendProc = Start-Process -FilePath "npm.cmd" -ArgumentList "start" -WorkingDirectory $PSScriptRoot -RedirectStandardOutput $backendOutLog -RedirectStandardError $backendErrLog -PassThru
Set-Content -Path $backendPidFile -Value $backendProc.Id

$healthOk = $false
$sw = [System.Diagnostics.Stopwatch]::StartNew()
while ($sw.Elapsed.TotalSeconds -lt 45) {
  try {
    $resp = Invoke-RestMethod -Method Get -Uri "http://localhost:$BackendPort/api/health" -TimeoutSec 3 -ErrorAction Stop
    if ($resp.success -eq $true) {
      $healthOk = $true
      break
    }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

if (-not $healthOk) {
  throw "Backend did not become healthy on port $BackendPort. Check $backendErrLog"
}

Write-Output "STACK_READY"
Write-Output "MySQL: 127.0.0.1:$MySqlPort"
Write-Output "Backend: http://localhost:$BackendPort"
Write-Output "Frontend: http://localhost:$BackendPort/index.html"
Write-Output "MySQL PID file: $mysqlPidFile"
Write-Output "Backend PID file: $backendPidFile"
Write-Output "Logs: $logDir"
