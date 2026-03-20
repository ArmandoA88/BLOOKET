const path = require("path");
const os = require("os");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const XLSX = require("xlsx");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { BOOK_LEGENDS_BLOOKS } = require("./data/pack-blooks");

const PORT = process.env.PORT || 3000;
const GAME_CODE_LENGTH = 6;
const GAME_IDLE_TTL_MS = 3 * 60 * 60 * 1000;
const REPORT_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-local-session-secret";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_AUTH_ENABLED = GOOGLE_CLIENT_ID.length > 0 && GOOGLE_CLIENT_SECRET.length > 0;

const QUESTION_BANK = [
  {
    prompt: "What does CPU stand for?",
    options: ["Central Processing Unit", "Computer Program Utility", "Central Peripheral Unit", "Compute Power Unit"],
    answerIndex: 0,
    explanation: "CPU means Central Processing Unit."
  },
  {
    prompt: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Mercury"],
    answerIndex: 1,
    explanation: "Mars appears red due to iron oxide on its surface."
  },
  {
    prompt: "What is 9 x 7?",
    options: ["56", "63", "72", "49"],
    answerIndex: 1,
    explanation: "9 multiplied by 7 is 63."
  },
  {
    prompt: "Which language runs natively in the browser?",
    options: ["Java", "Python", "JavaScript", "C#"],
    answerIndex: 2,
    explanation: "JavaScript is the browser's native scripting language."
  },
  {
    prompt: "What gas do plants absorb from the atmosphere?",
    options: ["Oxygen", "Hydrogen", "Nitrogen", "Carbon dioxide"],
    answerIndex: 3,
    explanation: "Plants absorb carbon dioxide during photosynthesis."
  },
  {
    prompt: "Who wrote 'Romeo and Juliet'?",
    options: ["William Shakespeare", "Jane Austen", "Charles Dickens", "Mark Twain"],
    answerIndex: 0,
    explanation: "Shakespeare wrote Romeo and Juliet."
  },
  {
    prompt: "What is the largest ocean on Earth?",
    options: ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"],
    answerIndex: 2,
    explanation: "The Pacific Ocean is the largest."
  },
  {
    prompt: "Which data structure uses FIFO ordering?",
    options: ["Stack", "Queue", "Tree", "Graph"],
    answerIndex: 1,
    explanation: "Queue is first-in, first-out."
  },
  {
    prompt: "How many degrees are in a right angle?",
    options: ["45", "90", "120", "180"],
    answerIndex: 1,
    explanation: "A right angle is 90 degrees."
  },
  {
    prompt: "Which country is home to the city of Kyoto?",
    options: ["China", "Japan", "South Korea", "Thailand"],
    answerIndex: 1,
    explanation: "Kyoto is in Japan."
  },
  {
    prompt: "What does HTML stand for?",
    options: ["HyperText Markup Language", "HighText Machine Language", "Hyperlink Tool Markup Language", "Home Tool Markup Language"],
    answerIndex: 0,
    explanation: "HTML stands for HyperText Markup Language."
  },
  {
    prompt: "Which organ pumps blood through the human body?",
    options: ["Liver", "Lungs", "Heart", "Kidney"],
    answerIndex: 2,
    explanation: "The heart pumps blood through the body."
  },
  {
    prompt: "What is the capital of Canada?",
    options: ["Toronto", "Vancouver", "Ottawa", "Montreal"],
    answerIndex: 2,
    explanation: "Ottawa is the capital city of Canada."
  },
  {
    prompt: "In coding, what does API stand for?",
    options: ["Applied Programming Interface", "Application Programming Interface", "Advanced Program Integration", "Automated Process Instruction"],
    answerIndex: 1,
    explanation: "API means Application Programming Interface."
  },
  {
    prompt: "What is the square root of 144?",
    options: ["10", "11", "12", "14"],
    answerIndex: 2,
    explanation: "12 * 12 equals 144."
  },
  {
    prompt: "Which continent has the most countries?",
    options: ["Africa", "Europe", "Asia", "South America"],
    answerIndex: 0,
    explanation: "Africa has the highest number of countries."
  },
  {
    prompt: "Which file extension is used for JSON files?",
    options: [".jsn", ".json", ".jv", ".data"],
    answerIndex: 1,
    explanation: "JSON files use the .json extension."
  },
  {
    prompt: "What is H2O commonly known as?",
    options: ["Hydrogen Peroxide", "Salt", "Water", "Ozone"],
    answerIndex: 2,
    explanation: "H2O is water."
  },
  {
    prompt: "Which musician is known as the 'King of Pop'?",
    options: ["Elvis Presley", "Michael Jackson", "Prince", "Stevie Wonder"],
    answerIndex: 1,
    explanation: "Michael Jackson is widely known as the King of Pop."
  },
  {
    prompt: "What does CSS primarily control in web development?",
    options: ["Database queries", "Server routing", "Page styling", "Unit testing"],
    answerIndex: 2,
    explanation: "CSS controls presentation and styling."
  },
  {
    prompt: "Which number is prime?",
    options: ["21", "29", "35", "49"],
    answerIndex: 1,
    explanation: "29 is a prime number."
  },
  {
    prompt: "Which layer of Earth is liquid and surrounds the inner core?",
    options: ["Crust", "Mantle", "Outer core", "Lithosphere"],
    answerIndex: 2,
    explanation: "The outer core is liquid and surrounds the inner core."
  },
  {
    prompt: "What command initializes a new npm project?",
    options: ["npm start", "npm init", "npm install", "npm create"],
    answerIndex: 1,
    explanation: "npm init starts a new npm project setup."
  },
  {
    prompt: "Which U.S. state is known as the Sunshine State?",
    options: ["California", "Florida", "Texas", "Arizona"],
    answerIndex: 1,
    explanation: "Florida is called the Sunshine State."
  }
];

const QUESTION_SET_CONFIG = {
  multiplication_1_digit: {
    id: "multiplication_1_digit",
    label: "Multiplication 1-Digit",
    source: "built_in",
    category: "Math",
    tags: ["math", "multiplication", "facts"]
  },
  general_knowledge: {
    id: "general_knowledge",
    label: "General Knowledge",
    source: "built_in",
    category: "General",
    tags: ["trivia", "mixed"]
  }
};
const CUSTOM_QUIZZES_DATA_FILE = path.join(__dirname, "data", "custom-quizzes.json");
const QUIZ_UPLOAD_ALLOWED_EXTENSIONS = new Set([".csv", ".xlsx", ".xls", ".json"]);
const customQuestionSets = new Map();
const MINIGAME_STATS_FILE = path.join(__dirname, "data", "minigame-stats.json");

const BLOOK_PACKS = [
  {
    id: "athletes",
    name: "Legendary Athletes",
    description: "20 world-class icons from NFL, NBA, MLB, and Soccer. High-quality portraits!",
    price: 0,
    blooks: [
      { id: "ath-mahomes", name: "Patrick Mahomes", image: "/assets/athletes/ath-mahomes.png", icon: "🏈", rarity: "Common", sport: "NFL" },
      { id: "ath-brady", name: "Tom Brady", image: "/assets/athletes/ath-brady.png", icon: "🏈", rarity: "Common", sport: "NFL" },
      { id: "ath-lebron", name: "LeBron James", image: "/assets/athletes/ath-lebron.png", icon: "🏀", rarity: "Common", sport: "NBA" },
      { id: "ath-curry", name: "Stephen Curry", image: "/assets/athletes/ath-curry.png", icon: "🏀", rarity: "Common", sport: "NBA" },
      { id: "ath-messi", name: "Lionel Messi", image: "/assets/athletes/ath-messi.png", icon: "⚽", rarity: "Common", sport: "Soccer" },
      { id: "ath-ronaldo", name: "Cristiano Ronaldo", image: "/assets/athletes/ath-ronaldo.png", icon: "⚽", rarity: "Common", sport: "Soccer" },
      { id: "ath-ohtani", name: "Shohei Ohtani", image: "/assets/athletes/ath-ohtani.png", icon: "⚾", rarity: "Common", sport: "MLB" },
      { id: "ath-judge", name: "Aaron Judge", image: "/assets/athletes/ath-judge.png", icon: "⚾", rarity: "Common", sport: "MLB" },
      { id: "ath-durant", name: "Kevin Durant", image: "/assets/athletes/ath-durant.png", icon: "🏀", rarity: "Common", sport: "NBA" },
      { id: "ath-giannis", name: "Giannis Antetokounmpo", image: "/assets/athletes/ath-giannis.png", icon: "🏀", rarity: "Common", sport: "NBA" },
      { id: "ath-luka", name: "Luka Doncic", image: "/assets/athletes/ath-luka.png", icon: "🏀", rarity: "Common", sport: "NBA" },
      { id: "ath-haaland", name: "Erling Haaland", image: "/assets/athletes/ath-haaland.png", icon: "⚽", rarity: "Common", sport: "Soccer" },
      { id: "ath-mbappe", name: "Kylian Mbappe", image: "/assets/athletes/ath-mbappe.png", icon: "⚽", rarity: "Common", sport: "Soccer" },
      { id: "ath-jackson", name: "Lamar Jackson", image: "/assets/athletes/ath-jackson.png", icon: "🏈", rarity: "Common", sport: "NFL" },
      { id: "ath-kelce", name: "Travis Kelce", image: "/assets/athletes/ath-kelce.png", icon: "🏈", rarity: "Common", sport: "NFL" },
      { id: "ath-allen", name: "Josh Allen", image: "/assets/athletes/ath-allen.png", icon: "🏈", rarity: "Common", sport: "NFL" },
      { id: "ath-burrow", name: "Joe Burrow", image: "/assets/athletes/ath-burrow.png", icon: "🏈", rarity: "Common", sport: "NFL" },
      { id: "ath-hill", name: "Tyreek Hill", image: "/assets/athletes/ath-hill.png", icon: "🏈", rarity: "Common", sport: "NFL" },
      { id: "ath-trout", name: "Mike Trout", image: "/assets/athletes/ath-trout.png", icon: "⚾", rarity: "Common", sport: "MLB" },
      { id: "ath-harper", name: "Bryce Harper", image: "/assets/athletes/ath-harper.png", icon: "⚾", rarity: "Common", sport: "MLB" }
    ]
  },
  {
    id: "sports",
    name: "Sports Pack",
    description: "20 elite NFL and World Soccer teams with real logos. Pick a champion!",
    price: 0,
    blooks: [
      { id: "nfl-chiefs", name: "Kansas City Chiefs", image: "/assets/sports/nfl-chiefs.png", icon: "🏈", rarity: "Common", sport: "NFL" },
      { id: "nfl-49ers", name: "SF 49ers", image: "/assets/sports/nfl-49ers.png", icon: "🏈", rarity: "Common", sport: "NFL" },
      { id: "nfl-eagles", name: "Philadelphia Eagles", image: "/assets/sports/nfl-eagles.png", icon: "🦅", rarity: "Common", sport: "NFL" },
      { id: "nfl-ravens", name: "Baltimore Ravens", image: "/assets/sports/nfl-ravens.png", icon: "🐦", rarity: "Common", sport: "NFL" },
      { id: "nfl-cowboys", name: "Dallas Cowboys", image: "/assets/sports/nfl-cowboys.png", icon: "⭐", rarity: "Common", sport: "NFL" },
      { id: "nfl-bills", name: "Buffalo Bills", image: "/assets/sports/nfl-bills.png", icon: "🦬", rarity: "Common", sport: "NFL" },
      { id: "nfl-lions", name: "Detroit Lions", image: "/assets/sports/nfl-lions.png", icon: "🦁", rarity: "Common", sport: "NFL" },
      { id: "nfl-bengals", name: "Cincinnati Bengals", image: "/assets/sports/nfl-bengals.png", icon: "🐅", rarity: "Common", sport: "NFL" },
      { id: "nfl-dolphins", name: "Miami Dolphins", image: "/assets/sports/nfl-dolphins.png", icon: "🐬", rarity: "Common", sport: "NFL" },
      { id: "nfl-packers", name: "Green Bay Packers", image: "/assets/sports/nfl-packers.png", icon: "🧀", rarity: "Common", sport: "NFL" },
      { id: "nfl-steelers", name: "Pittsburgh Steelers", image: "/assets/sports/nfl-steelers.png", icon: "🛠️", rarity: "Common", sport: "NFL" },
      { id: "soc-real-madrid", name: "Real Madrid", image: "/assets/sports/soc-real-madrid.png", icon: "⚽", rarity: "Common", sport: "Soccer" },
      { id: "soc-man-city", name: "Manchester City", image: "/assets/sports/soc-man-city.png", icon: "⚽", rarity: "Common", sport: "Soccer" },
      { id: "soc-liverpool", name: "Liverpool FC", image: "/assets/sports/soc-liverpool.png", icon: "⚽", rarity: "Common", sport: "Soccer" },
      { id: "soc-bayern", name: "Bayern Munich", image: "/assets/sports/soc-bayern.png", icon: "⚽", rarity: "Common", sport: "Soccer" },
      { id: "soc-psg", name: "Paris SG", image: "/assets/sports/soc-psg.png", icon: "⚽", rarity: "Common", sport: "Soccer" },
      { id: "soc-arsenal", name: "Arsenal FC", image: "/assets/sports/soc-arsenal.png", icon: "⚽", rarity: "Common", sport: "Soccer" },
      { id: "soc-leverkusen", name: "Bayer Leverkusen", image: "/assets/sports/soc-leverkusen.png", icon: "⚽", rarity: "Common", sport: "Soccer" },
      { id: "soc-chelsea", name: "Chelsea FC", image: "/assets/sports/soc-chelsea.png", icon: "⚽", rarity: "Common", sport: "Soccer" },
      { id: "soc-man-utd", name: "Manchester United", image: "/assets/sports/soc-man-utd.png", icon: "⚽", rarity: "Common", sport: "Soccer" }
    ]
  },
  {
    id: "anime",
    name: "Anime Pack",
    description: "Iconic protagonists from the greatest anime of all time. All free!",
    price: 0,
    blooks: [
      { id: "anime-naruto", name: "Naruto Uzumaki", image: "/assets/anime/naruto.jpg", icon: "🍜", rarity: "Common", series: "Naruto" },
      { id: "anime-goku", name: "Son Goku", image: "/assets/anime/goku.jpg", icon: "🐉", rarity: "Common", series: "Dragon Ball Z" },
      { id: "anime-luffy", name: "Monkey D. Luffy", image: "/assets/anime/luffy.jpg", icon: "🏴‍☠️", rarity: "Common", series: "One Piece" },
      { id: "anime-ichigo", name: "Ichigo Kurosaki", image: "/assets/anime/ichigo.jpg", icon: "⚔️", rarity: "Common", series: "Bleach" },
      { id: "anime-edward", name: "Edward Elric", image: "/assets/anime/edward.jpg", icon: "⚗️", rarity: "Common", series: "Fullmetal Alchemist" },
      { id: "anime-sasuke", name: "Sasuke Uchiha", image: "/assets/anime/sasuke.jpg", icon: "🌑", rarity: "Common", series: "Naruto" },
      { id: "anime-killua", name: "Killua Zoldyck", image: "/assets/anime/killua.jpg", icon: "⚡", rarity: "Common", series: "Hunter x Hunter" },
      { id: "anime-gon", name: "Gon Freecss", image: "/assets/anime/gon.jpg", icon: "🎣", rarity: "Common", series: "Hunter x Hunter" },
      { id: "anime-lelouch", name: "Lelouch vi Britannia", image: "/assets/anime/lelouch.jpg", icon: "♟️", rarity: "Common", series: "Code Geass" },
      { id: "anime-light", name: "Light Yagami", image: "/assets/anime/light.jpg", icon: "📓", rarity: "Common", series: "Death Note" },
      { id: "anime-spike", name: "Spike Spiegel", image: "/assets/anime/spike.jpg", icon: "🚀", rarity: "Common", series: "Cowboy Bebop" },
      { id: "anime-saitama", name: "Saitama", image: "/assets/anime/saitama.jpg", icon: "👊", rarity: "Common", series: "One Punch Man" },
      { id: "anime-kirito", name: "Kirito", image: "/assets/anime/kirito.jpg", icon: "🗡️", rarity: "Common", series: "Sword Art Online" },
      { id: "anime-eren", name: "Eren Yeager", image: "/assets/anime/eren.jpg", icon: "🔱", rarity: "Common", series: "Attack on Titan" },
      { id: "anime-levi", name: "Levi Ackerman", image: "/assets/anime/levi.jpg", icon: "🗡️", rarity: "Common", series: "Attack on Titan" },
      { id: "anime-deku", name: "Izuku Midoriya", image: "/assets/anime/deku.jpg", icon: "💪", rarity: "Common", series: "My Hero Academia" },
      { id: "anime-tanjiro", name: "Tanjiro Kamado", image: "/assets/anime/tanjiro.jpg", icon: "🌊", rarity: "Common", series: "Demon Slayer" },
      { id: "anime-meliodas", name: "Meliodas", image: "/assets/anime/meliodas.jpg", icon: "🐗", rarity: "Common", series: "Seven Deadly Sins" },
      { id: "anime-rimuru", name: "Rimuru Tempest", image: "/assets/anime/rimuru.jpg", icon: "🌀", rarity: "Common", series: "That Time I Got Reincarnated as a Slime" },
      { id: "anime-yusuke", name: "Yusuke Urameshi", image: "/assets/anime/yusuke.jpg", icon: "👻", rarity: "Common", series: "Yu Yu Hakusho" }
    ]
  },

  {
    id: "superheroes",
    name: "Superheroes Pack",
    description: "Marvel-only heroes, villains, and Spider-variants with real character images.",
    price: 20,
    blooks: [
      { id: "marvel-spiderman-classic", name: "Spider-Man (Classic)", image: "/assets/superheroes/spiderman-classic.png", icon: "M", rarity: "Legendary", universe: "Marvel", role: "Hero", variant: "Peter Parker" },
      { id: "marvel-spiderman-peter-mcu", name: "Spider-Man (MCU)", image: "/assets/superheroes/spiderman-mcu-peter.jpg", icon: "M", rarity: "Epic", universe: "Marvel", role: "Hero", variant: "Peter Parker MCU" },
      { id: "marvel-spiderman-miles", name: "Spider-Man (Miles Morales)", image: "/assets/superheroes/spiderman-miles.png", icon: "M", rarity: "Epic", universe: "Marvel", role: "Hero", variant: "Miles Morales" },
      { id: "marvel-spidergwen", name: "Spider-Gwen", image: "/assets/superheroes/spidergwen.jpg", icon: "M", rarity: "Epic", universe: "Marvel", role: "Hero", variant: "Gwen Stacy" },
      { id: "marvel-spiderman-2099", name: "Spider-Man 2099", image: "/assets/superheroes/spiderman-2099.png", icon: "M", rarity: "Epic", universe: "Marvel", role: "Hero", variant: "Miguel O'Hara" },
      { id: "marvel-spiderman-noir", name: "Spider-Man Noir", image: "/assets/superheroes/spiderman-noir.png", icon: "M", rarity: "Common", universe: "Marvel", role: "Hero", variant: "Noir Universe" },
      { id: "marvel-iron-man", name: "Iron Man", image: "/assets/superheroes/iron-man.png", icon: "M", rarity: "Legendary", universe: "Marvel", role: "Hero" },
      { id: "marvel-captain-america-steve", name: "Captain America (Steve)", image: "/assets/superheroes/captain-america-steve.jpg", icon: "M", rarity: "Legendary", universe: "Marvel", role: "Hero", variant: "Steve Rogers" },
      { id: "marvel-captain-america-sam", name: "Captain America (Sam)", image: "/assets/superheroes/captain-america-sam.jpg", icon: "M", rarity: "Common", universe: "Marvel", role: "Hero", variant: "Sam Wilson" },
      { id: "marvel-thor", name: "Thor", image: "/assets/superheroes/thor.png", icon: "M", rarity: "Legendary", universe: "Marvel", role: "Hero" },
      { id: "marvel-hulk", name: "Hulk", image: "/assets/superheroes/hulk.png", icon: "M", rarity: "Legendary", universe: "Marvel", role: "Hero" },
      { id: "marvel-black-widow", name: "Black Widow", image: "/assets/superheroes/black-widow.jpg", icon: "M", rarity: "Common", universe: "Marvel", role: "Hero" },
      { id: "marvel-hawkeye", name: "Hawkeye", image: "/assets/superheroes/hawkeye.png", icon: "M", rarity: "Common", universe: "Marvel", role: "Hero" },
      { id: "marvel-doctor-strange", name: "Doctor Strange", image: "/assets/superheroes/doctor-strange.jpg", icon: "M", rarity: "Epic", universe: "Marvel", role: "Hero" },
      { id: "marvel-scarlet-witch", name: "Scarlet Witch", image: "/assets/superheroes/scarlet-witch.jpg", icon: "M", rarity: "Epic", universe: "Marvel", role: "Hero" },
      { id: "marvel-black-panther", name: "Black Panther", image: "/assets/superheroes/black-panther.png", icon: "M", rarity: "Epic", universe: "Marvel", role: "Hero" },
      { id: "marvel-captain-marvel", name: "Captain Marvel", image: "/assets/superheroes/captain-marvel.jpg", icon: "M", rarity: "Rare", universe: "Marvel", role: "Hero" },
      { id: "marvel-green-goblin", name: "Green Goblin", image: "/assets/superheroes/green-goblin.png", icon: "M", rarity: "Epic", universe: "Marvel", role: "Villain" },
      { id: "marvel-doctor-octopus", name: "Doctor Octopus", image: "/assets/superheroes/doctor-octopus.jpg", icon: "M", rarity: "Epic", universe: "Marvel", role: "Villain" },
      { id: "marvel-venom", name: "Venom", image: "/assets/superheroes/venom.png", icon: "M", rarity: "Epic", universe: "Marvel", role: "Villain" },
      { id: "marvel-carnage", name: "Carnage", image: "/assets/superheroes/carnage.png", icon: "M", rarity: "Rare", universe: "Marvel", role: "Villain" },
      { id: "marvel-thanos", name: "Thanos", image: "/assets/superheroes/thanos.png", icon: "M", rarity: "Legendary", universe: "Marvel", role: "Villain" },
      { id: "marvel-loki", name: "Loki", image: "/assets/superheroes/loki.jpg", icon: "M", rarity: "Epic", universe: "Marvel", role: "Villain" },
      { id: "marvel-ultron", name: "Ultron", image: "/assets/superheroes/ultron.png", icon: "M", rarity: "Epic", universe: "Marvel", role: "Villain" },
      { id: "marvel-red-skull", name: "Red Skull", image: "/assets/superheroes/red-skull.png", icon: "M", rarity: "Common", universe: "Marvel", role: "Villain" },
      { id: "marvel-hela", name: "Hela", image: "/assets/superheroes/hela.png", icon: "M", rarity: "Rare", universe: "Marvel", role: "Villain" },
      { id: "marvel-killmonger", name: "Killmonger", image: "/assets/superheroes/killmonger.jpg", icon: "M", rarity: "Rare", universe: "Marvel", role: "Villain" },
      { id: "marvel-mysterio", name: "Mysterio", image: "/assets/superheroes/mysterio.png", icon: "M", rarity: "Rare", universe: "Marvel", role: "Villain" },
      { id: "marvel-vulture", name: "Vulture", image: "/assets/superheroes/vulture.png", icon: "M", rarity: "Common", universe: "Marvel", role: "Villain" },
      { id: "marvel-kingpin", name: "Kingpin", image: "/assets/superheroes/kingpin.png", icon: "M", rarity: "Common", universe: "Marvel", role: "Villain" }
    ]
  },

  {
    id: "science",
    name: "Science Pack",
    description: "Lab, space, and invention vibes.",
    blooks: [
      { id: "science-lab-rat", name: "Lab Rat", icon: "🧪", rarity: "Common" },
      { id: "science-rocket-cadet", name: "Rocket Cadet", icon: "🚀", rarity: "Common" },
      { id: "science-robot-tech", name: "Robot Tech", icon: "🛠️", rarity: "Rare" },
      { id: "science-dna-hacker", name: "DNA Hacker", icon: "🧬", rarity: "Rare" },
      { id: "science-circuit-master", name: "Circuit Master", icon: "💡", rarity: "Epic" },
      { id: "science-nebula-scout", name: "Nebula Scout", icon: "🪐", rarity: "Epic" },
      { id: "science-quantum-chief", name: "Quantum Chief", icon: "⚛️", rarity: "Legendary" },
      { id: "science-time-architect", name: "Time Architect", icon: "⌛", rarity: "Legendary" }
    ]
  },
  {
    id: "nature",
    name: "Nature Pack",
    description: "Animals and wild creatures.",
    blooks: [
      { id: "nature-forest-owl", name: "Forest Owl", icon: "🦉", rarity: "Common" },
      { id: "nature-polar-bear", name: "Polar Bear", icon: "🐻‍❄️", rarity: "Common" },
      { id: "nature-river-otter", name: "River Otter", icon: "🦦", rarity: "Rare" },
      { id: "nature-thunder-eagle", name: "Thunder Eagle", icon: "🦅", rarity: "Rare" },
      { id: "nature-night-panther", name: "Night Panther", icon: "🐆", rarity: "Epic" },
      { id: "nature-volcano-fox", name: "Volcano Fox", icon: "🦊", rarity: "Epic" },
      { id: "nature-ancient-turtle", name: "Ancient Turtle", icon: "🐢", rarity: "Legendary" },
      { id: "nature-crystal-stag", name: "Crystal Stag", icon: "🦌", rarity: "Legendary" }
    ]
  },
  {
    id: "books",
    name: "Book Legends",
    description: "30 iconic characters from your favorite childhood stories. Adventure awaits!",
    price: 0,
    blooks: [
      { id: "book-harry", name: "Harry Potter", image: "/assets/books/harry-potter.png", icon: "⚡", rarity: "Common", series: "Harry Potter" },
      { id: "book-hermione", name: "Hermione Granger", image: "/assets/books/hermione-granger.png", icon: "📚", rarity: "Common", series: "Harry Potter" },
      { id: "book-ron", name: "Ron Weasley", image: "/assets/books/ron-weasley.png", icon: "🐀", rarity: "Common", series: "Harry Potter" },
      { id: "book-matilda", name: "Matilda Wormwood", image: "/assets/books/matilda.png", icon: "📖", rarity: "Common", series: "Matilda" },
      { id: "book-greg", name: "Greg Heffley", image: "/assets/books/greg-heffley.png", icon: "📓", rarity: "Common", series: "Diary of a Wimpy Kid" },
      { id: "book-percy", name: "Percy Jackson", image: "/assets/books/percy-jackson.png", icon: "🔱", rarity: "Common", series: "Percy Jackson" },
      { id: "book-alice", name: "Alice", image: "/assets/books/alice.png", icon: "☕", rarity: "Common", series: "Alice in Wonderland" },
      { id: "book-dorothy", name: "Dorothy Gale", image: "/assets/books/dorothy.png", icon: "👠", rarity: "Common", series: "The Wizard of Oz" },
      { id: "book-charlie", name: "Charlie Bucket", image: "/assets/books/charlie-bucket.png", icon: "🍫", rarity: "Common", series: "Charlie and the Chocolate Factory" },
      { id: "book-wonka", name: "Willy Wonka", image: "/assets/books/willy-wonka.png", icon: "🎩", rarity: "Common", series: "Charlie and the Chocolate Factory" },
      { id: "book-peter", name: "Peter Pan", image: "/assets/books/peter-pan.png", icon: "🧚‍♂️", rarity: "Common", series: "Peter Pan" },
      { id: "book-pippi", name: "Pippi Longstocking", image: "/assets/books/pippi.png", icon: "👧", rarity: "Common", series: "Pippi Longstocking" },
      { id: "book-paddington", name: "Paddington Bear", image: "/assets/books/paddington.png", icon: "🐻", rarity: "Common", series: "Paddington" },
      { id: "book-pooh", name: "Winnie the Pooh", image: "/assets/books/pooh.png", icon: "🍯", rarity: "Common", series: "Winnie the Pooh" },
      { id: "book-charlotte", name: "Charlotte", image: "/assets/books/charlotte.png", icon: "🕷️", rarity: "Common", series: "Charlotte's Web" },
      { id: "book-wilbur", name: "Wilbur", image: "/assets/books/wilbur.png", icon: "🐷", rarity: "Common", series: "Charlotte's Web" },
      { id: "book-stuart", name: "Stuart Little", image: "/assets/books/stuart-little.png", icon: "🐭", rarity: "Common", series: "Stuart Little" },
      { id: "book-cat-hat", name: "Cat in the Hat", image: "/assets/books/cat-hat.png", icon: "🎩", rarity: "Common", series: "Dr. Seuss" },
      { id: "book-horton", name: "Horton", image: "/assets/books/horton.png", icon: "🐘", rarity: "Common", series: "Dr. Seuss" },
      { id: "book-dogman", name: "Dog Man", image: "/assets/books/dogman.png", icon: "🐕", rarity: "Common", series: "Dog Man" },
      { id: "book-underpants", name: "Captain Underpants", image: "/assets/books/captain-underpants.png", icon: "🩲", rarity: "Common", series: "Captain Underpants" },
      { id: "book-auggie", name: "Auggie Pullman", image: "/assets/books/auggie.png", icon: "👨‍🚀", rarity: "Common", series: "Wonder" },
      { id: "book-ivan", name: "Ivan", image: "/assets/books/ivan.png", icon: "🦍", rarity: "Common", series: "The One and Only Ivan" },
      { id: "book-mercy", name: "Mercy Watson", image: "/assets/books/mercy-watson.png", icon: "🐽", rarity: "Common", series: "Mercy Watson" },
      { id: "book-junie", name: "Junie B. Jones", image: "/assets/books/junie-b-jones.png", icon: "🎀", rarity: "Common", series: "Junie B. Jones" },
      { id: "book-geronimo", name: "Geronimo Stilton", image: "/assets/books/geronimo-stilton.png", icon: "🧀", rarity: "Common", series: "Geronimo Stilton" },
      { id: "book-frizzle", name: "Ms. Frizzle", image: "/assets/books/ms-frizzle.png", icon: "🚌", rarity: "Common", series: "Magic School Bus" },
      { id: "book-arthur", name: "Arthur", image: "/assets/books/arthur.png", icon: "👓", rarity: "Common", series: "Arthur" },
      { id: "book-clifford", name: "Clifford", image: "/assets/books/clifford.png", icon: "🐕‍🦺", rarity: "Common", series: "Clifford" },
      { id: "book-george", name: "Curious George", image: "/assets/books/curious-george.png", icon: "🐒", rarity: "Common", series: "Curious George" }
    ]
  }
];

