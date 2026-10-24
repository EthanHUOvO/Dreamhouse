$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
& (Join-Path $projectRoot "DreamHouseLauncher.ps1")
exit $LASTEXITCODE
