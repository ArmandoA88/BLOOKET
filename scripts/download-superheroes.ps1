$RefreshRequested = $args -contains "-Refresh" -or $args -contains "--refresh"
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
  @{ file = "iron-man.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/f/f2/Robert_Downey_Jr._as_Tony_Stark_in_Avengers_Infinity_War.jpg" },
  @{ file = "captain-america-steve.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/9/9e/Captain_America_The_Winter_Soldier_poster.jpg" },
  @{ file = "captain-america-sam.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/thumb/8/8c/Anthony_Mackie_as_Captain_America.jpeg/330px-Anthony_Mackie_as_Captain_America.jpeg" },
  @{ file = "thor.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/3/3c/Chris_Hemsworth_as_Thor.jpg" },
  @{ file = "hulk.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/c/cd/Edward_Norton_and_Mark_Ruffalo_as_Bruce_Banner_Hulk.jpg" },
  @{ file = "black-widow.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/f/f6/Scarlett_Johansson_as_Black_Widow.jpg" },
  @{ file = "hawkeye.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/d/da/Jeremy_Renner_as_Hawkeye.jpg" },
  @{ file = "doctor-strange.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/1/18/Benedict_Cumberbatch_as_Doctor_Strange.jpeg" },
  @{ file = "scarlet-witch.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/d/d9/Elizabeth_Olsen_as_Wanda_Maximoff.jpg" },
  @{ file = "black-panther.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/1/1a/Chadwick_Boseman_as_T%27Challa.jpg" },
  @{ file = "captain-marvel.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/f/f1/Brie_Larson_as_Carol_Danvers.jpeg" },
  @{ file = "ant-man.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/8/88/Paul_Rudd_as_Ant-Man.jpg" },
  @{ file = "wasp.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/6/6e/Evangeline_Lilly_as_Wasp.jpeg" },
  @{ file = "winter-soldier.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/4/4b/Sebastian_Stan_as_Bucky_Barnes.jpg" },
  @{ file = "war-machine.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/b/b7/Terrence_Howard_and_Don_Cheadle_as_James_Rhodes.jpg" },
  @{ file = "vision.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/thumb/f/fc/Paul_Bettany_as_Vision.jpg/330px-Paul_Bettany_as_Vision.jpg" },
  @{ file = "shang-chi.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/d/de/Simu_Liu_as_Shang-Chi.jpg" },
  @{ file = "star-lord.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/b/b2/Chris_Pratt_as_Peter_Quill.jpeg" },
  @{ file = "gamora.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/5/54/Zoe_Saldana_as_Gamora.jpeg" },
  @{ file = "groot.png"; url = "https://upload.wikimedia.org/wikipedia/en/3/3b/Groot.png" },
  @{ file = "rocket.png"; url = "https://upload.wikimedia.org/wikipedia/en/f/fc/Rocket_Raccoon_singing_in_a_spaceship%2C_from_Guardians_of_the_Galaxy_Vol_3%2C_2023.png" },
  @{ file = "drax.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/3/3d/Dave_Bautista_as_Drax.jpg" },
  @{ file = "deadpool.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/f/fb/Ryan_Reynolds_as_Deadpool_2016.jpg" },
  @{ file = "batman.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/a/a4/Unmasked_Batman_DCEU.jpg" },
  @{ file = "superman.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/d/d6/Superman_Man_of_Steel.jpg" },
  @{ file = "wonder-woman.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/e/e1/Gal_Gadot_as_Wonder_Woman.jpg" },
  @{ file = "aquaman.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/b/b2/Jason_Momoa_as_Aquaman.jpg" },
  @{ file = "flash.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/thumb/c/cd/EzraFlash.jpg/250px-EzraFlash.jpg" },
  @{ file = "shazam.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/c/c2/Shazam%21_%28film%29_poster.jpg" },
  @{ file = "blue-beetle.jpg"; url = "https://upload.wikimedia.org/wikipedia/en/6/68/Blue_Beetle_%28film%29_poster.jpg" },
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
  if ((-not $RefreshRequested) -and (Test-Path $outFile)) {
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
