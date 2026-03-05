
$destDir = "c:\Users\Administrator\Desktop\BLOOKET\public\assets\sports"
if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force $destDir }

$extraUrls = @{
    "nfl-bengals"   = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Cincinnati_Bengals_logo.svg/250px-Cincinnati_Bengals_logo.svg.png"
    "soc-bayern"    = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg/250px-FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg.png"
    "soc-psg"       = "https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/250px-Paris_Saint-Germain_F.C..svg.png"
    "soc-arsenal"   = "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/250px-Arsenal_FC.svg.png"
    "soc-barcelona" = "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28logo%29.svg/250px-FC_Barcelona_%28logo%29.svg.png"
    "soc-inter"     = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/FC_Internazionale_Milano_2021.svg/250px-FC_Internazionale_Milano_2021.svg.png"
    "soc-juventus"  = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Juventus_FC_2017_icon_%28black%29.svg/250px-Juventus_FC_2017_icon_%28black%29.svg.png"
}

foreach ($id in $extraUrls.Keys) {
    $filePath = Join-Path $destDir "$id.png"
    $url = $extraUrls[$id]
    Write-Host "Downloading $id..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $filePath -UserAgent "Mozilla/5.0"
        Write-Host "Success: $id"
    }
    catch {
        Write-Host "Failed: $id"
    }
}