// ── 10 Equippable Aura Effects (all free for students) ──────────────────────
const LEGACY_BLOOK_ID_MIGRATIONS = new Map();

const booksPack = BLOOK_PACKS.find((pack) => pack.id === "books");
if (booksPack) {
  booksPack.blooks = BOOK_LEGENDS_BLOOKS.map((blook) => ({ ...blook }));
}

const BLOOK_EFFECTS = [
  { id: "fx-none", name: "None", icon: "✖", css: "", description: "No effect" },
  { id: "fx-lightning", name: "Lightning", icon: "⚡", css: "fx-lightning", description: "Electric bolts crackle around you" },
  { id: "fx-golden-aura", name: "Golden Aura", icon: "✨", css: "fx-golden-aura", description: "Radiant golden glow pulses outward" },
  { id: "fx-snow", name: "Snow", icon: "❄️", css: "fx-snow", description: "Soft snowflakes drift around you" },
  { id: "fx-fire", name: "Fire", icon: "🔥", css: "fx-fire", description: "Roaring flames engulf your spirit" },
  { id: "fx-shadow", name: "Shadow Realm", icon: "🌑", css: "fx-shadow", description: "Dark energy swirls in your wake" },
  { id: "fx-rainbow", name: "Rainbow", icon: "🌈", css: "fx-rainbow", description: "Prismatic light streams around you" },
  { id: "fx-galaxy", name: "Galaxy", icon: "🌌", css: "fx-galaxy", description: "Stars and nebulas orbit your form" },
  { id: "fx-sakura", name: "Sakura", icon: "🌸", css: "fx-sakura", description: "Cherry blossoms float on the wind" },
  { id: "fx-matrix", name: "Matrix Code", icon: "💻", css: "fx-matrix", description: "Green digital rain cascades down" },
  { id: "fx-ice-crown", name: "Ice Crown", icon: "👑", css: "fx-ice-crown", description: "A frozen crown of ice above your head" }
];

const BLOOK_LOOKUP = new Map();

for (const pack of BLOOK_PACKS) {

  for (const blook of pack.blooks) {
    BLOOK_LOOKUP.set(blook.id, {
      id: blook.id,
      name: blook.name,
      icon: blook.icon,
      image: blook.image || null,   // real image URL if present
      series: blook.series || null,
      rarity: blook.rarity,
      packId: pack.id,
      packName: pack.name
    });
  }
}

const DEFAULT_BLOOK = BLOOK_LOOKUP.get(BLOOK_PACKS[0].blooks[0].id);
const ALL_BLOOKS = Array.from(BLOOK_LOOKUP.values());
const ALL_BLOOK_IDS = BLOOK_PACKS.flatMap((pack) => pack.blooks.map((blook) => blook.id));

// Unhide all blooks for every account (new + existing).
const STARTER_COMMON_BLOOK_IDS = [...new Set(ALL_BLOOK_IDS)];
const PACK_OPEN_COST = 20;
const DUPLICATE_SELL_RATE = 0.3;
const STARTER_COINS = 200;
const STARTER_FREE_PACK_OPENS = 0;
const STARTER_GRANT_VERSION = 1;
const BLOOK_RARITY_WEIGHT = {
  Common: 60,
  Rare: 26,
  Epic: 11,
  Legendary: 3
};
const ACCOUNT_DATA_DIR = path.join(__dirname, "data");
const ACCOUNT_DATA_FILE = path.join(ACCOUNT_DATA_DIR, "accounts.json");
const accounts = new Map();

function nowIso() {
  return new Date().toISOString();
}

function normalizeAccountKey(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (!/^[a-zA-Z0-9:_-]{8,120}$/.test(trimmed)) {
    return "";
  }

  return trimmed;
}

function migrateLegacyBlookId(blookId) {
  const safeId = typeof blookId === "string" ? blookId.trim() : "";
  if (!safeId) {
    return "";
  }
  return LEGACY_BLOOK_ID_MIGRATIONS.get(safeId) || safeId;
}

function migrateLegacyAccountBlooks(account) {
  if (!account || !account.inventory || typeof account.inventory !== "object") {
    return false;
  }

  let changed = false;
  for (const [legacyId, nextId] of LEGACY_BLOOK_ID_MIGRATIONS.entries()) {
    const ownedCount = Math.max(0, Math.floor(parseStoredNumber(account.inventory[legacyId], 0)));
    if (ownedCount <= 0) {
      continue;
    }

    account.inventory[nextId] = Math.max(0, Math.floor(parseStoredNumber(account.inventory[nextId], 0))) + ownedCount;
    delete account.inventory[legacyId];
    changed = true;
  }

  const migratedSelectedId = migrateLegacyBlookId(account.selectedBlookId);
  if (migratedSelectedId && migratedSelectedId !== account.selectedBlookId) {
    account.selectedBlookId = migratedSelectedId;
    changed = true;
  }

  if (changed) {
    account.updatedAt = nowIso();
  }
  return changed;
}

function generateGuestAccountKey() {
  if (typeof crypto.randomUUID === "function") {
    return `guest:${crypto.randomUUID()}`;
  }
  return `guest:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function parseStoredNumber(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return number;
}

function rarityWeightForBlook(blook) {
  const rarity = String(blook?.rarity || "Common");
  return BLOOK_RARITY_WEIGHT[rarity] || 1;
}

function packOpenCost(packId) {
  if (!packId) {
    return PACK_OPEN_COST;
  }
  return PACK_OPEN_COST;
}

function duplicateSellValueForPack(packId) {
  return Math.max(1, Math.floor(packOpenCost(packId) * DUPLICATE_SELL_RATE));
}

function ensureStarterCommonBlooks(account) {
  if (!account) {
    return false;
  }

  if (!account.inventory || typeof account.inventory !== "object") {
    account.inventory = {};
  }

  let changed = migrateLegacyAccountBlooks(account);
  account.coins = Math.max(0, Math.floor(parseStoredNumber(account.coins, 0)));
  account.freePackOpensRemaining = Math.max(0, Math.floor(parseStoredNumber(account.freePackOpensRemaining, STARTER_FREE_PACK_OPENS)));
  account.starterGrantVersion = Math.max(0, Math.floor(parseStoredNumber(account.starterGrantVersion, 0)));

  if (account.starterGrantVersion < STARTER_GRANT_VERSION) {
    account.coins = Math.max(account.coins, STARTER_COINS);
    account.freePackOpensRemaining = STARTER_FREE_PACK_OPENS;
    account.starterGrantVersion = STARTER_GRANT_VERSION;
    changed = true;
  }

  for (const blookId of STARTER_COMMON_BLOOK_IDS) {
    const ownedCount = Math.max(0, Math.floor(parseStoredNumber(account.inventory[blookId], 0)));
    if (ownedCount <= 0) {
      account.inventory[blookId] = 1;
      changed = true;
    }
  }

  if (!accountOwnsBlook(account, account.selectedBlookId)) {
    const fallback = STARTER_COMMON_BLOOK_IDS.find((blookId) => accountOwnsBlook(account, blookId)) || DEFAULT_BLOOK?.id || "";
    if (fallback && account.selectedBlookId !== fallback) {
      account.selectedBlookId = fallback;
      changed = true;
    }
  }

  if (changed) {
    account.updatedAt = nowIso();
  }
  return changed;
}

function loadAccountsFromDisk() {
  try {
    if (!fs.existsSync(ACCOUNT_DATA_FILE)) {
      return;
    }

    const raw = fs.readFileSync(ACCOUNT_DATA_FILE, "utf8");
    if (!raw.trim()) {
      return;
    }

    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed?.accounts) ? parsed.accounts : [];
    let touched = false;
    for (const record of records) {
      const key = normalizeAccountKey(record?.id);
      if (!key) {
        continue;
      }

      const inventorySource = record?.inventory && typeof record.inventory === "object" ? record.inventory : {};
      const inventory = {};
      for (const [blookId, countValue] of Object.entries(inventorySource)) {
        const nextBlookId = migrateLegacyBlookId(blookId);
        if (!BLOOK_LOOKUP.has(nextBlookId)) {
          continue;
        }
        const count = Math.max(0, Math.floor(parseStoredNumber(countValue, 0)));
        if (count > 0) {
          inventory[nextBlookId] = (inventory[nextBlookId] || 0) + count;
          if (nextBlookId !== blookId) {
            touched = true;
          }
        }
      }

      const rawSelectedCandidate = typeof record.selectedBlookId === "string" ? record.selectedBlookId : "";
      const selectedCandidate = migrateLegacyBlookId(rawSelectedCandidate);
      if (selectedCandidate !== rawSelectedCandidate) {
        touched = true;
      }
      const selectedBlookId = inventory[selectedCandidate] > 0 ? selectedCandidate : "";
      const miniGameStatsSource = record?.miniGameStats && typeof record.miniGameStats === "object" ? record.miniGameStats : {};
      const miniGameStats = {};
      for (const game of MINI_GAME_CATALOG) {
        const source = miniGameStatsSource[game.id] || {};
        miniGameStats[game.id] = {
          plays: Math.max(0, Math.floor(parseStoredNumber(source?.plays, 0))),
          wins: Math.max(0, Math.floor(parseStoredNumber(source?.wins, 0))),
          bestBonus: Math.max(0, Math.floor(parseStoredNumber(source?.bestBonus, 0))),
          totalBonus: Math.max(0, Math.floor(parseStoredNumber(source?.totalBonus, 0)))
        };
      }

      const account = {
        id: key,
        coins: Math.max(0, Math.floor(parseStoredNumber(record.coins, STARTER_COINS))),
        freePackOpensRemaining: Math.max(0, Math.floor(parseStoredNumber(record.freePackOpensRemaining, STARTER_FREE_PACK_OPENS))),
        starterGrantVersion: Math.max(0, Math.floor(parseStoredNumber(record.starterGrantVersion, 0))),
        selectedBlookId,
        inventory,
        miniGameStats,
        gamesPlayed: Math.max(0, Math.floor(parseStoredNumber(record.gamesPlayed, 0))),
        totalCorrect: Math.max(0, Math.floor(parseStoredNumber(record.totalCorrect, 0))),
        totalScore: Math.max(0, Math.floor(parseStoredNumber(record.totalScore, 0))),
        bestRank: Math.max(0, Math.floor(parseStoredNumber(record.bestRank, 0))),
        createdAt: typeof record.createdAt === "string" ? record.createdAt : nowIso(),
        updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : nowIso()
      };
      if (ensureStarterCommonBlooks(account)) {
        touched = true;
      }
      accounts.set(key, account);
    }

    if (touched) {
      saveAccountsToDisk();
    }
  } catch (error) {
    console.warn("Failed to load accounts data:", error?.message || error);
  }
}

function saveAccountsToDisk() {
  try {
    fs.mkdirSync(ACCOUNT_DATA_DIR, { recursive: true });
    const payload = {
      savedAt: nowIso(),
      accounts: Array.from(accounts.values()).map((account) => ({
        id: account.id,
        coins: account.coins,
        freePackOpensRemaining: account.freePackOpensRemaining,
        starterGrantVersion: account.starterGrantVersion || 0,
        selectedBlookId: account.selectedBlookId || "",
        inventory: account.inventory,
        miniGameStats: account.miniGameStats || {},
        gamesPlayed: account.gamesPlayed || 0,
        totalCorrect: account.totalCorrect || 0,
        totalScore: account.totalScore || 0,
        bestRank: account.bestRank || 0,
        createdAt: account.createdAt || nowIso(),
        updatedAt: account.updatedAt || nowIso()
      }))
    };
    fs.writeFileSync(ACCOUNT_DATA_FILE, JSON.stringify(payload, null, 2), "utf8");
  } catch (error) {
    console.warn("Failed to save accounts data:", error?.message || error);
  }
}

function ensureAccount(accountKey) {
  const safeKey = normalizeAccountKey(accountKey);
  if (!safeKey) {
    return null;
  }

  let changed = false;
  if (!accounts.has(safeKey)) {
    const createdAt = nowIso();
    const created = {
      id: safeKey,
      coins: STARTER_COINS,
      freePackOpensRemaining: STARTER_FREE_PACK_OPENS,
      starterGrantVersion: STARTER_GRANT_VERSION,
      selectedBlookId: "",
      inventory: {},
      miniGameStats: {},
      gamesPlayed: 0,
      totalCorrect: 0,
      totalScore: 0,
      bestRank: 0,
      createdAt,
      updatedAt: createdAt
    };
    accounts.set(safeKey, created);
    changed = true;
  }

  const account = accounts.get(safeKey);
  if (ensureStarterCommonBlooks(account)) {
    changed = true;
  }
  if (changed) {
    saveAccountsToDisk();
  }

  return account;
}

function accountOwnedCount(account, blookId) {
  if (!account || !account.inventory) {
    return 0;
  }
  return Math.max(0, Math.floor(parseStoredNumber(account.inventory[blookId], 0)));
}

function accountOwnsBlook(account, blookId) {
  return accountOwnedCount(account, blookId) > 0;
}

function accountMiniGameBucket(account, miniGameType) {
  if (!account) {
    return null;
  }
  if (!account.miniGameStats || typeof account.miniGameStats !== "object") {
    account.miniGameStats = {};
  }
  const key = String(miniGameType || "");
  if (!key) {
    return null;
  }
  if (!account.miniGameStats[key]) {
    account.miniGameStats[key] = {
      plays: 0,
      wins: 0,
      bestBonus: 0,
      totalBonus: 0
    };
  }
  return account.miniGameStats[key];
}

function accountUnlockedBlooks(account) {
  if (!account || typeof account.inventory !== "object") {
    return [];
  }

  const rows = [];
  for (const [blookId, countValue] of Object.entries(account.inventory)) {
    const blook = BLOOK_LOOKUP.get(blookId);
    if (!blook) {
      continue;
    }

    const count = Math.max(0, Math.floor(parseStoredNumber(countValue, 0)));
    if (count <= 0) {
      continue;
    }

    const duplicates = Math.max(0, count - 1);
    rows.push({
      ...blook,
      count,
      duplicates,
      sellValueEach: duplicateSellValueForPack(blook.packId)
    });
  }

  rows.sort((left, right) => {
    if (left.packName !== right.packName) {
      return left.packName.localeCompare(right.packName);
    }
    if (left.rarity !== right.rarity) {
      return left.rarity.localeCompare(right.rarity);
    }
    return left.name.localeCompare(right.name);
  });
  return rows;
}

function pickRandomOwnedBlookForPack(account, packId) {
  const safePackId = String(packId || "").trim();
  if (!safePackId || !account || typeof account.inventory !== "object") {
    return null;
  }

  const pack = BLOOK_PACKS.find((entry) => entry.id === safePackId);
  if (!pack || !Array.isArray(pack.blooks) || pack.blooks.length === 0) {
    return null;
  }

  const ownedIds = [];
  for (const blook of pack.blooks) {
    if (accountOwnedCount(account, blook.id) > 0) {
      ownedIds.push(blook.id);
    }
  }

  if (ownedIds.length === 0) {
    return null;
  }

  const chosenId = ownedIds[Math.floor(Math.random() * ownedIds.length)];
  return BLOOK_LOOKUP.get(chosenId) || null;
}

function rarityOddsForPack(pack) {
  const buckets = new Map();
  let totalWeight = 0;
  for (const blook of pack.blooks) {
    const rarity = String(blook.rarity || "Common");
    const weight = rarityWeightForBlook(blook);
    buckets.set(rarity, (buckets.get(rarity) || 0) + weight);
    totalWeight += weight;
  }

  if (totalWeight <= 0) {
    return [];
  }

  return Array.from(buckets.entries())
    .map(([rarity, weight]) => ({
      rarity,
      chance: Math.round((weight / totalWeight) * 1000) / 10
    }))
    .sort((left, right) => right.chance - left.chance);
}

function publicAccountSummary(account) {
  if (!account) {
    return null;
  }

  const inventory = accountUnlockedBlooks(account);
  const packRows = BLOOK_PACKS.map((pack) => {
    const totalCount = pack.blooks.length;
    let ownedCount = 0;
    let duplicateCount = 0;
    for (const blook of pack.blooks) {
      const count = accountOwnedCount(account, blook.id);
      if (count > 0) {
        ownedCount += 1;
      }
      if (count > 1) {
        duplicateCount += count - 1;
      }
    }

    return {
      id: pack.id,
      name: pack.name,
      description: pack.description,
      openCost: packOpenCost(pack.id),
      sellValueEach: duplicateSellValueForPack(pack.id),
      totalCount,
      ownedCount,
      duplicateCount,
      rarityOdds: rarityOddsForPack(pack)
    };
  });

  const selectedBlookId = accountOwnsBlook(account, account.selectedBlookId) ? account.selectedBlookId : "";
  const miniGames = MINI_GAME_CATALOG.map((game) => {
    const bucket = accountMiniGameBucket(account, game.id);
    const plays = Number(bucket?.plays || 0);
    const wins = Number(bucket?.wins || 0);
    const totalBonus = Number(bucket?.totalBonus || 0);
    return {
      id: game.id,
      name: game.name,
      plays,
      wins,
      bestBonus: Number(bucket?.bestBonus || 0),
      avgBonus: plays > 0 ? Math.round(totalBonus / plays) : 0
    };
  }).sort((left, right) => right.plays - left.plays || right.wins - left.wins || left.name.localeCompare(right.name));

  return {
    id: account.id,
    coins: account.coins,
    freePackOpensRemaining: account.freePackOpensRemaining,
    selectedBlookId,
    packs: packRows,
    inventory,
    effects: BLOOK_EFFECTS,
    stats: {
      gamesPlayed: account.gamesPlayed || 0,
      totalCorrect: account.totalCorrect || 0,
      totalScore: account.totalScore || 0,
      bestRank: account.bestRank || 0
    },
    miniGames
  };
}

function pickRandomBlookFromPack(pack) {
  if (!pack || !Array.isArray(pack.blooks) || pack.blooks.length === 0) {
    return DEFAULT_BLOOK;
  }

  const weighted = pack.blooks.map((blook) => ({
    blook,
    weight: Math.max(1, rarityWeightForBlook(blook))
  }));
  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const entry of weighted) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return BLOOK_LOOKUP.get(entry.blook.id) || DEFAULT_BLOOK;
    }
  }

  const fallback = weighted[weighted.length - 1]?.blook?.id;
  return BLOOK_LOOKUP.get(fallback) || DEFAULT_BLOOK;
}

function openPackForAccount(account, packId) {
  const pack = BLOOK_PACKS.find((entry) => entry.id === packId);
  if (!pack) {
    return { ok: false, message: "Pack not found." };
  }

  const cost = packOpenCost(pack.id);
  const isFree = account.freePackOpensRemaining > 0;

  if (!isFree && account.coins < cost) {
    return { ok: false, message: `Not enough coins. ${pack.name} costs ${cost}.` };
  }

  if (isFree) {
    account.freePackOpensRemaining -= 1;
  } else {
    account.coins -= cost;
  }

  const reward = pickRandomBlookFromPack(pack);
  const previousCount = accountOwnedCount(account, reward.id);
  const nextCount = previousCount + 1;
  account.inventory[reward.id] = nextCount;
  if (!account.selectedBlookId || !accountOwnsBlook(account, account.selectedBlookId)) {
    account.selectedBlookId = reward.id;
  }
  account.updatedAt = nowIso();
  saveAccountsToDisk();

  return {
    ok: true,
    reward: {
      id: reward.id,
      name: reward.name,
      icon: reward.icon,
      rarity: reward.rarity,
      packId: reward.packId,
      packName: reward.packName,
      duplicate: previousCount >= 1,
      count: nextCount,
      sellValueEach: duplicateSellValueForPack(reward.packId),
      openCost: cost,
      freeOpen: isFree
    }
  };
}

function sellDuplicateForAccount(account, blookId, quantity) {
  const blook = BLOOK_LOOKUP.get(String(blookId || ""));
  if (!blook) {
    return { ok: false, message: "Blook not found." };
  }

  const owned = accountOwnedCount(account, blook.id);
  const duplicates = Math.max(0, owned - 1);
  if (duplicates <= 0) {
    return { ok: false, message: "No duplicates available to sell." };
  }

  const requested = Math.max(1, Math.floor(Number(quantity) || 1));
  const sellCount = Math.min(duplicates, requested);
  const sellValueEach = duplicateSellValueForPack(blook.packId);
  const earned = sellCount * sellValueEach;

  account.inventory[blook.id] = owned - sellCount;
  account.coins += earned;
  account.updatedAt = nowIso();
  saveAccountsToDisk();

  return {
    ok: true,
    sold: {
      blookId: blook.id,
      name: blook.name,
      icon: blook.icon,
      quantity: sellCount,
      valueEach: sellValueEach,
      earned
    }
  };
}

function resolveRequestAccountKey(req, payloadAccountKey = "") {
  if (GOOGLE_AUTH_ENABLED && req?.user?.id) {
    return `google:${req.user.id}`;
  }

  const payloadKey = normalizeAccountKey(payloadAccountKey);
  if (payloadKey) {
    return payloadKey;
  }

  const queryKey = normalizeAccountKey(req?.query?.accountKey || "");
  if (queryKey) {
    return queryKey;
  }

  const headerKey = normalizeAccountKey(req?.get?.("x-account-key") || "");
  if (headerKey) {
    return headerKey;
  }

  const sessionKey = normalizeAccountKey(req?.session?.accountKey || "");
  if (sessionKey) {
    return sessionKey;
  }

  return "";
}

function rankBonusByPlace(rank, totalPlayers) {
  if (rank <= 1) return Math.max(18, 28 + Math.min(12, totalPlayers));
  if (rank === 2) return Math.max(14, 20 + Math.min(8, totalPlayers));
  if (rank === 3) return Math.max(10, 14 + Math.min(6, totalPlayers));
  if (rank <= 5) return 10;
  if (rank <= 10) return 6;
  return 3;
}

function calculateCoinReward(player, rank, totalPlayers) {
  const correctCoins = Math.max(0, Number(player?.correctCount || 0)) * 5;
  const scoreCoins = Math.max(0, Math.floor(Number(player?.score || 0) / 350));
  const participationCoins = 8;
  const rankCoins = rankBonusByPlace(rank, totalPlayers);
  const total = Math.max(10, participationCoins + correctCoins + scoreCoins + rankCoins);
  return {
    total,
    breakdown: {
      participation: participationCoins,
      correct: correctCoins,
      score: scoreCoins,
      rank: rankCoins
    }
  };
}

function publicBlookPacks() {
  return BLOOK_PACKS.map((pack) => ({
    id: pack.id,
    name: pack.name,
    description: pack.description,
    openCost: packOpenCost(pack.id),
    sellValueEach: duplicateSellValueForPack(pack.id),
    totalCount: pack.blooks.length,
    ownedCount: pack.blooks.length,
    duplicateCount: 0,
    rarityOdds: rarityOddsForPack(pack),
    blooks: pack.blooks.map((blook) => ({
      id: blook.id,
      name: blook.name,
      image: blook.image || null,
      icon: blook.icon,
      rarity: blook.rarity,
      packId: pack.id,
      packName: pack.name,
      count: 1,
      duplicates: 0,
      sellValueEach: duplicateSellValueForPack(pack.id)
    }))
  }));
}

function resolveBlookById(blookId) {
  if (typeof blookId !== "string") {
    return DEFAULT_BLOOK;
  }

  return BLOOK_LOOKUP.get(blookId.trim()) || DEFAULT_BLOOK;
}

function randomBlook() {
  if (!Array.isArray(ALL_BLOOKS) || ALL_BLOOKS.length === 0) {
    return DEFAULT_BLOOK;
  }

  return ALL_BLOOKS[randomInt(0, ALL_BLOOKS.length - 1)];
}

const MODE_CONFIG = {
  classic: {
    id: "classic",
    label: "Classic Quiz",
    baseScore: 600,
    speedBonusCap: 450,
    streakStep: 120,
    streakCap: 500,
    eventPhase: false,
    eventName: "",
    feedTitle: "Round Feed",
    actionLabel: "Open",
    fallbackGain: 100,
    unit: "points"
  },
  gold: {
    id: "gold",
    label: "Gold Quest",
    baseScore: 450,
    speedBonusCap: 420,
    streakStep: 120,
    streakCap: 500,
    eventPhase: true,
    eventName: "Gold Chest",
    feedTitle: "Gold Feed",
    actionLabel: "Open Chest",
    fallbackGain: 120,
    unit: "gold"
  },
  crypto: {
    id: "crypto",
    label: "Crypto Hack",
    baseScore: 440,
    speedBonusCap: 420,
    streakStep: 115,
    streakCap: 520,
    eventPhase: true,
    eventName: "Market Card",
    feedTitle: "Market Feed",
    actionLabel: "Use Card",
    fallbackGain: 110,
    unit: "coins"
  },
  fishing: {
    id: "fishing",
    label: "Fishing Frenzy",
    baseScore: 470,
    speedBonusCap: 390,
    streakStep: 110,
    streakCap: 480,
    eventPhase: true,
    eventName: "Catch Crate",
    feedTitle: "Harbor Feed",
    actionLabel: "Reel In",
    fallbackGain: 90,
    unit: "fish"
  },
  brawl: {
    id: "brawl",
    label: "Monster Brawl",
    baseScore: 500,
    speedBonusCap: 360,
    streakStep: 130,
    streakCap: 560,
    eventPhase: true,
    eventName: "Battle Move",
    feedTitle: "Battle Feed",
    actionLabel: "Use Move",
    fallbackGain: 95,
    unit: "power"
  }
};

const MODE_MINI_GAMES = {
  classic: ["foosball_frenzy", "tower_stacker", "space_invaders"],
  gold: ["tower_stacker"],
  crypto: ["foosball_frenzy", "tower_stacker", "space_invaders"],
  fishing: ["foosball_frenzy", "tower_stacker", "space_invaders"],
  brawl: ["space_invaders"]
};

const MINI_GAME_CATALOG = [
  {
    id: "foosball_frenzy",
    name: "Foosball Frenzy",
    description: "Table soccer bars stay fixed in formation. Slide laterally and kick with space."
  },
  {
    id: "soccer_shootout",
    name: "Fossball Arena",
    description: "Penalty kicks: choose lane and power against the goalkeeper."
  },
  {
    id: "space_invaders",
    name: "Space Invaders",
    description: "Move your ship, shoot aliens, and survive the waves."
  },
  {
    id: "tower_stacker",
    name: "Tower Stacker",
    description: "Pick a cute theme, drop friendly critters, and build the tallest tower."
  }
];

const MINI_GAME_LOOKUP = new Map(MINI_GAME_CATALOG.map((game) => [game.id, game]));
const MINI_GAME_ROTATION_MODES = new Set(["fixed", "random", "popular", "off"]);
const GAME_END_TYPES = new Set(["time", "weight"]);
const RANDOM_NAME_ADJECTIVES = ["Swift", "Bright", "Cosmic", "Brave", "Curious", "Rapid", "Lucky", "Epic", "Nimble", "Bold"];
const RANDOM_NAME_NOUNS = ["Falcon", "Panda", "Tiger", "Otter", "Comet", "Shark", "Wizard", "Racer", "Fox", "Eagle"];
const globalMiniGameStats = {};
for (const game of MINI_GAME_CATALOG) {
  globalMiniGameStats[game.id] = {
    sessions: 0,
    playerEntries: 0,
    completions: 0,
    totalBonus: 0
  };
}
loadAccountsFromDisk();
loadCustomQuestionSetsFromDisk();
loadMiniGameStatsFromDisk();

const WORD_SCRAMBLE_WORDS = [
  "MULTIPLY",
  "FRACTION",
  "INTEGER",
  "DECIMAL",
  "ALGEBRA",
  "SCIENCE",
  "HISTORY",
  "CHROMEBOOK",
  "SOCCER",
  "ANIME"
];
const SOCCER_FIELD_PLAYERS = [
  { id: "messi_left", starId: "messi", lane: 0, row: 2 },
  { id: "ronaldo_mid", starId: "ronaldo", lane: 1, row: 2 },
  { id: "kylian_right", starId: "kylian", lane: 2, row: 2 },
  { id: "messi_support", starId: "messi", lane: 0, row: 1 },
  { id: "ronaldo_support", starId: "ronaldo", lane: 1, row: 1 },
  { id: "kylian_support", starId: "kylian", lane: 2, row: 1 }
];
const SOCCER_TEAMS = {
  red: {
    id: "red",
    name: "Red Rockets"
  },
  blue: {
    id: "blue",
    name: "Blue Blazers"
  }
};
const TOWER_STACKER_THEMES = {
  cats: {
    id: "cats",
    label: "Cats",
    accent: "#ff9b5c",
    secondary: "#ffd971",
    pieces: [
      { id: "sleek_cat", w: 11.5, h: 10.8, shape: "tall", color: "#f59f61", belly: "#ffe3b8", ears: true, face: "smile", accessory: "cat_tail" },
      { id: "sleepy_cat", w: 18.6, h: 7.5, shape: "longcat", color: "#7f8da6", belly: "#eef3ff", ears: true, face: "sleepy", accessory: "whiskers" },
      { id: "kitten", w: 10.8, h: 8.8, shape: "roundrect", color: "#ffcf57", belly: "#fff2bc", ears: true, face: "wide", accessory: "blush" },
      { id: "fluffy_kitten", w: 14.2, h: 11.6, shape: "fluff", color: "#c17853", belly: "#f8d7be", ears: true, face: "grin", accessory: "stripes" }
    ]
  },
  dogs: {
    id: "dogs",
    label: "Dogs",
    accent: "#ff8c67",
    secondary: "#6ec5ff",
    pieces: [
      { id: "sausage_dog", w: 18.8, h: 7.8, shape: "dog_long", color: "#d28f57", belly: "#f7ddb5", ears: true, face: "happy", accessory: "wag_tail" },
      { id: "round_puppy", w: 13.8, h: 10.8, shape: "dog_round", color: "#f2c16f", belly: "#fff0ca", ears: true, face: "wide", accessory: "tongue" },
      { id: "floppy_dog", w: 15.6, h: 10.9, shape: "dog_chunky", color: "#f5f1e8", belly: "#fff8f2", ears: true, face: "smile", accessory: "collar" },
      { id: "chunky_pup", w: 14.4, h: 10.2, shape: "dog_chunky", color: "#8f6947", belly: "#e7d0b9", ears: true, face: "grin", accessory: "spots" }
    ]
  },
  ducks: {
    id: "ducks",
    label: "Ducks",
    accent: "#ffd34f",
    secondary: "#59d8d2",
    pieces: [
      { id: "chubby_duck", w: 14.4, h: 10.2, shape: "duck_round", color: "#ffd65c", belly: "#fff2b0", ears: false, face: "wide", accessory: "duck_beak" },
      { id: "baby_duck", w: 11.2, h: 8.4, shape: "duck_small", color: "#ffe27f", belly: "#fff6c7", ears: false, face: "happy", accessory: "duck_beak" },
      { id: "floatie_duck", w: 16.2, h: 9.2, shape: "duck_float", color: "#ffcb43", belly: "#fff0a8", ears: false, face: "grin", accessory: "floatie" },
      { id: "rubber_duck", w: 12.8, h: 10.8, shape: "duck_tall", color: "#f6d24d", belly: "#fff3b8", ears: false, face: "smile", accessory: "wing" }
    ]
  },
  pandas: {
    id: "pandas",
    label: "Pandas",
    accent: "#9fd3ff",
    secondary: "#9af0a9",
    pieces: [
      { id: "baby_panda", w: 12.6, h: 10.8, shape: "panda_round", color: "#f8fafc", belly: "#ffffff", ears: true, face: "wide", accessory: "panda_patch" },
      { id: "rolling_panda", w: 15.2, h: 9.8, shape: "panda_roll", color: "#eef2f7", belly: "#ffffff", ears: true, face: "grin", accessory: "panda_patch" },
      { id: "sleepy_panda", w: 17.4, h: 8.3, shape: "panda_loaf", color: "#f3f6fb", belly: "#ffffff", ears: true, face: "sleepy", accessory: "bamboo" },
      { id: "chunky_panda", w: 15.8, h: 11.8, shape: "panda_round", color: "#f7f9fc", belly: "#ffffff", ears: true, face: "happy", accessory: "cheeks" }
    ]
  }
};
const TOWER_STACKER_GROUND_Y = 92;
const TOWER_STACKER_PIECE_SCALE = 0.54;
const TOWER_STACKER_SPAWN_HEADROOM = 18;
const TOWER_STACKER_MIN_VISIBLE_HEADROOM = 10;

function publicMiniGameCatalog() {
  return MINI_GAME_CATALOG.map((game) => ({
    id: game.id,
    name: game.name,
    description: game.description
  }));
}

function normalizeMode(mode) {
  if (typeof mode !== "string") {
    return "classic";
  }

  return MODE_CONFIG[mode] ? mode : "classic";
}

function normalizeMiniGameRotationMode(mode) {
  if (typeof mode !== "string") {
    return "fixed";
  }

  const normalized = mode.trim().toLowerCase();
  return MINI_GAME_ROTATION_MODES.has(normalized) ? normalized : "fixed";
}

function normalizeGameEndType(value) {
  if (typeof value !== "string") {
    return "time";
  }
  const normalized = value.trim().toLowerCase();
  return GAME_END_TYPES.has(normalized) ? normalized : "time";
}

function normalizeBooleanFlag(value, defaultValue = true) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  return defaultValue;
}

function normalizeEndTargetValue(value, endType = "time") {
  const numeric = Number(value);
  if (normalizeGameEndType(endType) === "weight") {
    return clamp(Number.isFinite(numeric) ? numeric : 7, 2, 30);
  }
  return clamp(Number.isFinite(numeric) ? numeric : 7, 2, 20);
}

function normalizeExplanationRevealSec(value) {
  const numeric = Number(value);
  return clamp(Number.isFinite(numeric) ? numeric : 2, 0, 10);
}

function weightScoreGoal(game) {
  if (!game || normalizeGameEndType(game.settings?.endType) !== "weight") {
    return 0;
  }
  const target = normalizeEndTargetValue(game.settings?.endTargetValue, "weight");
  return target * 1000;
}

function gameReachedWeightGoal(game) {
  const goal = weightScoreGoal(game);
  if (goal <= 0 || !game || !(game.players instanceof Map)) {
    return false;
  }
  for (const player of game.players.values()) {
    if (Number(player?.score || 0) >= goal) {
      return true;
    }
  }
  return false;
}

function randomPlayerName(game) {
  const used = new Set(Array.from(game?.players?.values?.() || []).map((player) => String(player.name || "").toLowerCase()));
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const adjective = RANDOM_NAME_ADJECTIVES[randomInt(0, RANDOM_NAME_ADJECTIVES.length - 1)];
    const noun = RANDOM_NAME_NOUNS[randomInt(0, RANDOM_NAME_NOUNS.length - 1)];
    const suffix = randomInt(10, 99);
    const candidate = sanitizeName(`${adjective}${noun}${suffix}`).slice(0, 24);
    if (candidate && !used.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return sanitizeName(`Player${randomInt(100, 999)}`).slice(0, 24) || "Player";
}

function getModeConfig(mode) {
  return MODE_CONFIG[normalizeMode(mode)];
}

function authStatusForRequest(req) {
  const authenticated = typeof req?.isAuthenticated === "function" ? req.isAuthenticated() : false;
  const user = authenticated ? req.user || null : null;
  return {
    authEnabled: GOOGLE_AUTH_ENABLED,
    authenticated,
    user: user
      ? {
        id: user.id || "",
        name: user.name || "",
        email: user.email || "",
        picture: user.picture || ""
      }
      : null
  };
}

function resolveGoogleCallbackUrl(req) {
  if (typeof process.env.GOOGLE_CALLBACK_URL === "string" && process.env.GOOGLE_CALLBACK_URL.length > 0) {
    return process.env.GOOGLE_CALLBACK_URL;
  }

  const forwardedProto = typeof req?.get === "function" ? req.get("x-forwarded-proto") : "";
  const forwardedHost = typeof req?.get === "function" ? req.get("x-forwarded-host") : "";
  const protocolSource = (forwardedProto || req?.protocol || "http").split(",")[0].trim();
  const hostSource =
    (forwardedHost || (typeof req?.get === "function" ? req.get("host") : "") || `localhost:${PORT}`)
      .split(",")[0]
      .trim();
  const protocol = protocolSource || "http";
  const host = hostSource || `localhost:${PORT}`;
  return `${protocol}://${host}/auth/google/callback`;
}

