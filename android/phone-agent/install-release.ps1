param(
    [Parameter(Mandatory = $true)]
    [string]$ApkPath,
    [string]$DeviceSerial = 'ZY323XJ2V7',
    [string]$EnvironmentFile = (Join-Path $PSScriptRoot '..\..\.env.local')
)

$ErrorActionPreference = 'Stop'
$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
$applicationId = 'pl.regulski.phoneagent'
$resolvedApk = (Resolve-Path -LiteralPath $ApkPath).Path
$resolvedEnvironment = (Resolve-Path -LiteralPath $EnvironmentFile).Path

$tokenLine = Get-Content -LiteralPath $resolvedEnvironment |
    Where-Object { $_ -match '^PHONE_AGENT_TOKEN=' } |
    Select-Object -First 1
if (-not $tokenLine) { throw 'PHONE_AGENT_TOKEN is missing from the local environment file.' }
$token = ($tokenLine -split '=', 2)[1].Trim().Trim('"').Trim("'")
if (-not $token) { throw 'PHONE_AGENT_TOKEN is empty.' }

function Invoke-Adb {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    & $adb -s $DeviceSerial @Arguments
    if ($LASTEXITCODE -ne 0) { throw "ADB failed: $($Arguments -join ' ')" }
}

try {
    Invoke-Adb shell am force-stop $applicationId
    # Preserve the current app data and do not leave the Operator uninstalled
    # when a signature or transport check rejects the APK.
    Invoke-Adb install -r $resolvedApk
    Invoke-Adb shell pm grant $applicationId android.permission.CALL_PHONE
    Invoke-Adb shell pm grant $applicationId android.permission.ANSWER_PHONE_CALLS
    # A release install must return to monitor-only even when Android preserved
    # a temporary SMS grant from a controlled test.
    Invoke-Adb shell pm revoke $applicationId android.permission.SEND_SMS
    Invoke-Adb shell cmd notification allow_listener "$applicationId/$applicationId.RevolutNotificationListener"
    Invoke-Adb shell dumpsys deviceidle whitelist "+$applicationId"
    Invoke-Adb shell am start -n "$applicationId/.MainActivity" `
        --es server 'https://regulskibehawiorysta.pl' `
        --es token $token `
        --ez start_monitor true
} finally {
    $token = $null
}

Write-Output 'CONTROLLED_REINSTALL_COMPLETE'
