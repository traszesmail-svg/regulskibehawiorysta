$outDir = "C:\projekt\regulskibehawiorysta\public\branding\pdf-previews"

$newSlugs = @(
    "domowy-enrichment-plan-na-14-dni",
    "konflikt-miedzy-kotami-w-domu",
    "kot-dotyk-pielegnacja-i-obrona",
    "kot-i-kuweta-pierwszy-plan-dzialania",
    "kot-stres-srodowisko-i-bledy-opiekuna",
    "pierwsze-dni-po-adopcji-psa-lub-kota",
    "pies-boi-sie-gosci-i-dzwiekow",
    "pies-reaktywny-na-spacerze",
    "pies-zostaje-sam-plan-pierwszych-krokow",
    "szczeniak-pierwsze-30-dni"
)

foreach ($slug in $newSlugs) {
    $pdfPath = "C:\projekt\regulskibehawiorysta\content\guides\pdf\$slug.pdf"
    $targetDir = "$outDir\$slug"
    if (!(Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    
    Write-Host "Generating previews for $slug..."
    for ($i = 0; $i -lt 3; $i++) {
        $pageNum = $i + 1
        $pageStr = $pageNum.ToString("00")
        $targetFile = "$targetDir\page_$pageStr.png"
        
        $process = Start-Process -FilePath "magick" -ArgumentList "-density 150 `"$pdfPath`[$i`]`" -quality 90 `"$targetFile`"" -Wait -NoNewWindow -PassThru
        if ($process.ExitCode -ne 0) {
            Write-Host "Error generating page $pageNum for $slug"
        }
    }
}
Write-Host "Done."