function pathRequiresLogin(pathname) {
  if (!GOOGLE_AUTH_ENABLED) {
    return false;
  }

  return pathname === "/host.html";
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.set("trust proxy", true);
app.use(express.json());
const quizUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false
  }
});

const games = new Map();
const socketToGame = new Map();
const recentReports = new Map();

io.engine.use(sessionMiddleware);

function activeRoomSummary() {
  if (games.size === 0) {
    return null;
  }

  const entries = Array.from(games.values());
  entries.sort((left, right) => {
    const leftLobby = left.phase === "lobby" ? 1 : 0;
    const rightLobby = right.phase === "lobby" ? 1 : 0;
    if (leftLobby !== rightLobby) {
      return rightLobby - leftLobby;
    }
    return Number(right.updatedAt || 0) - Number(left.updatedAt || 0);
  });

  const game = entries[0];
  if (!game) {
    return null;
  }

  return {
    code: game.code,
    hostName: game.hostName,
    phase: game.phase,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt
  };
}

function broadcastActiveRoom() {
  io.emit("room:activeCode", activeRoomSummary());
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user || null);
});

if (GOOGLE_AUTH_ENABLED) {
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback";
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL
      },
      (_accessToken, _refreshToken, profile, done) => {
        const email = Array.isArray(profile.emails) && profile.emails[0] ? profile.emails[0].value : "";
        const picture = Array.isArray(profile.photos) && profile.photos[0] ? profile.photos[0].value : "";
        done(null, {
          id: profile.id,
          name: profile.displayName || email || "Google User",
          email,
          picture
        });
      }
    )
  );
}

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

app.get("/api/auth/status", (req, res) => {
  res.json(authStatusForRequest(req));
});

app.get("/auth/google", (req, res, next) => {
  if (!GOOGLE_AUTH_ENABLED) {
    res.status(503).json({ ok: false, message: "Google auth is not configured on this server." });
    return;
  }

  if (req.query?.next && typeof req.query.next === "string") {
    req.session.authReturnTo = req.query.next;
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
    callbackURL: resolveGoogleCallbackUrl(req)
  })(req, res, next);
});

app.get("/auth/google/callback", (req, res, next) => {
  if (!GOOGLE_AUTH_ENABLED) {
    res.redirect("/?error=auth_not_configured");
    return;
  }

  passport.authenticate("google", {
    failureRedirect: "/?error=google_auth_failed",
    callbackURL: resolveGoogleCallbackUrl(req)
  })(req, res, () => {
    const redirectTo = req.session?.authReturnTo || "/";
    delete req.session.authReturnTo;
    res.redirect(redirectTo);
  });
});

app.get("/auth/logout", (req, res) => {
  const done = () => {
    req.session?.destroy(() => {
      res.redirect("/");
    });
  };
  req.logout(done);
});

app.use((req, res, next) => {
  if (!pathRequiresLogin(req.path)) {
    next();
    return;
  }

  if (typeof req.isAuthenticated === "function" && req.isAuthenticated()) {
    next();
    return;
  }

  req.session.authReturnTo = req.originalUrl || req.path;
  res.redirect("/?login=required");
});

app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".html" || ext === ".js" || ext === ".css") {
        res.setHeader("Cache-Control", "no-store, max-age=0");
      }
    }
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, games: games.size, googleAuthEnabled: GOOGLE_AUTH_ENABLED });
});

app.get("/api/blooks", (_req, res) => {
  res.json({
    packs: publicBlookPacks(),
    effects: BLOOK_EFFECTS
  });
});

app.get("/api/quizzes", (_req, res) => {
  res.json({
    ok: true,
    sets: publicQuestionSets()
  });
});

app.get("/api/quizzes/export", (_req, res) => {
  const payload = buildCustomQuestionSetsPayload("exportedAt");
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="quiz-arena-custom-quizzes-${stamp}.json"`);
  res.json(payload);
});

app.post("/api/quizzes/upload", quizUpload.single("file"), (req, res) => {
  const titleRaw = String(req.body?.title || "").trim();
  const uploadedBy = sanitizeName(req.body?.uploadedBy || req.user?.name || "User");
  const category = sanitizeQuizCategory(req.body?.category || "");
  const tags = sanitizeQuizTags(req.body?.tags || "");
  const file = req.file;

  if (!file || !file.buffer || file.buffer.length === 0) {
    res.status(400).json({ ok: false, message: "Upload a CSV, Excel, or JSON file." });
    return;
  }

  const fileName = String(file.originalname || "quiz_upload");
  const ext = path.extname(fileName).toLowerCase();
  if (!QUIZ_UPLOAD_ALLOWED_EXTENSIONS.has(ext)) {
    res.status(400).json({ ok: false, message: "Only CSV, XLSX, XLS, and JSON files are supported." });
    return;
  }

  const fallbackLabel = sanitizeQuestionPrompt(titleRaw || path.basename(fileName, ext) || "Uploaded Quiz").slice(0, 64);

  if (ext === ".json") {
    let payload = null;
    try {
      payload = JSON.parse(file.buffer.toString("utf8"));
    } catch (_error) {
      res.status(400).json({ ok: false, message: "Could not parse JSON file. Check format and try again." });
      return;
    }

    const importEntries = extractQuizImportEntriesFromJson(payload, fallbackLabel);
    if (importEntries.length === 0) {
      res.status(400).json({
        ok: false,
        message: "JSON must contain a quiz with a questions array or a quizzes array."
      });
      return;
    }

    const importedSets = [];
    let skippedCount = 0;
    const singleSetImport = importEntries.length === 1;
    for (const entry of importEntries) {
      const labelOverride = singleSetImport && titleRaw ? titleRaw : entry.label;
      const storedSet = saveImportedQuestionSet({
        label: labelOverride,
        questions: entry.questions,
        uploadedBy: entry.uploadedBy || uploadedBy,
        uploadedAt: entry.uploadedAt,
        category: entry.category || category,
        tags: Array.isArray(entry.tags) && entry.tags.length > 0 ? entry.tags : tags
      });
      if (!storedSet) {
        skippedCount += 1;
        continue;
      }
      importedSets.push(storedSet);
    }

    if (importedSets.length === 0) {
      res.status(400).json({
        ok: false,
        message: "No valid quiz sets were imported. Each set needs at least 5 valid questions."
      });
      return;
    }

    saveCustomQuestionSetsToDisk();
    const setSummaries = importedSets.map(publicImportedQuestionSetSummary);
    res.json({
      ok: true,
      importedCount: setSummaries.length,
      skippedCount,
      importedSets: setSummaries,
      set: setSummaries[0],
      sets: publicQuestionSets()
    });
    return;
  }

  let rows = [];
  try {
    const workbook = XLSX.read(file.buffer, { type: "buffer", cellDates: false });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) {
      res.status(400).json({ ok: false, message: "File has no worksheet." });
      return;
    }

    rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
      raw: false,
      defval: "",
      blankrows: false
    });
  } catch (_error) {
    res.status(400).json({ ok: false, message: "Could not parse file. Check CSV/Excel format." });
    return;
  }

  const importedSet = saveImportedQuestionSet({
    label: fallbackLabel,
    questions: rows,
    uploadedBy,
    uploadedAt: nowIso(),
    category,
    tags
  });
  if (!importedSet) {
    res.status(400).json({
      ok: false,
      message: "Need at least 5 valid questions. Required columns: question/prompt, options, and answer."
    });
    return;
  }

  saveCustomQuestionSetsToDisk();
  const setSummary = publicImportedQuestionSetSummary(importedSet);
  res.json({
    ok: true,
    importedCount: 1,
    skippedCount: 0,
    importedSets: [setSummary],
    set: setSummary,
    sets: publicQuestionSets()
  });
});

app.get("/api/quizzes/custom/:setId", (req, res) => {
  const setId = String(req.params?.setId || "").trim();
  const quiz = customQuestionSets.get(setId);
  if (!quiz) {
    res.status(404).json({ ok: false, message: "Custom quiz set not found." });
    return;
  }

  res.json({
    ok: true,
    set: publicCustomQuestionSetDetail(quiz)
  });
});

app.post("/api/quizzes/custom/save", (req, res) => {
  const requestedId = String(req.body?.id || "").trim();
  const uploadedBy = sanitizeName(req.body?.uploadedBy || req.user?.name || "User");
  const titleRaw = String(req.body?.title || req.body?.label || "").trim();
  const categoryProvided = "category" in (req.body || {});
  const tagsProvided = "tags" in (req.body || {});
  const category = sanitizeQuizCategory(req.body?.category || "");
  const tags = sanitizeQuizTags(req.body?.tags || "");
  const parsedQuestions = parseQuizRows(Array.isArray(req.body?.questions) ? req.body.questions : []);
  if (parsedQuestions.length < 5) {
    res.status(400).json({
      ok: false,
      message: "Need at least 5 valid questions with prompt, options, and answer."
    });
    return;
  }

  const safeLabel = sanitizeQuestionPrompt(titleRaw).slice(0, 64);
  if (!safeLabel) {
    res.status(400).json({
      ok: false,
      message: "Quiz title is required."
    });
    return;
  }

  const existing = requestedId ? customQuestionSets.get(requestedId) : null;
  if (requestedId && !existing) {
    res.status(404).json({
      ok: false,
      message: "Custom quiz set to edit was not found."
    });
    return;
  }

  const now = nowIso();
  const id = existing ? existing.id : normalizeQuizSetId(safeLabel, "custom_quiz");
  const next = {
    id,
    label: safeLabel,
    source: "uploaded",
    questions: parsedQuestions,
    questionCount: parsedQuestions.length,
    uploadedBy: uploadedBy || existing?.uploadedBy || "",
    uploadedAt: existing?.uploadedAt || now,
    category: categoryProvided ? category : existing?.category || "",
    tags: tagsProvided ? tags : Array.isArray(existing?.tags) ? existing.tags : []
  };
  customQuestionSets.set(id, next);
  saveCustomQuestionSetsToDisk();

  res.json({
    ok: true,
    set: publicImportedQuestionSetSummary(next),
    sets: publicQuestionSets()
  });
});

app.get("/api/account", (req, res) => {
  let accountKey = resolveRequestAccountKey(req);
  if (!accountKey && !GOOGLE_AUTH_ENABLED) {
    accountKey = generateGuestAccountKey();
  }

  const account = ensureAccount(accountKey);
  if (!account) {
    res.status(400).json({ ok: false, message: "Invalid account key." });
    return;
  }

  if (req.session) {
    req.session.accountKey = account.id;
  }

  res.json({
    ok: true,
    accountKey: account.id,
    account: publicAccountSummary(account)
  });
});

app.post("/api/account/open-pack", (req, res) => {
  let accountKey = resolveRequestAccountKey(req, req.body?.accountKey || "");
  if (!accountKey && !GOOGLE_AUTH_ENABLED) {
    accountKey = generateGuestAccountKey();
  }

  const account = ensureAccount(accountKey);
  if (!account) {
    res.status(400).json({ ok: false, message: "Invalid account key." });
    return;
  }

  if (req.session) {
    req.session.accountKey = account.id;
  }

  const packId = String(req.body?.packId || "").trim();
  const result = openPackForAccount(account, packId);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }

  res.json({
    ok: true,
    reward: result.reward,
    accountKey: account.id,
    account: publicAccountSummary(account)
  });
});

app.post("/api/account/sell-duplicate", (req, res) => {
  const accountKey = resolveRequestAccountKey(req, req.body?.accountKey || "");
  const account = ensureAccount(accountKey);
  if (!account) {
    res.status(400).json({ ok: false, message: "Invalid account key." });
    return;
  }

  const blookId = String(req.body?.blookId || "").trim();
  const quantity = Number(req.body?.quantity || 1);
  const result = sellDuplicateForAccount(account, blookId, quantity);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }

  res.json({
    ok: true,
    sold: result.sold,
    accountKey: account.id,
    account: publicAccountSummary(account)
  });
});

app.get("/api/minigames", (_req, res) => {
  const stats = publicMiniGameStats();
  const mostMatched = mostMatchedMiniGame(stats);
  res.json({
    games: publicMiniGameCatalog(),
    stats,
    mostPlayed: stats[0] || null,
    mostMatched
  });
});

app.get("/api/minigames/stats", (_req, res) => {
  const stats = publicMiniGameStats();
  const mostMatched = mostMatchedMiniGame(stats);
  res.json({
    ok: true,
    stats,
    mostPlayed: stats[0] || null,
    mostMatched
  });
});

app.get("/api/reports/:code", (req, res) => {
  const code = String(req.params?.code || "").toUpperCase().trim();
  const report = recentReports.get(code);
  if (!report) {
    res.status(404).json({ ok: false, message: "Report not found." });
    return;
  }
  res.json({ ok: true, report });
});

app.delete("/api/reports/:code", (req, res) => {
  const code = String(req.params?.code || "").toUpperCase().trim();
  const removed = recentReports.delete(code);
  if (!removed) {
    res.status(404).json({ ok: false, message: "Report not found." });
    return;
  }
  res.json({ ok: true, code });
});

function isPrivateIpv4(ip) {
  if (typeof ip !== "string") {
    return false;
  }

  return ip.startsWith("10.") || ip.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}

function getLanIpv4Addresses() {
  const results = [];
  const seen = new Set();
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    if (!Array.isArray(entries)) {
      continue;
    }

    for (const entry of entries) {
      if (!entry || entry.family !== "IPv4" || entry.internal || !isPrivateIpv4(entry.address)) {
        continue;
      }

      if (seen.has(entry.address)) {
        continue;
      }

      seen.add(entry.address);
      results.push(entry.address);
    }
  }

  return results;
}

app.get("/api/server-info", (_req, res) => {
  const port = Number(PORT);
  const lanIps = getLanIpv4Addresses();
  const activeRoom = activeRoomSummary();

  res.json({
    port,
    localhost: `http://localhost:${port}`,
    lanIps,
    lanUrls: lanIps.map((ip) => `http://${ip}:${port}`),
    activeRoom
  });
});

app.get("/api/active-room", (_req, res) => {
  res.json({
    ok: true,
    activeRoom: activeRoomSummary()
  });
});

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeName(name) {
  if (typeof name !== "string") {
    return "";
  }

  return name.replace(/\s+/g, " ").trim().slice(0, 24);
}

function createGameCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  for (let i = 0; i < 2000; i += 1) {
    let code = "";

    for (let j = 0; j < GAME_CODE_LENGTH; j += 1) {
      code += alphabet[randomInt(0, alphabet.length - 1)];
    }

    if (!games.has(code)) {
      return code;
    }
  }

  throw new Error("Unable to generate unique game code");
}

function shuffle(list) {
  const arr = [...list];

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function scrambleWord(word) {
  const source = String(word || "").toUpperCase();
  if (source.length <= 1) {
    return source;
  }

  let scrambled = source;
  for (let tries = 0; tries < 10 && scrambled === source; tries += 1) {
    scrambled = shuffle(source.split("")).join("");
  }

  return scrambled;
}

function soccerFieldPlayersSnapshot() {
  return SOCCER_FIELD_PLAYERS.map((player) => ({
    id: String(player.id || ""),
    starId: String(player.starId || ""),
    lane: clamp(Number(player.lane) || 0, 0, 2),
    row: clamp(Number(player.row) || 0, 0, 3)
  }));
}

function randomSoccerTeamAssignments(playerIds) {
  const ids = shuffle(Array.isArray(playerIds) ? playerIds : []);
  const assignments = {};
  for (let index = 0; index < ids.length; index += 1) {
    assignments[ids[index]] = index % 2 === 0 ? "red" : "blue";
  }
  return assignments;
}

function ensureSoccerMatchState(game) {
  if (!game || !game.soccerMatch || typeof game.soccerMatch !== "object") {
    return null;
  }
  return game.soccerMatch;
}

function randomFloat(min, max) {
  const low = Math.min(Number(min) || 0, Number(max) || 0);
  const high = Math.max(Number(min) || 0, Number(max) || 0);
  return Math.random() * (high - low) + low;
}

function createSoccerMatchForPlayers(game, eligiblePlayerIds) {
  const ids = Array.isArray(eligiblePlayerIds) ? eligiblePlayerIds : [];
  const assignments = randomSoccerTeamAssignments(ids);
  const players = {};
  const grouped = { red: [], blue: [] };
  for (const id of ids) {
    const team = String(assignments[id] || "red") === "blue" ? "blue" : "red";
    grouped[team].push(id);
  }

  for (const team of ["red", "blue"]) {
    const roster = grouped[team];
    const count = Math.max(1, roster.length);
    for (let index = 0; index < roster.length; index += 1) {
      const playerId = roster[index];
      const slot = (index + 1) / (count + 1);
      const xBase = team === "red" ? randomFloat(14, 42) : randomFloat(58, 86);
      const yBase = clamp(8 + slot * 44 + randomFloat(-4.5, 4.5), 8, 52);
      players[playerId] = {
        x: xBase,
        y: yBase,
        vx: team === "red" ? randomFloat(0.08, 0.22) : randomFloat(-0.22, -0.08),
        vy: randomFloat(-0.18, 0.18),
        team
      };
    }
  }

  return {
    startedAt: game?.minigameStartedAt || Date.now(),
    pitch: {
      width: 100,
      height: 60,
      goalTop: 22,
      goalBottom: 38
    },
    teams: {
      red: { ...SOCCER_TEAMS.red, goals: 0 },
      blue: { ...SOCCER_TEAMS.blue, goals: 0 }
    },
    assignments,
    players,
    ball: {
      x: 50,
      y: 30,
      vx: 0,
      vy: 0,
      lastTouchPlayerId: "",
      lastTouchTeam: ""
    },
    lastKickSeq: 0,
    lastKick: null,
    lastEventSeq: 0,
    lastEvent: null,
    tickCount: 0
  };
}

function soccerMatchPlayerRows(game) {
  if (!game || !(game.chestPhase instanceof Map)) {
    return [];
  }

  const soccer = ensureSoccerMatchState(game);
  const worldPlayers = soccer?.players && typeof soccer.players === "object" ? soccer.players : {};
  const rows = [];
  for (const [playerId, state] of game.chestPhase.entries()) {
    if (!state || state.type !== "soccer_shootout") {
      continue;
    }
    const player = game.players.get(playerId);
    if (!player) {
      continue;
    }

    rows.push({
      id: player.id,
      name: player.name,
      blook: player.blook,
      team: state.team || "red",
      goals: Math.max(0, Number(state.goals || 0)),
      kicks: Math.max(0, Number(state.kicks || 0)),
      x: clamp(Number(worldPlayers[playerId]?.x || 50), 0, 100),
      y: clamp(Number(worldPlayers[playerId]?.y || 30), 0, 60)
    });
  }
  return rows;
}

function sanitizeQuestionPrompt(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 240);
}

function sanitizeQuestionOption(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 160);
}

function sanitizeQuestionImage(value) {
  const cleaned = String(value || "")
    .replace(/[\u0000-\u001F<>"'`]/g, "")
    .trim()
    .slice(0, 400);
  if (!cleaned) {
    return "";
  }

  const lower = cleaned.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) {
    return "";
  }
  if (lower.startsWith("http://") || lower.startsWith("https://") || cleaned.startsWith("/")) {
    return cleaned;
  }
  if (lower.startsWith("assets/")) {
    return `/${cleaned}`;
  }
  return "";
}

function sanitizeQuizCategory(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 40);
}

function normalizeQuizTag(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 28);
}

function sanitizeQuizTags(value) {
  const raw =
    Array.isArray(value) && value.length > 0
      ? value
      : String(value || "")
          .split(/[,\|]+/g)
          .map((piece) => piece.trim());

  const tags = [];
  for (const entry of raw) {
    const tag = normalizeQuizTag(entry);
    if (!tag || tags.includes(tag)) {
      continue;
    }
    tags.push(tag);
    if (tags.length >= 8) {
      break;
    }
  }
  return tags;
}

function normalizeQuizColumnKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function buildQuizRowLookup(row) {
  const lookup = new Map();
  if (!row || typeof row !== "object") {
    return lookup;
  }

  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeQuizColumnKey(key);
    if (!normalized || lookup.has(normalized)) {
      continue;
    }
    lookup.set(normalized, value);
  }
  return lookup;
}

function readQuizRowValue(rowLookup, aliases) {
  if (!(rowLookup instanceof Map) || !Array.isArray(aliases)) {
    return "";
  }

  for (const alias of aliases) {
    const normalized = normalizeQuizColumnKey(alias);
    if (!normalized) {
      continue;
    }
    if (rowLookup.has(normalized)) {
      return rowLookup.get(normalized);
    }
  }
  return "";
}

function splitOptionsFromSingleCell(value) {
  const text = String(value || "").trim();
  if (!text) {
    return [];
  }
  return text
    .split(/[\|\n;,]+/g)
    .map((piece) => sanitizeQuestionOption(piece))
    .filter(Boolean);
}

