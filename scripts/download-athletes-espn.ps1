
$athletes = @(
    # NFL
    @{ name = "Patrick Mahomes"; id = "ath-mahomes"; sport = "nfl"; espnId = "3139477" },
    @{ name = "Tom Brady"; id = "ath-brady"; sport = "nfl"; espnId = "2330" },
    @{ name = "Lamar Jackson"; id = "ath-jackson"; sport = "nfl"; espnId = "3916387" },
    @{ name = "Travis Kelce"; id = "ath-kelce"; sport = "nfl"; espnId = "15847" },
    @{ name = "Christian McCaffrey"; id = "ath-mccaffrey"; sport = "nfl"; espnId = "3117251" },
    @{ name = "Justin Jefferson"; id = "ath-jefferson"; sport = "nfl"; espnId = "4426515" },

    # MLB
    @{ name = "Shohei Ohtani"; id = "ath-ohtani"; sport = "mlb"; espnId = "39832" },
    @{ name = "Aaron Judge"; id = "ath-judge"; sport = "mlb"; espnId = "33153" },
    @{ name = "Bryce Harper"; id = "ath-harper"; sport = "mlb"; espnId = "30951" },
    @{ name = "Ronald Acuna Jr"; id = "ath-acuna"; sport = "mlb"; espnId = "35168" },
    @{ name = "Mike Trout"; id = "ath-trout"; sport = "mlb"; espnId = "30836" },
    @{ name = "Mookie Betts"; id = "ath-betts"; sport = "mlb"; espnId = "33042" },

    # Soccer
    @{ name = "Lionel Messi"; id = "ath-messi"; sport = "soccer"; espnId = "45843" },
    @{ name = "Cristiano Ronaldo"; id = "ath-ronaldo"; sport = "soccer"; espnId = "22774" },
    @{ name = "Kylian Mbappe"; id = "ath-mbappe"; sport = "soccer"; espnId = "231353" },
    @{ name = "Erling Haaland"; id = "ath-haaland"; sport = "soccer"; espnId = "249002" },
    @{ name = "Vinicius Junior"; id = "ath-vinicius"; sport = "soccer"; espnId = "238194" },
    @{ name = "Jude Bellingham"; id = "ath-bellingham"; sport = "soccer"; espnId = "279549" },
    @{ name = "Neymar Jr"; id = "ath-neymar"; sport = "soccer"; espnId = "145167" },
    @{ name = "Mohamed Salah"; id = "ath-salah"; sport = "soccer"; espnId = "161044" }
)

$destDir = "c:\Users\Administrator\Desktop\BLOOKET\public\assets\athletes"
if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force $destDir }

foreach ($ath in $athletes) {
    $filePath = Join-Path $destDir "$($ath.id).png"
    $url = "https://a.espncdn.com/combiner/i?img=/i/headshots/$($ath.sport)/players/full/$($ath.espnId).png&w=350&h=254"
    
    Write-Host "Downloading portrait for $($ath.name)..."
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $url -OutFile $filePath -UserAgent "Mozilla/5.0" -TimeoutSec 15
        Write-Host "Success: $($ath.id)"
    }
    catch {
        Write-Host "Failed: $($ath.id) - $($_.Exception.Message)"
    }
}
