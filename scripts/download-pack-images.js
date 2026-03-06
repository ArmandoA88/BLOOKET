const fs = require("fs");
const path = require("path");
const { BOOK_LEGENDS_BLOOKS } = require("../data/pack-blooks");

const BOOKS_DIR = path.join(process.cwd(), "public", "assets", "books");

const BOOK_QUERIES = {
  "book-harry": "Harry Potter and the Sorcerer's Stone",
  "book-hermione": "Harry Potter and the Sorcerer's Stone",
  "book-ron": "Harry Potter and the Sorcerer's Stone",
  "book-matilda": "Matilda Roald Dahl",
  "book-greg": "Diary of a Wimpy Kid",
  "book-percy": "The Lightning Thief",
  "book-alice": "Alice's Adventures in Wonderland",
  "book-dorothy": "The Wonderful Wizard of Oz",
  "book-charlie": "Charlie and the Chocolate Factory",
  "book-wonka": "Charlie and the Chocolate Factory",
  "book-peter": "Peter Pan",
  "book-pippi": "Pippi Longstocking",
  "book-paddington": "A Bear Called Paddington",
  "book-pooh": "Winnie-the-Pooh",
  "book-charlotte": "Charlotte's Web",
  "book-wilbur": "Charlotte's Web",
  "book-stuart": "Stuart Little",
  "book-cat-hat": "The Cat in the Hat",
  "book-horton": "Horton Hears a Who!",
  "book-dogman": "Dog Man",
  "book-underpants": "The Adventures of Captain Underpants",
  "book-auggie": "Wonder R. J. Palacio",
  "book-ivan": "The One and Only Ivan",
  "book-mercy": "Mercy Watson to the Rescue",
  "book-junie": "Junie B. Jones and the Stupid Smelly Bus",
  "book-geronimo": "Geronimo Stilton The Lost Treasure of the Emerald Eye",
  "book-frizzle": "The Magic School Bus Inside the Earth",
  "book-arthur": "Arthur's Nose",
  "book-clifford": "Clifford the Big Red Dog",
  "book-george": "Curious George"
};

async function fetchJson(url) {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "user-agent": "BlooketLocalAssetDownloader/1.0"
      }
    });
    if (response.ok) {
      return response.json();
    }
    if (response.status !== 429 || attempt === 6) {
      throw new Error(`Request failed ${response.status}: ${url}`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 2500));
  }
}

async function downloadFile(url, destinationPath) {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "user-agent": "BlooketLocalAssetDownloader/1.0"
      }
    });
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      fs.writeFileSync(destinationPath, Buffer.from(arrayBuffer));
      return;
    }
    if (response.status !== 429 || attempt === 8) {
      throw new Error(`Download failed ${response.status}: ${url}`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
  }
}

async function resolveOpenLibraryCoverUrl(query) {
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=12`;
  const payload = await fetchJson(url);
  const docs = Array.isArray(payload?.docs) ? payload.docs : [];
  const match = docs.find((entry) => Number.isFinite(Number(entry?.cover_i)));
  if (!match) {
    throw new Error(`No Open Library cover found for "${query}"`);
  }
  return `https://covers.openlibrary.org/b/id/${match.cover_i}-L.jpg`;
}

async function downloadBookImages() {
  fs.mkdirSync(BOOKS_DIR, { recursive: true });
  for (const blook of BOOK_LEGENDS_BLOOKS) {
    const query = BOOK_QUERIES[blook.id];
    if (!query) {
      throw new Error(`Missing book query mapping for ${blook.id}`);
    }
    const destinationPath = path.join(BOOKS_DIR, path.basename(blook.image));
    if (fs.existsSync(destinationPath) && fs.statSync(destinationPath).size > 0) {
      console.log(`Skipped existing book image for ${blook.name}`);
      continue;
    }
    const imageUrl = await resolveOpenLibraryCoverUrl(query);
    await downloadFile(imageUrl, destinationPath);
    console.log(`Downloaded book image for ${blook.name}`);
  }
}

async function main() {
  await downloadBookImages();
  console.log("Downloaded internet images for Book Legends.");
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