function builtInQuestionSetEntries() {
  return Object.values(QUESTION_SET_CONFIG);
}

function allQuestionSetEntries() {
  return [...builtInQuestionSetEntries(), ...Array.from(customQuestionSets.values())];
}

function hasQuestionSet(questionSet) {
  if (typeof questionSet !== "string") {
    return false;
  }
  return Boolean(QUESTION_SET_CONFIG[questionSet] || customQuestionSets.has(questionSet));
}

function normalizeQuestionSet(questionSet) {
  if (!hasQuestionSet(questionSet)) {
    return "multiplication_1_digit";
  }
  return questionSet;
}

function questionSetLabel(questionSet) {
  const normalized = normalizeQuestionSet(questionSet);
  return QUESTION_SET_CONFIG[normalized]?.label || customQuestionSets.get(normalized)?.label || "Quiz";
}

function normalizeQuizSetId(rawId, fallbackPrefix = "quiz") {
  const source = String(rawId || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 42);
  const base = source || fallbackPrefix;
  let id = base;
  let suffix = 2;
  while (hasQuestionSet(id)) {
    id = `${base}_${suffix}`;
    suffix += 1;
  }
  return id;
}

function parseAnswerIndex(answerValue, options) {
  if (!Array.isArray(options) || options.length < 2) {
    return -1;
  }

  const byNumber = Number(answerValue);
  if (Number.isInteger(byNumber)) {
    if (byNumber >= 0 && byNumber < options.length) {
      return byNumber;
    }
    if (byNumber >= 1 && byNumber <= options.length) {
      return byNumber - 1;
    }
  }

  const normalized = String(answerValue || "").trim().toLowerCase();
  if (!normalized) {
    return -1;
  }

  const alphaIndex = ["a", "b", "c", "d", "e", "f"].indexOf(normalized);
  if (alphaIndex >= 0 && alphaIndex < options.length) {
    return alphaIndex;
  }

  const optionIndex = options.findIndex((option) => option.toLowerCase() === normalized);
  return optionIndex;
}

function parseQuizRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const questions = [];
  for (const rawRow of rows) {
    const row = rawRow && typeof rawRow === "object" ? rawRow : {};

    if (typeof row.prompt === "string" && Array.isArray(row.options) && row.options.length >= 2) {
      const prompt = sanitizeQuestionPrompt(row.prompt);
      const options = row.options.map((option) => sanitizeQuestionOption(option)).filter(Boolean).slice(0, 6);
      const answerIndex = parseAnswerIndex(row.answerIndex ?? row.answer ?? row.correct, options);
      if (prompt && options.length >= 2 && answerIndex >= 0 && answerIndex < options.length) {
        const explanation = sanitizeQuestionPrompt(row.explanation || "");
        const image = sanitizeQuestionImage(row.image || row.imageUrl || row.media || "");
        const normalizedQuestion = {
          prompt,
          options,
          answerIndex,
          explanation
        };
        if (image) {
          normalizedQuestion.image = image;
        }
        questions.push(normalizedQuestion);
      }
      continue;
    }

    const rowLookup = buildQuizRowLookup(row);
    const prompt = sanitizeQuestionPrompt(readQuizRowValue(rowLookup, ["prompt", "question", "q", "text"]));
    if (!prompt) {
      continue;
    }

    const optionsRaw = [
      readQuizRowValue(rowLookup, ["optionA", "choiceA", "answerA", "A", "option1", "choice1", "answer1"]),
      readQuizRowValue(rowLookup, ["optionB", "choiceB", "answerB", "B", "option2", "choice2", "answer2"]),
      readQuizRowValue(rowLookup, ["optionC", "choiceC", "answerC", "C", "option3", "choice3", "answer3"]),
      readQuizRowValue(rowLookup, ["optionD", "choiceD", "answerD", "D", "option4", "choice4", "answer4"]),
      readQuizRowValue(rowLookup, ["optionE", "choiceE", "answerE", "E", "option5", "choice5", "answer5"]),
      readQuizRowValue(rowLookup, ["optionF", "choiceF", "answerF", "F", "option6", "choice6", "answer6"])
    ];
    const optionSet = [];
    for (const rawOption of optionsRaw) {
      const safeOption = sanitizeQuestionOption(rawOption);
      if (!safeOption) {
        continue;
      }
      if (optionSet.includes(safeOption)) {
        continue;
      }
      optionSet.push(safeOption);
      if (optionSet.length >= 6) {
        break;
      }
    }

    if (optionSet.length < 2) {
      const combined = splitOptionsFromSingleCell(readQuizRowValue(rowLookup, ["options", "choices", "answers"]));
      for (const option of combined) {
        if (!optionSet.includes(option)) {
          optionSet.push(option);
        }
        if (optionSet.length >= 6) {
          break;
        }
      }
    }

    if (optionSet.length < 2) {
      continue;
    }

    const answerValue = readQuizRowValue(rowLookup, [
      "answerIndex",
      "answer",
      "correct",
      "correctAnswer",
      "rightAnswer"
    ]);
    const answerIndex = parseAnswerIndex(answerValue, optionSet);
    if (answerIndex < 0 || answerIndex >= optionSet.length) {
      continue;
    }

    const explanation = sanitizeQuestionPrompt(readQuizRowValue(rowLookup, ["explanation", "hint", "reason"]));
    const image = sanitizeQuestionImage(
      readQuizRowValue(rowLookup, ["image", "imageUrl", "img", "picture", "photo", "media", "asset"])
    );
    const normalizedQuestion = {
      prompt,
      options: optionSet,
      answerIndex,
      explanation
    };
    if (image) {
      normalizedQuestion.image = image;
    }
    questions.push(normalizedQuestion);
  }

  return questions;
}

function looksLikeQuizQuestionRow(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  if (typeof value.prompt === "string" || typeof value.question === "string" || typeof value.q === "string") {
    return true;
  }
  if (Array.isArray(value.options)) {
    return true;
  }
  if ("optionA" in value || "choiceA" in value || "answerA" in value || "A" in value) {
    return true;
  }
  if ("answerIndex" in value || "answer" in value || "correct" in value || "correctAnswer" in value) {
    return true;
  }
  return false;
}

function extractQuizImportEntriesFromJson(payload, fallbackLabel = "Uploaded Quiz") {
  const safeFallback = sanitizeQuestionPrompt(fallbackLabel).slice(0, 64) || "Uploaded Quiz";

  function normalizeEntry(candidate, index = 0) {
    const source = candidate && typeof candidate === "object" && !Array.isArray(candidate) ? candidate : {};
    const labelRaw = sanitizeQuestionPrompt(source.label || source.name || source.title || "").slice(0, 64);
    const label = labelRaw || (index > 0 ? `${safeFallback} ${index + 1}` : safeFallback);
    return {
      label,
      questions: Array.isArray(source.questions) ? source.questions : Array.isArray(source.rows) ? source.rows : [],
      uploadedBy: sanitizeName(source.uploadedBy || ""),
      uploadedAt: typeof source.uploadedAt === "string" ? source.uploadedAt : "",
      category: sanitizeQuizCategory(source.category || ""),
      tags: sanitizeQuizTags(source.tags || "")
    };
  }

  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return [];
    }

    if (payload.every((row) => looksLikeQuizQuestionRow(row))) {
      return [
        {
          label: safeFallback,
          questions: payload,
          uploadedBy: "",
          uploadedAt: "",
          category: "",
          tags: []
        }
      ];
    }

    return payload
      .map((entry, index) => normalizeEntry(entry, index))
      .filter((entry) => Array.isArray(entry.questions) && entry.questions.length > 0);
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  if (Array.isArray(payload.quizzes)) {
    return payload.quizzes
      .map((entry, index) => normalizeEntry(entry, index))
      .filter((entry) => Array.isArray(entry.questions) && entry.questions.length > 0);
  }

  if (Array.isArray(payload.questions) || Array.isArray(payload.rows)) {
    return [normalizeEntry(payload, 0)];
  }

  if (payload.set && typeof payload.set === "object" && (Array.isArray(payload.set.questions) || Array.isArray(payload.set.rows))) {
    return [normalizeEntry(payload.set, 0)];
  }

  return [];
}

function saveImportedQuestionSet({ label, questions, uploadedBy, uploadedAt, category, tags }) {
  const safeLabel = sanitizeQuestionPrompt(label || "Uploaded Quiz").slice(0, 64) || "Uploaded Quiz";
  const parsedQuestions = parseQuizRows(Array.isArray(questions) ? questions : []);
  if (parsedQuestions.length < 5) {
    return null;
  }

  const now = nowIso();
  const id = normalizeQuizSetId(safeLabel, "uploaded_quiz");
  const quiz = {
    id,
    label: safeLabel,
    source: "uploaded",
    questions: parsedQuestions,
    questionCount: parsedQuestions.length,
    uploadedBy: sanitizeName(uploadedBy || ""),
    uploadedAt: typeof uploadedAt === "string" && uploadedAt.trim() ? uploadedAt : now,
    category: sanitizeQuizCategory(category || ""),
    tags: sanitizeQuizTags(tags || "")
  };
  customQuestionSets.set(id, quiz);
  return quiz;
}

function publicImportedQuestionSetSummary(quiz) {
  return {
    id: quiz.id,
    label: quiz.label,
    questionCount: quiz.questionCount || (Array.isArray(quiz.questions) ? quiz.questions.length : 0),
    uploadedBy: quiz.uploadedBy || "",
    uploadedAt: quiz.uploadedAt || nowIso(),
    category: sanitizeQuizCategory(quiz.category || ""),
    tags: sanitizeQuizTags(quiz.tags || "")
  };
}

function publicCustomQuestionSetDetail(quiz) {
  const safeQuestions = Array.isArray(quiz?.questions)
    ? quiz.questions.map((question) => {
        const normalized = {
          prompt: sanitizeQuestionPrompt(question?.prompt || ""),
          options: Array.isArray(question?.options)
            ? question.options.map((option) => sanitizeQuestionOption(option)).filter(Boolean).slice(0, 6)
            : [],
          answerIndex: Number(question?.answerIndex || 0),
          explanation: sanitizeQuestionPrompt(question?.explanation || "")
        };
        const image = sanitizeQuestionImage(question?.image || question?.imageUrl || "");
        if (image) {
          normalized.image = image;
        }
        return normalized;
      })
    : [];
  return {
    id: quiz?.id || "",
    label: quiz?.label || "Custom Quiz",
    source: "uploaded",
    uploadedBy: quiz?.uploadedBy || "",
    uploadedAt: quiz?.uploadedAt || nowIso(),
    category: sanitizeQuizCategory(quiz?.category || ""),
    tags: sanitizeQuizTags(quiz?.tags || ""),
    questionCount: safeQuestions.length,
    questions: safeQuestions
  };
}

function buildCustomQuestionSetsPayload(timestampKey = "savedAt") {
  const payload = {
    schemaVersion: 1,
    quizzes: Array.from(customQuestionSets.values()).map((quiz) => ({
      id: quiz.id,
      label: quiz.label,
      uploadedBy: quiz.uploadedBy || "",
      uploadedAt: quiz.uploadedAt || nowIso(),
      category: sanitizeQuizCategory(quiz.category || ""),
      tags: sanitizeQuizTags(quiz.tags || ""),
      questions: quiz.questions
    }))
  };
  payload[timestampKey] = nowIso();
  return payload;
}

function loadCustomQuestionSetsFromDisk() {
  try {
    customQuestionSets.clear();
    if (!fs.existsSync(CUSTOM_QUIZZES_DATA_FILE)) {
      return;
    }

    const raw = fs.readFileSync(CUSTOM_QUIZZES_DATA_FILE, "utf8");
    if (!raw.trim()) {
      return;
    }
    const payload = JSON.parse(raw);
    const quizzes = Array.isArray(payload?.quizzes) ? payload.quizzes : [];
    for (const quiz of quizzes) {
      const id = normalizeQuizSetId(quiz?.id || "");
      const label = sanitizeQuestionPrompt(quiz?.label || quiz?.name || id).slice(0, 64);
      const questions = parseQuizRows(Array.isArray(quiz?.questions) ? quiz.questions : []);
      if (questions.length === 0) {
        continue;
      }

      customQuestionSets.set(id, {
        id,
        label,
        source: "uploaded",
        questions,
        questionCount: questions.length,
        uploadedBy: sanitizeName(quiz?.uploadedBy || ""),
        uploadedAt: typeof quiz?.uploadedAt === "string" ? quiz.uploadedAt : nowIso(),
        category: sanitizeQuizCategory(quiz?.category || ""),
        tags: sanitizeQuizTags(quiz?.tags || "")
      });
    }
  } catch (error) {
    console.warn("Failed to load custom quizzes:", error?.message || error);
  }
}

function saveCustomQuestionSetsToDisk() {
  try {
    fs.mkdirSync(path.dirname(CUSTOM_QUIZZES_DATA_FILE), { recursive: true });
    const payload = buildCustomQuestionSetsPayload("savedAt");
    fs.writeFileSync(CUSTOM_QUIZZES_DATA_FILE, JSON.stringify(payload, null, 2), "utf8");
  } catch (error) {
    console.warn("Failed to save custom quizzes:", error?.message || error);
  }
}

function publicQuestionSets() {
  return allQuestionSetEntries().map((entry) => ({
    id: entry.id,
    label: entry.label,
    source: entry.source || "built_in",
    questionCount: entry.questionCount || (entry.id === "multiplication_1_digit" ? 81 : QUESTION_BANK.length),
    category: sanitizeQuizCategory(entry.category || ""),
    tags: sanitizeQuizTags(entry.tags || "")
  }));
}

function ensureMiniGameStatsBucket(type) {
  const key = String(type || "");
  if (!key) {
    return null;
  }
  if (!globalMiniGameStats[key]) {
    globalMiniGameStats[key] = {
      sessions: 0,
      playerEntries: 0,
      completions: 0,
      totalBonus: 0
    };
  }
  return globalMiniGameStats[key];
}

function loadMiniGameStatsFromDisk() {
  try {
    if (!fs.existsSync(MINIGAME_STATS_FILE)) {
      return;
    }
    const raw = fs.readFileSync(MINIGAME_STATS_FILE, "utf8");
    if (!raw.trim()) {
      return;
    }
    const payload = JSON.parse(raw);
    const source = payload?.stats && typeof payload.stats === "object" ? payload.stats : {};
    for (const [type, values] of Object.entries(source)) {
      const bucket = ensureMiniGameStatsBucket(type);
      if (!bucket) {
        continue;
      }
      bucket.sessions = Math.max(0, Math.floor(parseStoredNumber(values?.sessions, 0)));
      bucket.playerEntries = Math.max(0, Math.floor(parseStoredNumber(values?.playerEntries, 0)));
      bucket.completions = Math.max(0, Math.floor(parseStoredNumber(values?.completions, 0)));
      bucket.totalBonus = Math.max(0, Math.floor(parseStoredNumber(values?.totalBonus, 0)));
    }
  } catch (error) {
    console.warn("Failed to load mini-game stats:", error?.message || error);
  }
}

function saveMiniGameStatsToDisk() {
  try {
    fs.mkdirSync(path.dirname(MINIGAME_STATS_FILE), { recursive: true });
    const payload = {
      savedAt: nowIso(),
      stats: globalMiniGameStats
    };
    fs.writeFileSync(MINIGAME_STATS_FILE, JSON.stringify(payload, null, 2), "utf8");
  } catch (error) {
    console.warn("Failed to save mini-game stats:", error?.message || error);
  }
}

function publicMiniGameStats() {
  const rows = MINI_GAME_CATALOG.map((game) => {
    const bucket = ensureMiniGameStatsBucket(game.id);
    const sessions = Math.max(0, Number(bucket?.sessions || 0));
    const playerEntries = Math.max(0, Number(bucket?.playerEntries || 0));
    const completions = Math.max(0, Number(bucket?.completions || 0));
    const totalBonus = Math.max(0, Number(bucket?.totalBonus || 0));
    const avgBonus = completions > 0 ? Math.round(totalBonus / completions) : 0;
    const completionRate = playerEntries > 0 ? Math.round((completions / playerEntries) * 1000) / 10 : 0;
    return {
      id: game.id,
      name: game.name,
      sessions,
      playerEntries,
      completions,
      avgBonus,
      completionRate
    };
  });
  rows.sort((left, right) => right.playerEntries - left.playerEntries || right.sessions - left.sessions || left.name.localeCompare(right.name));
  return rows;
}

function mostMatchedMiniGame(statsRows) {
  const rows = Array.isArray(statsRows) ? statsRows : [];
  if (rows.length === 0) {
    return null;
  }

  const filtered = rows.filter((row) => Number(row?.completions || 0) > 0);
  const source = filtered.length > 0 ? filtered : rows;
  return source
    .slice()
    .sort(
      (left, right) =>
        Number(right?.completionRate || 0) - Number(left?.completionRate || 0) ||
        Number(right?.avgBonus || 0) - Number(left?.avgBonus || 0) ||
        Number(right?.completions || 0) - Number(left?.completions || 0) ||
        Number(right?.playerEntries || 0) - Number(left?.playerEntries || 0) ||
        String(left?.name || "").localeCompare(String(right?.name || ""))
    )[0];
}

function mostPlayedMiniGameType(options) {
  const source = Array.isArray(options) ? options : [];
  if (source.length === 0) {
    return null;
  }

  let bestType = source[0];
  let bestEntries = -1;
  let bestSessions = -1;
  let bestCompletionRate = -1;
  for (const type of source) {
    const bucket = ensureMiniGameStatsBucket(type);
    const entries = Number(bucket?.playerEntries || 0);
    const sessions = Number(bucket?.sessions || 0);
    const completions = Number(bucket?.completions || 0);
    const completionRate = entries > 0 ? completions / entries : 0;
    if (
      entries > bestEntries ||
      (entries === bestEntries && completionRate > bestCompletionRate) ||
      (entries === bestEntries && completionRate === bestCompletionRate && sessions > bestSessions)
    ) {
      bestType = type;
      bestEntries = entries;
      bestSessions = sessions;
      bestCompletionRate = completionRate;
    }
  }
  return bestType;
}

function buildMultiplicationOneDigitBank() {
  const questions = [];

  for (let left = 1; left <= 9; left += 1) {
    for (let right = 1; right <= 9; right += 1) {
      const correct = left * right;
      const distractors = new Set();

      while (distractors.size < 3) {
        const drift = randomInt(-9, 9);
        if (drift === 0) {
          continue;
        }
        const candidate = Math.max(1, correct + drift);
        if (candidate !== correct) {
          distractors.add(candidate);
        }
      }

      const options = shuffle([correct, ...distractors]).map((value) => String(value));
      questions.push({
        prompt: `What is ${left} x ${right}?`,
        options,
        answerIndex: options.indexOf(String(correct)),
        explanation: `${left} x ${right} = ${correct}.`
      });
    }
  }

  return questions;
}

function questionPoolBySet(questionSet) {
  const normalizedSet = normalizeQuestionSet(questionSet);
  if (normalizedSet === "multiplication_1_digit") {
    return buildMultiplicationOneDigitBank();
  }

  if (normalizedSet === "general_knowledge") {
    return QUESTION_BANK;
  }

  const custom = customQuestionSets.get(normalizedSet);
  if (custom && Array.isArray(custom.questions) && custom.questions.length > 0) {
    return custom.questions;
  }

  return QUESTION_BANK;
}

function normalizeQuestionSource(question) {
  const prompt = sanitizeQuestionPrompt(question?.prompt || "");
  const options = Array.isArray(question?.options)
    ? question.options.map((option) => sanitizeQuestionOption(option)).filter(Boolean).slice(0, 6)
    : [];
  if (!prompt || options.length < 2) {
    return null;
  }

  let answerIndex = parseAnswerIndex(question?.answerIndex, options);
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) {
    answerIndex = 0;
  }

  const normalized = {
    prompt,
    options,
    answerIndex,
    explanation: sanitizeQuestionPrompt(question?.explanation || "")
  };
  const image = sanitizeQuestionImage(question?.image || question?.imageUrl || "");
  if (image) {
    normalized.image = image;
  }
  return normalized;
}

function questionFingerprint(question) {
  if (!question || typeof question !== "object") {
    return "";
  }
  const prompt = sanitizeQuestionPrompt(question.prompt || "");
  const options = Array.isArray(question.options)
    ? question.options.map((option) => sanitizeQuestionOption(option)).filter(Boolean).slice(0, 6)
    : [];
  const answerIndex = parseAnswerIndex(question.answerIndex, options);
  const image = sanitizeQuestionImage(question.image || "");
  if (!prompt || options.length < 2) {
    return "";
  }
  return `${prompt}::${options.join("\u001f")}::${answerIndex}::${image}`;
}

function materializeQuestion(question, shuffleOptions = false) {
  const source = normalizeQuestionSource(question);
  if (!source) {
    return null;
  }

  const output = {
    prompt: source.prompt,
    options: source.options.slice(),
    answerIndex: source.answerIndex,
    explanation: source.explanation
  };
  if (source.image) {
    output.image = source.image;
  }
  if (!shuffleOptions) {
    return output;
  }

  const decorated = output.options.map((value, index) => ({
    value,
    correct: index === output.answerIndex
  }));
  const shuffled = shuffle(decorated);
  output.options = shuffled.map((entry) => entry.value);
  output.answerIndex = Math.max(
    0,
    shuffled.findIndex((entry) => entry.correct)
  );
  return output;
}

function pickQuestions(count, questionSet, options = {}) {
  const safeCount = clamp(count, 5, 30);
  const shuffleOptions = options?.shuffleOptions === true;
  const noRepeats = options?.noRepeats === true;
  const usedQuestionKeys = options?.usedQuestionKeys instanceof Set ? options.usedQuestionKeys : null;
  const sourceEntries = questionPoolBySet(questionSet)
    .map((sourceQuestion) => {
      const normalized = normalizeQuestionSource(sourceQuestion);
      if (!normalized) {
        return null;
      }
      const key = questionFingerprint(normalized);
      if (!key) {
        return null;
      }
      return {
        key,
        question: normalized
      };
    })
    .filter(Boolean);
  if (sourceEntries.length === 0) {
    return [];
  }

  const targetCount = noRepeats ? Math.min(safeCount, sourceEntries.length) : safeCount;
  let ordered = shuffle(sourceEntries);

  if (noRepeats && usedQuestionKeys) {
    const unseen = ordered.filter((entry) => !usedQuestionKeys.has(entry.key));
    if (unseen.length >= targetCount) {
      ordered = unseen;
    } else {
      usedQuestionKeys.clear();
      for (const entry of unseen) {
        usedQuestionKeys.add(entry.key);
      }
      const refill = shuffle(sourceEntries).filter((entry) => !usedQuestionKeys.has(entry.key));
      ordered = [...unseen, ...refill];
    }
  }

  const selected = [];
  if (noRepeats) {
    for (const entry of ordered) {
      if (selected.length >= targetCount) {
        break;
      }
      const question = materializeQuestion(entry.question, shuffleOptions);
      if (!question) {
        continue;
      }
      selected.push(question);
      if (usedQuestionKeys) {
        usedQuestionKeys.add(entry.key);
      }
    }
    return selected;
  }

  while (selected.length < targetCount) {
    for (const entry of ordered) {
      if (selected.length >= targetCount) {
        break;
      }
      const question = materializeQuestion(entry.question, shuffleOptions);
      if (question) {
        selected.push(question);
      }
    }
    if (selected.length >= targetCount) {
      break;
    }
    ordered = shuffle(sourceEntries);
  }
  return selected;
}

function sortedPlayers(game) {
  return Array.from(game.players.values())
    .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)
    .map((player, index) => ({
      id: player.id,
      name: player.name,
      blook: player.blook,
      score: player.score,
      streak: player.streak,
      correctCount: player.correctCount,
      rank: index + 1,
      isProtected: player.protectedTurns > 0
    }));
}

function ensureGameReportState(game) {
  if (!game || typeof game !== "object") {
    return null;
  }
  if (!game.report || typeof game.report !== "object") {
    game.report = {
      startedAt: Date.now(),
      questionStats: [],
      playerStats: new Map()
    };
  }
  if (!Array.isArray(game.report.questionStats)) {
    game.report.questionStats = [];
  }
  if (!(game.report.playerStats instanceof Map)) {
    game.report.playerStats = new Map();
  }
  return game.report;
}

function recordQuestionReportEntry(game, question, submissions) {
  const report = ensureGameReportState(game);
  if (!report) {
    return;
  }
  const safeSubmissions = Array.isArray(submissions) ? submissions : [];
  const correctCount = safeSubmissions.filter((entry) => entry?.correct === true).length;
  const totalAnswers = safeSubmissions.length;
  const incorrectCount = Math.max(0, totalAnswers - correctCount);

  report.questionStats.push({
    index: report.questionStats.length + 1,
    prompt: String(question?.prompt || `Question ${report.questionStats.length + 1}`),
    correctCount,
    incorrectCount,
    totalAnswers
  });

  for (const submission of safeSubmissions) {
    const playerId = String(submission?.playerId || "");
    if (!playerId) {
      continue;
    }
    const prev = report.playerStats.get(playerId) || { answers: 0, correct: 0 };
    const nextAnswers = Math.max(0, Number(prev.answers || 0)) + 1;
    const nextCorrect = Math.max(0, Number(prev.correct || 0)) + (submission?.correct === true ? 1 : 0);
    report.playerStats.set(playerId, { answers: nextAnswers, correct: nextCorrect });
  }
}

function buildGameReportSnapshot(game, leaderboard) {
  const report = ensureGameReportState(game);
  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];
  const questions = Array.isArray(report?.questionStats) ? report.questionStats : [];
  const totalCorrect = questions.reduce((sum, row) => sum + Math.max(0, Number(row?.correctCount || 0)), 0);
  const totalIncorrect = questions.reduce((sum, row) => sum + Math.max(0, Number(row?.incorrectCount || 0)), 0);
  const totalAnswers = totalCorrect + totalIncorrect;
  const accuracyPct = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
  const finishedAtMs = Date.now();
  const normalizedSet = normalizeQuestionSet(game?.settings?.questionSet);
  const modeConfig = getModeConfig(game?.settings?.mode);

  return {
    code: String(game?.code || "").toUpperCase(),
    reportId: `${String(game?.code || "").toUpperCase()}-${finishedAtMs}`,
    hostName: String(game?.hostName || "Host"),
    mode: String(game?.settings?.mode || "classic"),
    modeLabel: modeConfig?.label || "Classic Quiz",
    questionSet: normalizedSet,
    questionSetLabel: questionSetLabel(normalizedSet),
    endType: normalizeGameEndType(game?.settings?.endType),
    endTargetValue: normalizeEndTargetValue(game?.settings?.endTargetValue, game?.settings?.endType),
    createdAt: Number(game?.createdAt || finishedAtMs),
    startedAt: Number(report?.startedAt || game?.createdAt || finishedAtMs),
    finishedAt: finishedAtMs,
    totals: {
      totalCorrect,
      totalIncorrect,
      totalAnswers,
      totalStudents: safeLeaderboard.length,
      accuracyPct
    },
    leaderboard: safeLeaderboard.map((row) => {
      const stats = report?.playerStats?.get?.(row.id) || { answers: 0, correct: 0 };
      const answers = Math.max(0, Number(stats.answers || 0));
      const correct = Math.max(0, Number(stats.correct || 0));
      const playerAccuracyPct = answers > 0 ? Math.round((correct / answers) * 100) : 0;
      return {
        id: row.id,
        rank: Math.max(1, Number(row.rank || 0)),
        name: row.name,
        blook: row.blook,
        score: Math.max(0, Number(row.score || 0)),
        weightLbs: Math.max(0, Number(row.score || 0)),
        correctCount: Math.max(0, Number(row.correctCount || 0)),
        answerCount: answers,
        accuracyPct: playerAccuracyPct
      };
    }),
    questions: questions.map((item) => {
      const total = Math.max(0, Number(item?.totalAnswers || 0));
      const incorrect = Math.max(0, Number(item?.incorrectCount || 0));
      const incorrectPct = total > 0 ? Math.round((incorrect / total) * 100) : 0;
      return {
        index: Math.max(1, Number(item?.index || 1)),
        prompt: String(item?.prompt || ""),
        totalAnswers: total,
        correctCount: Math.max(0, Number(item?.correctCount || 0)),
        incorrectCount: incorrect,
        incorrectPct
      };
    })
  };
}

function rememberGameReport(snapshot) {
  const code = String(snapshot?.code || "").toUpperCase().trim();
  if (!code || !snapshot) {
    return;
  }
  recentReports.set(code, snapshot);
}

function broadcastLobby(game) {
  const modeConfig = getModeConfig(game.settings.mode);
  const normalizedQuestionSet = normalizeQuestionSet(game.settings.questionSet);

  io.to(game.code).emit("lobby:update", {
    code: game.code,
    hostName: game.hostName,
    settings: game.settings,
    mode: game.settings.mode,
    modeName: modeConfig.label,
    eventName: modeConfig.eventName,
    feedTitle: modeConfig.feedTitle,
    questionSet: normalizedQuestionSet,
    questionSetLabel: questionSetLabel(normalizedQuestionSet),
    players: sortedPlayers(game)
  });
}

