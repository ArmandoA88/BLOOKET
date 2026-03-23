const fs = require("fs");
const path = require("path");

const MIN_BYTES = 8 * 1024;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Codex NASA Downloader";
const SHOULD_REFRESH = process.argv.includes("--refresh");

const NASA_BLOOK_ASSETS = [
  {
    destination: path.join("public", "assets", "science", "science-lab-rat.jpg"),
    url: "https://images-assets.nasa.gov/image/iss059e027387/iss059e027387~medium.jpg",
    label: "Rodent Research-12 on the ISS"
  },
  {
    destination: path.join("public", "assets", "science", "science-rocket-cadet.jpg"),
    url: "https://images-assets.nasa.gov/image/NHQ202211160028/NHQ202211160028~medium.jpg",
    label: "Artemis I launch"
  },
  {
    destination: path.join("public", "assets", "science", "science-robot-tech.jpg"),
    url: "https://images-assets.nasa.gov/image/iss065e389375/iss065e389375~medium.jpg",
    label: "Astrobee robot aboard the ISS"
  },
  {
    destination: path.join("public", "assets", "science", "science-dna-hacker.jpg"),
    url: "https://images-assets.nasa.gov/image/jsc2018e059572_alt/jsc2018e059572_alt~medium.jpg",
    label: "DNA sequencing in microgravity"
  },
  {
    destination: path.join("public", "assets", "science", "science-circuit-master.jpg"),
    url: "https://images-assets.nasa.gov/image/s123e005945/s123e005945~medium.jpg",
    label: "Dextre robotics on the ISS"
  },
  {
    destination: path.join("public", "assets", "science", "science-nebula-scout.jpg"),
    url: "https://images-assets.nasa.gov/image/carina_nebula/carina_nebula~medium.jpg",
    label: "Carina Nebula from JWST"
  },
  {
    destination: path.join("public", "assets", "science", "science-quantum-chief.jpg"),
    url: "https://images-assets.nasa.gov/image/S112E05142/S112E05142~medium.jpg",
    label: "Canadarm2 over Earth"
  },
  {
    destination: path.join("public", "assets", "science", "science-time-architect.jpg"),
    url: "https://images-assets.nasa.gov/image/PIA12110/PIA12110~medium.jpg",
    label: "Hubble Deep Field"
  },
  {
    destination: path.join("public", "assets", "space", "space-moon-rover.jpg"),
    url: "https://images-assets.nasa.gov/image/as17-137-20979/as17-137-20979~medium.jpg",
    label: "Apollo 17 lunar rover"
  },
  {
    destination: path.join("public", "assets", "space", "space-rocket-buddy.jpg"),
    url: "https://images-assets.nasa.gov/image/NHQ202211160028/NHQ202211160028~medium.jpg",
    label: "Artemis I launch"
  },
  {
    destination: path.join("public", "assets", "space", "space-mars-explorer.jpg"),
    url: "https://images-assets.nasa.gov/image/PIA16764/PIA16764~medium.jpg",
    label: "Curiosity self-portrait"
  },
  {
    destination: path.join("public", "assets", "space", "space-comet-cruiser.jpg"),
    url: "https://images-assets.nasa.gov/image/PIA18153/PIA18153~small.jpg",
    label: "Comet ISON from Hubble"
  },
  {
    destination: path.join("public", "assets", "space", "space-starlight-satellite.jpg"),
    url: "https://images-assets.nasa.gov/image/PIA18165/PIA18165~medium.jpg",
    label: "Hubble above Earth"
  },
  {
    destination: path.join("public", "assets", "space", "space-solar-sailor.jpg"),
    url: "https://images-assets.nasa.gov/image/PIA26681/PIA26681~medium.jpg",
    label: "Solar Dynamics Observatory Sun image"
  },
  {
    destination: path.join("public", "assets", "space", "space-lunar-lander.jpg"),
    url: "https://images-assets.nasa.gov/image/as11-40-5902/as11-40-5902~medium.jpg",
    label: "Apollo 11 lunar surface near the lander"
  },
  {
    destination: path.join("public", "assets", "space", "space-meteor-surfer.jpg"),
    url: "https://images-assets.nasa.gov/image/NHQ202108110003/NHQ202108110003~medium.jpg",
    label: "Perseid meteor shower"
  },
  {
    destination: path.join("public", "assets", "space", "space-saturn-skipper.jpg"),
    url: "https://images-assets.nasa.gov/image/PIA06193/PIA06193~medium.jpg",
    label: "Cassini Saturn portrait"
  },
  {
    destination: path.join("public", "assets", "space", "space-astro-mechanic.jpg"),
    url: "https://images-assets.nasa.gov/image/iss010e20747/iss010e20747~medium.jpg",
    label: "Astronaut during ISS EVA"
  },
  {
    destination: path.join("public", "assets", "space", "space-eclipse-ranger.jpg"),
    url: "https://images-assets.nasa.gov/image/AFRC2017-0233-009/AFRC2017-0233-009~medium.jpg",
    label: "2017 total solar eclipse"
  },
  {
    destination: path.join("public", "assets", "space", "space-nebula-nomad.jpg"),
    url: "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000842/GSFC_20171208_Archive_e000842~medium.jpg",
    label: "Pillars of Creation"
  },
  {
    destination: path.join("public", "assets", "space", "space-gravity-glider.jpg"),
    url: "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000017/GSFC_20171208_Archive_e000017~medium.jpg",
    label: "Hunting Dog Galaxy"
  },
  {
    destination: path.join("public", "assets", "space", "space-aurora-orbiter.jpg"),
    url: "https://images-assets.nasa.gov/image/iss040e124583/iss040e124583~medium.jpg",
    label: "Aurora from the ISS"
  },
  {
    destination: path.join("public", "assets", "space", "space-starforge-pilot.jpg"),
    url: "https://images-assets.nasa.gov/image/PIA04223/PIA04223~medium.jpg",
    label: "Star-forming Thackeray Globules"
  },
  {
    destination: path.join("public", "assets", "space", "space-supernova-sentinel.jpg"),
    url: "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001896/GSFC_20171208_Archive_e001896~medium.jpg",
    label: "Hubble supernova remnant"
  },
  {
    destination: path.join("public", "assets", "space", "space-galaxy-guardian.jpg"),
    url: "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000158/GSFC_20171208_Archive_e000158~medium.jpg",
    label: "Spiral galaxy from Hubble"
  },
  {
    destination: path.join("public", "assets", "space", "space-void-voyager.jpg"),
    url: "https://images-assets.nasa.gov/image/PIA12110/PIA12110~medium.jpg",
    label: "Hubble Deep Field"
  },
  {
    destination: path.join("public", "assets", "space", "space-celestial-observatory.jpg"),
    url: "https://images-assets.nasa.gov/image/GSFC_20161102_2016-21507_012/GSFC_20161102_2016-21507_012~medium.jpg",
    label: "James Webb mirror reveal"
  },
  {
    destination: path.join("public", "assets", "space", "space-cosmic-crown.jpg"),
    url: "https://images-assets.nasa.gov/image/southern_ring_nebula/southern_ring_nebula~medium.jpg",
    label: "Southern Ring Nebula from JWST"
  }
];

