param()
$ErrorActionPreference = 'Stop'
$jdk = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot\bin'
$javac = "$jdk\javac.exe"
$java = "$jdk\java.exe"

$buildDir = Join-Path $env:TEMP ('regulski-jvm-tests-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $buildDir -Force | Out-Null

try {
    Write-Host "Compiling JVM tests..."
    $sources = @(
        (Join-Path $PSScriptRoot '..\app\src\main\java\pl\regulski\phoneagent\CallSessionGuard.java'),
        (Join-Path $PSScriptRoot '..\app\src\main\java\pl\regulski\phoneagent\Clock.java'),
        (Join-Path $PSScriptRoot '..\app\src\main\java\pl\regulski\phoneagent\TwoLegConferenceState.java'),
        (Join-Path $PSScriptRoot '..\app\src\main\java\pl\regulski\phoneagent\TwoLegTelecomAdapter.java'),
        (Join-Path $PSScriptRoot '..\app\src\main\java\pl\regulski\phoneagent\ConferencePhoneMasker.java'),
        (Join-Path $PSScriptRoot '..\app\src\main\java\pl\regulski\phoneagent\ConferenceScheduler.java'),
        (Join-Path $PSScriptRoot '..\app\src\main\java\pl\regulski\phoneagent\ConferenceRuntimeScheduler.java'),
        (Join-Path $PSScriptRoot '..\app\src\main\java\pl\regulski\phoneagent\ConferencePrerequisites.java'),
        (Join-Path $PSScriptRoot '..\app\src\main\java\pl\regulski\phoneagent\InCallServiceBridge.java'),
        (Join-Path $PSScriptRoot '..\app\src\main\java\pl\regulski\phoneagent\TwoLegConferenceController.java'),
        (Join-Path $PSScriptRoot '..\app\src\main\java\pl\regulski\phoneagent\ConferenceSessionCoordinator.java'),
        (Join-Path $PSScriptRoot 'CallSessionGuardTest.java'),
        (Join-Path $PSScriptRoot 'TwoLegConferenceControllerTest.java'),
        (Join-Path $PSScriptRoot 'ConferenceSessionCoordinatorTest.java'),
        (Join-Path $PSScriptRoot 'ConferencePrivacyAuditTest.java')
    )

    & $javac -encoding UTF-8 -d $buildDir $sources
    if ($LASTEXITCODE -ne 0) { throw "Kompilacja testów JVM nie powiodła się." }

    Write-Host "Running CallSessionGuardTest..."
    & $java -cp $buildDir pl.regulski.phoneagent.CallSessionGuardTest
    if ($LASTEXITCODE -ne 0) { throw "CallSessionGuardTest failed" }

    Write-Host "Running TwoLegConferenceControllerTest..."
    & $java -cp $buildDir pl.regulski.phoneagent.TwoLegConferenceControllerTest
    if ($LASTEXITCODE -ne 0) { throw "TwoLegConferenceControllerTest failed" }

    Write-Host "Running ConferenceSessionCoordinatorTest..."
    & $java -cp $buildDir pl.regulski.phoneagent.ConferenceSessionCoordinatorTest
    if ($LASTEXITCODE -ne 0) { throw "ConferenceSessionCoordinatorTest failed" }

    Write-Host "Running ConferencePrivacyAuditTest..."
    & $java -cp $buildDir pl.regulski.phoneagent.ConferencePrivacyAuditTest
    if ($LASTEXITCODE -ne 0) { throw "ConferencePrivacyAuditTest failed" }

    Write-Host "ALL JVM TESTS PASSED!"
} finally {
    Remove-Item -Recurse -Force $buildDir -ErrorAction SilentlyContinue
}