function broadcastHostStatus(game) {
  const totalPlayers = game.players.size;
  let answers = game.submissions.size;
  let correctAnswers = Array.from(game.submissions.values()).filter((entry) => entry.correct).length;

  if (game.phase === "question" && game.questionEligiblePlayerIds instanceof Set && game.questionEligiblePlayerIds.size > 0) {
    answers = 0;
    correctAnswers = 0;
    for (const submission of game.submissions.values()) {
      if (!game.questionEligiblePlayerIds.has(submission.playerId)) {
        continue;
      }
      answers += 1;
      if (submission.correct) {
        correctAnswers += 1;
      }
    }
  }

  io.to(game.hostId).emit("host:status", {
    phase: game.phase,
    code: game.code,
    totalPlayers,
    answers,
    correctAnswers,
    currentQuestionIndex: game.currentQuestionIndex + 1,
    totalQuestions: game.questions.length
  });
}

function syncPlayerToCurrentPhase(game, socketId) {
  if (!game || !socketId) {
    return;
  }

  const leaderboard = sortedPlayers(game);
  io.to(socketId).emit("players:update", {
    players: leaderboard
  });

  if (game.phase === "question") {
    const question = game.questions[game.currentQuestionIndex];
    if (!question) {
      return;
    }

    io.to(socketId).emit("question:start", {
      questionIndex: game.currentQuestionIndex + 1,
      totalQuestions: game.questions.length,
      endsAt: game.questionEndsAt || Date.now() + 1000,
      question: {
        prompt: question.prompt,
        options: question.options,
        image: sanitizeQuestionImage(question.image || "")
      }
    });
    return;
  }

  if (game.phase === "question_result") {
    const question = game.questions[game.currentQuestionIndex];
    if (question) {
      io.to(socketId).emit("question:start", {
        questionIndex: game.currentQuestionIndex + 1,
        totalQuestions: game.questions.length,
        endsAt: Date.now(),
        question: {
          prompt: question.prompt,
          options: question.options,
          image: sanitizeQuestionImage(question.image || "")
        }
      });
    }
    if (game.lastQuestionResultPayload) {
      io.to(socketId).emit("question:result", game.lastQuestionResultPayload);
    }
    return;
  }

  if (game.phase === "paused") {
    const pausedFromPhase = String(game.pauseState?.fromPhase || "");
    const remainingMs = Math.max(0, Number(game.pauseState?.remainingMs || 0));
    if (pausedFromPhase === "countdown") {
      io.to(socketId).emit("game:countdown", {
        secondsLeft: Math.max(0, Math.ceil(remainingMs / 1000)),
        endsAt: Date.now() + remainingMs
      });
    } else if (pausedFromPhase === "question") {
      const question = game.questions[game.currentQuestionIndex];
      if (question) {
        io.to(socketId).emit("question:start", {
          questionIndex: game.currentQuestionIndex + 1,
          totalQuestions: game.questions.length,
          endsAt: Date.now() + remainingMs,
          question: {
            prompt: question.prompt,
            options: question.options,
            image: sanitizeQuestionImage(question.image || "")
          }
        });
      }
    } else if (pausedFromPhase === "question_result") {
      const question = game.questions[game.currentQuestionIndex];
      if (question) {
        io.to(socketId).emit("question:start", {
          questionIndex: game.currentQuestionIndex + 1,
          totalQuestions: game.questions.length,
          endsAt: Date.now(),
          question: {
            prompt: question.prompt,
            options: question.options,
            image: sanitizeQuestionImage(question.image || "")
          }
        });
      }
      if (game.lastQuestionResultPayload) {
        io.to(socketId).emit("question:result", game.lastQuestionResultPayload);
      }
    } else if (pausedFromPhase === "minigame") {
      const eligiblePlayerIds = Array.from(game.chestPhase.keys());
      const meta = miniGameMeta(game.minigameType);
      io.to(socketId).emit("minigame:start", {
        eligiblePlayerIds,
        type: game.minigameType,
        endsAt: Date.now() + remainingMs,
        eventName: meta?.name || "Mini Game",
        feedTitle: "Mini-game Feed",
        difficulty: game.minigameDifficulty || miniGameDifficultyProfile(game)
      });
      if (game.chestPhase.has(socketId)) {
        const state = game.chestPhase.get(socketId);
        io.to(socketId).emit("minigame:yourData", {
          type: state.type,
          endsAt: Date.now() + remainingMs,
          eventName: meta?.name || "Mini Game",
          actionLabel: "Play",
          data: miniGamePublicData(state, game, socketId),
          difficulty: game.minigameDifficulty || miniGameDifficultyProfile(game)
        });
      }
    } else if (pausedFromPhase === "round_summary") {
      io.to(socketId).emit("round:summary", {
        questionIndex: game.currentQuestionIndex + 1,
        totalQuestions: game.questions.length,
        leaderboard
      });
    }

    io.to(socketId).emit("game:paused", {
      fromPhase: pausedFromPhase || "question",
      remainingMs
    });
    return;
  }

  if (game.phase === "countdown") {
    const endsAt = Number(game.countdownEndsAt || Date.now());
    const leftSeconds = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    io.to(socketId).emit("game:countdown", {
      secondsLeft: leftSeconds,
      endsAt
    });
    return;
  }

  if (game.phase === "minigame") {
    const eligiblePlayerIds = Array.from(game.chestPhase.keys());
    const meta = miniGameMeta(game.minigameType);

    io.to(socketId).emit("minigame:start", {
      eligiblePlayerIds,
      type: game.minigameType,
      endsAt: game.minigameEndsAt || Date.now() + 1000,
      eventName: meta?.name || "Mini Game",
      feedTitle: "Mini-game Feed",
      difficulty: game.minigameDifficulty || miniGameDifficultyProfile(game)
    });

    if (game.chestPhase.has(socketId)) {
      const state = game.chestPhase.get(socketId);
      io.to(socketId).emit("minigame:yourData", {
        type: state.type,
        endsAt: game.minigameEndsAt || Date.now() + 1000,
        eventName: meta?.name || "Mini Game",
        actionLabel: "Play",
        data: miniGamePublicData(state, game, socketId),
        difficulty: game.minigameDifficulty || miniGameDifficultyProfile(game)
      });
    }
    return;
  }

  if (game.phase === "round_summary") {
    io.to(socketId).emit("round:summary", {
      questionIndex: game.currentQuestionIndex + 1,
      totalQuestions: game.questions.length,
      leaderboard
    });
    return;
  }

  if (game.phase === "finished") {
    const existingReportCode = String(game.code || "").toUpperCase();
    io.to(socketId).emit("game:finished", {
      leaderboard,
      reportCode: existingReportCode
    });
  }
}

function clearTimers(game) {
  if (game.questionTimer) {
    clearTimeout(game.questionTimer);
    game.questionTimer = null;
  }

  if (game.roundTimer) {
    clearTimeout(game.roundTimer);
    game.roundTimer = null;
  }

  if (game.chestTimer) {
    clearTimeout(game.chestTimer);
    game.chestTimer = null;
  }
  if (game.minigameTick) {
    clearInterval(game.minigameTick);
    game.minigameTick = null;
  }
}

function resetMiniGameRuntimeState(game) {
  game.chestPhase.clear();
  game.minigameType = null;
  game.minigameDifficulty = null;
  game.minigameDurationMs = 0;
  game.minigameStartedAt = null;
  game.minigameEndsAt = null;
  game.soccerMatch = null;
}

function emitCountdownTick(game, secondsLeft) {
  io.to(game.code).emit("game:countdown", {
    secondsLeft: Math.max(0, Number(secondsLeft) || 0),
    endsAt: Number(game.countdownEndsAt || Date.now())
  });
}

function startGameCountdown(game, seconds = 3) {
  if (!game || !games.has(game.code) || game.phase !== "lobby") {
    return false;
  }

  clearTimers(game);
  const safeSeconds = clamp(Number(seconds) || 3, 1, 10);
  game.phase = "countdown";
  game.pauseState = null;
  game.countdownEndsAt = Date.now() + safeSeconds * 1000;
  game.updatedAt = Date.now();

  emitCountdownTick(game, safeSeconds);
  broadcastHostStatus(game);

  const tick = (remainingSeconds) => {
    if (!games.has(game.code) || game.phase !== "countdown") {
      return;
    }

    if (remainingSeconds <= 0) {
      game.countdownEndsAt = 0;
      startQuestion(game);
      return;
    }

    game.roundTimer = setTimeout(() => {
      game.roundTimer = null;
      const next = remainingSeconds - 1;
      emitCountdownTick(game, next);
      tick(next);
    }, 1000);
  };

  tick(safeSeconds);
  return true;
}

function restartActiveMiniGameTick(game) {
  if (!game || game.phase !== "minigame" || !game.minigameType) {
    return;
  }

  if (game.chestTimer) {
    clearTimeout(game.chestTimer);
  }
  game.chestTimer = setTimeout(() => {
    finalizeMiniGamePhase(game);
  }, Math.max(120, Number(game.minigameEndsAt || Date.now()) - Date.now() + 120));

  if (game.minigameTick) {
    clearInterval(game.minigameTick);
    game.minigameTick = null;
  }

  if (game.minigameType === "soccer_shootout" || game.minigameType === "space_invaders" || game.minigameType === "foosball_frenzy" || game.minigameType === "tower_stacker") {
    game.minigameTick = setInterval(() => {
      if (game.minigameType === "soccer_shootout") {
        tickSoccerMatch(game);
        return;
      }
      if (game.minigameType === "space_invaders") {
        tickSpaceInvadersMatch(game);
        return;
      }
      if (game.minigameType === "foosball_frenzy") {
        tickFoosballMatch(game);
        return;
      }
      if (game.minigameType === "tower_stacker") {
        tickTowerStackerMatch(game);
      }
    }, 90);

    if (game.minigameType === "soccer_shootout") {
      broadcastSoccerMatchState(game);
    } else if (game.minigameType === "space_invaders") {
      broadcastSpaceInvadersState(game);
    } else if (game.minigameType === "tower_stacker") {
      broadcastTowerStackerState(game);
    } else {
      broadcastFoosballState(game);
    }
  }

  broadcastMiniGameProgress(game);
}

function skipMiniGamePhase(game, options = {}) {
  if (!game || game.phase !== "minigame") {
    return false;
  }

  clearTimers(game);
  game.feed = [];
  resetMiniGameRuntimeState(game);
  game.updatedAt = Date.now();

  if (options.startNextQuestion === true) {
    startQuestion(game);
    return true;
  }

  io.to(game.code).emit("minigame:skipped", {
    reason: String(options.reason || "Host skipped the current mini-game.")
  });
  startRoundSummary(game);
  return true;
}

function pauseGame(game) {
  if (!game || !games.has(game.code) || game.phase === "finished" || game.phase === "ended" || game.phase === "paused") {
    return false;
  }

  const now = Date.now();
  let remainingMs = 0;
  let resumeAction = "";

  if (game.phase === "countdown") {
    remainingMs = Math.max(250, Number(game.countdownEndsAt || now) - now);
    resumeAction = "countdown";
  } else if (game.phase === "question") {
    remainingMs = Math.max(250, Number(game.questionEndsAt || now) - now);
    resumeAction = "question";
  } else if (game.phase === "question_result") {
    remainingMs = Math.max(0, Number(game.roundEndsAt || now) - now);
    resumeAction = "advance_after_result";
  } else if (game.phase === "minigame") {
    remainingMs = Math.max(250, Number(game.minigameEndsAt || now) - now);
    resumeAction = "minigame";
  } else if (game.phase === "round_summary") {
    remainingMs = Math.max(250, Number(game.roundEndsAt || now) - now);
    resumeAction =
      game.currentQuestionIndex >= game.questions.length - 1 && normalizeGameEndType(game.settings?.endType) !== "weight"
        ? "finish_game"
        : "start_question";
  } else {
    return false;
  }

  game.pauseState = {
    fromPhase: game.phase,
    remainingMs,
    elapsedQuestionMs:
      game.phase === "question" ? clamp(now - Number(game.questionStartedAt || now), 0, Number(game.settings?.timerSeconds || 15) * 1000) : 0,
    resumeAction
  };
  clearTimers(game);
  game.phase = "paused";
  game.updatedAt = now;

  io.to(game.code).emit("game:paused", {
    fromPhase: game.pauseState.fromPhase,
    remainingMs: game.pauseState.remainingMs
  });
  broadcastHostStatus(game);
  return true;
}

function resumeGame(game) {
  if (!game || !games.has(game.code) || game.phase !== "paused" || !game.pauseState) {
    return false;
  }

  const pausedFromPhase = String(game.pauseState.fromPhase || "");
  const remainingMs = Math.max(0, Number(game.pauseState.remainingMs || 0));
  const elapsedQuestionMs = Math.max(0, Number(game.pauseState.elapsedQuestionMs || 0));
  const resumeAction = String(game.pauseState.resumeAction || "");
  game.pauseState = null;
  game.updatedAt = Date.now();

  if (pausedFromPhase === "countdown") {
    return startGameCountdown(game, Math.max(1, Math.ceil(remainingMs / 1000)));
  }

  if (pausedFromPhase === "question") {
    game.phase = "question";
    game.questionStartedAt = Date.now() - elapsedQuestionMs;
    game.questionEndsAt = Date.now() + remainingMs;
    game.questionTimer = setTimeout(() => {
      closeQuestion(game);
    }, remainingMs + 120);
    io.to(game.code).emit("game:resumed", {
      phase: "question",
      endsAt: game.questionEndsAt
    });
    broadcastHostStatus(game);
    return true;
  }

  if (pausedFromPhase === "question_result") {
    game.phase = "question_result";
    game.roundEndsAt = Date.now() + remainingMs;
    game.roundTimer = setTimeout(() => {
      game.roundTimer = null;
      advanceAfterQuestionResult(game);
    }, remainingMs);
    io.to(game.code).emit("game:resumed", {
      phase: "question_result"
    });
    broadcastHostStatus(game);
    return true;
  }

  if (pausedFromPhase === "minigame") {
    game.phase = "minigame";
    game.minigameEndsAt = Date.now() + remainingMs;
    restartActiveMiniGameTick(game);
    io.to(game.code).emit("game:resumed", {
      phase: "minigame",
      endsAt: game.minigameEndsAt
    });
    broadcastHostStatus(game);
    return true;
  }

  if (pausedFromPhase === "round_summary") {
    game.phase = "round_summary";
    game.roundEndsAt = Date.now() + remainingMs;
    game.roundTimer = setTimeout(() => {
      game.roundTimer = null;
      if (resumeAction === "finish_game") {
        finishGame(game);
        return;
      }
      startQuestion(game);
    }, remainingMs);
    io.to(game.code).emit("game:resumed", {
      phase: "round_summary"
    });
    broadcastHostStatus(game);
    return true;
  }

  return false;
}

function forceNextQuestionNow(game) {
  if (!game || !games.has(game.code) || game.phase === "finished") {
    return false;
  }

  if (game.phase === "paused") {
    const pausedFromPhase = String(game.pauseState?.fromPhase || "");
    game.pauseState = null;
    if (pausedFromPhase === "minigame") {
      game.phase = "minigame";
      return skipMiniGamePhase(game, { startNextQuestion: true });
    }
    if (pausedFromPhase === "countdown" || pausedFromPhase === "question" || pausedFromPhase === "question_result") {
      game.phase = pausedFromPhase === "countdown" ? "countdown" : pausedFromPhase;
      if (pausedFromPhase === "question") {
        closeQuestion(game);
      }
      clearTimers(game);
      startQuestion(game);
      return true;
    }
    if (pausedFromPhase === "round_summary") {
      game.phase = "round_summary";
      clearTimers(game);
      startQuestion(game);
      return true;
    }
    return false;
  }

  if (game.phase === "countdown") {
    clearTimers(game);
    game.countdownEndsAt = 0;
    startQuestion(game);
    return true;
  }

  if (game.phase === "question") {
    closeQuestion(game);
    clearTimers(game);
    startQuestion(game);
    return true;
  }

  if (game.phase === "question_result") {
    clearTimers(game);
    startQuestion(game);
    return true;
  }

  if (game.phase === "minigame") {
    return skipMiniGamePhase(game, { startNextQuestion: true });
  }

  if (game.phase === "round_summary") {
    clearTimers(game);
    startQuestion(game);
    return true;
  }

  return false;
}

function destroyGame(code, reason = "Game ended") {
  const game = games.get(code);
  if (!game) {
    return;
  }

  clearTimers(game);
  io.to(game.code).emit("game:ended", { reason });

  for (const player of game.players.values()) {
    socketToGame.delete(player.id);
  }

  socketToGame.delete(game.hostId);
  games.delete(code);
  broadcastActiveRoom();
}

function startRoundSummary(game) {
  game.phase = "round_summary";
  game.roundEndsAt = 0;

  io.to(game.code).emit("round:summary", {
    questionIndex: game.currentQuestionIndex + 1,
    totalQuestions: game.questions.length,
    leaderboard: sortedPlayers(game)
  });

  broadcastHostStatus(game);

  if (game.currentQuestionIndex >= game.questions.length - 1) {
    game.roundEndsAt = Date.now() + 9000;
    game.roundTimer = setTimeout(() => {
      game.roundTimer = null;
      finishGame(game);
    }, 9000);
    return;
  }

  game.roundEndsAt = Date.now() + 7000;
  game.roundTimer = setTimeout(() => {
    game.roundTimer = null;
    startQuestion(game);
  }, 7000);
}

function applyPenalty(target, amount) {
  const loss = Math.min(target.score, amount);
  target.score -= loss;
  return loss;
}

function pickMiniGameType(game) {
  const rotationMode = normalizeMiniGameRotationMode(game.settings.miniGameRotationMode);
  if (rotationMode === "off") {
    return null;
  }

  const options = MODE_MINI_GAMES[normalizeMode(game.settings.mode)] || [];
  if (options.length === 0) {
    return null;
  }

  if (rotationMode === "random") {
    return options[randomInt(0, options.length - 1)];
  }

  if (rotationMode === "popular") {
    return mostPlayedMiniGameType(options) || options[0];
  }

  const index = game.minigameRotationIndex % options.length;
  game.minigameRotationIndex += 1;
  return options[index];
}

function miniGameMeta(type) {
  return MINI_GAME_LOOKUP.get(type) || MINI_GAME_LOOKUP.get("soccer_shootout");
}

function isMiniGameType(type) {
  if (typeof type !== "string") {
    return false;
  }

  return MINI_GAME_LOOKUP.has(type.trim());
}

function miniGameDifficultyProfile(game) {
  const totalQuestions = Math.max(1, Number(game?.questions?.length || game?.settings?.questionCount || 10));
  const roundNumber = Math.max(1, Number(game?.currentQuestionIndex ?? -1) + 1);
  const ratioRaw = totalQuestions <= 1 ? 1 : (roundNumber - 1) / (totalQuestions - 1);
  const ratio = clamp(Number.isFinite(ratioRaw) ? ratioRaw : 0, 0, 1);
  const tier = clamp(1 + Math.round(ratio * 3), 1, 4);
  return {
    roundNumber,
    totalQuestions,
    ratio,
    tier
  };
}

function miniGameHostGoal(game, type) {
  const difficulty = game?.minigameDifficulty || miniGameDifficultyProfile(game);
  const tier = clamp(Number(difficulty?.tier || 1), 1, 4);
  if (type === "foosball_frenzy") {
    return 5 + tier;
  }
  if (type === "soccer_shootout") {
    return 4 + tier;
  }
  if (type === "space_invaders") {
    return 8 + tier * 4;
  }
  if (type === "tower_stacker") {
    return 5 + tier * 2;
  }
  return 0;
}

function hostMiniGameProgressRow(state) {
  if (state.type === "foosball_frenzy") {
    const goals = Math.max(0, Number(state.goals || 0));
    const shots = Math.max(0, Number(state.shots || 0));
    const saves = Math.max(0, Number(state.saves || 0));
    const botGoals = Math.max(0, Number(state.botGoals || 0));
    const accuracy = shots > 0 ? Math.round((goals / shots) * 100) : 0;
    return {
      metric: goals * 210 + accuracy * 2 + saves * 28 - botGoals * 45,
      progress: goals,
      goals,
      shots,
      saves,
      botGoals,
      accuracy,
      completed: false
    };
  }

  if (state.type === "soccer_shootout") {
    const goals = Math.max(0, Number(state.goals || 0));
    const kicks = Math.max(0, Number(state.kicks || 0));
    return {
      metric: goals * 130 + kicks * 22,
      progress: goals,
      team: String(state.team || "red"),
      goals,
      kicks,
      completed: false
    };
  }

  if (state.type === "space_invaders") {
    const hits = Math.max(0, Number(state.hits || 0));
    const shots = Math.max(0, Number(state.shots || 0));
    const wave = Math.max(1, Number(state.wave || 1));
    const lives = Math.max(0, Number(state.lives || 0));
    const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 100;
    return {
      metric: hits * 220 + wave * 95 + lives * 30,
      progress: hits,
      hits,
      shots,
      wave,
      lives,
      accuracy,
      completed: state.completed === true
    };
  }

  if (state.type === "tower_stacker") {
    const height = Math.max(0, Number(state.towerHeight || 0));
    const piecesPlaced = Math.max(0, Number(state.piecesPlaced || 0));
    const perfectDrops = Math.max(0, Number(state.perfectDrops || 0));
    const combo = Math.max(0, Number(state.bestCombo || state.combo || 0));
    const stabilityScore = Math.max(0, Number(state.stabilityScore || 0));
    return {
      metric: Math.max(0, Number(state.score || 0)),
      progress: height,
      height,
      heightScore: Math.max(0, Number(state.towerHeightScore || 0)),
      piecesPlaced,
      perfectDrops,
      perfectLandingScore: Math.max(0, Number(state.perfectLandingScore || 0)),
      combo,
      stabilityScore,
      collapsed: state.collapsed === true,
      completed: false
    };
  }

  return {
    metric: 0,
    progress: 0,
    completed: false
  };
}

function buildMiniGameProgressPayload(game) {
  if (!game || game.phase !== "minigame" || !game.minigameType) {
    return null;
  }

  const type = game.minigameType;
  const meta = miniGameMeta(type);
  const difficulty = game?.minigameDifficulty || miniGameDifficultyProfile(game);
  const goal = miniGameHostGoal(game, type);
  const rows = [];

  for (const [playerId, state] of game.chestPhase.entries()) {
    const player = game.players.get(playerId);
    if (!player || !state) {
      continue;
    }

    const progressRow = hostMiniGameProgressRow(state);
    rows.push({
      id: player.id,
      name: player.name,
      blook: player.blook,
      score: player.score,
      ...progressRow
    });
  }

  rows.sort((a, b) => b.metric - a.metric || b.score - a.score || a.name.localeCompare(b.name));
  rows.forEach((row, index) => {
    row.rank = index + 1;
  });

  return {
    type,
    eventName: meta?.name || "Mini-game",
    goal,
    difficulty,
    endsAt: game.minigameEndsAt || Date.now() + 1000,
    players: rows,
    teamScores:
      type === "soccer_shootout"
        ? {
          red: Math.max(0, Number(game.soccerMatch?.teams?.red?.goals || 0)),
          blue: Math.max(0, Number(game.soccerMatch?.teams?.blue?.goals || 0)),
          redName: SOCCER_TEAMS.red.name,
          blueName: SOCCER_TEAMS.blue.name
        }
        : null
  };
}

function broadcastMiniGameProgress(game) {
  if (!game || game.phase !== "minigame") {
    return;
  }

  const payload = buildMiniGameProgressPayload(game);
  if (!payload) {
    return;
  }

  io.to(game.hostId).emit("minigame:progress", payload);
}

function soccerStatePayloadForPlayer(game, playerId) {
  const soccer = ensureSoccerMatchState(game);
  if (!soccer) {
    return null;
  }
  const playerState = game?.chestPhase?.get(playerId);
  const players = soccerMatchPlayerRows(game);
  return {
    type: "soccer_shootout",
    teams: {
      red: SOCCER_TEAMS.red.name,
      blue: SOCCER_TEAMS.blue.name
    },
    score: {
      red: Math.max(0, Number(soccer.teams?.red?.goals || 0)),
      blue: Math.max(0, Number(soccer.teams?.blue?.goals || 0))
    },
    yourTeam: String(playerState?.team || "red"),
    yourGoals: Math.max(0, Number(playerState?.goals || 0)),
    yourKicks: Math.max(0, Number(playerState?.kicks || 0)),
    players,
    ball: {
      x: clamp(Number(soccer.ball?.x || 50), 0, 100),
      y: clamp(Number(soccer.ball?.y || 30), 0, 60),
      vx: Number(soccer.ball?.vx || 0),
      vy: Number(soccer.ball?.vy || 0)
    },
    lastKick: soccer.lastKick || null,
    lastEvent: soccer.lastEvent || null,
    completed: false
  };
}

function broadcastSoccerMatchState(game) {
  if (!game || game.phase !== "minigame" || game.minigameType !== "soccer_shootout") {
    return;
  }
  for (const playerId of game.chestPhase.keys()) {
    const payload = soccerStatePayloadForPlayer(game, playerId);
    if (!payload) {
      continue;
    }
    io.to(playerId).emit("minigame:state", payload);
  }
}

function updateSoccerBallKick(game, playerId, value) {
  const soccer = ensureSoccerMatchState(game);
  const state = game?.chestPhase?.get(playerId);
  if (!soccer || !state) {
    return { ok: false, message: "Soccer match state unavailable." };
  }

  const playerWorld = soccer.players?.[playerId];
  if (!playerWorld) {
    return { ok: false, message: "Player world state missing." };
  }

  const ball = soccer.ball;
  const dx = Number(ball.x || 50) - Number(playerWorld.x || 50);
  const dy = Number(ball.y || 30) - Number(playerWorld.y || 30);
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > 26) {
    return { ok: false, message: "Move closer to the ball before kicking." };
  }

  const team = String(state.team || "red") === "blue" ? "blue" : "red";
  const attackSign = team === "red" ? 1 : -1;
  const power = clamp(Number(value?.power) || 2, 1, 3);
  const direction = clamp(Number(value?.direction) || randomFloat(-35, 35), -60, 60);
  const angle = (direction * Math.PI) / 180;
  const speed = 2.0 + power * 0.9;
  ball.vx = attackSign * Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
  ball.lastTouchPlayerId = playerId;
  ball.lastTouchTeam = team;

  state.kicks = Math.max(0, Number(state.kicks || 0)) + 1;
  state.lastKickAt = Date.now();

  soccer.lastKickSeq = Math.max(0, Number(soccer.lastKickSeq || 0)) + 1;
  soccer.lastKick = {
    seq: soccer.lastKickSeq,
    ts: Date.now(),
    byId: playerId,
    byName: game.players.get(playerId)?.name || "Player",
    byTeam: team,
    power,
    direction,
    flightMs: clamp(Math.round((100 / Math.max(0.01, Math.abs(ball.vx))) * 16), 350, 1200),
    outcome: "in_play",
    goal: false,
    bounces: 0
  };

  return { ok: true };
}

function soccerResetBallAfterGoal(soccer, team) {
  const nextKickTeam = team === "red" ? "blue" : "red";
  const sign = nextKickTeam === "red" ? 1 : -1;
  soccer.ball.x = 50;
  soccer.ball.y = 30;
  soccer.ball.vx = sign * randomFloat(0.55, 1.05);
  soccer.ball.vy = randomFloat(-0.3, 0.3);
  soccer.ball.lastTouchPlayerId = "";
  soccer.ball.lastTouchTeam = "";
}

