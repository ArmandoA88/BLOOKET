$ErrorActionPreference = "Stop"

$dest = "public\assets\superheroes"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$headers = @{
  "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
}

$entries = @(
  @{ file = "spiderman-classic.png"; url = "https://upload.wikimedia.org/wikipedia/en/2/21/Web_of_Spider-Man_Vol_1_129-1.png" },
  @{ file = "spiderman-mcu-peter.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/0/0f/Tom_Holland_as_Spider-Man.jpg" },
  @{ file = "spiderman-miles.png"; url = "https://upload.wikimedia.org/wikipedia/en/8/8e/Spider-Man_%28Miles_Morales%29_character_art.png" },
  @{ file = "spidergwen.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/4/42/Spider-Gwen_Vol_1_1.jpg" },
  @{ file = "spiderman-2099.png"; url = "https://upload.wikimedia.org/wikipedia/en/b/bb/Spider-Man_%28Miguel_O%27Hara%29.png" },
  @{ file = "spiderman-noir.png"; url = "https://upload.wikimedia.org/wikipedia/en/3/32/Spider-Man_Noir.png" },
  @{ file = "iron-man.png"; url = "https://upload.wikimedia.org/wikipedia/en/4/47/Iron_Man_%28circa_2018%29.png" },
  @{ file = "captain-america-steve.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/9/9e/Captain_America_The_Winter_Soldier_poster.jpg" },
  @{ file = "captain-america-sam.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/thumb/8/8c/Anthony_Mackie_as_Captain_America.jpeg/330px-Anthony_Mackie_as_Captain_America.jpeg" },
  @{ file = "thor.png"; url = "https://upload.wikimedia.org/wikipedia/en/1/1a/Thor_%28Marvel_Comics%29.png" },
  @{ file = "hulk.png"; url = "https://upload.wikimedia.org/wikipedia/en/a/aa/Hulk_%28circa_2019%29.png" },
  @{ file = "black-widow.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/3/37/Natasha_Romanova_incarnations.jpg" },
  @{ file = "hawkeye.png"; url = "https://upload.wikimedia.org/wikipedia/en/9/99/Hawkeye_%28Clinton_Barton%29.png" },
  @{ file = "doctor-strange.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/4/4f/Doctor_Strange_Vol_4_2_Ross_Variant_Textless.jpg" },
  @{ file = "scarlet-witch.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/e/ec/Scarlet_Witch_Various_incarnations_2021.jpg" },
  @{ file = "black-panther.png"; url = "https://upload.wikimedia.org/wikipedia/en/f/f7/Black_Panther_%28T%27Challa%29.png" },
  @{ file = "captain-marvel.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/0/02/Carol_Danvers_-_%28evolution%29.jpg" },
  @{ file = "green-goblin.png"; url = "https://upload.wikimedia.org/wikipedia/en/3/35/Green_Goblin_Comic_Art_by_Miguel_Mercado.png" },
  @{ file = "doctor-octopus.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/b/bc/Dr._Octopus_Marvel.jpg" },
  @{ file = "venom.png"; url = "https://upload.wikimedia.org/wikipedia/en/b/b0/Venom_%28Marvel_Comics_character%29.png" },
  @{ file = "carnage.png"; url = "https://upload.wikimedia.org/wikipedia/en/8/87/Carnage_%28Marvel_Comics_character%29.png" },
  @{ file = "thanos.png"; url = "https://upload.wikimedia.org/wikipedia/en/b/b7/Thanos_%28Infobox_image%29.png" },
  @{ file = "loki.jpg"; url = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Tom_Hiddleston_by_Gage_Skidmore.jpg/330px-Tom_Hiddleston_by_Gage_Skidmore.jpg" },
  @{ file = "ultron.png"; url = "https://upload.wikimedia.org/wikipedia/en/7/74/Ultron_%28Marvel_Comics_character%29.png" },
  @{ file = "red-skull.png"; url = "https://upload.wikimedia.org/wikipedia/en/4/4b/Red_Skull_%28Johann_Shmidt%29.png" },
  @{ file = "hela.png"; url = "https://upload.wikimedia.org/wikipedia/en/d/db/Hela.png" },
  @{ file = "killmonger.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/e/e6/Black_Panther_Vol4_37.jpg" },
  @{ file = "mysterio.png"; url = "https://upload.wikimedia.org/wikipedia/en/4/45/Mysterio.png" },
  @{ file = "vulture.png"; url = "https://upload.wikimedia.org/wikipedia/en/4/46/Vulture_%28Adrian_Toomes%29.png" },
  @{ file = "kingpin.png"; url = "https://upload.wikimedia.org/wikipedia/en/5/54/Kingpin_%28Wilson_Grant_Fisk%29.png" }
)

$ok = 0
$skip = 0
$fail = 0

foreach ($entry in $entries) {
  $outFile = Join-Path $dest $entry.file
  if (Test-Path $outFile) {
    Write-Host "SKIP $($entry.file)"
    $skip += 1
    continue
  }

  $success = $false
  for ($attempt = 1; $attempt -le 5; $attempt += 1) {
    try {
      Invoke-WebRequest -Uri $entry.url -OutFile $outFile -Headers $headers -TimeoutSec 45
      Write-Host "OK   $($entry.file) (attempt $attempt)"
      $ok += 1
      $success = $true
      break
    } catch {
      Write-Host "RETRY $($entry.file) (attempt $attempt) => $($_.Exception.Message)"
      Start-Sleep -Seconds (2 + $attempt)
    }
  }

  if (-not $success) {
    Write-Host "FAIL $($entry.file)"
    $fail += 1
  }

  Start-Sleep -Milliseconds 250
}

Write-Host "Done. ok=$ok skip=$skip fail=$fail"
