param([switch]$BootstrapOnly)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$server = Join-Path $projectRoot "launcher\server.cjs"
$logDir = Join-Path $projectRoot "logs"
$startupLog = Join-Path $logDir "launcher-startup.log"
$runtimeDir = Join-Path $projectRoot ".runtime"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-StartupLog([string]$message) {
  Add-Content -Path $startupLog -Value ("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message)
}

function Test-TcpPort([int]$port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $task = $client.ConnectAsync("127.0.0.1", $port)
    if (-not $task.Wait(400)) { return $false }
    return $client.Connected
  } catch { return $false }
  finally { $client.Dispose() }
}

function Get-NodeMajor([string]$nodePath) {
  try {
    $version = & $nodePath --version 2>$null
    if ($version -match '^v(\d+)\.') { return [int]$Matches[1] }
  } catch {}
  return 0
}

function Install-PortableNode {
  $nodeRoot = Join-Path $runtimeDir "node"
  $nodePath = Join-Path $nodeRoot "node.exe"
  if ((Test-Path -LiteralPath $nodePath) -and (Get-NodeMajor $nodePath) -ge 20) { return $nodePath }

  Write-Host "Preparing the bundled Node.js runtime for first use..."
  Write-StartupLog "Downloading the latest Node.js 22 runtime."
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $checksums = Invoke-RestMethod -Uri "https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt"
  $match = [regex]::Match([string]$checksums, '(?m)^([a-f0-9]{64})\s+(node-v[^\s]+-win-x64\.zip)$')
  if (-not $match.Success) { throw "Could not resolve the latest Node.js 22 Windows package." }
  $expectedHash = $match.Groups[1].Value.ToUpperInvariant()
  $archiveName = $match.Groups[2].Value
  $archivePath = Join-Path $runtimeDir $archiveName
  $extractPath = Join-Path $runtimeDir "node-extract"
  New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
  Invoke-WebRequest -UseBasicParsing -Uri ("https://nodejs.org/dist/latest-v22.x/{0}" -f $archiveName) -OutFile $archivePath
  $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath).Hash
  if ($actualHash -ne $expectedHash) { throw "The downloaded Node.js package checksum did not match." }
  if (Test-Path -LiteralPath $extractPath) { Remove-Item -LiteralPath $extractPath -Recurse -Force }
  Expand-Archive -LiteralPath $archivePath -DestinationPath $extractPath -Force
  $extractedNode = Get-ChildItem -LiteralPath $extractPath -Directory | Select-Object -First 1
  if (-not $extractedNode) { throw "The downloaded Node.js package could not be extracted." }
  if (Test-Path -LiteralPath $nodeRoot) { Remove-Item -LiteralPath $nodeRoot -Recurse -Force }
  Move-Item -LiteralPath $extractedNode.FullName -Destination $nodeRoot
  Remove-Item -LiteralPath $archivePath -Force
  Remove-Item -LiteralPath $extractPath -Recurse -Force
  return $nodePath
}

function Resolve-Node {
  $localNode = Join-Path $runtimeDir "node\node.exe"
  if ((Test-Path -LiteralPath $localNode) -and (Get-NodeMajor $localNode) -ge 20) { return $localNode }
  $systemNode = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($systemNode) {
    $candidate = if ($systemNode.Source) { $systemNode.Source } else { $systemNode.Path }
    $candidateNpm = Join-Path (Split-Path -Parent $candidate) "npm.cmd"
    if ((Get-NodeMajor $candidate) -ge 20 -and (Test-Path -LiteralPath $candidateNpm)) { return $candidate }
  }
  return Install-PortableNode
}

