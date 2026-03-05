
$athletes = @(
    # NBA
    @{ name = "LeBron James"; id = "ath-lebron"; sport = "nba"; espnId = "1966" },
    @{ name = "Stephen Curry"; id = "ath-curry"; sport = "nba"; espnId = "3975" },
    @{ name = "Kevin Durant"; id = "ath-durant"; sport = "nba"; espnId = "3202" },
    @{ name = "Giannis Antetokounmpo"; id = "ath-giannis"; sport = "nba"; espnId = "3032976" },
    @{ name = "Luka Doncic"; id = "ath-luka"; sport = "nba"; espnId = "4395628" },

    # NFL
    @{ name = "Josh Allen"; id = "ath-allen"; sport = "nfl"; espnId = "3918298" },
    @{ name = "Joe Burrow"; id = "ath-burrow"; sport = "nfl"; espnId = "3915511" },
    @{ name = "Tyreek Hill"; id = "ath-hill"; sport = "nfl"; espnId = "3116406" },

    # MLB
    @{ name = "Mookie Betts"; id = "ath-betts"; sport = "mlb"; espnId = "33042" },
    @{ name = "Aaron Judge"; id = "ath-judge"; sport = "mlb"; espnId = "33153" }
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