function hasUsableAsset(destinationPath) {
  if (!fs.existsSync(destinationPath)) {
    return false;
  }

  const stat = fs.statSync(destinationPath);
  return stat.isFile() && stat.size >= MIN_BYTES;
}

async function downloadImage(url, destinationPath) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": USER_AGENT,
      accept: "image/*,*/*;q=0.8"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Unexpected content type: ${contentType || "unknown"}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < MIN_BYTES) {
    throw new Error(`Downloaded file too small (${buffer.length} bytes)`);
  }

  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.writeFileSync(destinationPath, buffer);
  return { size: buffer.length, contentType, finalUrl: response.url };
}

async function ensureNasaAssets() {
  for (const asset of NASA_BLOOK_ASSETS) {
    const destinationPath = path.join(process.cwd(), asset.destination);

    if (!SHOULD_REFRESH && hasUsableAsset(destinationPath)) {
      console.log(`Keeping ${path.basename(asset.destination)}`);
      continue;
    }

    const result = await downloadImage(asset.url, destinationPath);
    console.log(`Saved ${path.basename(asset.destination)} (${result.contentType}, ${result.size} bytes) for ${asset.label} from ${result.finalUrl}`);
  }
}

async function main() {
  await ensureNasaAssets();
  console.log(SHOULD_REFRESH ? "Refreshed NASA science and space blook images." : "Verified or downloaded NASA science and space blook images.");
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
