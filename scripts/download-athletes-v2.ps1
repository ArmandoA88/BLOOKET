
$athletes = @(
    @{ name = "Patrick Mahomes"; id = "ath-mahomes"; url = "https://upload.wikimedia.org/wikipedia/commons/e/e0/Patrick_Mahomes_Feb_2019.jpg" },
    @{ name = "Tom Brady"; id = "ath-brady"; url = "https://upload.wikimedia.org/wikipedia/commons/b/ba/Tom_Brady_2021.jpg" },
    @{ name = "Lionel Messi"; id = "ath-messi"; url = "https://upload.wikimedia.org/wikipedia/commons/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg" },
    @{ name = "Cristiano Ronaldo"; id = "ath-ronaldo"; url = "https://upload.wikimedia.org/wikipedia/commons/8/8c/Cristiano_Ronaldo_2018.jpg" },
    @{ name = "Kylian Mbappe"; id = "ath-mbappe"; url = "https://upload.wikimedia.org/wikipedia/commons/5/57/Kylian_Mbapp%C3%A9_2018.jpg" },
    @{ name = "Neymar Jr"; id = "ath-neymar"; url = "https://upload.wikimedia.org/wikipedia/commons/b/bc/Bra-Cos_%281%29_%28cropped%29.jpg" },
    @{ name = "Shohei Ohtani"; id = "ath-ohtani"; url = "https://upload.wikimedia.org/wikipedia/commons/d/df/Shohei_Ohtani_at_Angel_Stadium_on_March_26%2C_2023.jpg" },
    @{ name = "Aaron Judge"; id = "ath-judge"; url = "https://upload.wikimedia.org/wikipedia/commons/b/b9/Aaron_Judge_2022.jpg" },
    # Add some common ones
    @{ name = "LeBron James"; id = "ath-lebron"; url = "https://upload.wikimedia.org/wikipedia/commons/c/cf/LeBron_James_crop.jpg" },
    @{ name = "Stephen Curry"; id = "ath-curry"; url = "https://upload.wikimedia.org/wikipedia/commons/3/36/Stephen_Curry_2023_%28cropped%29.jpg" },
    @{ name = "Erling Haaland"; id = "ath-haaland"; url = "https://upload.wikimedia.org/wikipedia/commons/1/1a/Erling_Haaland_2021_%28cropped%29.jpg" },
    @{ name = "Mohamed Salah"; id = "ath-salah"; url = "https://upload.wikimedia.org/wikipedia/commons/4/4a/Mohamed_Salah_2022.jpg" },
    @{ name = "Lamar Jackson"; id = "ath-jackson"; url = "https://upload.wikimedia.org/wikipedia/commons/7/77/Lamar_Jackson_2021.png" },
    @{ name = "Joe Burrow"; id = "ath-burrow"; url = "https://upload.wikimedia.org/wikipedia/commons/a/ab/Joe_Burrow_2022.jpg" },
    @{ name = "Mike Trout"; id = "ath-trout"; url = "https://upload.wikimedia.org/wikipedia/commons/6/69/Mike_Trout_2021.jpg" },
    @{ name = "Mookie Betts"; id = "ath-betts"; url = "https://upload.wikimedia.org/wikipedia/commons/e/e0/Mookie_Betts_2022.jpg" },
    @{ name = "Ronald Acuna Jr"; id = "ath-acuna"; url = "https://upload.wikimedia.org/wikipedia/commons/3/36/Ronald_Acu%C3%B1a_Jr._2022.jpg" },
    @{ name = "Bryce Harper"; id = "ath-harper"; url = "https://upload.wikimedia.org/wikipedia/commons/2/23/Bryce_Harper_2021.jpg" },
    @{ name = "Fernando Tatis Jr"; id = "ath-tatis"; url = "https://upload.wikimedia.org/wikipedia/commons/2/23/Fernando_Tat%C3%ADs_Jr._2021.jpg" },
    @{ name = "Zion Williamson"; id = "ath-zion"; url = "https://upload.wikimedia.org/wikipedia/commons/b/b7/Zion_Williamson_%2848981442142%29_%28cropped%29.jpg" }
)

$destDir = "c:\Users\Administrator\Desktop\BLOOKET\public\assets\athletes"
if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force $destDir }

foreach ($ath in $athletes) {
    $filePath = Join-Path $destDir "$($ath.id).jpg"
    Write-Host "Downloading portrait for $($ath.name)..."
    try {
        # Using -UserAgent and -Timeout to ensure better success
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $ath.url -OutFile $filePath -UserAgent "Mozilla/5.0" -TimeoutSec 15
        Write-Host "Success: $($ath.id)"
    }
    catch {
        Write-Host "Failed: $($ath.id) - $($_.Exception.Message)"
    }
}
