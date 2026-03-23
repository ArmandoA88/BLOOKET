const fs = require("fs");
const path = require("path");
const { BOOK_LEGENDS_BLOOKS } = require("../data/pack-blooks");

const BOOKS_DIR = path.join(process.cwd(), "public", "assets", "books");
const MIN_BYTES = 4 * 1024;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Codex Book Legends Downloader";
const SHOULD_REFRESH = process.argv.includes("--refresh");

const BOOK_LEGENDS_IMAGE_SOURCES = {
  "harry-potter.jpg": [
    "https://static.wikia.nocookie.net/harrypotter/images/c/ce/Harry_Potter_DHF1.jpg/revision/latest?cb=20140603201724&format=original"
  ],
  "hermione-granger.jpg": [
    "https://static.wikia.nocookie.net/harrypotter/images/3/34/Hermione_Granger.jpg/revision/latest?cb=20251206062840&format=original"
  ],
  "ron-weasley.jpg": [
    "https://static.wikia.nocookie.net/harrypotter/images/4/44/Ronald_Weasley_DHF1.jpg/revision/latest?cb=20101104210200&format=original"
  ],
  "matilda.png": [
    "https://static.wikia.nocookie.net/matilda/images/c/cc/977B8275-B8EC-4998-B871-49700EB4154D.png/revision/latest?cb=20190725111626&format=original"
  ],
  "greg-heffley.png": [
    "https://static.wikia.nocookie.net/doawk/images/2/24/Character-_Greg_Heffley.png/revision/latest?cb=20230302144857&format=original"
  ],
  "percy-jackson.jpg": [
    "https://static.wikia.nocookie.net/olympians/images/1/10/Percy_Jackson.jpg/revision/latest?cb=20180319172727&format=original"
  ],
  "alice.jpg": [
    "https://static.wikia.nocookie.net/aliceinwonderland/images/b/bc/Teatimealice.jpg/revision/latest?cb=20140404080433&format=original"
  ],
  "dorothy.png": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/The_Wonderful_Wizard_of_Oz%2C_006.png/330px-The_Wonderful_Wizard_of_Oz%2C_006.png"
  ],
  "charlie-bucket.jpg": [
    "https://static.wikia.nocookie.net/charlieandthechocolatefactoryfilm/images/c/c7/13868598026798l-1-.jpg/revision/latest?cb=20150912184131&format=original"
  ],
  "willy-wonka.png": [
    "https://static.wikia.nocookie.net/charlieandthechocolatefactoryfilm/images/8/82/Wonka_2005.png/revision/latest?cb=20240330045911&format=original"
  ],
  "peter-pan.jpg": [
    "https://static.wikia.nocookie.net/peterpan/images/8/81/Peter_pan_by_brian_froud.jpg/revision/latest?cb=20150614221615&format=original"
  ],
  "pippi.jpg": [
    "https://upload.wikimedia.org/wikipedia/en/7/78/L%C3%A5ngstrump_G%C3%A5r_Ombord.jpeg"
  ],
  "paddington.png": [
    "https://static.wikia.nocookie.net/paddingtonbear/images/0/00/Paddington_2.png/revision/latest?cb=20171111120746&format=original",
    "https://static.wikia.nocookie.net/paddingtonbear/images/7/77/Paddington_3.png/revision/latest?cb=20171111120812&format=original"
  ],
  "pooh.png": [
    "https://upload.wikimedia.org/wikipedia/commons/6/67/Winnie-the-Pooh_166-1.png",
    "https://upload.wikimedia.org/wikipedia/commons/0/0b/Winnie-the-Pooh_67.png"
  ],
  "charlotte.jpg": [
    "https://static.wikia.nocookie.net/charlottesweb/images/f/f5/Charlotte_A._Cavatica.jpg/revision/latest?cb=20190628214916&format=original"
  ],
  "wilbur.jpg": [
    "https://static.wikia.nocookie.net/charlottesweb/images/6/69/Live_Action_Wilbur.jpg/revision/latest?cb=20190315234641&format=original"
  ],
  "stuart-little.png": [
    "https://static.wikia.nocookie.net/stuartlittle/images/2/27/Stuart_Little_Michael_J._Fox.png/revision/latest?cb=20211127104326&format=original"
  ],
  "cat-hat.png": [
    "https://static.wikia.nocookie.net/seuss/images/b/b5/CatintheHat.png/revision/latest?cb=20260215171125&format=original"
  ],
  "horton.png": [
    "https://static.wikia.nocookie.net/seuss/images/7/74/A5FE6F93-F4B6-4CD4-A646-928B8F0FD057.png/revision/latest?cb=20200414142007&format=original"
  ],
  "dogman.png": [
    "https://static.wikia.nocookie.net/dog-man/images/7/7f/Dog_man.png/revision/latest?cb=20250808082810&format=original"
  ],
  "captain-underpants.png": [
    "https://static.wikia.nocookie.net/captainunderpants/images/c/c1/Capt-character-captainunderpants.png/revision/latest?cb=20200503124947&format=original"
  ],
  "auggie.jpg": [
    "https://static.wikia.nocookie.net/rjpalacioswonder/images/c/c1/4E09D7C0-304D-43C1-8D85-293BB9C4432E.jpeg/revision/latest?cb=20171121084008&format=original"
  ],
  "ivan.jpg": [
    "https://static.wikia.nocookie.net/disney/images/9/9c/Ivan.JPG/revision/latest?cb=20100705214859&format=original"
  ],
  "mercy-watson.jpg": [
    "https://www.mercywatson.com/wp-content/uploads/2015/08/book1-04.jpg"
  ],
  "junie-b-jones.png": [
    "https://static.wikia.nocookie.net/juniebjonesbooks/images/b/bd/Junie_b_kinder.png/revision/latest?cb=20220711043535&format=original"
  ],
  "geronimo-stilton.jpg": [
    "https://static.wikia.nocookie.net/geronimostilton/images/8/88/Geronimo_Stilton_%281%29.jpg/revision/latest?cb=20150725045219&format=original"
  ],
  "ms-frizzle.jpg": [
    "https://static.wikia.nocookie.net/magicschoolbus/images/4/41/Valerie_Frizzle_Bruce_Degen.jpg/revision/latest?cb=20260115025758&format=original"
  ],
  "arthur.png": [
    "https://static.wikia.nocookie.net/arthur/images/d/dd/Arthur_full.png/revision/latest?cb=20231110024600&format=original"
  ],
  "clifford.png": [
    "https://static.wikia.nocookie.net/clifford/images/0/03/Nose_In_a_Book.png/revision/latest?cb=20200105175816&format=original"
  ],
  "curious-george.png": [
    "https://static.wikia.nocookie.net/curious-george/images/d/d8/Curious_George.png/revision/latest?cb=20180109005518&format=original"
  ]
};

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

  fs.writeFileSync(destinationPath, buffer);
  return { size: buffer.length, contentType, finalUrl: response.url };
}

