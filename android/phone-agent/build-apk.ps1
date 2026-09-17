param(
    [string]$KeystorePath = $env:PHONE_AGENT_KEYSTORE_PATH,
    [string]$KeystoreAlias = $env:PHONE_AGENT_KEYSTORE_ALIAS,
    [string]$KeystorePassword = $env:PHONE_AGENT_KEYSTORE_PASSWORD,
    [switch]$AllowEphemeralTestSigning
)

$ErrorActionPreference = "Stop"

$sdk = "C:\Users\chris\AppData\Local\Android\Sdk"
$buildTools = "$sdk\build-tools\36.0.0"
$androidJar = "$sdk\platforms\android-37.0\android.jar"
$aapt2 = "$buildTools\aapt2.exe"
$d8 = "$buildTools\d8.bat"
$zipalign = "$buildTools\zipalign.exe"
$apksigner = "$buildTools\apksigner.bat"
$javac = "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot\bin\javac.exe"
$keytool = "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot\bin\keytool.exe"

$agentDir = "C:\projekt\regulskibehawiorysta\android\phone-agent"
$appDir = "$agentDir\app"
$buildDir = "$appDir\build"

# Validate before cleaning: never delete the only copy of a signing key.
if (-not $AllowEphemeralTestSigning) {
    if (-not $KeystorePath -or -not $KeystoreAlias -or -not $KeystorePassword) {
        throw "Brak stałego klucza podpisu. Podaj PHONE_AGENT_KEYSTORE_PATH, PHONE_AGENT_KEYSTORE_ALIAS i PHONE_AGENT_KEYSTORE_PASSWORD."
    }
    if (-not (Test-Path -LiteralPath $KeystorePath)) { throw "Nie znaleziono klucza podpisu." }
    $resolvedKey = [IO.Path]::GetFullPath($KeystorePath)
    if ($resolvedKey.StartsWith([IO.Path]::GetFullPath($buildDir) + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw "Klucz podpisu musi znajdować się poza katalogiem build."
    }
}
$resolvedBuild = [IO.Path]::GetFullPath($buildDir)
if ($resolvedBuild -ne [IO.Path]::GetFullPath((Join-Path $agentDir 'app\build'))) { throw "Nieprawidłowy katalog build." }

Write-Host "Czyszczenie katalogu build..."
if (Test-Path $buildDir) { Remove-Item -Recurse -Force $buildDir }
New-Item -ItemType Directory -Path "$buildDir\gen" -Force | Out-Null
New-Item -ItemType Directory -Path "$buildDir\obj" -Force | Out-Null
New-Item -ItemType Directory -Path "$buildDir\dex" -Force | Out-Null

Write-Host "1. Kompilacja zasobów (aapt2 compile)..."
& $aapt2 compile --dir "$appDir\src\main\res" -o "$buildDir\compiled_res.zip"
if ($LASTEXITCODE -ne 0) { throw "Błąd aapt2 compile" }

Write-Host "2. Linkowanie zasobów i generowanie R.java (aapt2 link)..."
& $aapt2 link -I $androidJar --manifest "$appDir\src\main\AndroidManifest.xml" --java "$buildDir\gen" -o "$buildDir\app-unaligned.apk" "$buildDir\compiled_res.zip" --auto-add-overlay
if ($LASTEXITCODE -ne 0) { throw "Błąd aapt2 link" }

Write-Host "3. Kompilacja kodu Java (javac)..."
$javaFiles = @(Get-ChildItem -Recurse "$buildDir\gen\*.java", "$appDir\src\main\java\*.java" | ForEach-Object { $_.FullName })
& $javac -encoding UTF-8 -cp $androidJar -d "$buildDir\obj" $javaFiles
if ($LASTEXITCODE -ne 0) { throw "Błąd javac" }

Write-Host "4. Konwersja do DEX (d8)..."
$classFiles = @(Get-ChildItem -Recurse "$buildDir\obj\*.class" | ForEach-Object { $_.FullName })
& $d8 --lib $androidJar --output "$buildDir\dex" $classFiles
if ($LASTEXITCODE -ne 0) { throw "Błąd d8" }

Write-Host "5. Dołączanie classes.dex do pliku APK (jar uf)..."
$jar = "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot\bin\jar.exe"
& $jar uf "$buildDir\app-unaligned.apk" -C "$buildDir\dex" classes.dex
if ($LASTEXITCODE -ne 0) { throw "Błąd dodawania classes.dex" }

Write-Host "6. Wyrównywanie pliku APK (zipalign)..."
& $zipalign -f -p 4 "$buildDir\app-unaligned.apk" "$buildDir\app-aligned.apk"
if ($LASTEXITCODE -ne 0) { throw "Błąd zipalign" }

Write-Host "7. Walidacja klucza do podpisu..."
if (-not $KeystorePath -or -not $KeystoreAlias -or -not $KeystorePassword) {
    if (-not $AllowEphemeralTestSigning) {
        throw "Brak stałego klucza podpisu. Ustaw PHONE_AGENT_KEYSTORE_PATH, PHONE_AGENT_KEYSTORE_ALIAS i PHONE_AGENT_KEYSTORE_PASSWORD. Dla jednorazowego APK testowego użyj -AllowEphemeralTestSigning."
    }
    $KeystorePath = "$buildDir\ephemeral-test.keystore"
    $KeystoreAlias = "androidtestkey"
    $KeystorePassword = "android"
    & $keytool -genkeypair -validity 30 -dname "CN=Regulski Test,O=Regulski,C=PL" -keystore $KeystorePath -storepass $KeystorePassword -keypass $KeystorePassword -alias $KeystoreAlias -keyalg RSA -keysize 2048
    if ($LASTEXITCODE -ne 0) { throw "Błąd tworzenia jednorazowego klucza testowego" }
} elseif (-not (Test-Path -LiteralPath $KeystorePath)) {
    throw "Nie znaleziono wskazanego klucza podpisu: $KeystorePath"
}

Write-Host "8. Podpisywanie APK stałym kluczem..."
$outApk = "$agentDir\regulski-telefon.apk"
& $apksigner sign --ks $KeystorePath --ks-pass "pass:$KeystorePassword" --ks-key-alias $KeystoreAlias --key-pass "pass:$KeystorePassword" --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out $outApk "$buildDir\app-aligned.apk"
if ($LASTEXITCODE -ne 0) { throw "Błąd apksigner" }

Write-Host "9. Weryfikacja podpisu..."
& $apksigner verify --verbose $outApk
if ($LASTEXITCODE -ne 0) { throw "Błąd weryfikacji podpisu" }

Write-Host "SUKCES! Gotowy plik APK znajduje się pod adresem: $outApk"
Get-Item $outApk | Select-Object Name, Length, LastWriteTime | Format-List
