$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$python = Get-Command python -ErrorAction SilentlyContinue
if ($python) {
    & python .\run.py @args
    exit $LASTEXITCODE
}

$py = Get-Command py -ErrorAction SilentlyContinue
if ($py) {
    & py -3 .\run.py @args
    exit $LASTEXITCODE
}

Write-Error "Python 3.11 or newer was not found on PATH."
