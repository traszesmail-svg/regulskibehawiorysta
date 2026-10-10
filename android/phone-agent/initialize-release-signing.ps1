param(
    [string]$CredentialDirectory = (Join-Path $env:LOCALAPPDATA 'RegulskiOperator\signing')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$keytool = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot\bin\keytool.exe'
$keyPath = Join-Path $CredentialDirectory 'operator-production-20261008.keystore'
$passwordPath = Join-Path $CredentialDirectory 'production-password.dpapi'
$metadataPath = Join-Path $CredentialDirectory 'production-signing.json'
$certificatePath = Join-Path $CredentialDirectory 'production-cert.tmp.der'
$alias = 'regulski-operator-production'

if ((Test-Path -LiteralPath $keyPath) -or
    (Test-Path -LiteralPath $passwordPath) -or
    (Test-Path -LiteralPath $metadataPath)) {
    throw 'Production signing configuration already exists and will not be overwritten.'
}

New-Item -ItemType Directory -Path $CredentialDirectory -Force | Out-Null
$randomBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($randomBytes)
$password = [Convert]::ToBase64String($randomBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
$passwordBytes = [Text.Encoding]::UTF8.GetBytes($password)
$protectedPassword = [Security.Cryptography.ProtectedData]::Protect(
    $passwordBytes,
    $null,
    [Security.Cryptography.DataProtectionScope]::CurrentUser
)

try {
    [IO.File]::WriteAllBytes($passwordPath, $protectedPassword)
    $env:REGULSKI_KEYSTORE_PASSWORD = $password

    & $keytool -genkeypair -alias $alias -keyalg RSA -keysize 3072 -validity 9125 `
        -dname 'CN=Regulski Operator,O=Regulski,C=PL' -keystore $keyPath -storetype PKCS12 `
        -storepass:env REGULSKI_KEYSTORE_PASSWORD -keypass:env REGULSKI_KEYSTORE_PASSWORD -noprompt | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Production signing key creation failed.' }

    & $keytool -exportcert -alias $alias -keystore $keyPath `
        -storepass:env REGULSKI_KEYSTORE_PASSWORD -file $certificatePath | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Production certificate verification failed.' }

    $certificateHash = (Get-FileHash -LiteralPath $certificatePath -Algorithm SHA256).Hash.ToLowerInvariant()
    [ordered]@{
        version = 1
        createdAt = (Get-Date).ToUniversalTime().ToString('o')
        keystorePath = $keyPath
        alias = $alias
        certificateSha256 = $certificateHash
        passwordProtection = 'Windows DPAPI CurrentUser'
        buildScript = (Join-Path $PSScriptRoot 'build-release.ps1')
    } | ConvertTo-Json | Set-Content -LiteralPath $metadataPath -Encoding UTF8
} catch {
    Remove-Item -LiteralPath $keyPath, $passwordPath, $metadataPath -Force -ErrorAction SilentlyContinue
    throw
} finally {
    Remove-Item -LiteralPath $certificatePath -Force -ErrorAction SilentlyContinue
    Remove-Item Env:REGULSKI_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
    [Array]::Clear($randomBytes, 0, $randomBytes.Length)
    [Array]::Clear($passwordBytes, 0, $passwordBytes.Length)
    $password = $null
}

Get-Content -LiteralPath $metadataPath -Raw
