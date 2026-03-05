
$destDir = "c:\Users\Administrator\Desktop\BLOOKET\public\assets\sports"
if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force $destDir }

$wikiUrls = @{
    "nfl-chiefs"      = "https://upload.wikimedia.org/wikipedia/en/thumb/e/e1/Kansas_City_Chiefs_logo.svg/250px-Kansas_City_Chiefs_logo.svg.png"
    "nfl-49ers"       = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/San_Francisco_49ers_logo.svg/250px-San_Francisco_49ers_logo.svg.png"
    "nfl-eagles"      = "https://upload.wikimedia.org/wikipedia/en/thumb/8/8e/Philadelphia_Eagles_logo.svg/250px-Philadelphia_Eagles_logo.svg.png"
    "nfl-ravens"      = "https://upload.wikimedia.org/wikipedia/en/thumb/1/16/Baltimore_Ravens_logo.svg/250px-Baltimore_Ravens_logo.svg.png"
    "nfl-cowboys"     = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Dallas_Cowboys.svg/250px-Dallas_Cowboys.svg.png"
    "nfl-bills"       = "https://upload.wikimedia.org/wikipedia/en/thumb/7/77/Buffalo_Bills_logo.svg/250px-Buffalo_Bills_logo.svg.png"
    "nfl-lions"       = "https://upload.wikimedia.org/wikipedia/en/thumb/7/71/Detroit_Lions_logo.svg/250px-Detroit_Lions_logo.svg.png"
    "nfl-bengals"     = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Cincinnati_Bengals_logo.svg/250px-Cincinnati_Bengals_logo.svg.png"
    "nfl-dolphins"    = "https://upload.wikimedia.org/wikipedia/en/thumb/3/37/Miami_Dolphins_logo.svg/250px-Miami_Dolphins_logo.svg.png"
    "nfl-packers"     = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Green_Bay_Packers_logo.svg/250px-Green_Bay_Packers_logo.svg.png"
    
    "soc-real-madrid" = "https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/200px-Real_Madrid_CF.svg.png"
    "soc-man-city"    = "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/200px-Manchester_City_FC_badge.svg.png"
    "soc-liverpool"   = "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/200px-Liverpool_FC.svg.png"
    "soc-bayern"      = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg/200px-FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg.png"
    "soc-psg"         = "https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/200px-Paris_Saint-Germain_F.C..svg.png"
    "soc-arsenal"     = "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/200px-Arsenal_FC.svg.png"
    "soc-barcelona"   = "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28logo%29.svg/200px-FC_Barcelona_%28logo%29.svg.png"
    "soc-inter"       = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/FC_Internazionale_Milano_2021.svg/250px-FC_Internazionale_Milano_2021.svg.png"
    "soc-leverkusen"  = "https://upload.wikimedia.org/wikipedia/en/thumb/5/59/Bayer_04_Leverkusen_logo.svg/200px-Bayer_04_Leverkusen_logo.svg.png"
    "soc-juventus"    = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Juventus_FC_2017_icon_%28black%29.svg/200px-Juventus_FC_2017_icon_%28black%29.svg.png"
}

foreach ($id in $wikiUrls.Keys) {
    $filePath = Join-Path $destDir "$id.png"
    $url = $wikiUrls[$id]
    Write-Host "Downloading $id..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $filePath -UserAgent "Mozilla/5.0"
        Write-Host "Success: $id"
    }
    catch {
        Write-Host "Failed: $id"
    }
}
