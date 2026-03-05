
$athletes = @(
    # NFL
    @{ name = "Patrick Mahomes"; id = "ath-mahomes"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Patrick_Mahomes_2021.jpg/220px-Patrick_Mahomes_2021.jpg" },
    @{ name = "Travis Kelce"; id = "ath-kelce"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Travis_Kelce_2022.jpg/220px-Travis_Kelce_2022.jpg" },
    @{ name = "Tom Brady"; id = "ath-brady"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Tom_Brady_2021.jpg/220px-Tom_Brady_2021.jpg" },
    @{ name = "Lamar Jackson"; id = "ath-jackson"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Lamar_Jackson_2022.jpg/220px-Lamar_Jackson_2022.jpg" },
    @{ name = "Christian McCaffrey"; id = "ath-mccaffrey"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Christian_McCaffrey_2022.jpg/220px-Christian_McCaffrey_2022.jpg" },
    @{ name = "Justin Jefferson"; id = "ath-jefferson"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Justin_Jefferson_2022.jpg/220px-Justin_Jefferson_2022.jpg" },

    # MLB
    @{ name = "Shohei Ohtani"; id = "ath-ohtani"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Shohei_Ohtani_2023.jpg/220px-Shohei_Ohtani_2023.jpg" },
    @{ name = "Aaron Judge"; id = "ath-judge"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Aaron_Judge_2023.jpg/220px-Aaron_Judge_2023.jpg" },
    @{ name = "Bryce Harper"; id = "ath-harper"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Bryce_Harper_2022.jpg/220px-Bryce_Harper_2022.jpg" },
    @{ name = "Ronald Acuna Jr"; id = "ath-acuna"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Ronald_Acuna_Jr_2023.jpg/220px-Ronald_Acuna_Jr_2023.jpg" },
    @{ name = "Mike Trout"; id = "ath-trout"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Mike_Trout_2023.jpg/220px-Mike_Trout_2023.jpg" },
    @{ name = "Juan Soto"; id = "ath-soto"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Juan_Soto_2023.jpg/220px-Juan_Soto_2023.jpg" },

    # Soccer
    @{ name = "Lionel Messi"; id = "ath-messi"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg/220px-Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg" },
    @{ name = "Cristiano Ronaldo"; id = "ath-ronaldo"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Cristiano_Ronaldo_playing_for_Al_Nassr_FC_against_Al_Fateh_FC%2C_3_February_2023.jpg/220px-Cristiano_Ronaldo_playing_for_Al_Nassr_FC_against_Al_Fateh_FC%2C_3_February_2023.jpg" },
    @{ name = "Kylian Mbappe"; id = "ath-mbappe"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Kylian_Mbapp%C3%A9_Vuss_2023.jpg/220px-Kylian_Mbapp%C3%A9_Vuss_2023.jpg" },
    @{ name = "Erling Haaland"; id = "ath-haaland"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Erling_Haaland_2023.jpg/220px-Erling_Haaland_2023.jpg" },
    @{ name = "Vinicius Junior"; id = "ath-vinicius"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Vinicius_Jr_2023.jpg/220px-Vinicius_Jr_2023.jpg" },
    @{ name = "Jude Bellingham"; id = "ath-bellingham"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Jude_Bellingham_2023.jpg/220px-Jude_Bellingham_2023.jpg" },
    @{ name = "Neymar Jr"; id = "ath-neymar"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Neymar_Jr_2023.jpg/220px-Neymar_Jr_2023.jpg" },
    @{ name = "Mohamed Salah"; id = "ath-salah"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Mohamed_Salah_2023.jpg/220px-Mohamed_Salah_2023.jpg" }
)

$destDir = "c:\Users\Administrator\Desktop\BLOOKET\public\assets\athletes"
if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force $destDir }

foreach ($ath in $athletes) {
    $filePath = Join-Path $destDir "$($ath.id).jpg"
    Write-Host "Downloading portrait for $($ath.name)..."
    try {
        Invoke-WebRequest -Uri $ath.url -OutFile $filePath -UserAgent "Mozilla/5.0"
        Write-Host "Success: $($ath.id)"
    }
    catch {
        Write-Host "Failed: $($ath.id)"
    }
}
