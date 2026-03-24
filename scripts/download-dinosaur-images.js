const fs = require("fs");
const path = require("path");

const DINO_DIR = path.join(process.cwd(), "public", "assets", "dinos");
const MIN_BYTES = 8 * 1024;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Codex Dinosaur Downloader";
const SHOULD_REFRESH = process.argv.includes("--refresh");
const REQUEST_DELAY_MS = 900;
const MAX_RETRIES = 4;

const DINOSAUR_IMAGE_SOURCES = [
  {
    file: "dino-tyrannosaurus.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Tyrannosaurus-rex-Profile-steveoc86.png/960px-Tyrannosaurus-rex-Profile-steveoc86.png",
    label: "Tyrannosaurus Rex"
  },
  {
    file: "dino-triceratops.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Triceratops_horridus.png/960px-Triceratops_horridus.png",
    label: "Triceratops"
  },
  {
    file: "dino-velociraptor.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Velociraptor_Restoration.png/960px-Velociraptor_Restoration.png",
    label: "Velociraptor"
  },
  {
    file: "dino-stegosaurus.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Stegosaurus_stenops.png/960px-Stegosaurus_stenops.png",
    label: "Stegosaurus"
  },
  {
    file: "dino-brachiosaurus.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Brachiosaurus_DB.jpg/960px-Brachiosaurus_DB.jpg",
    label: "Brachiosaurus"
  },
  {
    file: "dino-spinosaurus.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Spinosaurus_LM.png/960px-Spinosaurus_LM.png",
    label: "Spinosaurus"
  },
  {
    file: "dino-ankylosaurus.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Ankylosaurus_magniventris_by_sphenaphinae.png/960px-Ankylosaurus_magniventris_by_sphenaphinae.png",
    label: "Ankylosaurus"
  },
  {
    file: "dino-parasaurolophus.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Parasaurolophus_walkeri.png/960px-Parasaurolophus_walkeri.png",
    label: "Parasaurolophus"
  },
  {
    file: "dino-allosaurus.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Allosaurus_Life_Restoration.jpg/960px-Allosaurus_Life_Restoration.jpg",
    label: "Allosaurus"
  },
  {
    file: "dino-iguanodon.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Iguanodon_galvensis.png/960px-Iguanodon_galvensis.png",
    label: "Iguanodon"
  },
  {
    file: "dino-carnotaurus.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Carnotaurus_life_restoration_%28mirrored%29.jpg/960px-Carnotaurus_life_restoration_%28mirrored%29.jpg",
    label: "Carnotaurus"
  },
  {
    file: "dino-dilophosaurus.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Dilophosaurus_wetherilli_%28flipped%29.PNG/960px-Dilophosaurus_wetherilli_%28flipped%29.PNG",
    label: "Dilophosaurus"
  },
  {
    file: "dino-pachycephalosaurus.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Pachycephalosaurus_Reconstruction.jpg/960px-Pachycephalosaurus_Reconstruction.jpg",
    label: "Pachycephalosaurus"
  },
  {
    file: "dino-deinonychus.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Deinonychus_Restoration.png/960px-Deinonychus_Restoration.png",
    label: "Deinonychus"
  },
  {
    file: "dino-giganotosaurus.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Giganotosaurus_carolinii_by_durbed.jpg/960px-Giganotosaurus_carolinii_by_durbed.jpg",
    label: "Giganotosaurus"
  },
  {
    file: "dino-corythosaurus.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Corythosaurus_restoration.jpg",
    label: "Corythosaurus"
  },
  {
    file: "dino-styracosaurus.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Styracosaurus_01_%28update%29.png/960px-Styracosaurus_01_%28update%29.png",
    label: "Styracosaurus"
  },
  {
    file: "dino-therizinosaurus.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Therizinosaurus_cheloniformis_restoration.jpg/960px-Therizinosaurus_cheloniformis_restoration.jpg",
    label: "Therizinosaurus"
  },
  {
    file: "dino-argentinosaurus.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/fb/Argentinosaurus_digital_clay_reconstruction.png",
    label: "Argentinosaurus"
  },
  {
    file: "dino-microraptor.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b9/Microraptor_mmartyniuk_true_colors.png",
    label: "Microraptor"
  }
];

function hasUsableAsset(destinationPath) {
  if (!fs.existsSync(destinationPath)) {
    return false;
  }

  const stat = fs.statSync(destinationPath);
  return stat.isFile() && stat.size >= MIN_BYTES;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, label) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }

      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`${label} returned HTTP ${response.status}`);
        await sleep(REQUEST_DELAY_MS * attempt);
        continue;
      }

      throw new Error(`${label} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt >= MAX_RETRIES) {
        break;
      }
      await sleep(REQUEST_DELAY_MS * attempt);
    }
  }

  throw lastError || new Error(`Unable to fetch ${label}`);
}

async function downloadImage(url, destinationPath) {
  const response = await fetchWithRetry(url, {
    redirect: "follow",
    headers: {
      "user-agent": USER_AGENT,
      accept: "image/*,*/*;q=0.8"
    }
  }, url);

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

async function ensureDinosaurAssets() {
  fs.mkdirSync(DINO_DIR, { recursive: true });

  for (const asset of DINOSAUR_IMAGE_SOURCES) {
    const destinationPath = path.join(DINO_DIR, asset.file);

    if (!SHOULD_REFRESH && hasUsableAsset(destinationPath)) {
      console.log(`Keeping ${asset.file}`);
      continue;
    }

    const result = await downloadImage(asset.url, destinationPath);
    console.log(`Saved ${asset.file} (${result.contentType}, ${result.size} bytes) for ${asset.label} from ${result.finalUrl}`);
    await sleep(REQUEST_DELAY_MS);
  }
}

async function main() {
  await ensureDinosaurAssets();
  console.log(SHOULD_REFRESH ? "Refreshed Dinosaur Pack paleoart images." : "Verified or downloaded Dinosaur Pack paleoart images.");
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