function tickSoccerMatch(game) {
  if (!game || game.phase !== "minigame" || game.minigameType !== "soccer_shootout") {
    return;
  }
  const soccer = ensureSoccerMatchState(game);
  if (!soccer) {
    return;
  }

  const pitch = soccer.pitch || { width: 100, height: 60, goalTop: 22, goalBottom: 38 };
  const players = soccer.players && typeof soccer.players === "object" ? soccer.players : {};
  for (const [playerId, world] of Object.entries(players)) {
    if (!game.chestPhase.has(playerId)) {
      delete players[playerId];
      continue;
    }
    const team = String(world.team || soccer.assignments?.[playerId] || "red") === "blue" ? "blue" : "red";
    const minX = team === "red" ? 7 : 53;
    const maxX = team === "red" ? 47 : 93;
    const minY = 6;
    const maxY = pitch.height - 6;

    world.vx = clamp(Number(world.vx || 0) + randomFloat(-0.05, 0.05), -0.55, 0.55);
    world.vy = clamp(Number(world.vy || 0) + randomFloat(-0.06, 0.06), -0.6, 0.6);
    world.x = Number(world.x || 50) + world.vx;
    world.y = Number(world.y || 30) + world.vy;

    if (world.x <= minX || world.x >= maxX) {
      world.vx *= -0.85;
      world.x = clamp(world.x, minX, maxX);
    }
    if (world.y <= minY || world.y >= maxY) {
      world.vy *= -0.85;
      world.y = clamp(world.y, minY, maxY);
    }
  }

  const ball = soccer.ball;
  ball.x = Number(ball.x || 50) + Number(ball.vx || 0);
  ball.y = Number(ball.y || 30) + Number(ball.vy || 0);
  ball.vx = Number(ball.vx || 0) * 0.986;
  ball.vy = Number(ball.vy || 0) * 0.986;

  if (Math.abs(ball.vx) < 0.01) {
    ball.vx = 0;
  }
  if (Math.abs(ball.vy) < 0.01) {
    ball.vy = 0;
  }

  if (ball.y <= 1 || ball.y >= pitch.height - 1) {
    ball.y = clamp(ball.y, 1, pitch.height - 1);
    ball.vy *= -0.9;
    if (soccer.lastKick && soccer.lastKick.outcome === "in_play") {
      soccer.lastKick.bounces = Math.max(0, Number(soccer.lastKick.bounces || 0)) + 1;
    }
  }

  let handledGoalOrEnd = false;
  if (ball.x <= 0 || ball.x >= pitch.width) {
    const side = ball.x >= pitch.width ? "right" : "left";
    const inGoalWindow = ball.y >= pitch.goalTop && ball.y <= pitch.goalBottom;
    const scoringTeam = side === "right" ? "red" : "blue";
    if (inGoalWindow && ball.lastTouchTeam === scoringTeam) {
      soccer.teams[scoringTeam].goals += 1;
      const scorerId = String(ball.lastTouchPlayerId || "");
      const scorer = game.chestPhase.get(scorerId);
      if (scorer && scorer.type === "soccer_shootout") {
        scorer.goals = Math.max(0, Number(scorer.goals || 0)) + 1;
      }

      soccer.lastEventSeq = Math.max(0, Number(soccer.lastEventSeq || 0)) + 1;
      soccer.lastEvent = {
        seq: soccer.lastEventSeq,
        type: "goal",
        team: scoringTeam,
        byId: scorerId,
        byName: game.players.get(scorerId)?.name || "Player",
        score: {
          red: Math.max(0, Number(soccer.teams.red.goals || 0)),
          blue: Math.max(0, Number(soccer.teams.blue.goals || 0))
        }
      };
      if (soccer.lastKick) {
        soccer.lastKick.outcome = "goal";
        soccer.lastKick.goal = true;
      }
      soccerResetBallAfterGoal(soccer, scoringTeam);
      handledGoalOrEnd = true;
    } else {
      if (ball.x <= 0) {
        ball.x = 0;
        ball.vx = Math.abs(Number(ball.vx || 0)) * 0.85;
      } else {
        ball.x = pitch.width;
        ball.vx = -Math.abs(Number(ball.vx || 0)) * 0.85;
      }
      if (soccer.lastKick) {
        soccer.lastKick.outcome = "saved";
      }
    }
  }

  soccer.tickCount = Math.max(0, Number(soccer.tickCount || 0)) + 1;
  broadcastSoccerMatchState(game);
  if (handledGoalOrEnd || soccer.tickCount % 5 === 0) {
    broadcastMiniGameProgress(game);
  }
}

function clampFoosballLane(lane) {
  return clamp(Math.round(Number(lane ?? 1)), 0, 2);
}

function foosballStatePayload(state) {
  const goals = Math.max(0, Number(state?.goals || 0));
  const botGoals = Math.max(0, Number(state?.botGoals || 0));
  const shots = Math.max(0, Number(state?.shots || 0));
  const saves = Math.max(0, Number(state?.saves || 0));
  return {
    type: "foosball_frenzy",
    lane: clampFoosballLane(state?.lane),
    goalieLane: clampFoosballLane(state?.goalieLane),
    goals,
    botGoals,
    shots,
    saves,
    score: {
      you: goals,
      bot: botGoals
    },
    lastShot: state?.lastShot || null,
    lastEvent: state?.lastEvent || null,
    completed: false
  };
}

function broadcastFoosballState(game) {
  if (!game || game.phase !== "minigame" || game.minigameType !== "foosball_frenzy") {
    return;
  }
  for (const [playerId, state] of game.chestPhase.entries()) {
    if (!state || state.type !== "foosball_frenzy") {
      continue;
    }
    io.to(playerId).emit("minigame:state", foosballStatePayload(state));
  }
}

function tickFoosballMatch(game) {
  if (!game || game.phase !== "minigame" || game.minigameType !== "foosball_frenzy") {
    return;
  }

  const now = Date.now();
  let progressChanged = false;

  for (const [playerId, state] of game.chestPhase.entries()) {
    if (!state || state.type !== "foosball_frenzy") {
      continue;
    }

    const tickMs = clamp(now - Number(state.lastTickAt || now), 16, 250);
    state.lastTickAt = now;
    state.tick = Math.max(0, Number(state.tick || 0)) + 1;

    let stateChanged = false;
    const tier = clamp(Number(state.difficultyTier || 1), 1, 4);
    const goalieShiftMs = Math.max(520, 1100 - tier * 120);
    if (now - Number(state.lastGoalieShiftAt || 0) >= goalieShiftMs) {
      const nextLane = randomInt(0, 2);
      if (nextLane !== clampFoosballLane(state.goalieLane)) {
        state.goalieLane = nextLane;
        state.lastGoalieShiftAt = now;
        state.lastEventSeq = Math.max(0, Number(state.lastEventSeq || 0)) + 1;
        state.lastEvent = {
          seq: state.lastEventSeq,
          ts: now,
          type: "goalie_shift",
          lane: nextLane
        };
        stateChanged = true;
      }
    }

    state.botMeter = Math.max(0, Number(state.botMeter || 0)) + tickMs * (0.04 + tier * 0.009);
    if (state.botMeter >= 100) {
      state.botMeter -= 100;
      const shotLane = randomInt(0, 2);
      const blockLane = clampFoosballLane(state.lane);
      const blocked = shotLane === blockLane && Math.random() < 0.57;
      if (!blocked) {
        state.botGoals = Math.max(0, Number(state.botGoals || 0)) + 1;
        progressChanged = true;
      }
      state.lastEventSeq = Math.max(0, Number(state.lastEventSeq || 0)) + 1;
      state.lastEvent = {
        seq: state.lastEventSeq,
        ts: now,
        type: blocked ? "bot_saved" : "bot_goal",
        lane: shotLane
      };
      stateChanged = true;
    }

    if (stateChanged || state.tick % 8 === 0) {
      io.to(playerId).emit("minigame:state", foosballStatePayload(state));
    }
  }

  if (progressChanged) {
    broadcastMiniGameProgress(game);
  }
}

function createSpaceInvaderWave(wave, difficultyTier = 1) {
  const safeWave = Math.max(1, Number(wave || 1));
  const tier = clamp(Number(difficultyTier || 1), 1, 4);
  const columns = 7;
  const rows = clamp(2 + Math.floor((safeWave - 1) / 2) + (tier >= 3 ? 1 : 0), 2, 5);
  const startX = 16;
  const stepX = 11;
  const startY = 10;
  const stepY = 8;
  const invaders = [];
  let sequence = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      invaders.push({
        id: `w${safeWave}_${sequence}`,
        x: startX + col * stepX,
        y: startY + row * stepY,
        alive: true
      });
      sequence += 1;
    }
  }
  return invaders;
}

function spaceInvadersStateSnapshot(state) {
  const invaders = Array.isArray(state?.invaders)
    ? state.invaders
      .filter((invader) => invader && invader.alive !== false)
      .map((invader) => ({
        id: String(invader.id || ""),
        x: clamp(Number(invader.x || 0), 0, 100),
        y: clamp(Number(invader.y || 0), 0, 100)
      }))
    : [];
  const bulletActive = Boolean(state?.bullet && state.bullet.active !== false);
  const bullet = bulletActive
    ? {
      x: clamp(Number(state.bullet.x || 50), 0, 100),
      y: clamp(Number(state.bullet.y || 90), 0, 100)
    }
    : null;
  return {
    shipX: clamp(Number(state?.shipX || 50), 6, 94),
    lives: Math.max(0, Number(state?.lives || 0)),
    wave: Math.max(1, Number(state?.wave || 1)),
    hits: Math.max(0, Number(state?.hits || 0)),
    shots: Math.max(0, Number(state?.shots || 0)),
    invaderDirection: Number(state?.invaderDirection || 1) >= 0 ? 1 : -1,
    invaders,
    bullet,
    completed: state?.completed === true,
    lost: state?.lost === true
  };
}

function spaceInvadersPayload(state, game) {
  const difficulty = game?.minigameDifficulty || miniGameDifficultyProfile(game);
  const tier = clamp(Number(state?.difficultyTier || difficulty?.tier || 1), 1, 4);
  return {
    type: "space_invaders",
    ...spaceInvadersStateSnapshot(state),
    difficultyTier: tier
  };
}

function towerStackerThemeConfig(themeId) {
  const key = String(themeId || "").toLowerCase();
  return TOWER_STACKER_THEMES[key] || TOWER_STACKER_THEMES.cats;
}

function towerStackerThemeList() {
  return Object.values(TOWER_STACKER_THEMES).map((theme) => ({
    id: theme.id,
    label: theme.label,
    accent: theme.accent,
    secondary: theme.secondary
  }));
}

function towerStackerVariantById(themeId, variantId) {
  const theme = towerStackerThemeConfig(themeId);
  return theme.pieces.find((piece) => piece.id === variantId) || theme.pieces[0];
}

function createTowerStackerPiece(themeId, difficultyTier = 1) {
  const theme = towerStackerThemeConfig(themeId);
  const tier = clamp(Number(difficultyTier || 1), 1, 4);
  const variant = theme.pieces[randomInt(0, theme.pieces.length - 1)];
  const widthScale = 1 - (tier - 1) * 0.04 + randomFloat(-0.05, 0.05);
  const heightScale = 1 + randomFloat(-0.06, 0.08);
  const width = clamp(Math.round(variant.w * TOWER_STACKER_PIECE_SCALE * widthScale * 10) / 10, 4.8, 10.8);
  const height = clamp(Math.round(variant.h * TOWER_STACKER_PIECE_SCALE * heightScale * 10) / 10, 4.2, 8.6);
  return {
    id: `tower_piece_${Math.random().toString(36).slice(2, 9)}`,
    theme: theme.id,
    variantId: variant.id,
    variantLabel: variant.id,
    shape: variant.shape,
    color: variant.color,
    belly: variant.belly,
    ears: variant.ears === true,
    face: variant.face,
    accessory: variant.accessory,
    w: width,
    h: height,
    x: 50,
    y: 14,
    vx: 0,
    vy: 0,
    slideVx: 0,
    angle: 0,
    rotationSpeed: randomFloat(-0.01, 0.01),
    wobble: 0,
    dropped: false,
    perfect: false,
    settledAt: 0,
    supportId: "",
    supportOverlap: 1,
    blinkSeed: Math.random()
  };
}

function towerStackerSpawnPreview(state) {
  if (!state || state.collapsed || state.previewPiece || Number(state.availableDrops || 0) <= 0) {
    return;
  }
  const piece = createTowerStackerPiece(state.theme, state.difficultyTier || 1);
  const towerTopWorld = getTowerTopWorldY(state.settledPieces || []);
  piece.x = 50;
  piece.y = towerTopWorld - TOWER_STACKER_SPAWN_HEADROOM;
  piece.spawnedAt = Date.now();
  state.previewPiece = piece;
}

function grantTowerStackerDrops(state, count = 1) {
  if (!state || state.type !== "tower_stacker") {
    return state;
  }
  const safeCount = Math.max(0, Math.round(Number(count) || 0));
  state.availableDrops = Math.max(0, Number(state.availableDrops || 0)) + safeCount;
  state.totalGrantedDrops = Math.max(0, Number(state.totalGrantedDrops || 0)) + safeCount;
  towerStackerSpawnPreview(state);
  return state;
}

function towerStackerRestartState(state, options = {}) {
  if (!state) {
    return;
  }
  const preserveTheme = options.preserveTheme !== false;
  const nextTheme = preserveTheme ? state.theme : towerStackerThemeConfig(options.theme).id;
  const drops = Number.isFinite(Number(options.availableDrops)) ? Math.max(0, Number(options.availableDrops)) : Math.max(1, Number(state.availableDrops || 0));
  state.theme = nextTheme;
  state.previewPiece = null;
  state.settledPieces = [];
  state.fallingPieces = [];
  state.availableDrops = drops;
  state.totalGrantedDrops = Math.max(0, Number(state.totalGrantedDrops || 0));
  state.piecesPlaced = 0;
  state.perfectDrops = 0;
  state.perfectLandingScore = 0;
  state.combo = 0;
  state.bestCombo = Math.max(0, Number(state.bestCombo || 0));
  state.towerHeight = 0;
  state.towerHeightScore = 0;
  state.bestHeight = Math.max(0, Number(state.bestHeight || 0));
  state.stabilityScore = 0;
  state.score = 0;
  state.collapsed = false;
  state.collapseAmount = 0;
  state.completed = false;
  state.lastEvent = null;
  state.lastSupportQuality = 1;
  state.lastTickAt = Date.now();
  state.tick = 0;
  towerStackerSpawnPreview(state);
}

function towerPieceTop(piece) {
  return Number(piece.y || 0) - Number(piece.h || 0) / 2;
}

function towerPieceBottom(piece) {
  return Number(piece.y || 0) + Number(piece.h || 0) / 2;
}

function towerPieceLeft(piece) {
  return Number(piece.x || 0) - Number(piece.w || 0) / 2;
}

function towerPieceRight(piece) {
  return Number(piece.x || 0) + Number(piece.w || 0) / 2;
}

function towerOverlapWidth(a, b) {
  return Math.max(0, Math.min(towerPieceRight(a), towerPieceRight(b)) - Math.max(towerPieceLeft(a), towerPieceLeft(b)));
}

function getTowerTopWorldY(settledPieces) {
  if (!Array.isArray(settledPieces) || settledPieces.length === 0) {
    return TOWER_STACKER_GROUND_Y;
  }
  return settledPieces.reduce((min, piece) => Math.min(min, towerPieceTop(piece)), TOWER_STACKER_GROUND_Y);
}

function getTowerHeightWorldUnits(settledPieces) {
  return Math.max(0, Math.round((TOWER_STACKER_GROUND_Y - getTowerTopWorldY(settledPieces)) * 10) / 10);
}

function findTowerSupportPiece(piece, settledPieces) {
  let best = null;
  let bestTop = Number.POSITIVE_INFINITY;
  for (const candidate of settledPieces) {
    const candidateTop = towerPieceTop(candidate);
    if (candidateTop < towerPieceBottom(piece) - 4) {
      continue;
    }
    const overlap = towerOverlapWidth(piece, candidate);
    if (overlap <= 0) {
      continue;
    }
    if (candidateTop < bestTop) {
      bestTop = candidateTop;
      best = { piece: candidate, overlap };
    }
  }
  return best;
}

function towerStackerTowerHeight(state) {
  return getTowerHeightWorldUnits(state?.settledPieces || []);
}

function towerStackerHeightScore(state) {
  const height = Math.max(0, Number(state?.towerHeight || 0));
  const layers = Math.max(0, Number(state?.piecesPlaced || 0));
  return Math.round(height * 24 + layers * 16);
}

function towerStackerPerfectPoints(landingPrecision, supportOverlap, wobbleAmount) {
  const precisionScore = clamp(Number(landingPrecision || 0), 0, 1);
  const supportScore = clamp(Number(supportOverlap || 0), 0, 1);
  const wobblePenalty = clamp(Number(wobbleAmount || 0) / 18, 0, 1);
  return Math.max(0, Math.round(precisionScore * 80 + supportScore * 50 - wobblePenalty * 18));
}

function towerStackerScore(state) {
  const heightScore = Math.round(Math.max(0, Number(state.towerHeightScore || 0)));
  const stackScore = Math.max(0, Number(state.piecesPlaced || 0)) * 135;
  const stability = Math.round(Math.max(0, Number(state.stabilityScore || 0)) * 45);
  const perfect = Math.max(0, Number(state.perfectLandingScore || 0)) * 2;
  const combo = Math.max(0, Number(state.bestCombo || 0)) * 65;
  return heightScore + stackScore + stability + perfect + combo;
}

function towerStackerPayload(state) {
  const theme = towerStackerThemeConfig(state?.theme);
  const snapshotPieces = (rows = []) =>
    rows.map((piece) => ({
      id: String(piece.id || ""),
      theme: String(piece.theme || theme.id),
      variantId: String(piece.variantId || ""),
      shape: String(piece.shape || "roundrect"),
      color: String(piece.color || "#ffffff"),
      belly: String(piece.belly || "#ffffff"),
      ears: piece.ears === true,
      face: String(piece.face || "smile"),
      accessory: String(piece.accessory || ""),
      x: clamp(Number(piece.x || 50), -20, 120),
      y: clamp(Number(piece.y || 0), -4000, 160),
      w: clamp(Number(piece.w || 12), 6, 24),
      h: clamp(Number(piece.h || 10), 6, 18),
      angle: Number(piece.angle || 0),
      wobble: Number(piece.wobble || 0),
      perfect: piece.perfect === true,
      supportOverlap: clamp(Number(piece.supportOverlap ?? 1), 0, 1),
      blinkSeed: Number(piece.blinkSeed || 0)
    }));
  return {
    type: "tower_stacker",
    theme: theme.id,
    themes: towerStackerThemeList(),
    availableDrops: Math.max(0, Number(state?.availableDrops || 0)),
    totalGrantedDrops: Math.max(0, Number(state?.totalGrantedDrops || 0)),
    piecesPlaced: Math.max(0, Number(state?.piecesPlaced || 0)),
    perfectDrops: Math.max(0, Number(state?.perfectDrops || 0)),
    perfectLandingScore: Math.max(0, Number(state?.perfectLandingScore || 0)),
    combo: Math.max(0, Number(state?.combo || 0)),
    bestCombo: Math.max(0, Number(state?.bestCombo || 0)),
    towerHeight: Math.max(0, Number(state?.towerHeight || 0)),
    towerHeightScore: Math.max(0, Number(state?.towerHeightScore || 0)),
    bestHeight: Math.max(0, Number(state?.bestHeight || 0)),
    stabilityScore: Math.max(0, Number(state?.stabilityScore || 0)),
    score: Math.max(0, Number(state?.score || 0)),
    collapsed: state?.collapsed === true,
    collapseAmount: Math.max(0, Number(state?.collapseAmount || 0)),
    completed: state?.completed === true,
    lastEvent: state?.lastEvent || null,
    previewPiece: state?.previewPiece ? snapshotPieces([state.previewPiece])[0] : null,
    settledPieces: snapshotPieces(state?.settledPieces || []),
    fallingPieces: snapshotPieces(state?.fallingPieces || [])
  };
}

function towerStackerTickState(state, now) {
  if (!state || state.type !== "tower_stacker") {
    return false;
  }

  let changed = false;
  const tickMs = clamp(now - Number(state.lastTickAt || now), 16, 180);
  state.lastTickAt = now;
  state.tick = Math.max(0, Number(state.tick || 0)) + 1;
  const tier = clamp(Number(state.difficultyTier || 1), 1, 4);

  if (Array.isArray(state.fallingPieces) && state.fallingPieces.length > 0) {
    for (const piece of state.fallingPieces) {
      piece.vy = Number(piece.vy || 0) + 0.06 * (tickMs / 16);
      piece.y = Number(piece.y || 0) + piece.vy * (tickMs / 16);
      piece.x = Number(piece.x || 0) + Number(piece.vx || 0) * (tickMs / 16);
      piece.angle = Number(piece.angle || 0) + Number(piece.rotationSpeed || 0) * (tickMs / 16) * 10;
    }
    state.fallingPieces = state.fallingPieces.filter((piece) => Number(piece.y || 0) < 124);
    changed = true;
  }

  if (state.collapsed !== true && state.previewPiece && state.previewPiece.dropped !== true) {
    const preview = state.previewPiece;
    const hoverAmplitude = Math.max(8, 18 - tier * 1.4);
    const hoverSpeed = 0.0011 + tier * 0.00018;
    const towerTop = getTowerTopWorldY(state.settledPieces || []);
    preview.x = 50 + Math.sin((now - Number(preview.spawnedAt || now)) * hoverSpeed) * hoverAmplitude;
    preview.y = towerTop - TOWER_STACKER_SPAWN_HEADROOM + Math.sin((now - Number(preview.spawnedAt || now)) * 0.003) * 1.2;
    preview.angle = Math.sin((now - Number(preview.spawnedAt || now)) * 0.004) * 0.05;
    changed = true;
  }

  if (state.previewPiece && state.previewPiece.dropped === true) {
    const piece = state.previewPiece;
    piece.vy = Number(piece.vy || 0) + 0.09 * (tickMs / 16);
    piece.y = Number(piece.y || 0) + piece.vy * (tickMs / 16);
    piece.x = Number(piece.x || 0) + Number(piece.vx || 0) * (tickMs / 16);
    piece.angle = Number(piece.angle || 0) + Number(piece.rotationSpeed || 0) * (tickMs / 16) * 16;

    let targetY = TOWER_STACKER_GROUND_Y - Number(piece.h || 0) / 2;
    let supportPiece = null;
    let overlapRatio = 1;
    const support = findTowerSupportPiece(piece, state.settledPieces || []);
    if (support) {
      targetY = towerPieceTop(support.piece) - Number(piece.h || 0) / 2;
      supportPiece = support.piece;
      overlapRatio = clamp(support.overlap / Math.max(1, Number(piece.w || 1)), 0, 1);
    }

    if (towerPieceBottom(piece) >= targetY) {
      piece.y = targetY;
      piece.vy = 0;
      piece.settledAt = now;
      piece.supportId = supportPiece?.id || "ground";
      piece.supportOverlap = overlapRatio;
      const centerDelta = supportPiece
        ? Math.abs(Number(piece.x || 0) - Number(supportPiece.x || 0))
        : Math.abs(Number(piece.x || 50) - 50);
      const centerAllowance = supportPiece ? Math.max(1.8, Number(supportPiece.w || 0) * 0.08) : 2.2;
      const landingPrecision = clamp(1 - centerDelta / Math.max(centerAllowance * 3, 1), 0, 1);
      piece.perfect = centerDelta <= centerAllowance && overlapRatio >= 0.9;
      piece.wobble = clamp((1 - overlapRatio) * 14, 0, 14);
      if (supportPiece) {
        piece.slideVx = overlapRatio < 0.54 ? Math.sign(Number(piece.x || 0) - Number(supportPiece.x || 0) || randomFloat(-1, 1)) * (0.018 + (0.54 - overlapRatio) * 0.14) : 0;
      } else {
        piece.slideVx = Math.abs(Number(piece.x || 50) - 50) > 5 ? Math.sign(Number(piece.x || 50) - 50) * 0.03 : 0;
      }
      state.settledPieces.push(piece);
      state.previewPiece = null;
      state.piecesPlaced = Math.max(0, Number(state.piecesPlaced || 0)) + 1;
      state.combo = piece.perfect ? Math.max(0, Number(state.combo || 0)) + 1 : 0;
      state.bestCombo = Math.max(Math.max(0, Number(state.bestCombo || 0)), Number(state.combo || 0));
      if (piece.perfect) {
        state.perfectDrops = Math.max(0, Number(state.perfectDrops || 0)) + 1;
      }
      const perfectPoints = towerStackerPerfectPoints(landingPrecision, overlapRatio, piece.wobble);
      state.perfectLandingScore = Math.max(0, Number(state.perfectLandingScore || 0)) + perfectPoints;
      state.lastSupportQuality = overlapRatio;
      state.stabilityScore = Math.max(0, Number(state.stabilityScore || 0)) + overlapRatio;
      state.towerHeight = towerStackerTowerHeight(state);
      state.towerHeightScore = towerStackerHeightScore(state);
      const previousBestHeight = Math.max(0, Number(state.bestHeight || 0));
      state.bestHeight = Math.max(Math.max(0, Number(state.bestHeight || 0)), Number(state.towerHeight || 0));
      state.score = towerStackerScore(state);
      state.lastEventSeq = Math.max(0, Number(state.lastEventSeq || 0)) + 1;
      state.lastEvent = {
        seq: state.lastEventSeq,
        type:
          piece.perfect
            ? "perfect_drop"
            : landingPrecision >= 0.74 && overlapRatio >= 0.76
              ? "great_drop"
              : overlapRatio >= 0.62
                ? "stable_stack"
                : "drop_landed",
        perfect: piece.perfect,
        perfectPoints,
        landingPrecision,
        supportOverlap: overlapRatio,
        isHeightRecord: Number(state.towerHeight || 0) >= previousBestHeight,
        x: piece.x,
        y: piece.y
      };
      changed = true;
    }
  }

  if (Array.isArray(state.settledPieces) && state.settledPieces.length > 0) {
    const stillStanding = [];
    const newlyFalling = [];
    const orderedPieces = [...state.settledPieces].sort((left, right) => towerPieceTop(right) - towerPieceTop(left));
    for (let index = 0; index < orderedPieces.length; index += 1) {
      const piece = orderedPieces[index];
      const grounded = towerPieceBottom(piece) >= TOWER_STACKER_GROUND_Y - 0.75;
      if (grounded) {
        piece.y = TOWER_STACKER_GROUND_Y - Number(piece.h || 0) / 2;
      }
      const support = grounded ? null : findTowerSupportPiece(piece, stillStanding);
      const overlapRatio = support ? clamp(support.overlap / Math.max(1, Number(piece.w || 1)), 0, 1) : 0;
      piece.supportOverlap = overlapRatio;
      piece.wobble = clamp((1 - overlapRatio) * 13 + Math.abs(Number(piece.slideVx || 0)) * 44, 0, 16);

      if (!grounded && !support && stillStanding.length > 0) {
        piece.vx = Number(piece.slideVx || randomFloat(-0.18, 0.18));
        piece.vy = 0.12;
        newlyFalling.push(piece);
        continue;
      }

      if (support && overlapRatio < 0.46) {
        const supportCenter = Number(support.piece.x || 50);
        piece.y = towerPieceTop(support.piece) - Number(piece.h || 0) / 2;
        piece.slideVx = clamp(Number(piece.slideVx || 0) + Math.sign(Number(piece.x || 0) - supportCenter || randomFloat(-1, 1)) * (0.01 + (0.46 - overlapRatio) * 0.045), -0.26, 0.26);
      } else {
        piece.slideVx = Number(piece.slideVx || 0) * 0.82;
      }

      if (Math.abs(Number(piece.slideVx || 0)) > 0.001) {
        piece.x = Number(piece.x || 0) + Number(piece.slideVx || 0) * (tickMs / 16);
        changed = true;
      }

      if (support && Math.abs(Number(piece.x || 0) - Number(support.piece.x || 0)) > (Number(support.piece.w || 0) + Number(piece.w || 0)) * 0.58) {
        piece.vx = Number(piece.slideVx || 0);
        piece.vy = 0.14;
        newlyFalling.push(piece);
        continue;
      }

      stillStanding.push(piece);
    }

    if (newlyFalling.length > 0) {
      state.settledPieces = stillStanding;
      state.fallingPieces.push(...newlyFalling);
      state.collapseAmount = Math.max(0, Number(state.collapseAmount || 0)) + newlyFalling.length;
      state.combo = 0;
      state.lastEventSeq = Math.max(0, Number(state.lastEventSeq || 0)) + 1;
      state.lastEvent = {
        seq: state.lastEventSeq,
        type: "tower_wobble",
        fallen: newlyFalling.length
      };
      changed = true;
    }
  }

  state.towerHeight = towerStackerTowerHeight(state);
  state.towerHeightScore = towerStackerHeightScore(state);
  state.bestHeight = Math.max(Math.max(0, Number(state.bestHeight || 0)), Number(state.towerHeight || 0));
  state.score = towerStackerScore(state);

  if (Number(state.collapseAmount || 0) >= 3 && state.collapsed !== true) {
    state.collapsed = true;
    state.lastEventSeq = Math.max(0, Number(state.lastEventSeq || 0)) + 1;
    state.lastEvent = {
      seq: state.lastEventSeq,
      type: "tower_collapse",
      fallen: Number(state.collapseAmount || 0)
    };
    changed = true;
  }

  if (state.collapsed !== true && !state.previewPiece && Number(state.availableDrops || 0) > 0) {
    towerStackerSpawnPreview(state);
    changed = true;
  }

  return changed || state.tick % 5 === 0;
}

function broadcastSpaceInvadersState(game) {
  if (!game || game.phase !== "minigame" || game.minigameType !== "space_invaders") {
    return;
  }

  for (const [playerId, state] of game.chestPhase.entries()) {
    if (!state || state.type !== "space_invaders") {
      continue;
    }
    io.to(playerId).emit("minigame:state", spaceInvadersPayload(state, game));
  }
}

function broadcastTowerStackerState(game) {
  if (!game || game.phase !== "minigame" || game.minigameType !== "tower_stacker") {
    return;
  }

  for (const [playerId, state] of game.chestPhase.entries()) {
    if (!state || state.type !== "tower_stacker") {
      continue;
    }
    io.to(playerId).emit("minigame:state", towerStackerPayload(state));
  }
}

function tickTowerStackerMatch(game) {
  if (!game || game.phase !== "minigame" || game.minigameType !== "tower_stacker") {
    return;
  }

  const now = Date.now();
  let shouldBroadcastProgress = false;
  let shouldBroadcastState = false;

  for (const state of game.chestPhase.values()) {
    if (!state || state.type !== "tower_stacker") {
      continue;
    }
    const changed = towerStackerTickState(state, now);
    shouldBroadcastState = shouldBroadcastState || changed;
    if (changed) {
      shouldBroadcastProgress = true;
    }
  }

  if (shouldBroadcastState) {
    broadcastTowerStackerState(game);
  }
  if (shouldBroadcastProgress) {
    broadcastMiniGameProgress(game);
  }
}

