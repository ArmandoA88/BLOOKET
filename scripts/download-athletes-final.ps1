
$athletes = @(
    @{ name = "Patrick Mahomes"; id = "ath-mahomes"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Patrick_Mahomes_II.JPG/250px-Patrick_Mahomes_II.JPG" },
    @{ name = "Tom Brady"; id = "ath-brady"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Tom_Brady_2021.jpg/250px-Tom_Brady_2021.jpg" },
    @{ name = "LeBron James"; id = "ath-lebron"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/LeBron_James_crop.jpg/220px-LeBron_James_crop.jpg" },
    @{ name = "Stephen Curry"; id = "ath-curry"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Stephen_Curry_2023_%28cropped%29.jpg/220px-Stephen_Curry_2023_%28cropped%29.jpg" },
    @{ name = "Lionel Messi"; id = "ath-messi"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg/250px-Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg" },
    @{ name = "Cristiano Ronaldo"; id = "ath-ronaldo"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Cristiano_Ronaldo_2018.jpg/250px-Cristiano_Ronaldo_2018.jpg" },
    @{ name = "Kylian Mbappe"; id = "ath-mbappe"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Kylian_Mbapp%C3%A9_Vuss_2023.jpg/250px-Kylian_Mbapp%C3%A9_Vuss_2023.jpg" },
    @{ name = "Shohei Ohtani"; id = "ath-ohtani"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Shohei_Ohtani_2023.jpg/250px-Shohei_Ohtani_2023.jpg" },
    @{ name = "Aaron Judge"; id = "ath-judge"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Aaron_Judge_2023.jpg/250px-Aaron_Judge_2023.jpg" },
    @{ name = "Mike Trout"; id = "ath-trout"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Mike_Trout_2023.jpg/250px-Mike_Trout_2023.jpg" }
)

$destDir = "c:\Users\Administrator\Desktop\BLOOKET\public\assets\athletes"
if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force $destDir }

foreach ($ath in $athletes) {
    $filePath = Join-Path $destDir "$($ath.id).jpg"
    Write-Host "Downloading portrait for $($ath.name)..."
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $ath.url -OutFile $filePath -UserAgent "Mozilla/5.0" -TimeoutSec 15
        Write-Host "Success: $($ath.id)"
        Start-Sleep -Seconds 3 # Anti-rate-limiting
    }
    catch {
        Write-Host "Failed: $($ath.id) - $($_.Exception.Message)"
    }
}
