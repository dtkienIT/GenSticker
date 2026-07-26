[CmdletBinding()]
param(
    [string]$ModelRoot,
    [string]$PackageId = 'com.vinai.gensticker.dev',
    [string]$Device,
    [string]$AdbPath,
    [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $ModelRoot) {
    $ModelRoot = Join-Path $PSScriptRoot '..\model_artifacts\model-lcm-sd15-v1.0.1'
}
$resolvedModelRoot = (Resolve-Path -LiteralPath $ModelRoot).Path
$manifestPath = Join-Path $resolvedModelRoot 'model-distribution.manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Distribution manifest not found: $manifestPath"
}

$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
$verifiedBytes = 0L
foreach ($part in $manifest.parts) {
    $relativePath = [string]$part.path
    if ($relativePath -notmatch '^[A-Za-z0-9._/-]+$') {
        throw "Model path contains characters unsupported by the ADB helper: $relativePath"
    }
    $candidate = [System.IO.Path]::GetFullPath((Join-Path $resolvedModelRoot $relativePath))
    $rootPrefix = $resolvedModelRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
    if (-not $candidate.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe model path in manifest: $relativePath"
    }
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        throw "Model part not found: $relativePath"
    }
    $file = Get-Item -LiteralPath $candidate
    if ($file.Length -ne [long]$part.bytes) {
        throw "Length mismatch for ${relativePath}: expected $($part.bytes), found $($file.Length)"
    }
    $digest = (Get-FileHash -Algorithm SHA256 -LiteralPath $candidate).Hash.ToLowerInvariant()
    if ($digest -ne ([string]$part.sha256).ToLowerInvariant()) {
        throw "SHA-256 mismatch for $relativePath"
    }
    $verifiedBytes += $file.Length
    Write-Host "Verified $relativePath" -ForegroundColor DarkGreen
}

if ($verifiedBytes -ne [long]$manifest.artifactBytes) {
    throw "Bundle length mismatch: expected $($manifest.artifactBytes), found $verifiedBytes"
}

Write-Host "Verified $($manifest.parts.Count) model parts ($verifiedBytes bytes)." -ForegroundColor Green
if ($ValidateOnly) {
    return
}

if (-not $AdbPath) {
    $sdkRoot = if ($env:ANDROID_HOME) {
        $env:ANDROID_HOME
    } elseif ($env:ANDROID_SDK_ROOT) {
        $env:ANDROID_SDK_ROOT
    } else {
        Join-Path $env:LOCALAPPDATA 'Android\Sdk'
    }
    $AdbPath = Join-Path $sdkRoot 'platform-tools\adb.exe'
}
$resolvedAdb = (Resolve-Path -LiteralPath $AdbPath).Path

if (-not $Device) {
    $emulators = @(
        & $resolvedAdb devices |
            Select-String -Pattern '^(emulator-\d+)\s+device$' |
            ForEach-Object { $_.Matches[0].Groups[1].Value }
    )
    if ($emulators.Count -ne 1) {
        throw "Expected exactly one running emulator; found $($emulators.Count). Pass -Device explicitly."
    }
    $Device = $emulators[0]
}

if ($PackageId -notmatch '^[A-Za-z][A-Za-z0-9_.]+$') {
    throw "Invalid Android package ID: $PackageId"
}

& $resolvedAdb -s $Device get-state | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Emulator is not ready: $Device"
}
& $resolvedAdb -s $Device shell pm path $PackageId | Select-String -SimpleMatch 'package:' | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Install the development app before staging the model: $PackageId"
}

$remoteTemporaryRoot = "/data/local/tmp/gensticker-model-import-$PackageId"
$internalRoot = 'files/model-import'
$legacyExternalRoot = "/sdcard/Android/data/$PackageId/files/model-import"
& $resolvedAdb -s $Device shell mkdir -p $remoteTemporaryRoot
if ($LASTEXITCODE -ne 0) {
    throw "Could not create the temporary ADB import directory."
}

foreach ($part in $manifest.parts) {
    $relativePath = ([string]$part.path).Replace('\', '/')
    $localPath = Join-Path $resolvedModelRoot ([string]$part.path)
    $temporaryPath = "$remoteTemporaryRoot/$([string]$part.name)"
    $internalPath = "$internalRoot/$relativePath"
    $internalDirectory = $internalPath.Substring(0, $internalPath.LastIndexOf('/'))

    & $resolvedAdb -s $Device shell run-as $PackageId mkdir -p $internalDirectory
    if ($LASTEXITCODE -ne 0) {
        throw "Could not create the app-private directory for $relativePath"
    }
    Write-Host "Staging $relativePath..." -ForegroundColor Cyan
    & $resolvedAdb -s $Device push $localPath $temporaryPath
    if ($LASTEXITCODE -ne 0) {
        throw "ADB push failed for $relativePath"
    }

    & $resolvedAdb -s $Device shell run-as $PackageId cp $temporaryPath $internalPath
    if ($LASTEXITCODE -ne 0) {
        throw "Could not copy $relativePath under the debug app identity"
    }
    $remoteBytes = (& $resolvedAdb -s $Device shell run-as $PackageId stat -c '%s' $internalPath).Trim()
    $remoteDigest = ((& $resolvedAdb -s $Device shell run-as $PackageId sha256sum $internalPath) -split '\s+')[0]
    if ([long]$remoteBytes -ne [long]$part.bytes -or
        $remoteDigest -ne ([string]$part.sha256).ToLowerInvariant()) {
        throw "Device-side verification failed for $relativePath"
    }
    & $resolvedAdb -s $Device shell rm -f $temporaryPath
    if ($LASTEXITCODE -ne 0) {
        throw "Could not remove the temporary ADB copy for $relativePath"
    }
}

& $resolvedAdb -s $Device shell rmdir $remoteTemporaryRoot 2>$null
# API 37.1 isolates shell-owned /sdcard/Android/data files from the app. Remove only
# the legacy import tree created by earlier versions of this helper after the
# app-private copy has been completely verified.
& $resolvedAdb -s $Device shell rm -rf $legacyExternalRoot
if ($LASTEXITCODE -ne 0) {
    throw "Could not remove the legacy external staging directory."
}

Write-Host 'Model staged successfully. Open GenSticker and tap "Install staged local model".' -ForegroundColor Green
