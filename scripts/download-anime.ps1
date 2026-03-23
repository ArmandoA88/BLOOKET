# Download anime protagonist images from Jikan API (MyAnimeList proxy)
$dest = "public\assets\anime"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

# Character IDs on MyAnimeList
$characters = @(
  @{ id=17;    file="naruto.jpg";    name="Naruto"   },
  @{ id=40;    file="luffy.jpg";     name="Luffy"    },
  @{ id=246;   file="goku.jpg";      name="Goku"     },
  @{ id=5;     file="ichigo.jpg";    name="Ichigo"   },
  @{ id=11;    file="edward.jpg";    name="Edward"   },
  @{ id=13;    file="sasuke.jpg";    name="Sasuke"   },
  @{ id=3;     file="killua.jpg";    name="Killua"   },
  @{ id=2104;  file="gohan.jpg";     name="Gohan"    },
  @{ id=417;   file="lelouch.jpg";   name="Lelouch"  },
  @{ id=80;    file="light.jpg";     name="Light"    },
  @{ id=1;     file="spike.jpg";     name="Spike"    },
  @{ id=22475; file="saitama.jpg";   name="Saitama"  },
  @{ id=36765; file="kirito.jpg";    name="Kirito"   },
  @{ id=40881; file="eren.jpg";      name="Eren"     },
  @{ id=34219; file="levi.jpg";      name="Levi"     },
  @{ id=124785;file="deku.jpg";      name="Deku"     },
  @{ id=163268;file="tanjiro.jpg";   name="Tanjiro"  },
  @{ id=913;   file="vegeta.jpg";    name="Vegeta"   },
  @{ id=152043;file="rimuru.jpg";    name="Rimuru"   },
  @{ id=2707;  file="trunks.jpg";    name="Trunks"   }
)

$headers = @{ "User-Agent" = "BlooketArcade/1.0" }

foreach ($char in $characters) {
  $outFile = Join-Path $dest $char.file
  if (Test-Path $outFile) {
    Write-Host "SKIP $($char.name) (exists)"
    continue
  }
  try {
    $apiUrl = "https://api.jikan.moe/v4/characters/$($char.id)/pictures"
    Write-Host "Fetching $($char.name) from $apiUrl ..."
    $resp = Invoke-RestMethod -Uri $apiUrl -Headers $headers -TimeoutSec 15
    Start-Sleep -Milliseconds 400   # respect Jikan rate limit
    $imgUrl = $resp.data[0].jpg.image_url
    if (-not $imgUrl) { Write-Host "  No image for $($char.name)"; continue }
    Write-Host "  Downloading $imgUrl"
    Invoke-WebRequest -Uri $imgUrl -OutFile $outFile -Headers $headers -TimeoutSec 20
    Write-Host "  Saved $($char.file)"
  } catch {
    Write-Host "  ERROR for $($char.name): $_"
  }
}

Write-Host "Done."
