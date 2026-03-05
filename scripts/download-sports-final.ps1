
$destDir = "c:\Users\Administrator\Desktop\BLOOKET\public\assets\sports"
if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force $destDir }

$finalUrls = @{
    "nfl-jets"     = "https://upload.wikimedia.org/wikipedia/en/thumb/2/20/New_York_Jets_2024_logo.svg/250px-New_York_Jets_2024_logo.svg.png"
    "nfl-giants"   = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/New_York_Giants_logo.svg/250px-New_York_Giants_logo.svg.png"
    "nfl-steelers" = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Pittsburgh_Steelers_logo.svg/250px-Pittsburgh_Steelers_logo.svg.png"
}

foreach ($id in $finalUrls.Keys) {
    $filePath = Join-Path $destDir "$id.png"
    $url = $finalUrls[$id]
    Write-Host "Downloading $id..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $filePath -UserAgent "Mozilla/5.0"
        Write-Host "Success: $id"
    }
    catch {
        Write-Host "Failed: $id"
    }
}