function tickSpaceInvadersMatch(game) {
  if (!game || game.phase !== "minigame" || game.minigameType !== "space_invaders") {
    return;
  }

  const now = Date.now();
  let shouldBroadcastProgress = false;
  let shouldBroadcastState = false;

  for (const [playerId, state] of game.chestPhase.entries()) {
    if (!state || state.type !== "space_invaders" || state.completed) {
      continue;
    }

    const tickMs = clamp(now - Number(state.lastTickAt || now), 16, 180);
    state.lastTickAt = now;
    state.tick = Math.max(0, Number(state.tick || 0)) + 1;

    const aliveInvaders = Array.isArray(state.invaders)
      ? state.invaders.filter((invader) => invader && invader.alive !== false)
      : [];
    if (aliveInvaders.length === 0) {
      state.wave = Math.max(1, Number(state.wave || 1)) + 1;
      state.invaders = createSpaceInvaderWave(state.wave, state.difficultyTier || 1);
      state.invaderDirection = state.wave % 2 === 0 ? -1 : 1;
      state.invaderSpeed = Math.min(
        1.5,
        Math.max(0.3, Number(state.invaderSpeed || 0.35) + 0.07 + Number(state.difficultyTier || 1) * 0.01)
      );
      state.bullet = null;
      shouldBroadcastProgress = true;
      shouldBroadcastState = true;
      continue;
    }

    const invaderSpeed = Math.max(0.2, Number(state.invaderSpeed || 0.35));
    const xDelta = Number(state.invaderDirection || 1) * invaderSpeed * (tickMs / 16);
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    for (const invader of aliveInvaders) {
      invader.x = clamp(Number(invader.x || 0) + xDelta, 3, 97);
      minX = Math.min(minX, invader.x);
      maxX = Math.max(maxX, invader.x);
    }

    if (minX <= 5 || maxX >= 95) {
      state.invaderDirection = Number(state.invaderDirection || 1) >= 0 ? -1 : 1;
      for (const invader of aliveInvaders) {
        invader.y = clamp(Number(invader.y || 0) + 2.3, 0, 100);
      }
      shouldBroadcastState = true;
    }

    const bullet = state.bullet && state.bullet.active !== false ? state.bullet : null;
    if (bullet) {
      bullet.y = clamp(Number(bullet.y || 90) - (2.8 + Number(state.wave || 1) * 0.14) * (tickMs / 16), -10, 100);
      if (bullet.y < 2) {
        state.bullet = null;
      } else {
        let hitInvader = null;
        for (const invader of aliveInvaders) {
          if (Math.abs(invader.x - bullet.x) <= 3.6 && Math.abs(invader.y - bullet.y) <= 3.4) {
            hitInvader = invader;
            break;
          }
        }

        if (hitInvader) {
          hitInvader.alive = false;
          state.hits = Math.max(0, Number(state.hits || 0)) + 1;
          state.bullet = null;
          shouldBroadcastProgress = true;
          shouldBroadcastState = true;
        }
      }
    }

    const updatedAlive = Array.isArray(state.invaders)
      ? state.invaders.filter((invader) => invader && invader.alive !== false)
      : [];
    const reachedBottom = updatedAlive.some((invader) => Number(invader.y || 0) >= 87);
    if (reachedBottom) {
      state.lives = Math.max(0, Number(state.lives || 0) - 1);
      shouldBroadcastProgress = true;
      shouldBroadcastState = true;
      if (state.lives <= 0) {
        state.completed = true;
        state.lost = true;
      } else {
        state.invaders = createSpaceInvaderWave(state.wave, state.difficultyTier || 1);
        state.invaderDirection = Number(state.invaderDirection || 1) >= 0 ? -1 : 1;
        state.bullet = null;
      }
    }

    if (shouldBroadcastState || state.tick % 2 === 0) {
      io.to(playerId).emit("minigame:state", spaceInvadersPayload(state, game));
    }
  }

  if (shouldBroadcastProgress) {
    broadcastMiniGameProgress(game);
  }

  if (shouldBroadcastState) {
    broadcastSpaceInvadersState(game);
  }

  if (allMiniGamesResolved(game)) {
    finalizeMiniGamePhase(game);
  }
}

function createMiniGameState(type, difficulty = null) {
  const safeTier = clamp(Number(difficulty?.tier || 1), 1, 4);
  if (type === "foosball_frenzy") {
    return {
      type,
      lane: 1,
      goalieLane: randomInt(0, 2),
      goals: 0,
      botGoals: 0,
      shots: 0,
      saves: 0,
      lastKickAt: 0,
      lastShotSeq: 0,
      lastEventSeq: 0,
      lastShot: null,
      lastEvent: null,
      botMeter: randomFloat(8, 52),
      tick: 0,
      lastTickAt: Date.now(),
      lastGoalieShiftAt: Date.now(),
      difficultyTier: safeTier
    };
  }

  if (type === "soccer_shootout") {
    return {
      type,
      team: "red",
      goals: 0,
      kicks: 0,
      lastKickAt: 0,
      difficultyTier: safeTier
    };
  }

  if (type === "space_invaders") {
    return {
      type,
      shipX: 50,
      invaders: createSpaceInvaderWave(1, safeTier),
      invaderDirection: 1,
      invaderSpeed: 0.34 + safeTier * 0.07,
      bullet: null,
      shots: 0,
      hits: 0,
      wave: 1,
      lives: 3,
      completed: false,
      lost: false,
      tick: 0,
      lastTickAt: Date.now(),
      difficultyTier: safeTier
    };
  }

  if (type === "tower_stacker") {
    const state = {
      type,
      theme: "cats",
      availableDrops: 0,
      totalGrantedDrops: 0,
      previewPiece: null,
      settledPieces: [],
      fallingPieces: [],
      piecesPlaced: 0,
      perfectDrops: 0,
      perfectLandingScore: 0,
      combo: 0,
      bestCombo: 0,
      towerHeight: 0,
      towerHeightScore: 0,
      bestHeight: 0,
      stabilityScore: 0,
      score: 0,
      collapsed: false,
      collapseAmount: 0,
      completed: false,
      lastEventSeq: 0,
      lastEvent: null,
      lastDropAt: 0,
      tick: 0,
      lastTickAt: Date.now(),
      difficultyTier: safeTier
    };
    grantTowerStackerDrops(state, 3);
    return state;
  }

  return createMiniGameState("soccer_shootout", difficulty);
}

function miniGamePublicData(state, game, playerId = "") {
  const difficulty = game?.minigameDifficulty || miniGameDifficultyProfile(game);
  const difficultyTier = clamp(Number(state?.difficultyTier || difficulty?.tier || 1), 1, 4);
  if (state.type === "foosball_frenzy") {
    return {
      ...foosballStatePayload(state),
      difficultyTier
    };
  }

  if (state.type === "soccer_shootout") {
    const soccer = ensureSoccerMatchState(game);
    const allPlayers = soccerMatchPlayerRows(game);
    const assignments = soccer?.assignments && typeof soccer.assignments === "object" ? soccer.assignments : {};
    return {
      team: String(state.team || "red"),
      goals: state.goals,
      kicks: state.kicks,
      teams: {
        red: SOCCER_TEAMS.red.name,
        blue: SOCCER_TEAMS.blue.name
      },
      score: {
        red: Math.max(0, Number(soccer?.teams?.red?.goals || 0)),
        blue: Math.max(0, Number(soccer?.teams?.blue?.goals || 0))
      },
      assignments,
      players: allPlayers,
      ball: {
        x: clamp(Number(soccer?.ball?.x || 50), 0, 100),
        y: clamp(Number(soccer?.ball?.y || 30), 0, 60),
        vx: Number(soccer?.ball?.vx || 0),
        vy: Number(soccer?.ball?.vy || 0)
      },
      lastKick: soccer?.lastKick || null,
      lastEvent: soccer?.lastEvent || null,
      yourId: String(playerId || ""),
      difficultyTier
    };
  }

  if (state.type === "space_invaders") {
    return {
      ...spaceInvadersStateSnapshot(state),
      difficultyTier
    };
  }

  if (state.type === "tower_stacker") {
    return {
      ...towerStackerPayload(state),
      difficultyTier
    };
  }

  return {};
}

function isMiniGameStateResolved(state) {
  if (state.type === "foosball_frenzy") {
    return false;
  }

  if (state.type === "soccer_shootout") {
    return false;
  }

  if (state.type === "space_invaders") {
    return state.completed === true;
  }

  if (state.type === "tower_stacker") {
    return false;
  }

  return false;
}

function allMiniGamesResolved(game) {
  if (game.chestPhase.size === 0) {
    return true;
  }

  for (const state of game.chestPhase.values()) {
    if (!isMiniGameStateResolved(state)) {
      return false;
    }
  }

  return true;
}

function miniGameResult(game, player, state) {
  const modeConfig = getModeConfig(game.settings.mode);
  const unit = modeConfig.unit;

  if (state.type === "foosball_frenzy") {
    const goals = Math.max(0, Number(state.goals || 0));
    const botGoals = Math.max(0, Number(state.botGoals || 0));
    const shots = Math.max(0, Number(state.shots || 0));
    const saves = Math.max(0, Number(state.saves || 0));
    const accuracy = shots > 0 ? goals / shots : 0;
    const duelBonus = goals > botGoals ? 220 : goals === botGoals ? 90 : 0;
    const bonus = Math.max(
      110,
      130 +
      goals * 170 +
      saves * 22 +
      Math.round(accuracy * 160) +
      Math.max(0, 3 - botGoals) * 30 +
      duelBonus
    );
    const duelText = goals > botGoals ? "won" : goals < botGoals ? "lost" : "tied";
    return {
      bonus,
      text: `${player.name} scored ${goals} on ${shots} shots and ${duelText} ${goals}-${botGoals} vs Bot for +${bonus} ${unit}.`
    };
  }

  if (state.type === "soccer_shootout") {
    const soccer = ensureSoccerMatchState(game);
    const redGoals = Math.max(0, Number(soccer?.teams?.red?.goals || 0));
    const blueGoals = Math.max(0, Number(soccer?.teams?.blue?.goals || 0));
    const team = String(state.team || "red");
    const teamGoals = team === "blue" ? blueGoals : redGoals;
    const opponentGoals = team === "blue" ? redGoals : blueGoals;
    const teamWinBonus = teamGoals > opponentGoals ? 240 : 0;
    const drawBonus = teamGoals === opponentGoals ? 80 : 0;
    const bonus = 120 + Math.max(0, Number(state.goals || 0)) * 190 + Math.max(0, Number(state.kicks || 0)) * 14 + teamWinBonus + drawBonus;
    const resultText = teamGoals > opponentGoals ? "won" : teamGoals < opponentGoals ? "lost" : "drew";
    return {
      bonus,
      text: `${player.name} scored ${state.goals} goals on ${state.kicks} kicks. ${SOCCER_TEAMS[team]?.name || "Team"} ${resultText} ${teamGoals}-${opponentGoals} for +${bonus} ${unit}.`
    };
  }

  if (state.type === "space_invaders") {
    const hits = Math.max(0, Number(state.hits || 0));
    const shots = Math.max(0, Number(state.shots || 0));
    const wave = Math.max(1, Number(state.wave || 1));
    const lives = Math.max(0, Number(state.lives || 0));
    const accuracy = shots > 0 ? hits / shots : 1;
    const accuracyBonus = Math.round(accuracy * 220);
    const waveBonus = (wave - 1) * 170;
    const lifeBonus = lives * 55;
    const bonus = Math.max(100, 130 + hits * 95 + waveBonus + lifeBonus + accuracyBonus - (state.lost ? 140 : 0));
    return {
      bonus,
      text: `${player.name} blasted ${hits} invaders, reached wave ${wave}, and earned +${bonus} ${unit}.`
    };
  }

  if (state.type === "tower_stacker") {
    const height = Math.max(0, Number(state.towerHeight || 0));
    const piecesPlaced = Math.max(0, Number(state.piecesPlaced || 0));
    const perfectDrops = Math.max(0, Number(state.perfectDrops || 0));
    const bestCombo = Math.max(0, Number(state.bestCombo || state.combo || 0));
    const collapsePenalty = state.collapsed ? 90 : 0;
    const heightScore = Math.max(0, Number(state.towerHeightScore || 0));
    const perfectLandingScore = Math.max(0, Number(state.perfectLandingScore || 0));
    const bonus = Math.max(120, 140 + Math.round(height * 8) + Math.round(heightScore * 0.42) + Math.round(perfectLandingScore * 0.55) + piecesPlaced * 70 + bestCombo * 34 - collapsePenalty);
    return {
      bonus,
      text: `${player.name} stacked ${piecesPlaced} pieces, reached height ${Math.round(height)}, and earned +${bonus} ${unit}.`
    };
  }

  return {
    bonus: modeConfig.fallbackGain,
    text: `${player.name} received fallback +${modeConfig.fallbackGain} ${unit}.`
  };
}

function finalizeMiniGamePhase(game) {
  if (game.phase !== "minigame") {
    return;
  }

  if (game.chestTimer) {
    clearTimeout(game.chestTimer);
    game.chestTimer = null;
  }

  const miniGameType = String(game.minigameType || "");
  const resolved = [];
  for (const [playerId, state] of game.chestPhase.entries()) {
    const player = game.players.get(playerId);
    if (!player) {
      continue;
    }

    const result = miniGameResult(game, player, state);
    resolved.push({ playerId, player, result });
  }

  const bestBonus = resolved.reduce((max, row) => Math.max(max, Number(row.result?.bonus || 0)), 0);
  let accountsTouched = false;
  let miniGameStatsTouched = false;
  for (const row of resolved) {
    const { playerId, player, result } = row;
    player.score += result.bonus;

    const feedEvent = { playerId: player.id, playerName: player.name, text: result.text };
    game.feed.push(feedEvent);

    io.to(playerId).emit("minigame:resolved", {
      text: result.text,
      bonus: result.bonus,
      leaderboard: sortedPlayers(game)
    });

    const globalBucket = ensureMiniGameStatsBucket(miniGameType);
    if (globalBucket) {
      globalBucket.completions += 1;
      globalBucket.totalBonus += Math.max(0, Number(result.bonus || 0));
      miniGameStatsTouched = true;
    }

    const accountKey = normalizeAccountKey(player.accountKey || "");
    if (accountKey) {
      const account = ensureAccount(accountKey);
      if (account) {
        const accountBucket = accountMiniGameBucket(account, miniGameType);
        if (accountBucket) {
          accountBucket.plays += 1;
          accountBucket.totalBonus += Math.max(0, Number(result.bonus || 0));
          accountBucket.bestBonus = Math.max(accountBucket.bestBonus, Math.max(0, Number(result.bonus || 0)));
          if (Number(result.bonus || 0) === bestBonus && bestBonus > 0) {
            accountBucket.wins += 1;
          }
          account.updatedAt = nowIso();
          accountsTouched = true;
        }
      }
    }
  }

  if (miniGameStatsTouched) {
    saveMiniGameStatsToDisk();
  }

  if (maybeFinishGameByWeight(game)) {
    return;
  }

  if (accountsTouched) {
    saveAccountsToDisk();
  }

  io.to(game.code).emit("minigame:feed", {
    feed: game.feed.slice(-8),
    leaderboard: sortedPlayers(game)
  });

  resetMiniGameRuntimeState(game);
  const returnPhase = game.minigameReturnPhase === "lobby" ? "lobby" : "round_summary";
  game.minigameReturnPhase = "round_summary";

  if (returnPhase === "lobby") {
    game.phase = "lobby";
    game.submissions.clear();
    game.feed = [];
    game.updatedAt = Date.now();
    broadcastLobby(game);
    broadcastHostStatus(game);
    return;
  }

  startRoundSummary(game);
}

function getTowerStackerSessionState(game, playerId, difficulty) {
  if (!game.towerStackerSessions) {
    game.towerStackerSessions = new Map();
  }
  let state = game.towerStackerSessions.get(playerId);
  if (!state || state.type !== "tower_stacker") {
    state = createMiniGameState("tower_stacker", difficulty);
    state.availableDrops = 0;
    state.totalGrantedDrops = 0;
    state.previewPiece = null;
    game.towerStackerSessions.set(playerId, state);
  }
  state.difficultyTier = clamp(Number(difficulty?.tier || state.difficultyTier || 1), 1, 4);
  if (state.collapsed === true) {
    towerStackerRestartState(state, { preserveTheme: true, availableDrops: 0 });
    state.availableDrops = 0;
  }
  return state;
}

function startMiniGamePhase(game, eligiblePlayerIds, options = {}) {
  const requestedType = typeof options.type === "string" ? options.type.trim() : "";
  const miniGameType = isMiniGameType(requestedType) ? requestedType : pickMiniGameType(game);
  const meta = miniGameMeta(miniGameType);
  const difficulty = miniGameDifficultyProfile(game);
  const returnPhase = options.returnPhase === "lobby" ? "lobby" : "round_summary";
  const settingsDurationMs = clamp(Number(game.settings?.miniGameDurationSec) || 10, 5, 30) * 1000;
  const durationMs = clamp(Number(options.durationMs) || settingsDurationMs, 5000, 30000);
  const allowEmpty = options.allowEmpty === true;

  if (!miniGameType || !meta || !Array.isArray(eligiblePlayerIds) || (eligiblePlayerIds.length === 0 && !allowEmpty)) {
    if (returnPhase === "lobby") {
      game.phase = "lobby";
      game.updatedAt = Date.now();
      broadcastLobby(game);
      broadcastHostStatus(game);
      return false;
    }
    startRoundSummary(game);
    return false;
  }

  game.phase = "minigame";
  game.roundEndsAt = 0;
  game.feed = [];
  game.chestPhase.clear();
  game.minigameType = miniGameType;
  game.minigameDurationMs = durationMs;
  game.minigameReturnPhase = returnPhase;
  game.minigameStartedAt = Date.now();
  game.minigameEndsAt = game.minigameStartedAt + game.minigameDurationMs;
  game.minigameDifficulty = difficulty;
  game.soccerMatch = null;
  const globalBucket = ensureMiniGameStatsBucket(miniGameType);
  if (globalBucket) {
    globalBucket.sessions += 1;
    globalBucket.playerEntries += Math.max(0, eligiblePlayerIds.length);
    saveMiniGameStatsToDisk();
  }

  if (miniGameType === "soccer_shootout") {
    game.soccerMatch = createSoccerMatchForPlayers(game, eligiblePlayerIds);
  }

  for (const playerId of eligiblePlayerIds) {
    const state =
      miniGameType === "tower_stacker"
        ? getTowerStackerSessionState(game, playerId, difficulty)
        : createMiniGameState(miniGameType, difficulty);
    if (miniGameType === "soccer_shootout") {
      const team = String(game.soccerMatch?.assignments?.[playerId] || "red");
      state.team = team === "blue" ? "blue" : "red";
    } else if (miniGameType === "tower_stacker") {
      grantTowerStackerDrops(state, 1);
      state.completed = false;
      state.collapsed = false;
      towerStackerSpawnPreview(state);
    }
    game.chestPhase.set(playerId, state);

    io.to(playerId).emit("minigame:yourData", {
      type: miniGameType,
      endsAt: game.minigameEndsAt,
      eventName: meta.name,
      actionLabel: "Play",
      data: miniGamePublicData(state, game, playerId),
      difficulty: game.minigameDifficulty
    });
  }

  io.to(game.code).emit("minigame:start", {
    eligiblePlayerIds,
    type: miniGameType,
    endsAt: game.minigameEndsAt,
    eventName: meta.name,
    feedTitle: "Mini-game Feed",
    difficulty: game.minigameDifficulty
  });

  restartActiveMiniGameTick(game);

  broadcastHostStatus(game);
  return true;
}