async function ensureBookCharacterAssets() {
  fs.mkdirSync(BOOKS_DIR, { recursive: true });

  for (const blook of BOOK_LEGENDS_BLOOKS) {
    const filename = path.basename(blook.image);
    const destinationPath = path.join(BOOKS_DIR, filename);

    if (!SHOULD_REFRESH && hasUsableAsset(destinationPath)) {
      console.log(`Keeping ${filename}`);
      continue;
    }

    const sources = BOOK_LEGENDS_IMAGE_SOURCES[filename];
    if (!sources || sources.length === 0) {
      throw new Error(`Missing Book Legends image sources for ${filename}`);
    }

    const failures = [];
    let downloaded = false;

    for (const source of sources) {
      try {
        const result = await downloadImage(source, destinationPath);
        console.log(`Saved ${filename} (${result.contentType}, ${result.size} bytes) from ${result.finalUrl}`);
        downloaded = true;
        break;
      } catch (error) {
        failures.push(`${source} -> ${error?.message || error}`);
      }
    }

    if (!downloaded) {
      throw new Error(`Unable to download ${filename}:\n${failures.join("\n")}`);
    }
  }
}

async function main() {
  await ensureBookCharacterAssets();
  console.log(SHOULD_REFRESH ? "Refreshed Book Legends internet character art." : "Verified or downloaded Book Legends internet character art.");
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
