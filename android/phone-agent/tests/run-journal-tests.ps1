param([string]$Serial)
$ErrorActionPreference = 'Stop'
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$bt = Join-Path $sdk 'build-tools\36.0.0'
$jar = Join-Path $sdk 'platforms\android-37.0\android.jar'
$jdk = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot\bin'
$build = Join-Path $env:TEMP ('regulski-journal-tests-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path "$build\obj", "$build\dex" -Force | Out-Null
function Check-Exit { if ($LASTEXITCODE -ne 0) { throw "Command failed: $LASTEXITCODE" } }
& "$bt\aapt2.exe" link -I $jar --manifest "$PSScriptRoot\AndroidManifest.xml" -o "$build\base.apk"
Check-Exit
& "$jdk\javac.exe" -encoding UTF-8 -cp $jar -d "$build\obj" "$PSScriptRoot\JournalTestActivity.java" "$PSScriptRoot\..\app\src\main\java\pl\regulski\phoneagent\SmsJournal.java"
Check-Exit
$classes = @(Get-ChildItem "$build\obj" -Recurse -Filter '*.class' | ForEach-Object FullName)
& "$bt\d8.bat" --lib $jar --output "$build\dex" $classes
Check-Exit
& "$jdk\jar.exe" uf "$build\base.apk" -C "$build\dex" classes.dex
Check-Exit
& "$bt\zipalign.exe" -f 4 "$build\base.apk" "$build\aligned.apk"
Check-Exit
& "$jdk\keytool.exe" -genkeypair -keystore "$build\test.jks" -storepass android -keypass android -alias test -dname 'CN=Isolated Journal Test' -keyalg RSA -validity 2
Check-Exit
& "$bt\apksigner.bat" sign --ks "$build\test.jks" --ks-pass pass:android --out "$build\test.apk" "$build\aligned.apk"
Check-Exit
$adb = "$sdk\platform-tools\adb.exe"
$target = @()
if ($Serial) { $target = @('-s', $Serial) }
$package = 'pl.regulski.phoneagent.journaltests'
& $adb @target install "$build\test.apk"
Check-Exit
try {
    foreach ($phase in @('prepare', 'recover')) {
        & $adb @target shell am force-stop $package
        & $adb @target shell am start -n "$package/pl.regulski.phoneagent.JournalTestActivity" --es phase $phase
        Start-Sleep -Seconds 2
    }
    $logs = & $adb @target logcat -d -s RegulskiJournalTest:I '*:S'
    $logs | Out-Host
    if (-not ($logs -match 'PASS prepare') -or -not ($logs -match 'PASS recover') -or ($logs -match 'FAIL')) { throw 'Journal tests failed' }
} finally {
    & $adb @target uninstall $package
}