function handleMiniGameAction(game, socketId, action, value) {
  if (!game || game.phase !== "minigame") {
    return { ok: false, message: "Mini-game is not active." };
  }

  const state = game.chestPhase.get(socketId);
  if (!state) {
    return { ok: false, message: "You are not in this mini-game." };
  }

  if (state.type === "tap_rush") {
    if (action !== "tap") {
      return { ok: false, message: "Invalid action for tap rush." };
    }

    state.taps += 1;
    io.to(socketId).emit("minigame:state", {
      type: state.type,
      taps: state.taps
    });
    broadcastMiniGameProgress(game);
    return { ok: true };
  }

  if (state.type === "reaction_duel") {
    if (action !== "react") {
      return { ok: false, message: "Invalid action for reaction duel." };
    }

    if (state.reactedAt !== null) {
      return { ok: true, completed: true };
    }

    const now = Date.now();
    state.reactedAt = now;
    if (now < state.goAt) {
      state.falseStart = true;
      state.reactionMs = null;
    } else {
      state.falseStart = false;
      state.reactionMs = Math.max(0, now - state.goAt);
    }

    io.to(socketId).emit("minigame:state", {
      type: state.type,
      reacted: true,
      falseStart: state.falseStart,
      reactionMs: state.reactionMs,
      goAt: state.goAt,
      completed: true
    });
    broadcastMiniGameProgress(game);

    if (allMiniGamesResolved(game)) {
      finalizeMiniGamePhase(game);
    }

    return { ok: true };
  }

  if (state.type === "foosball_frenzy") {
    if (action === "set_lane") {
      const laneValue =
        value && typeof value === "object" && value !== null ? value.lane ?? value.value ?? value : value;
      const lane = clampFoosballLane(laneValue);
      state.lane = lane;
      io.to(socketId).emit("minigame:state", foosballStatePayload(state));
      return { ok: true, lane };
    }

    if (action !== "kick" && action !== "shoot") {
      return { ok: false, message: "Invalid action for foosball frenzy." };
    }

    const now = Date.now();
    if (now - Number(state.lastKickAt || 0) < 150) {
      return { ok: true, throttled: true };
    }

    const lane = clampFoosballLane(value?.lane);
    const goalieLane = clampFoosballLane(state.goalieLane);
    state.lastKickAt = now;
    state.lane = lane;
    state.shots = Math.max(0, Number(state.shots || 0)) + 1;

    const sameLane = lane === goalieLane;
    const tierPenalty = (clamp(Number(state.difficultyTier || 1), 1, 4) - 1) * 0.05;
    let goalChance = sameLane ? 0.33 : 0.84;
    goalChance -= tierPenalty;
    goalChance = clamp(goalChance, 0.1, 0.95);

    const goal = Math.random() < goalChance;
    if (goal) {
      state.goals = Math.max(0, Number(state.goals || 0)) + 1;
    } else {
      state.saves = Math.max(0, Number(state.saves || 0)) + 1;
    }

    state.goalieLane = randomInt(0, 2);
    state.lastGoalieShiftAt = now;
    state.lastShotSeq = Math.max(0, Number(state.lastShotSeq || 0)) + 1;
    state.lastShot = {
      seq: state.lastShotSeq,
      ts: now,
      lane,
      goalieLane,
      goal
    };
    state.lastEventSeq = Math.max(0, Number(state.lastEventSeq || 0)) + 1;
    state.lastEvent = {
      seq: state.lastEventSeq,
      ts: now,
      type: goal ? "player_goal" : "player_saved",
      lane,
      goalieLane
    };

    io.to(socketId).emit("minigame:state", foosballStatePayload(state));
    broadcastMiniGameProgress(game);
    return { ok: true, goal };
  }

  if (state.type === "soccer_shootout") {
    if (action !== "kick" && action !== "shoot") {
      return { ok: false, message: "Invalid action for soccer match." };
    }

    const now = Date.now();
    if (now - Number(state.lastKickAt || 0) < 150) {
      return { ok: true, throttled: true };
    }

    const applied = updateSoccerBallKick(game, socketId, value);
    if (!applied.ok) {
      return applied;
    }
    broadcastSoccerMatchState(game);
    broadcastMiniGameProgress(game);
    return { ok: true };
  }

  if (state.type === "tower_stacker") {
    if (action === "set_theme") {
      const nextTheme = towerStackerThemeConfig(value?.theme || value?.id || value).id;
      if (Number(state.piecesPlaced || 0) > 0) {
        return { ok: false, message: "Theme can only change before the first drop." };
      }
      state.theme = nextTheme;
      state.previewPiece = null;
      towerStackerSpawnPreview(state);
      io.to(socketId).emit("minigame:state", towerStackerPayload(state));
      return { ok: true, theme: nextTheme };
    }

    if (action === "restart") {
      towerStackerRestartState(state, {
        preserveTheme: true,
        availableDrops: Math.max(1, Number(state.availableDrops || 0))
      });
      io.to(socketId).emit("minigame:state", towerStackerPayload(state));
      broadcastMiniGameProgress(game);
      return { ok: true };
    }

    if (action !== "drop") {
      return { ok: false, message: "Invalid action for tower stacker." };
    }

    if (state.collapsed === true) {
      return { ok: false, message: "Tower fell. Press Restart to build again." };
    }
    if (!state.previewPiece || state.previewPiece.dropped === true) {
      return { ok: false, message: "Wait for the next stack piece." };
    }
    if (Number(state.availableDrops || 0) <= 0) {
      return { ok: false, message: "Earn another correct answer for a new drop." };
    }

    const now = Date.now();
    if (now - Number(state.lastDropAt || 0) < 150) {
      return { ok: true, throttled: true };
    }

    state.lastDropAt = now;
    state.availableDrops = Math.max(0, Number(state.availableDrops || 0) - 1);
    state.previewPiece.dropped = true;
    state.previewPiece.spawnedAt = now;
    state.previewPiece.vy = 0.6;
    state.previewPiece.vx = Math.sin(now * 0.0013) * 0.08;
    state.previewPiece.rotationSpeed = randomFloat(-0.012, 0.012);
    state.lastEventSeq = Math.max(0, Number(state.lastEventSeq || 0)) + 1;
    state.lastEvent = {
      seq: state.lastEventSeq,
      type: "piece_drop",
      x: state.previewPiece.x,
      y: state.previewPiece.y
    };
    io.to(socketId).emit("minigame:state", towerStackerPayload(state));
    broadcastMiniGameProgress(game);
    return { ok: true };
  }

  if (state.type === "obstacle_dodge") {
    if (action !== "dodge") {
      return { ok: false, message: "Invalid action for obstacle dodge." };
    }

    if (state.step >= state.totalTurns) {
      return { ok: true, completed: true };
    }

    const lane = Number(value);
    if (!Number.isInteger(lane) || lane < 0 || lane > 2) {
      return { ok: false, message: "Invalid dodge lane." };
    }

    const obstacleLane = state.obstacles[state.step];
    const hit = lane === obstacleLane;
    state.lane = lane;
    state.lastObstacle = obstacleLane;
    state.lastHit = hit;
    if (hit) {
      state.hits += 1;
    }
    state.step += 1;

    io.to(socketId).emit("minigame:state", {
      type: state.type,
      lane: state.lane,
      obstacleLane,
      hit,
      hits: state.hits,
      step: state.step,
      totalTurns: state.totalTurns,
      completed: state.step >= state.totalTurns
    });
    broadcastMiniGameProgress(game);

    if (allMiniGamesResolved(game)) {
      finalizeMiniGamePhase(game);
    }

    return { ok: true };
  }

  if (state.type === "sequence_memory") {
    if (action !== "step") {
      return { ok: false, message: "Invalid action for sequence memory." };
    }

    const stepValue = Number(value);
    if (!Number.isInteger(stepValue) || stepValue < 0 || stepValue > 3) {
      return { ok: false, message: "Invalid sequence step." };
    }

    if (state.completedAt !== null) {
      return { ok: true, completed: true };
    }

    const expected = state.sequence[state.progress];
    if (stepValue === expected) {
      state.progress += 1;
      if (state.progress >= state.sequence.length) {
        state.completedAt = Date.now();
      }
    } else {
      state.progress = Math.max(0, state.progress - 1);
    }

    io.to(socketId).emit("minigame:state", {
      type: state.type,
      progress: state.progress,
      total: state.sequence.length,
      completed: state.completedAt !== null
    });
    broadcastMiniGameProgress(game);

    if (allMiniGamesResolved(game)) {
      finalizeMiniGamePhase(game);
    }

    return { ok: true };
  }

  if (state.type === "precision_stop") {
    if (action !== "stop") {
      return { ok: false, message: "Invalid action for precision stop." };
    }

    if (state.submitted) {
      return { ok: true, submitted: true };
    }

    const safeValue = clamp(Number(value), 0, 100);
    state.submitted = true;
    state.value = Math.round(safeValue);

    io.to(socketId).emit("minigame:state", {
      type: state.type,
      submitted: true,
      value: state.value,
      target: state.target
    });
    broadcastMiniGameProgress(game);

    if (allMiniGamesResolved(game)) {
      finalizeMiniGamePhase(game);
    }

    return { ok: true };
  }

  if (state.type === "word_scramble") {
    if (action !== "guess") {
      return { ok: false, message: "Invalid action for word scramble." };
    }

    if (state.completed || state.solved || state.attempts >= state.maxAttempts) {
      return { ok: true, completed: true, solved: state.solved };
    }

    const guess = String(value || "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, state.answer.length);

    if (!guess) {
      return { ok: false, message: "Enter a guess first." };
    }

    state.attempts += 1;
    state.lastGuess = guess;
    if (guess === state.answer) {
      state.solved = true;
    }

    if (state.solved || state.attempts >= state.maxAttempts) {
      state.completed = true;
    }

    io.to(socketId).emit("minigame:state", {
      type: state.type,
      attempts: state.attempts,
      maxAttempts: state.maxAttempts,
      solved: state.solved,
      completed: state.completed,
      lastGuess: guess,
      answer: state.completed ? state.answer : undefined
    });
    broadcastMiniGameProgress(game);

    if (allMiniGamesResolved(game)) {
      finalizeMiniGamePhase(game);
    }

    return { ok: true, solved: state.solved, completed: state.completed };
  }

  return { ok: false, message: "Unknown mini-game type." };
}

function maybeFinishGameByWeight(game) {
  if (!game || game.phase === "finished") {
    return false;
  }
  if (!gameReachedWeightGoal(game)) {
    return false;
  }
  finishGame(game);
  return true;
}

function advanceAfterQuestionResult(game) {
  if (!game || !games.has(game.code) || game.phase !== "question_result") {
    return;
  }

  game.lastQuestionResultPayload = null;

  if (game.players.size > 0) {
    const submissions = Array.from(game.submissions.values());
    const eligible = submissions
      .filter((entry) => entry.correct === true)
      .map((entry) => entry.playerId)
      .filter((playerId, index, source) => source.indexOf(playerId) === index);
    const started = startMiniGamePhase(game, eligible, {
      durationMs: 10000
    });
    if (started || game.phase !== "question_result") {
      return;
    }
  }

  startRoundSummary(game);
}

function closeQuestion(game) {
  if (game.phase !== "question") {
    return;
  }

  if (game.questionTimer) {
    clearTimeout(game.questionTimer);
    game.questionTimer = null;
  }

  const question = game.questions[game.currentQuestionIndex];
  const submissions = Array.from(game.submissions.values());
  game.questionEligiblePlayerIds = new Set();
  recordQuestionReportEntry(game, question, submissions);
  game.phase = "question_result";
  const resultPayload = {
    correctAnswer: question.answerIndex,
    explanation: question.explanation,
    submissions: submissions.map((item) => ({
      playerId: item.playerId,
      playerName: item.playerName,
      correct: item.correct,
      delta: item.delta,
      answerIndex: item.answerIndex,
      ms: item.ms
    })),
    leaderboard: sortedPlayers(game)
  };
  game.lastQuestionResultPayload = resultPayload;
  io.to(game.code).emit("question:result", resultPayload);
  broadcastHostStatus(game);

  const revealDelayMs = normalizeExplanationRevealSec(game.settings?.explanationRevealSec) * 1000;
  game.roundEndsAt = Date.now() + revealDelayMs;
  if (game.roundTimer) {
    clearTimeout(game.roundTimer);
    game.roundTimer = null;
  }
  game.roundTimer = setTimeout(() => {
    game.roundTimer = null;
    advanceAfterQuestionResult(game);
  }, revealDelayMs);
}

function finishGame(game) {
  game.phase = "finished";
  game.roundEndsAt = 0;
  game.countdownEndsAt = 0;
  game.pauseState = null;
  clearTimers(game);

  const leaderboard = sortedPlayers(game);
  const reportSnapshot = buildGameReportSnapshot(game, leaderboard);
  rememberGameReport(reportSnapshot);
  const totalPlayers = leaderboard.length;
  for (const row of leaderboard) {
    const livePlayer = game.players.get(row.id);
    const accountKey = normalizeAccountKey(livePlayer?.accountKey || "");
    if (!accountKey) {
      continue;
    }

    const account = ensureAccount(accountKey);
    if (!account) {
      continue;
    }

    const reward = calculateCoinReward(row, row.rank, totalPlayers);
    account.coins += reward.total;
    account.gamesPlayed = Math.max(0, Number(account.gamesPlayed || 0)) + 1;
    account.totalCorrect = Math.max(0, Number(account.totalCorrect || 0)) + Math.max(0, Number(row.correctCount || 0));
    account.totalScore = Math.max(0, Number(account.totalScore || 0)) + Math.max(0, Number(row.score || 0));
    const currentBestRank = Math.max(0, Number(account.bestRank || 0));
    account.bestRank = currentBestRank > 0 ? Math.min(currentBestRank, row.rank) : row.rank;
    account.updatedAt = nowIso();

    io.to(row.id).emit("account:coinsAwarded", {
      reward,
      rank: row.rank,
      totalPlayers,
      account: publicAccountSummary(account)
    });
  }
  saveAccountsToDisk();

  io.to(game.code).emit("game:finished", {
    leaderboard,
    reportCode: reportSnapshot.code
  });

  broadcastHostStatus(game);
}

function startQuestion(game) {
  if (!games.has(game.code) || game.phase === "finished") {
    return;
  }

  clearTimers(game);

  if (game.currentQuestionIndex >= game.questions.length - 1) {
    if (normalizeGameEndType(game.settings?.endType) === "weight") {
      if (!(game.usedQuestionKeys instanceof Set)) {
        game.usedQuestionKeys = new Set();
      }
      if (!normalizeBooleanFlag(game.settings?.preventQuestionRepeats, false)) {
        game.usedQuestionKeys.clear();
      }
      game.questions = pickQuestions(game.settings.questionCount, game.settings.questionSet, {
        shuffleOptions: normalizeBooleanFlag(game.settings?.shuffleQuestionOptions, false),
        noRepeats: normalizeBooleanFlag(game.settings?.preventQuestionRepeats, false),
        usedQuestionKeys: game.usedQuestionKeys
      });
      game.currentQuestionIndex = -1;
    } else {
      finishGame(game);
      return;
    }
  }

  game.phase = "question";
  game.countdownEndsAt = 0;
  game.roundEndsAt = 0;
  game.pauseState = null;
  game.currentQuestionIndex += 1;
  game.lastQuestionResultPayload = null;
  game.submissions.clear();
  game.questionEligiblePlayerIds = new Set(game.players.keys());
  game.chestPhase.clear();
  game.minigameType = null;
  game.minigameDifficulty = null;
  game.minigameStartedAt = null;
  game.minigameEndsAt = null;

  const question = game.questions[game.currentQuestionIndex];
  const endsAt = Date.now() + game.settings.timerSeconds * 1000;

  game.questionStartedAt = Date.now();
  game.questionEndsAt = endsAt;

  io.to(game.code).emit("question:start", {
    questionIndex: game.currentQuestionIndex + 1,
    totalQuestions: game.questions.length,
    endsAt,
    question: {
      prompt: question.prompt,
      options: question.options,
      image: sanitizeQuestionImage(question.image || "")
    }
  });

  broadcastHostStatus(game);

  game.questionTimer = setTimeout(() => {
    closeQuestion(game);
  }, game.settings.timerSeconds * 1000 + 120);
}

function calculateScore(game, elapsedMs, isCorrect, previousStreak) {
  if (!isCorrect) {
    return { delta: 0, newStreak: 0 };
  }

  const modeConfig = getModeConfig(game.settings.mode);
  const maxWindowMs = game.settings.timerSeconds * 1000;
  const normalized = clamp(1 - elapsedMs / maxWindowMs, 0, 1);
  const base = modeConfig.baseScore;
  const speedBonus = Math.round(normalized * modeConfig.speedBonusCap);
  const nextStreak = previousStreak + 1;
  const streakBonus = Math.min(modeConfig.streakCap, (nextStreak - 1) * modeConfig.streakStep);

  return {
    delta: base + speedBonus + streakBonus,
    newStreak: nextStreak
  };
}

function canHost(socket, game) {
  return game && socket.id === game.hostId;
}

function socketGoogleUser(socket) {
  return socket?.request?.session?.passport?.user || null;
}

function ensureSocketAuthenticated(socket, ack) {
  if (!GOOGLE_AUTH_ENABLED) {
    return true;
  }

  if (socketGoogleUser(socket)) {
    return true;
  }

  if (typeof ack === "function") {
    ack({ ok: false, message: "Login with Google first." });
  }
  return false;
}

function markSocketGame(socket, code) {
  socketToGame.set(socket.id, code);
}

function removePlayerFromGame(game, socketId) {
  const player = game.players.get(socketId);
  if (!player) {
    return;
  }

  game.players.delete(socketId);
  socketToGame.delete(socketId);
  game.submissions.delete(socketId);
  if (game.questionEligiblePlayerIds instanceof Set) {
    game.questionEligiblePlayerIds.delete(socketId);
  }
  game.chestPhase.delete(socketId);
  if (game.soccerMatch?.players && game.soccerMatch.players[socketId]) {
    delete game.soccerMatch.players[socketId];
  }

  io.to(game.code).emit("player:left", {
    playerId: socketId,
    playerName: player.name
  });

  if (game.phase === "lobby") {
    broadcastLobby(game);
  } else {
    io.to(game.code).emit("players:update", {
      players: sortedPlayers(game)
    });
  }
  broadcastHostStatus(game);

  if (game.phase === "question") {
    const requiredAnswers =
      game.questionEligiblePlayerIds instanceof Set && game.questionEligiblePlayerIds.size > 0
        ? game.questionEligiblePlayerIds.size
        : game.players.size;
    let submittedAnswers = 0;
    for (const submission of game.submissions.values()) {
      if (!(game.questionEligiblePlayerIds instanceof Set) || game.questionEligiblePlayerIds.size === 0) {
        submittedAnswers += 1;
        continue;
      }
      if (game.questionEligiblePlayerIds.has(submission.playerId)) {
        submittedAnswers += 1;
      }
    }

    if (requiredAnswers === 0 || submittedAnswers >= requiredAnswers) {
      closeQuestion(game);
    }
  }

  if (game.phase === "minigame") {
    if (game.chestPhase.size === 0 || (game.minigameType !== "tap_rush" && allMiniGamesResolved(game))) {
      finalizeMiniGamePhase(game);
    } else {
      if (game.minigameType === "soccer_shootout") {
        broadcastSoccerMatchState(game);
      }
      broadcastMiniGameProgress(game);
    }
  }
}

io.on("connection", (socket) => {
  socket.emit("room:activeCode", activeRoomSummary());

  socket.on("host:create", (payload, ack) => {
    if (!ensureSocketAuthenticated(socket, ack)) {
      return;
    }

    const hostName = sanitizeName(payload?.hostName || "Teacher");
    const mode = normalizeMode(payload?.mode);
    const questionSet = normalizeQuestionSet(payload?.questionSet);
    const timerSeconds = clamp(Number(payload?.timerSeconds) || 15, 8, 45);
    const explanationRevealSec = normalizeExplanationRevealSec(payload?.explanationRevealSec);
    const questionCount = clamp(Number(payload?.questionCount) || 10, 5, 30);
    const miniGameRotationMode = normalizeMiniGameRotationMode(payload?.miniGameRotationMode);
    const miniGameDurationSec = clamp(Number(payload?.miniGameDurationSec) || 10, 5, 30);
    const shuffleQuestionOptions = normalizeBooleanFlag(payload?.shuffleQuestionOptions, false);
    const preventQuestionRepeats = normalizeBooleanFlag(payload?.preventQuestionRepeats, false);
    const endType = normalizeGameEndType(payload?.endType);
    const endTargetValue = normalizeEndTargetValue(payload?.endTargetValue, endType);
    const showInstructions = normalizeBooleanFlag(payload?.showInstructions, true);
    const allowLateJoin = normalizeBooleanFlag(payload?.allowLateJoin, true);
    const useRandomNames = normalizeBooleanFlag(payload?.useRandomNames, false);
    const allowStudentAccounts = normalizeBooleanFlag(payload?.allowStudentAccounts, true);
    const usedQuestionKeys = new Set();

    const code = createGameCode();
    const game = {
      code,
      hostId: socket.id,
      hostName: hostName || "Teacher",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      phase: "lobby",
      settings: {
        mode,
        questionSet,
        timerSeconds,
        explanationRevealSec,
        questionCount,
        miniGameRotationMode,
        miniGameDurationSec,
        shuffleQuestionOptions,
        preventQuestionRepeats,
        endType,
        endTargetValue,
        showInstructions,
        allowLateJoin,
        useRandomNames,
        allowStudentAccounts
      },
      players: new Map(),
      questions: pickQuestions(questionCount, questionSet, {
        shuffleOptions: shuffleQuestionOptions,
        noRepeats: preventQuestionRepeats,
        usedQuestionKeys
      }),
      currentQuestionIndex: -1,
      submissions: new Map(),
      questionEligiblePlayerIds: new Set(),
      chestPhase: new Map(),
      usedQuestionKeys,
      feed: [],
      questionTimer: null,
      roundTimer: null,
      chestTimer: null,
      minigameTick: null,
      lastQuestionResultPayload: null,
      countdownEndsAt: 0,
      roundEndsAt: 0,
      pauseState: null,
      questionStartedAt: null,
      questionEndsAt: null,
      minigameType: null,
      minigameDifficulty: null,
      minigameDurationMs: 0,
      minigameStartedAt: null,
      minigameEndsAt: null,
      minigameReturnPhase: "round_summary",
      minigameRotationIndex: 0,
      soccerMatch: null,
      towerStackerSessions: new Map(),
      report: {
        startedAt: Date.now(),
        questionStats: [],
        playerStats: new Map()
      }
    };

    games.set(code, game);
    broadcastActiveRoom();
    socket.join(code);
    markSocketGame(socket, code);

    broadcastLobby(game);
    broadcastHostStatus(game);

    if (typeof ack === "function") {
      ack({
        ok: true,
        code,
        gameMode: mode,
        modeName: getModeConfig(mode).label,
        questionSet,
        questionSetLabel: questionSetLabel(questionSet)
      });
    }
  });

  socket.on("host:updateSettings", ({ code, settings }, ack) => {
    const game = games.get((code || "").toUpperCase());
    if (!canHost(socket, game) || game.phase !== "lobby") {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Cannot update settings right now." });
      }
      return;
    }

    game.settings.mode = normalizeMode(settings?.mode ?? game.settings.mode);
    game.settings.questionSet = normalizeQuestionSet(settings?.questionSet ?? game.settings.questionSet);
    game.settings.timerSeconds = clamp(Number(settings?.timerSeconds) || game.settings.timerSeconds, 8, 45);
    game.settings.explanationRevealSec = normalizeExplanationRevealSec(
      settings?.explanationRevealSec ?? game.settings.explanationRevealSec
    );
    game.settings.questionCount = clamp(Number(settings?.questionCount) || game.settings.questionCount, 5, 30);
    game.settings.miniGameRotationMode = normalizeMiniGameRotationMode(
      settings?.miniGameRotationMode ?? game.settings.miniGameRotationMode
    );
    game.settings.miniGameDurationSec = clamp(
      Number(settings?.miniGameDurationSec) || game.settings.miniGameDurationSec || 10,
      5,
      30
    );
    game.settings.shuffleQuestionOptions = normalizeBooleanFlag(
      settings?.shuffleQuestionOptions,
      game.settings.shuffleQuestionOptions === true
    );
    game.settings.preventQuestionRepeats = normalizeBooleanFlag(
      settings?.preventQuestionRepeats,
      game.settings.preventQuestionRepeats === true
    );
    game.settings.endType = normalizeGameEndType(settings?.endType ?? game.settings.endType);
    game.settings.endTargetValue = normalizeEndTargetValue(
      settings?.endTargetValue ?? game.settings.endTargetValue,
      game.settings.endType
    );
    game.settings.showInstructions = normalizeBooleanFlag(settings?.showInstructions, game.settings.showInstructions !== false);
    game.settings.allowLateJoin = normalizeBooleanFlag(settings?.allowLateJoin, game.settings.allowLateJoin !== false);
    game.settings.useRandomNames = normalizeBooleanFlag(settings?.useRandomNames, game.settings.useRandomNames === true);
    game.settings.allowStudentAccounts = normalizeBooleanFlag(
      settings?.allowStudentAccounts,
      game.settings.allowStudentAccounts !== false
    );
    if (!(game.usedQuestionKeys instanceof Set)) {
      game.usedQuestionKeys = new Set();
    }
    game.usedQuestionKeys.clear();
    game.questions = pickQuestions(game.settings.questionCount, game.settings.questionSet, {
      shuffleOptions: game.settings.shuffleQuestionOptions === true,
      noRepeats: game.settings.preventQuestionRepeats === true,
      usedQuestionKeys: game.usedQuestionKeys
    });
    game.minigameRotationIndex = 0;
    game.updatedAt = Date.now();

    broadcastLobby(game);

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("host:toggleLateJoin", ({ code, allowLateJoin }, ack) => {
    const game = games.get((code || "").toUpperCase());
    if (!canHost(socket, game) || !game || game.phase === "finished") {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Cannot update late join right now." });
      }
      return;
    }

    game.settings.allowLateJoin = normalizeBooleanFlag(allowLateJoin, game.settings.allowLateJoin !== false);
    game.updatedAt = Date.now();

    io.to(game.code).emit("settings:update", {
      code: game.code,
      settings: game.settings
    });

    if (game.phase === "lobby") {
      broadcastLobby(game);
    }
    broadcastHostStatus(game);

    if (typeof ack === "function") {
      ack({ ok: true, allowLateJoin: game.settings.allowLateJoin });
    }
  });

  socket.on("player:join", (payload, ack) => {
    const code = String(payload?.code || "").toUpperCase().trim();
    const requestedName = sanitizeName(payload?.name || "");
    const game = games.get(code);
    const requestedBlookId = String(payload?.blookId || "").trim();
    const requestedPackId = String(payload?.packId || "").trim();
    const allowLateJoin = normalizeBooleanFlag(game?.settings?.allowLateJoin, true);
    const useRandomNames = normalizeBooleanFlag(game?.settings?.useRandomNames, false);
    const allowStudentAccounts = normalizeBooleanFlag(game?.settings?.allowStudentAccounts, true);
    const googleSocketKey = GOOGLE_AUTH_ENABLED && socketGoogleUser(socket)?.id ? `google:${socketGoogleUser(socket).id}` : "";
    const providedAccountKey = normalizeAccountKey(payload?.accountKey || "");
    const accountKey = allowStudentAccounts ? normalizeAccountKey(googleSocketKey || providedAccountKey) : "";
    const hasAccount = allowStudentAccounts && accountKey.length > 0;
    const account = hasAccount ? ensureAccount(accountKey) : null;
    let playerName = useRandomNames ? randomPlayerName(game) : requestedName;
    let selectedBlook = null;

    if (!game) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Game code not found." });
      }
      return;
    }

    if (game.phase === "finished") {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Game already finished." });
      }
      return;
    }

    if (game.phase !== "lobby" && !allowLateJoin) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Late joining is disabled by the host." });
      }
      return;
    }

    if (game.players.size >= 60) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Lobby is full." });
      }
      return;
    }

    if (!playerName) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Name is required." });
      }
      return;
    }

    let duplicate = Array.from(game.players.values()).some((player) => player.name.toLowerCase() === playerName.toLowerCase());
    if (duplicate && useRandomNames) {
      playerName = randomPlayerName(game);
      duplicate = Array.from(game.players.values()).some((player) => player.name.toLowerCase() === playerName.toLowerCase());
    }
    if (duplicate) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Name already taken in this room." });
      }
      return;
    }

    if (hasAccount && !account) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Invalid account." });
      }
      return;
    }

    if (hasAccount) {
      const randomPackBlook = pickRandomOwnedBlookForPack(account, requestedPackId);
      if (randomPackBlook) {
        selectedBlook = { ...randomPackBlook };
      } else if (accountOwnsBlook(account, requestedBlookId)) {
        selectedBlook = { ...resolveBlookById(requestedBlookId) };
      } else if (accountOwnsBlook(account, account.selectedBlookId)) {
        selectedBlook = { ...resolveBlookById(account.selectedBlookId) };
      } else {
        const firstOwned = accountUnlockedBlooks(account)[0];
        if (firstOwned) {
          selectedBlook = { ...resolveBlookById(firstOwned.id) };
        }
      }

      if (!selectedBlook) {
        if (typeof ack === "function") {
          ack({ ok: false, message: "Open a pack first to unlock your first blook." });
        }
        return;
      }

      account.selectedBlookId = selectedBlook.id;
      account.updatedAt = nowIso();
      saveAccountsToDisk();
    } else {
      selectedBlook = { ...resolveBlookById(payload?.blookId) };
    }

    socket.join(game.code);
    markSocketGame(socket, game.code);

    game.players.set(socket.id, {
      id: socket.id,
      name: playerName,
      blook: selectedBlook,
      effectId: BLOOK_EFFECTS.find(e => e.id === payload?.effectId) ? payload.effectId : "fx-none",
      accountKey: hasAccount ? account.id : "",
      score: 0,
      streak: 0,
      correctCount: 0,
      protectedTurns: 0,
      joinedAt: Date.now()
    });

    game.updatedAt = Date.now();

    if (game.phase === "lobby") {
      broadcastLobby(game);
    } else {
      io.to(game.code).emit("players:update", {
        players: sortedPlayers(game)
      });
      syncPlayerToCurrentPhase(game, socket.id);
    }
    broadcastHostStatus(game);

    io.to(game.hostId).emit("host:playerJoined", {
      id: socket.id,
      name: playerName,
      blook: selectedBlook
    });

    if (typeof ack === "function") {
      ack({
        ok: true,
        code: game.code,
        mode: game.settings.mode,
        hostName: game.hostName,
        playerName,
        blook: selectedBlook,
        phase: game.phase,
        account: hasAccount ? publicAccountSummary(account) : null,
        settings: {
          showInstructions: normalizeBooleanFlag(game.settings?.showInstructions, true),
          allowLateJoin,
          useRandomNames,
          allowStudentAccounts,
          endType: normalizeGameEndType(game.settings?.endType),
          endTargetValue: normalizeEndTargetValue(game.settings?.endTargetValue, game.settings?.endType)
        }
      });
    }
  });

  socket.on("host:kick", ({ code, playerId }, ack) => {
    const game = games.get((code || "").toUpperCase());
    if (!canHost(socket, game)) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Not allowed." });
      }
      return;
    }

    if (!game.players.has(playerId)) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Player not found." });
      }
      return;
    }

    io.to(playerId).emit("kicked", { reason: "Removed by host." });

    const targetSocket = io.sockets.sockets.get(playerId);
    if (targetSocket) {
      targetSocket.leave(game.code);
    }

    removePlayerFromGame(game, playerId);

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("host:pauseToggle", ({ code }, ack) => {
    const game = games.get((code || "").toUpperCase());
    if (!canHost(socket, game)) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Not allowed." });
      }
      return;
    }

    const ok = game.phase === "paused" ? resumeGame(game) : pauseGame(game);
    if (!ok) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Pause/resume unavailable right now." });
      }
      return;
    }

    if (typeof ack === "function") {
      ack({ ok: true, phase: game.phase, pausedFromPhase: game.pauseState?.fromPhase || "" });
    }
  });

  socket.on("host:skipMiniGame", ({ code }, ack) => {
    const game = games.get((code || "").toUpperCase());
    if (!canHost(socket, game)) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Not allowed." });
      }
      return;
    }

    let ok = false;
    if (game.phase === "minigame") {
      ok = skipMiniGamePhase(game);
    } else if (game.phase === "paused" && String(game.pauseState?.fromPhase || "") === "minigame") {
      game.phase = "minigame";
      ok = skipMiniGamePhase(game);
    }
    if (!ok) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "No mini-game is active." });
      }
      return;
    }

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("host:forceNextQuestion", ({ code }, ack) => {
    const game = games.get((code || "").toUpperCase());
    if (!canHost(socket, game)) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Not allowed." });
      }
      return;
    }

    const ok = forceNextQuestionNow(game);
    if (!ok) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Cannot force the next question right now." });
      }
      return;
    }

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("host:start", ({ code }, ack) => {
    const game = games.get((code || "").toUpperCase());
    if (!canHost(socket, game)) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Not allowed." });
      }
      return;
    }

    if (game.phase !== "lobby") {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Game already running." });
      }
      return;
    }

    if (game.players.size === 0) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "At least one student is required." });
      }
      return;
    }

    startGameCountdown(game, 3);

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("host:startMiniGameTest", ({ code, type }, ack) => {
    const game = games.get((code || "").toUpperCase());
    if (!canHost(socket, game)) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Not allowed." });
      }
      return;
    }

    if (game.phase !== "lobby" && game.phase !== "round_summary") {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Mini-game test can only run from lobby or round summary." });
      }
      return;
    }

    if (!isMiniGameType(type || "")) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Unknown mini-game type." });
      }
      return;
    }

    if (game.roundTimer) {
      clearTimeout(game.roundTimer);
      game.roundTimer = null;
    }

    const playerIds = Array.from(game.players.keys());
    const previewMode = playerIds.length === 0;
    startMiniGamePhase(game, playerIds, {
      type,
      returnPhase: "lobby",
      durationMs: 12000,
      allowEmpty: previewMode
    });

    if (typeof ack === "function") {
      ack({ ok: true, previewMode });
    }
  });

  socket.on("host:next", ({ code }, ack) => {
    const game = games.get((code || "").toUpperCase());
    if (!canHost(socket, game) || game.phase !== "round_summary") {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Next round unavailable." });
      }
      return;
    }

    if (game.roundTimer) {
      clearTimeout(game.roundTimer);
      game.roundTimer = null;
    }

    startQuestion(game);

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("host:end", ({ code }, ack) => {
    const roomCode = (code || "").toUpperCase();
    const game = games.get(roomCode);

    if (!canHost(socket, game)) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Not allowed." });
      }
      return;
    }

    destroyGame(roomCode, "Host ended the game.");

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("player:answer", ({ code, answerIndex }, ack) => {
    const game = games.get((code || "").toUpperCase());
    const player = game?.players.get(socket.id);

    if (!game || !player || game.phase !== "question") {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Question not active." });
      }
      return;
    }

    if (game.submissions.has(socket.id)) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Answer already submitted." });
      }
      return;
    }

    const question = game.questions[game.currentQuestionIndex];
    const safeAnswerIndex = Number(answerIndex);

    if (!Number.isInteger(safeAnswerIndex) || safeAnswerIndex < 0 || safeAnswerIndex >= question.options.length) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Invalid answer." });
      }
      return;
    }

    const elapsed = clamp(Date.now() - game.questionStartedAt, 0, game.settings.timerSeconds * 1000);
    const correct = safeAnswerIndex === question.answerIndex;
    const score = calculateScore(game, elapsed, correct, player.streak);

    player.streak = score.newStreak;
    player.score += score.delta;
    if (correct) {
      player.correctCount += 1;
    }

    game.submissions.set(socket.id, {
      playerId: player.id,
      playerName: player.name,
      answerIndex: safeAnswerIndex,
      correct,
      delta: score.delta,
      ms: elapsed
    });

    game.updatedAt = Date.now();

    broadcastHostStatus(game);

    if (typeof ack === "function") {
      ack({
        ok: true,
        correct,
        delta: score.delta,
        streak: player.streak
      });
    }

    io.to(socket.id).emit("player:locked", {
      leaderboard: sortedPlayers(game)
    });

    if (maybeFinishGameByWeight(game)) {
      return;
    }

    const requiredAnswers =
      game.questionEligiblePlayerIds instanceof Set && game.questionEligiblePlayerIds.size > 0
        ? game.questionEligiblePlayerIds.size
        : game.players.size;
    let submittedAnswers = 0;
    for (const submission of game.submissions.values()) {
      if (!(game.questionEligiblePlayerIds instanceof Set) || game.questionEligiblePlayerIds.size === 0) {
        submittedAnswers += 1;
        continue;
      }
      if (game.questionEligiblePlayerIds.has(submission.playerId)) {
        submittedAnswers += 1;
      }
    }

    if (requiredAnswers > 0 && submittedAnswers >= requiredAnswers) {
      closeQuestion(game);
    }
  });

  socket.on("player:minigameAction", ({ code, action, value }, ack) => {
    const game = games.get((code || "").toUpperCase());
    const result = handleMiniGameAction(game, socket.id, action, value);
    if (typeof ack === "function") {
      ack(result);
    }
  });

  socket.on("disconnect", () => {
    const code = socketToGame.get(socket.id);
    if (!code) {
      return;
    }

    const game = games.get(code);
    socketToGame.delete(socket.id);

    if (!game) {
      return;
    }

    if (socket.id === game.hostId) {
      destroyGame(code, "Host disconnected.");
      return;
    }

    removePlayerFromGame(game, socket.id);
  });
});

setInterval(() => {
  const now = Date.now();

  for (const [code, game] of games.entries()) {
    if (now - game.updatedAt > GAME_IDLE_TTL_MS) {
      destroyGame(code, "Game expired due to inactivity.");
    }
  }

  for (const [code, report] of recentReports.entries()) {
    const finishedAt = Number(report?.finishedAt || 0);
    if (!finishedAt || now - finishedAt > REPORT_TTL_MS) {
      recentReports.delete(code);
    }
  }
}, 15 * 60 * 1000);

server.listen(PORT, () => {
  const port = Number(PORT);
  const lanUrls = getLanIpv4Addresses().map((ip) => `http://${ip}:${port}`);

  console.log(`Blooket-style game server listening on http://localhost:${port}`);
  if (lanUrls.length > 0) {
    console.log("Chromebook/LAN join URLs:");
    for (const url of lanUrls) {
      console.log(`  ${url}`);
    }
  } else {
    console.log("No private LAN IPv4 address detected. Students can still use localhost on this machine.");
  }
});
