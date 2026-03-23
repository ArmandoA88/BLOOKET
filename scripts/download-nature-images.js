const fs = require("fs");
const path = require("path");

const NATURE_DIR = path.join(process.cwd(), "public", "assets", "nature");
const MIN_BYTES = 8 * 1024;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Codex Nature Downloader";
const SHOULD_REFRESH = process.argv.includes("--refresh");
const REQUEST_DELAY_MS = 900;
const MAX_RETRIES = 4;

const NATURE_IMAGE_SOURCES = [
  { file: "dolphin.jpg", title: "Bottlenose_dolphin" },
  { file: "red-panda.jpg", title: "Red_panda" },
  { file: "sea-otter.jpg", title: "Sea_otter" },
  { file: "bald-eagle.jpg", title: "Bald_eagle" },
  { file: "black-panther.jpg", title: "Black_panther" },
  { file: "arctic-fox.jpg", title: "Arctic_fox" },
  { file: "sea-turtle.jpg", title: "Green_sea_turtle" },
  { file: "snow-leopard.jpg", title: "Snow_leopard" }
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

async function fetchWikipediaThumbnail(title) {
  const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=900&titles=${encodeURIComponent(title)}`;
  const response = await fetchWithRetry(apiUrl, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "application/json"
    }
  }, `Wikipedia API for ${title}`);

  const payload = await response.json();
  const page = Object.values(payload?.query?.pages || {})[0];
  const thumbnailUrl = page?.thumbnail?.source;
  if (!thumbnailUrl) {
    throw new Error(`No thumbnail found for ${title}`);
  }

  return thumbnailUrl;
}

async function downloadImage(url, destinationPath) {
  const response = await fetchWithRetry(url, {
    redirect: "follow",
    headers: {
      "user-agent": USER_AGENT,
      accept: "image/*,*/*;q=0.8"
    }
  }, url);

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Unexpected content type: ${contentType || "unknown"}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < MIN_BYTES) {
    throw new Error(`Downloaded file too small (${buffer.length} bytes)`);
  }

  fs.writeFileSync(destinationPath, buffer);
  return { size: buffer.length, contentType, finalUrl: response.url };
}

async function ensureNatureAssets() {
  fs.mkdirSync(NATURE_DIR, { recursive: true });

  for (const asset of NATURE_IMAGE_SOURCES) {
    const destinationPath = path.join(NATURE_DIR, asset.file);

    if (!SHOULD_REFRESH && hasUsableAsset(destinationPath)) {
      console.log(`Keeping ${asset.file}`);
      continue;
    }

    const sourceUrl = await fetchWikipediaThumbnail(asset.title);
    const result = await downloadImage(sourceUrl, destinationPath);
    console.log(`Saved ${asset.file} (${result.contentType}, ${result.size} bytes) from ${result.finalUrl}`);
    await sleep(REQUEST_DELAY_MS);
  }
}

async function main() {
  await ensureNatureAssets();
  console.log(SHOULD_REFRESH ? "Refreshed Nature Pack wildlife photos." : "Verified or downloaded Nature Pack wildlife photos.");
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
