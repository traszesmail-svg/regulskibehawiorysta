param(
    [string]$BuildDirectory,
    [string]$OutputApk
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$credentialDirectory = Join-Path $env:LOCALAPPDATA 'RegulskiOperator\signing'
$metadataPath = Join-Path $credentialDirectory 'production-signing.json'
$passwordPath = Join-Path $credentialDirectory 'production-password.dpapi'

if (-not (Test-Path -LiteralPath $metadataPath) -or -not (Test-Path -LiteralPath $passwordPath)) {
    throw 'Brak lokalnej konfiguracji podpisu produkcyjnego Regulski Operator.'
}

$metadata = Get-Content -LiteralPath $metadataPath -Raw | ConvertFrom-Json
$protectedPassword = [IO.File]::ReadAllBytes($passwordPath)
$passwordBytes = [Security.Cryptography.ProtectedData]::Unprotect(
    $protectedPassword,
    $null,
    [Security.Cryptography.DataProtectionScope]::CurrentUser
)
$password = [Text.Encoding]::UTF8.GetString($passwordBytes)

try {
    $buildParameters = @{
        KeystorePath = [string]$metadata.keystorePath
        KeystoreAlias = [string]$metadata.alias
        KeystorePassword = $password
    }
    if ($BuildDirectory) { $buildParameters.BuildDirectory = $BuildDirectory }
    if ($OutputApk) { $buildParameters.OutputApk = $OutputApk }

    & (Join-Path $PSScriptRoot 'build-apk.ps1') @buildParameters
} finally {
    [Array]::Clear($passwordBytes, 0, $passwordBytes.Length)
    $password = $null
}
