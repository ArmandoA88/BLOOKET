$destDir = Join-Path $PSScriptRoot "..\public\assets\sports"
if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

$teams = @(
    @{ id = "nfl-cardinals";   abbr = "ari" },
    @{ id = "nfl-falcons";     abbr = "atl" },
    @{ id = "nfl-ravens";      abbr = "bal" },
    @{ id = "nfl-bills";       abbr = "buf" },
    @{ id = "nfl-panthers";    abbr = "car" },
    @{ id = "nfl-bears";       abbr = "chi" },
    @{ id = "nfl-bengals";     abbr = "cin" },
    @{ id = "nfl-browns";      abbr = "cle" },
    @{ id = "nfl-cowboys";     abbr = "dal" },
    @{ id = "nfl-broncos";     abbr = "den" },
    @{ id = "nfl-lions";       abbr = "det" },
    @{ id = "nfl-packers";     abbr = "gb" },
    @{ id = "nfl-texans";      abbr = "hou" },
    @{ id = "nfl-colts";       abbr = "ind" },
    @{ id = "nfl-jaguars";     abbr = "jax" },
    @{ id = "nfl-chiefs";      abbr = "kc" },
    @{ id = "nfl-raiders";     abbr = "lv" },
    @{ id = "nfl-chargers";    abbr = "lac" },
    @{ id = "nfl-rams";        abbr = "lar" },
    @{ id = "nfl-dolphins";    abbr = "mia" },
    @{ id = "nfl-vikings";     abbr = "min" },
    @{ id = "nfl-patriots";    abbr = "ne" },
    @{ id = "nfl-saints";      abbr = "no" },
    @{ id = "nfl-giants";      abbr = "nyg" },
    @{ id = "nfl-jets";        abbr = "nyj" },
    @{ id = "nfl-eagles";      abbr = "phi" },
    @{ id = "nfl-steelers";    abbr = "pit" },
    @{ id = "nfl-49ers";       abbr = "sf" },
    @{ id = "nfl-seahawks";    abbr = "sea" },
    @{ id = "nfl-buccaneers";  abbr = "tb" },
    @{ id = "nfl-titans";      abbr = "ten" },
    @{ id = "nfl-commanders";  abbr = "wsh" }
)

foreach ($team in $teams) {
    $filePath = Join-Path $destDir "$($team.id).png"
    $url = "https://a.espncdn.com/i/teamlogos/nfl/500/$($team.abbr).png"

    if (Test-Path $filePath) {
        Write-Host "SKIP $($team.id) (exists)"
        continue
    }

    Write-Host "Downloading $($team.id) from $url"
    try {
        Invoke-WebRequest -Uri $url -OutFile $filePath -UserAgent "Mozilla/5.0" -TimeoutSec 30
        Write-Host "Saved $filePath"
    }
    catch {
        Write-Host "FAILED $($team.id): $_"
    }
}
