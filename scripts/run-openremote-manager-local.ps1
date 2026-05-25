param(
    [int]$TeltonikaPort = 5027,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$managerRoot = Join-Path $repoRoot "openremote-manager"
$installDir = Join-Path $managerRoot "manager\build\install\manager"
$composeOverride = Join-Path $repoRoot "docker-compose.openremote-local.yml"
$yarnCjs = Join-Path $managerRoot ".yarn\releases\yarn-4.12.0.cjs"
$yarnShimDir = Join-Path $env:TEMP "openremote-yarn-shim"
$mdiSourceDir = Join-Path $managerRoot "ui\component\or-icon\dist\Material Design Icons"
$mdiInstallDir = Join-Path $installDir "web\shared\fonts\Material Design Icons"
$consoleAppConfigDir = Join-Path $installDir "web\consoleappconfig"

$jdkHome = "C:\Program Files\Java\jdk-21.0.10"
if (-not (Test-Path $jdkHome)) {
    $jdkHome = Get-ChildItem "C:\Program Files\Java" -Directory -Filter "jdk-21*" -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty FullName
}

if (-not $jdkHome -or -not (Test-Path $jdkHome)) {
    throw "JDK 21 was not found. Install JDK 21 or update this script's JAVA_HOME path."
}

if (-not (Test-Path $yarnCjs)) {
    throw "Vendored Yarn was not found: $yarnCjs"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js was not found on PATH. Install Node.js before building the Manager web UI."
}

$yarnPathPrefix = ""
$useGlobalYarn = $false
if (Get-Command yarn -ErrorAction SilentlyContinue) {
    Push-Location $managerRoot
    try {
        $yarnVersion = (& yarn --version 2>$null)
        if ($LASTEXITCODE -eq 0 -and $yarnVersion.Trim() -eq "4.12.0") {
            $useGlobalYarn = $true
        }
    }
    finally {
        Pop-Location
    }
}

if (-not $useGlobalYarn) {
    if (-not (Test-Path $yarnShimDir)) {
        New-Item -ItemType Directory -Path $yarnShimDir | Out-Null
    }
    $yarnCmd = Join-Path $yarnShimDir "yarn.cmd"
    $yarnCmdContent = "@echo off`r`nnode `"$yarnCjs`" %*`r`n"
    Set-Content -Path $yarnCmd -Value $yarnCmdContent -Encoding ASCII
    $yarnPathPrefix = "$yarnShimDir;"
}

if (-not $SkipBuild) {
    Push-Location $managerRoot
    try {
        $env:JAVA_HOME = $jdkHome
        $env:Path = "$yarnPathPrefix$env:JAVA_HOME\bin;$env:Path"
        & ".\gradlew.bat" `
            ":manager:installDist" `
            ":ui:component:or-icon:installDist" `
            ":ui:app:shared:installDist" `
            ":ui:app:manager:installDist" `
            "-x" "test" `
            "-x" "npmTest" `
            "--no-daemon"
        if ($LASTEXITCODE -ne 0) {
            throw "OpenRemote Manager build failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

$dockerfile = Join-Path $installDir "Dockerfile"
if (-not (Test-Path $dockerfile)) {
    throw "Manager install directory is missing Dockerfile: $dockerfile. Run without -SkipBuild first."
}

if (Test-Path $mdiSourceDir) {
    if (-not (Test-Path $mdiInstallDir)) {
        New-Item -ItemType Directory -Path $mdiInstallDir | Out-Null
    }
    Copy-Item -Path (Join-Path $mdiSourceDir "*") -Destination $mdiInstallDir -Recurse -Force
} elseif (-not $SkipBuild) {
    throw "Material Design Icons source directory was not created: $mdiSourceDir"
}

if (-not (Test-Path $consoleAppConfigDir)) {
    New-Item -ItemType Directory -Path $consoleAppConfigDir | Out-Null
}
$consoleAppConfigPath = Join-Path $consoleAppConfigDir "master.json"
if (-not (Test-Path $consoleAppConfigPath)) {
    Set-Content -Path $consoleAppConfigPath -Value "{}" -Encoding ASCII
}

$deploymentDir = Join-Path $installDir "deployment"
if (-not (Test-Path $deploymentDir)) {
    New-Item -ItemType Directory -Path $deploymentDir | Out-Null
}
$deploymentMarker = Join-Path $deploymentDir ".empty"
if (-not (Test-Path $deploymentMarker)) {
    New-Item -ItemType File -Path $deploymentMarker | Out-Null
}

$env:OPENREMOTE_MANAGER_BUILD_CONTEXT = ($installDir -replace "\\", "/")
$env:OPENREMOTE_TELTONIKA_PORT = "$TeltonikaPort"

docker compose `
    -p openremote `
    -f (Join-Path $managerRoot "docker-compose.yml") `
    -f $composeOverride `
    up -d --build

if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose failed with exit code $LASTEXITCODE."
}

docker compose `
    -p openremote `
    -f (Join-Path $managerRoot "docker-compose.yml") `
    -f $composeOverride `
    ps