function Install-Dependencies([string]$nodePath) {
  $npmPath = Join-Path (Split-Path -Parent $nodePath) "npm.cmd"
  if (-not (Test-Path -LiteralPath $npmPath)) {
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($npmCommand) { $npmPath = $npmCommand.Source }
  }
  if (-not (Test-Path -LiteralPath $npmPath)) { throw "npm was not found next to Node.js." }

  $lockPath = Join-Path $projectRoot "package-lock.json"
  $statePath = Join-Path $runtimeDir "package-lock.sha256"
  $nextBin = Join-Path $projectRoot "node_modules\next\dist\bin\next"
  $currentHash = if (Test-Path -LiteralPath $lockPath) { (Get-FileHash -Algorithm SHA256 -LiteralPath $lockPath).Hash } else { "no-lock" }
  $savedHash = if (Test-Path -LiteralPath $statePath) { (Get-Content -LiteralPath $statePath -Raw).Trim() } else { "" }
  if ((Test-Path -LiteralPath $nextBin) -and $savedHash -eq $currentHash) { return }

  Write-Host "Installing DreamHouse dependencies. The first start can take several minutes..."
  Write-StartupLog "Installing npm dependencies."
  New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
  $previousPath = $env:Path
  try {
    $env:Path = "$(Split-Path -Parent $nodePath);$previousPath"
    if (Test-Path -LiteralPath $lockPath) {
      & $npmPath ci --no-audit --no-fund
    } else {
      & $npmPath install --no-audit --no-fund
    }
    if ($LASTEXITCODE -ne 0) { throw "npm dependency installation failed with exit code $LASTEXITCODE." }
    Set-Content -LiteralPath $statePath -Value $currentHash -Encoding ascii
  } finally {
    $env:Path = $previousPath
  }
}

try {
  if (-not (Test-Path -LiteralPath $server)) { throw "Launcher server file was not found: $server" }
  if (Test-TcpPort 3210) {
    try {
      Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:3210/api/start" -Method Post -ContentType "application/json" -Body "{}" -TimeoutSec 8 | Out-Null
      Write-StartupLog "Launcher already running; requested DreamHouse start."
    } catch {
      Write-StartupLog "Launcher is reachable but app start request failed: $($_.Exception.Message)"
    }
    Write-StartupLog "Opening http://127.0.0.1:3210."
    Start-Process "http://127.0.0.1:3210"
    exit 0
  }

  $envFile = Join-Path $projectRoot ".env.local"
  $envTemplate = Join-Path $projectRoot ".env.example"
  if (-not (Test-Path -LiteralPath $envFile)) {
    if (-not (Test-Path -LiteralPath $envTemplate)) { throw ".env.example was not found." }
    Copy-Item -LiteralPath $envTemplate -Destination $envFile
    Write-StartupLog "Created .env.local from .env.example."
  }
  $nodePath = Resolve-Node
  Install-Dependencies $nodePath
  if ($BootstrapOnly) {
    Write-StartupLog "Bootstrap-only verification completed."
    Write-Host "DreamHouse bootstrap completed successfully."
    exit 0
  }
  $stdout = Join-Path $logDir "launcher.log"
  $stderr = Join-Path $logDir "launcher-error.log"
  $env:DREAMHOUSE_LAUNCHER_AUTO_START = "1"
  $process = Start-Process -FilePath $nodePath -ArgumentList @($server) -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
  Write-StartupLog "Started launcher PID $($process.Id) with Node $nodePath."

  $deadline = (Get-Date).AddSeconds(15)
  while ((Get-Date) -lt $deadline) {
    if (Test-TcpPort 3210) {
      Start-Process "http://127.0.0.1:3210"
      Write-StartupLog "Launcher ready on http://127.0.0.1:3210."
      exit 0
    }
    Start-Sleep -Milliseconds 250
  }
  $tail = "no stderr output"
  if (Test-Path -LiteralPath $stderr) { $tail = (Get-Content -LiteralPath $stderr -Tail 8 -ErrorAction SilentlyContinue) -join " | " }
  throw "Launcher port 3210 did not become ready within 15 seconds. $tail"
} catch {
  Write-StartupLog "Startup failed: $($_.Exception.Message)"
  throw
}
