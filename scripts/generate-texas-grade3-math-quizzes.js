const fs = require("fs");
const path = require("path");

const OUTPUT_FILE = path.join(__dirname, "..", "data", "custom-quizzes.json");
const GENERATED_BY = "Local Curriculum";
const CATEGORY = "Texas Grade 3 Math";
const NOW = new Date().toISOString();
const ASSESSED_CURRICULUM_URL = "https://tea.texas.gov/student-assessment/staar/staar-3-math-assessed-curriculum.pdf";
const BLUEPRINT_URL = "https://tea.texas.gov/student-assessment/staar/staar-3-math-blueprint.pdf";

const NAMES = [
  "Ava", "Liam", "Mia", "Noah", "Sofia", "Ethan", "Isla", "Lucas", "Zoe", "Mateo",
  "Ella", "Levi", "Nora", "Jayden", "Ruby", "Isaac", "Clara", "Owen", "Hazel", "Diego"
];
const ITEMS = ["stickers", "books", "crayons", "shells", "cards", "buttons", "erasers", "marbles", "pencils", "beads"];
const GROUP_ITEMS = ["cookies", "markers", "toy cars", "flowers", "rocks", "baseballs", "blocks", "glow sticks"];
const JOBS = [
  ["chef", "cooking skills"],
  ["teacher", "teaching skills"],
  ["nurse", "medical training"],
  ["builder", "construction skills"],
  ["artist", "art skills"],
  ["mechanic", "repair skills"],
  ["farmer", "farming skills"],
  ["baker", "baking skills"]
];
const RESOURCES = ["oranges", "concert tickets", "winter coats", "umbrellas", "school notebooks", "fresh flowers", "baseball cards", "bicycles"];
const FRACTION_DENOMINATORS = [2, 3, 4, 6, 8];
const GENERATED_IDS = new Set();

function hashSeed(text) {
  let hash = 2166136261;
  const source = String(text || "");
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seedText) {
  let state = hashSeed(seedText) || 123456789;
  return function rng() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffle(values, rng) {
  const copy = values.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const next = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = next;
  }
  return copy;
}

function pick(array, index, offset = 0) {
  return array[(index + offset) % array.length];
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const normalized = String(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-US");
}

function digitsOf(value) {
  const text = String(Math.max(0, Math.floor(Number(value) || 0))).padStart(5, "0");
  return text.split("").map((digit) => Number(digit));
}

function expandedNotation(value) {
  const [tenThousands, thousands, hundreds, tens, ones] = digitsOf(value);
  return `${tenThousands} ten thousands + ${thousands} thousands + ${hundreds} hundreds + ${tens} tens + ${ones} ones`;
}

function buildFallbackChoices(correctText) {
  const choices = [];

  if (/^\$-?\d+(\.\d{2})?$/.test(correctText)) {
    const amount = Number(correctText.replace("$", ""));
    choices.push(`$${(amount + 1).toFixed(2)}`);
    choices.push(`$${Math.max(0, amount - 1).toFixed(2)}`);
    choices.push(`$${(amount + 0.1).toFixed(2)}`);
  }

  if (/^-?\d[\d,]*$/.test(correctText)) {
    const amount = Number(correctText.replace(/,/g, ""));
    choices.push(formatNumber(amount + 1));
    choices.push(formatNumber(Math.max(0, amount - 1)));
    choices.push(formatNumber(amount + 10));
  }

  if (/^\d+\/\d+$/.test(correctText)) {
    const [left, right] = correctText.split("/").map((piece) => Number(piece));
    choices.push(fraction(Math.max(1, left - 1), right));
    choices.push(fraction(left + 1, right));
    choices.push(fraction(left, right + 1));
  }

  if (/^\d+:\d{2}$/.test(correctText)) {
    const [hourText, minuteText] = correctText.split(":");
    const hour = Number(hourText);
    const minute = Number(minuteText);
    choices.push(formatTime(...addMinutes(hour, minute, 15)));
    choices.push(formatTime(...addMinutes(hour, minute, -15)));
    choices.push(formatTime(...addMinutes(hour, minute, 30)));
  }

  if (/^\d+ (square units|units|minutes|pounds|liters)$/.test(correctText)) {
    const [, measure] = correctText.match(/^(\d+) (.+)$/) || [];
    const amount = Number(correctText.split(" ")[0]);
    const unit = correctText.slice(String(amount).length + 1);
    choices.push(`${amount + 1} ${unit}`);
    choices.push(`${Math.max(0, amount - 1)} ${unit}`);
    choices.push(`${amount + 2} ${unit}`);
  }

  if (correctText.includes("ten thousands")) {
    const digits = correctText.match(/\d+/g);
    if (digits && digits.length === 5) {
      const shifted = digits.map((digit, index) => (index === 0 ? (Number(digit) + 1) % 10 : Number(digit)));
      choices.push(expandedNotation(Number(shifted.join(""))));
    }
  }

  choices.push("Not enough information");
  choices.push("None of these");
  choices.push("All of these");
  return uniqueStrings(choices.filter((choice) => choice && choice !== correctText));
}

function makeQuestion(prompt, correct, wrongs, explanation, seedKey = "") {
  const correctText = String(correct);
  const options = uniqueStrings([correctText, ...wrongs.map((wrong) => String(wrong))]);
  for (const fallback of buildFallbackChoices(correctText)) {
    if (options.length >= 4) {
      break;
    }
    if (!options.includes(fallback)) {
      options.push(fallback);
    }
  }
  if (options.length < 4) {
    throw new Error(`Need at least 4 unique options for: ${prompt}`);
  }
  const shuffled = shuffle(options.slice(0, 4), createRng(`${seedKey}|${prompt}|${correctText}`));
  return {
    prompt: String(prompt),
    options: shuffled,
    answerIndex: shuffled.indexOf(correctText),
    explanation: String(explanation)
  };
}

function assertQuestionCount(code, questions) {
  if (!Array.isArray(questions) || questions.length !== 50) {
    throw new Error(`${code} generated ${Array.isArray(questions) ? questions.length : 0} questions instead of 50.`);
  }
}

function fraction(numerator, denominator) {
  return `${numerator}/${denominator}`;
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function simplestFraction(numerator, denominator) {
  const factor = gcd(numerator, denominator);
  return fraction(numerator / factor, denominator / factor);
}

function formatMoney(cents) {
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

function pluralize(word, count) {
  return Number(count) === 1 ? word : `${word}s`;
}

function placeName(placeValue) {
  const lookup = {
    1: "ones",
    10: "tens",
    100: "hundreds",
    1000: "thousands",
    10000: "ten thousands",
    100000: "hundred thousands"
  };
  return lookup[placeValue] || "place";
}

function countObjectsPhrase(count, noun) {
  return `${count} ${pluralize(noun, count)}`;
}

function barTableText(rows) {
  return rows.map((row) => `${row.label}: ${row.value}`).join("; ");
}

function build31A() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const name = pick(NAMES, index);
    const item = pick(ITEMS, index);
    questions.push(
      makeQuestion(
        `Which situation best shows ${name} applying mathematics to an everyday problem?`,
        `Comparing prices to decide which ${item} costs less`,
        [
          `Picking a favorite color for ${item}`,
          `Choosing a song to play while using ${item}`,
          `Guessing which ${item} looks the nicest`
        ],
        `Applying mathematics means using numbers, measurements, or comparisons to solve a real problem.`,
        `3.1A-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const name = pick(NAMES, index, 4);
    const item = pick(GROUP_ITEMS, index);
    const students = (index % 8) + 12;
    questions.push(
      makeQuestion(
        `${name}'s class needs enough ${item} for ${students} students. What is the best use of mathematics?`,
        `Use numbers to figure out how many ${item} are needed`,
        [
          `Ask students to guess how many ${item} are needed`,
          `Choose the ${item} that looks most colorful`,
          `Wait until the class starts and hope there are enough ${item}`
        ],
        `Math helps solve real class and workplace problems by finding the amount needed.`,
        `3.1A-b-${index}`
      )
    );
  }
  return questions;
}

function build31B() {
  const questions = [];
  const steps = [
    "analyze the given information",
    "formulate a plan or strategy",
    "determine a solution",
    "justify the solution",
    "evaluate the problem-solving process and the reasonableness of the solution"
  ];

  for (let index = 0; index < 25; index += 1) {
    const stage = index % 4;
    questions.push(
      makeQuestion(
        `A student has just completed this step: ${steps[stage]}. According to the problem-solving model, what should the student do next?`,
        steps[stage + 1],
        uniqueStrings(steps.filter((step) => step !== steps[stage + 1]).slice(0, 3)),
        `The problem-solving model follows the order analyze, plan, solve, justify, then evaluate.`,
        `3.1B-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const prompt =
      index % 2 === 0
        ? "Why should a student evaluate whether an answer is reasonable after solving?"
        : "Why is it important to justify a mathematical solution?";
    const correct =
      index % 2 === 0
        ? "To check whether the answer makes sense for the problem"
        : "To explain why the strategy and answer are correct";
    questions.push(
      makeQuestion(
        prompt,
        correct,
        [
          "To make the numbers larger",
          "To skip the planning step",
          "To avoid showing any work"
        ],
        `Good problem solving includes explaining and checking the answer, not just writing a number.`,
        `3.1B-b-${index}`
      )
    );
  }
  return questions;
}

function build31C() {
  const questions = [];
  const toolCases = [
    ["measure the length of a desk", "ruler", ["measuring cup", "clock", "number line"]],
    ["find the liquid volume of juice", "measuring cup", ["ruler", "base-ten blocks", "clock"]],
    ["show equal groups in a multiplication problem", "counters", ["thermometer", "ruler", "clock"]],
    ["read elapsed time on a schedule", "clock", ["measuring cup", "ruler", "scale"]],
    ["model place value of a large number", "base-ten blocks", ["clock", "bar graph", "scale"]]
  ];

  for (let index = 0; index < 25; index += 1) {
    const [task, correct, wrongs] = pick(toolCases, index);
    questions.push(
      makeQuestion(
        `Which tool is most appropriate to ${task}?`,
        correct,
        wrongs,
        `Choose a tool that matches the kind of information you need to measure or model.`,
        `3.1C-a-${index}`
      )
    );
  }

  const techniqueCases = [
    ["198 + 203 is close to 400", "estimation", ["skip counting", "drawing a picture", "using a ruler"]],
    ["50 - 20 in your head", "mental math", ["measuring", "graphing", "sorting"]],
    ["5, 10, 15, 20 when counting by fives", "skip counting", ["rounding", "measuring", "weighing"]],
    ["knowing 299 is about 300 before solving", "number sense", ["timing", "tracing", "guessing"]],
    ["about how many seats are needed before arranging chairs", "estimation", ["classifying shapes", "naming colors", "drawing a map"]]
  ];

  for (let index = 0; index < 25; index += 1) {
    const [task, correct, wrongs] = pick(techniqueCases, index);
    questions.push(
      makeQuestion(
        `Which technique would help a student with this idea: ${task}?`,
        correct,
        wrongs,
        `Students should choose techniques such as mental math, estimation, skip counting, or number sense when they fit the problem.`,
        `3.1C-b-${index}`
      )
    );
  }
  return questions;
}

function build31D() {
  const questions = [];
  const communicationCases = [
    ["show 3 x 4", "an array and an equation", ["a color name and a drawing with no labels", "a random list of numbers", "only a guess"]],
    ["compare survey results", "a bar graph and a sentence", ["a shape pattern only", "a blank table", "just the word maybe"]],
    ["explain 3/4", "a number line and words", ["only a favorite food", "an unlabeled picture", "a guess with no model"]],
    ["show why 402 rounds to 400", "a number line and an explanation", ["just saying because", "a picture of a clock", "an unrelated equation"]],
    ["explain a missing factor problem", "a strip diagram and an equation", ["a song title", "a blank page", "an unrelated bar graph"]]
  ];

  for (let index = 0; index < 50; index += 1) {
    const [task, correct, wrongs] = pick(communicationCases, index);
    questions.push(
      makeQuestion(
        `Which choice best communicates a mathematical idea to ${task}?`,
        correct,
        wrongs,
        `Communicating mathematical ideas clearly often uses symbols, diagrams, graphs, and words together.`,
        `3.1D-${index}`
      )
    );
  }
  return questions;
}

function build31E() {
  const questions = [];
  const representationCases = [
    ["organize class survey data", "frequency table", ["measuring cup", "pencil box", "clock"]],
    ["show equal groups in multiplication", "array", ["thermometer", "calendar", "scale"]],
    ["show jumps from 0 to 1 on fractions", "number line", ["pattern block bag", "ruler only", "paint brush"]],
    ["compare category totals", "bar graph", ["dice", "glue stick", "crayon box"]],
    ["show parts of a whole in a problem", "strip diagram", ["flashlight", "bookmark", "folder"]]
  ];

  for (let index = 0; index < 25; index += 1) {
    const [task, correct, wrongs] = pick(representationCases, index);
    questions.push(
      makeQuestion(
        `Which representation should a student create to ${task}?`,
        correct,
        wrongs,
        `A good representation helps organize, record, and communicate the math idea clearly.`,
        `3.1E-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const task = pick(["keep work organized", "record important information", "show thinking clearly", "share a solution with classmates", "track data"], index);
    questions.push(
      makeQuestion(
        `Why do students create mathematical representations such as tables, diagrams, and number lines?`,
        `To ${task} while solving and communicating ideas`,
        [
          "To avoid using any numbers",
          "To make the problem harder to read",
          "To replace every answer with a guess"
        ],
        `Representations help students organize, record, and communicate mathematics.`,
        `3.1E-b-${index}`
      )
    );
  }
  return questions;
}

function build31F() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const factorA = (index % 8) + 2;
    const factorB = ((index + 3) % 8) + 2;
    const product = factorA * factorB;
    questions.push(
      makeQuestion(
        `Which fact is related to ${factorA} x ${factorB} = ${product}?`,
        `${product} / ${factorA} = ${factorB}`,
        [`${product} + ${factorA} = ${factorB}`, `${factorA} - ${factorB} = ${product}`, `${factorA} x ${product} = ${factorB}`],
        `Analyzing relationships helps connect multiplication facts to related division facts.`,
        `3.1F-a-${index}`
      )
    );
  }

  const relationshipCases = [
    ["the same point on a number line", "equivalent fractions", ["different denominators only", "unrelated numbers", "unequal wholes only"]],
    ["numbers increasing by 5 each time", "a skip-counting pattern", ["a measuring error", "a random order", "a fraction model"]],
    ["the digit 4 moving one place to the left", "the value becomes 10 times as great", ["the value stays the same", "the value is cut in half", "the number becomes odd"]],
    ["a rectangle split into rows and columns", "multiplication can find the total number of squares", ["only subtraction can be used", "there is no pattern", "the area must be 0"]],
    ["data shown in a table and in a graph", "both can represent the same mathematical relationship", ["only one can ever be correct", "tables cannot show numbers", "graphs cannot compare data"]]
  ];

  for (let index = 0; index < 25; index += 1) {
    const [clue, correct, wrongs] = pick(relationshipCases, index);
    questions.push(
      makeQuestion(
        `What mathematical relationship is shown by ${clue}?`,
        correct,
        wrongs,
        `Analyzing relationships helps students connect one math idea to another and explain it clearly.`,
        `3.1F-b-${index}`
      )
    );
  }
  return questions;
}

function build31G() {
  const questions = [];
  const justificationCases = [
    [
      "Which explanation uses precise mathematical language to justify that 3/4 is greater than 2/4?",
      "They have the same denominator, and 3 parts is greater than 2 parts",
      ["It is bigger because I feel like it", "The 3 looks larger than the 2", "Fractions are always different"]
    ],
    [
      "Which explanation best justifies that 5 x 4 = 20?",
      "Five groups of four make a total of twenty",
      ["It just is twenty", "I guessed and got lucky", "Twenty is my favorite number"]
    ],
    [
      "Which sentence uses precise mathematical language about perimeter?",
      "Perimeter is the distance around a figure",
      ["Perimeter is how big it feels", "Perimeter is any number you write", "Perimeter means color the shape"]
    ],
    [
      "Which statement clearly justifies rounding 398 to 400?",
      "398 is between 390 and 400 and is closer to 400",
      ["398 should go up because it looks large", "398 turns into 300", "All numbers round to 0"]
    ],
    [
      "Which statement best explains an equivalent fraction?",
      "Two equivalent fractions represent the same amount of the same-size whole",
      ["Equivalent means the numerators match", "Equivalent means the fractions are random", "Equivalent means the denominators are odd"]
    ]
  ];

  for (let index = 0; index < 25; index += 1) {
    const [prompt, correct, wrongs] = pick(justificationCases, index);
    questions.push(
      makeQuestion(
        prompt,
        correct,
        wrongs,
        `Precise mathematical language explains why an idea is correct, not just what the answer is.`,
        `3.1G-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const topic = pick(["area", "perimeter", "fraction", "product", "quotient"], index);
    questions.push(
      makeQuestion(
        `Why should a student use precise mathematical language when explaining a ${topic} solution?`,
        "So the reasoning is clear and can be understood by others",
        [
          "So no one can follow the explanation",
          "So the answer sounds longer but not clearer",
          "So numbers do not need to match the work"
        ],
        `Precise language helps students display, explain, and justify mathematical ideas clearly.`,
        `3.1G-b-${index}`
      )
    );
  }
  return questions;
}

function build32A() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const number = 12345 + index * 3471;
    const digits = digitsOf(number);
    const wrongDigitsA = [digits[0], digits[2], digits[1], digits[3], digits[4]];
    const wrongDigitsB = [digits[0], digits[1], digits[2], digits[4], digits[3]];
    const wrongDigitsC = [digits[1], digits[0], digits[2], digits[3], digits[4]];
    questions.push(
      makeQuestion(
        `Which expanded form matches ${formatNumber(number)}?`,
        expandedNotation(number),
        [expandedNotation(Number(wrongDigitsA.join(""))), expandedNotation(Number(wrongDigitsB.join(""))), expandedNotation(Number(wrongDigitsC.join("")))],
        `${formatNumber(number)} is ${expandedNotation(number)}.`,
        `3.2A-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const tenThousands = (index % 9) + 1;
    const thousands = (index * 3) % 10;
    const hundreds = (index * 7) % 10;
    const tens = (index * 5) % 10;
    const ones = (index * 9 + 2) % 10;
    const number = tenThousands * 10000 + thousands * 1000 + hundreds * 100 + tens * 10 + ones;
    const wrongA = tenThousands * 10000 + hundreds * 1000 + thousands * 100 + tens * 10 + ones;
    const wrongB = tenThousands * 10000 + thousands * 1000 + hundreds * 100 + ones * 10 + tens;
    const wrongC = thousands * 10000 + tenThousands * 1000 + hundreds * 100 + tens * 10 + ones;
    questions.push(
      makeQuestion(
        `What number is ${expandedNotation(number)}?`,
        formatNumber(number),
        [formatNumber(wrongA), formatNumber(wrongB), formatNumber(wrongC)],
        `${expandedNotation(number)} is ${formatNumber(number)}.`,
        `3.2A-b-${index}`
      )
    );
  }
  return questions;
}

function build32B() {
  const questions = [];
  const places = [1, 10, 100, 1000, 10000, 100000];

  for (let index = 0; index < 20; index += 1) {
    const base = places[index % (places.length - 1)];
    const next = base * 10;
    questions.push(
      makeQuestion(
        `Compared with the ${placeName(base)} place, the same digit in the ${placeName(next)} place has a value that is...`,
        "10 times as great",
        ["100 times as great", "1/10 as great", "the same value"],
        `In base ten, each place to the left is 10 times the value of the place to its right.`,
        `3.2B-a-${index}`
      )
    );
  }

  for (let index = 0; index < 15; index += 1) {
    const base = places[(index % (places.length - 1)) + 1];
    const right = base / 10;
    questions.push(
      makeQuestion(
        `Compared with the ${placeName(base)} place, the same digit in the ${placeName(right)} place has a value that is...`,
        "1/10 as great",
        ["10 times as great", "100 times as great", "the same value"],
        `Moving one place to the right makes the value 1/10 as great in base ten.`,
        `3.2B-b-${index}`
      )
    );
  }

  for (let index = 0; index < 15; index += 1) {
    const base = places[index % (places.length - 2)];
    const target = base * 10;
    questions.push(
      makeQuestion(
        `Which place is 10 times the value of the ${placeName(base)} place?`,
        `${placeName(target)} place`,
        [`${placeName(base / 10 || 1)} place`, `${placeName(base)} place`, `${placeName(target * 10)} place`],
        `The place one step to the left is 10 times the value in a base-10 system.`,
        `3.2B-c-${index}`
      )
    );
  }
  return questions;
}

function build32C() {
  const questions = [];
  const placeValues = [10, 100, 1000, 10000];

  for (let index = 0; index < 25; index += 1) {
    const place = placeValues[index % placeValues.length];
    const number = 1250 + index * 2719;
    const lower = Math.floor(number / place) * place;
    const upper = lower + place;
    questions.push(
      makeQuestion(
        `${formatNumber(number)} is between which two consecutive multiples of ${formatNumber(place)}?`,
        `${formatNumber(lower)} and ${formatNumber(upper)}`,
        [`${formatNumber(lower - place)} and ${formatNumber(lower)}`, `${formatNumber(upper)} and ${formatNumber(upper + place)}`, `${formatNumber(lower - place)} and ${formatNumber(upper)}`],
        `${formatNumber(number)} is between ${formatNumber(lower)} and ${formatNumber(upper)}.`,
        `3.2C-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const place = placeValues[index % placeValues.length];
    const number = 1865 + index * 3187;
    const rounded = Math.round(number / place) * place;
    const wrongA = Math.floor(number / place) * place;
    const wrongB = wrongA + place * 2;
    const wrongC = Math.max(0, rounded - place);
    questions.push(
      makeQuestion(
        `Round ${formatNumber(number)} to the nearest ${placeName(place)} place.`,
        formatNumber(rounded),
        [formatNumber(wrongA), formatNumber(wrongB), formatNumber(wrongC)],
        `${formatNumber(number)} rounds to ${formatNumber(rounded)}.`,
        `3.2C-b-${index}`
      )
    );
  }
  return questions;
}

function build32D() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const left = 12000 + index * 2893;
    const right = left + (index % 2 === 0 ? 47 : -63);
    const symbol = left > right ? ">" : left < right ? "<" : "=";
    questions.push(
      makeQuestion(
        `Which symbol makes this true? ${formatNumber(left)} __ ${formatNumber(right)}`,
        symbol,
        [symbol === ">" ? "<" : ">", symbol === "=" ? "<" : "=", symbol === "<" ? ">" : "<="],
        `${formatNumber(left)} ${symbol} ${formatNumber(right)}.`,
        `3.2D-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const a = 10000 + index * 321;
    const b = a + 67;
    const c = b + 209;
    const d = c + 18;
    const values = [a, b, c, d];
    const descending = index % 2 === 0;
    const correct = values.slice().sort((x, y) => (descending ? y - x : x - y)).map((value) => formatNumber(value)).join(", ");
    const wrongA = values.slice().sort((x, y) => (descending ? x - y : y - x)).map((value) => formatNumber(value)).join(", ");
    const wrongB = [a, c, b, d].map((value) => formatNumber(value)).join(", ");
    const wrongC = [d, b, c, a].map((value) => formatNumber(value)).join(", ");
    questions.push(
      makeQuestion(
        `Which list is in ${descending ? "descending" : "ascending"} order? ${formatNumber(a)}, ${formatNumber(b)}, ${formatNumber(c)}, ${formatNumber(d)}`,
        correct,
        [wrongA, wrongB, wrongC],
        `Order the numbers by comparing place values from left to right.`,
        `3.2D-b-${index}`
      )
    );
  }
  return questions;
}

function build33A() {
  const questions = [];
  for (let index = 0; index < 20; index += 1) {
    const denominator = FRACTION_DENOMINATORS[index % FRACTION_DENOMINATORS.length];
    const numerator = (index % denominator) + 1;
    questions.push(
      makeQuestion(
        `A strip is divided into ${denominator} equal parts. ${numerator} parts are shaded. What fraction is shaded?`,
        fraction(numerator, denominator),
        [fraction(Math.max(1, numerator - 1), denominator), fraction(Math.min(denominator, numerator + 1), denominator), fraction(numerator, FRACTION_DENOMINATORS[(index + 2) % FRACTION_DENOMINATORS.length])],
        `${numerator} of ${denominator} equal parts is ${fraction(numerator, denominator)}.`,
        `3.3A-a-${index}`
      )
    );
  }

  for (let index = 0; index < 15; index += 1) {
    const denominator = FRACTION_DENOMINATORS[index % FRACTION_DENOMINATORS.length];
    const numerator = ((index + 2) % denominator) + 1;
    questions.push(
      makeQuestion(
        `A number line from 0 to 1 is split into ${denominator} equal parts. A point is at the ${numerator}th tick mark after 0. What fraction does the point show?`,
        fraction(numerator, denominator),
        [fraction(Math.max(1, numerator - 1), denominator), fraction(Math.min(denominator, numerator + 1), denominator), fraction(numerator, denominator === 8 ? 4 : denominator + 1)],
        `The ${numerator}th mark out of ${denominator} equal parts is ${fraction(numerator, denominator)}.`,
        `3.3A-b-${index}`
      )
    );
  }

  for (let index = 0; index < 15; index += 1) {
    const denominator = FRACTION_DENOMINATORS[index % FRACTION_DENOMINATORS.length];
    const numerator = ((index + 3) % denominator) + 1;
    const totalObjects = denominator * 2;
    questions.push(
      makeQuestion(
        `A set has ${totalObjects} counters split into ${denominator} equal groups. ${numerator} groups are red. What fraction of the set is red?`,
        fraction(numerator, denominator),
        [fraction(Math.max(1, numerator - 1), denominator), fraction(Math.min(denominator, numerator + 1), denominator), fraction(numerator, denominator === 8 ? 4 : denominator + 1)],
        `${numerator} of the ${denominator} equal groups are red, so the fraction is ${fraction(numerator, denominator)}.`,
        `3.3A-c-${index}`
      )
    );
  }
  return questions;
}

function build33B() {
  const questions = [];
  for (let index = 0; index < 50; index += 1) {
    const denominator = FRACTION_DENOMINATORS[index % FRACTION_DENOMINATORS.length];
    const numerator = (index % denominator) + 1;
    questions.push(
      makeQuestion(
        `Point P is on a number line from 0 to 1 divided into ${denominator} equal parts. Point P is at mark ${numerator}. What fraction is Point P?`,
        fraction(numerator, denominator),
        [fraction(Math.max(1, numerator - 1), denominator), fraction(Math.min(denominator, numerator + 1), denominator), fraction(numerator, denominator === 8 ? 4 : denominator + 1)],
        `Mark ${numerator} out of ${denominator} equal parts names ${fraction(numerator, denominator)}.`,
        `3.3B-${index}`
      )
    );
  }
  return questions;
}

function build33C() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const denominator = FRACTION_DENOMINATORS[index % FRACTION_DENOMINATORS.length];
    questions.push(
      makeQuestion(
        `What does ${fraction(1, denominator)} mean?`,
        `1 part of a whole split into ${denominator} equal parts`,
        [`${denominator} parts of 1 whole`, `1 whole and ${denominator} extra parts`, `A whole split into ${denominator} unequal parts`],
        `${fraction(1, denominator)} is one unit fraction, so it is 1 of ${denominator} equal parts.`,
        `3.3C-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const denominator = FRACTION_DENOMINATORS[index % FRACTION_DENOMINATORS.length];
    const item = pick(["pizza", "brownie", "paper strip", "sandwich", "pan"], index);
    questions.push(
      makeQuestion(
        `A ${item} is cut into ${denominator} equal pieces. One piece is what fraction of the whole?`,
        fraction(1, denominator),
        [fraction(denominator, 1), fraction(2, denominator), fraction(denominator - 1, denominator)],
        `One equal piece out of ${denominator} pieces is ${fraction(1, denominator)}.`,
        `3.3C-b-${index}`
      )
    );
  }
  return questions;
}

function build33D() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const denominator = FRACTION_DENOMINATORS[index % FRACTION_DENOMINATORS.length];
    const numerator = Math.min(denominator, (index % denominator) + 2);
    const correct = Array.from({ length: numerator }, () => fraction(1, denominator)).join(" + ");
    const wrongA = Array.from({ length: Math.max(1, numerator - 1) }, () => fraction(1, denominator)).join(" + ");
    const wrongB = Array.from({ length: numerator }, () => fraction(1, denominator === 8 ? 4 : denominator + 1)).join(" + ");
    const wrongC = `${correct} + ${fraction(1, denominator)}`;
    questions.push(
      makeQuestion(
        `Which sum shows ${fraction(numerator, denominator)} as a sum of unit fractions?`,
        correct,
        [wrongA, wrongB, wrongC],
        `${fraction(numerator, denominator)} is ${numerator} copies of ${fraction(1, denominator)}.`,
        `3.3D-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const denominator = FRACTION_DENOMINATORS[index % FRACTION_DENOMINATORS.length];
    const numerator = ((index + 1) % denominator) + 1;
    questions.push(
      makeQuestion(
        `A fraction is made from ${numerator} copies of ${fraction(1, denominator)}. What is the fraction?`,
        fraction(numerator, denominator),
        [fraction(Math.max(1, numerator - 1), denominator), fraction(Math.min(denominator, numerator + 1), denominator), fraction(numerator, denominator === 8 ? 4 : denominator + 1)],
        `${numerator} copies of ${fraction(1, denominator)} make ${fraction(numerator, denominator)}.`,
        `3.3D-b-${index}`
      )
    );
  }
  return questions;
}

function build33E() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const recipients = FRACTION_DENOMINATORS[index % FRACTION_DENOMINATORS.length];
    const item = pick(["pizza", "sub sandwich", "sheet cake", "paper strip", "pan of brownies"], index);
    questions.push(
      makeQuestion(
        `One ${item} is shared equally among ${recipients} students. What fraction of the whole does each student get?`,
        fraction(1, recipients),
        [fraction(2, recipients), fraction(recipients - 1, recipients), fraction(recipients, 1)],
        `Equal sharing among ${recipients} students gives each student ${fraction(1, recipients)} of the whole.`,
        `3.3E-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const groups = FRACTION_DENOMINATORS[index % FRACTION_DENOMINATORS.length];
    const total = groups * ((index % 3) + 2);
    const noun = pick(["counters", "stickers", "buttons", "tiles", "beans"], index);
    questions.push(
      makeQuestion(
        `${total} ${noun} are split into ${groups} equal groups. What fraction of the set is one group?`,
        fraction(1, groups),
        [fraction(2, groups), fraction(groups - 1, groups), fraction(total / groups, total)],
        `One of ${groups} equal groups is ${fraction(1, groups)} of the set.`,
        `3.3E-b-${index}`
      )
    );
  }
  return questions;
}

function build33F() {
  const questions = [];
  const equivalents = [
    [fraction(1, 2), fraction(2, 4), fraction(3, 6), fraction(4, 8)],
    [fraction(1, 3), fraction(2, 6)],
    [fraction(1, 4), fraction(2, 8)],
    [fraction(3, 4), fraction(6, 8)]
  ];

  for (let index = 0; index < 50; index += 1) {
    const group = pick(equivalents, index);
    const source = group[index % group.length];
    const correct = group[(index + 1) % group.length];
    questions.push(
      makeQuestion(
        `Which fraction is equivalent to ${source}?`,
        correct,
        [fraction(1, 6), fraction(3, 8), fraction(2, 3)],
        `${source} and ${correct} name the same amount of the same-size whole.`,
        `3.3F-${index}`
      )
    );
  }
  return questions;
}

function build33G() {
  const questions = [];
  const pairs = [
    [fraction(1, 2), fraction(2, 4)],
    [fraction(1, 2), fraction(3, 6)],
    [fraction(1, 2), fraction(4, 8)],
    [fraction(1, 3), fraction(2, 6)],
    [fraction(1, 4), fraction(2, 8)],
    [fraction(3, 4), fraction(6, 8)]
  ];

  for (let index = 0; index < 25; index += 1) {
    const [left, right] = pick(pairs, index);
    questions.push(
      makeQuestion(
        `Why can ${left} and ${right} be equivalent fractions?`,
        "They name the same amount of the same-size whole",
        ["They always use the same denominator", "They have different points on the number line", "They must come from different-size wholes"],
        `Equivalent fractions represent the same amount of the same-size whole.`,
        `3.3G-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const [left, right] = pick(pairs, index, 2);
    questions.push(
      makeQuestion(
        `If ${left} and ${right} are equivalent, what must be true?`,
        "They are at the same point on a number line for the same whole",
        ["One fraction is always bigger than the other", "They must use different numerators and different denominators", "They can only be shown with unequal parts"],
        `Equivalent fractions can be shown at the same point on a number line for the same whole.`,
        `3.3G-b-${index}`
      )
    );
  }
  return questions;
}

function build33H() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const denominator = FRACTION_DENOMINATORS[index % FRACTION_DENOMINATORS.length];
    const numeratorA = ((index + 1) % denominator) + 1;
    const numeratorB = Math.max(1, numeratorA - 1);
    const left = fraction(numeratorA, denominator);
    const right = fraction(numeratorB, denominator);
    questions.push(
      makeQuestion(
        `Which symbol makes this true? ${left} __ ${right}`,
        numeratorA > numeratorB ? ">" : numeratorA < numeratorB ? "<" : "=",
        [numeratorA > numeratorB ? "<" : ">", "=", "<>"],
        `With the same denominator, the fraction with the greater numerator is larger.`,
        `3.3H-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const numerator = (index % 3) + 1;
    const denominatorA = FRACTION_DENOMINATORS[index % FRACTION_DENOMINATORS.length];
    const denominatorB = FRACTION_DENOMINATORS[(index + 2) % FRACTION_DENOMINATORS.length];
    const left = fraction(numerator, denominatorA);
    const right = fraction(numerator, denominatorB);
    const correct = denominatorA < denominatorB ? left : right;
    questions.push(
      makeQuestion(
        `Which fraction is greater: ${left} or ${right}?`,
        correct,
        [correct === left ? right : left, fraction(numerator + 1, denominatorA), fraction(numerator + 1, denominatorB)],
        `With the same numerator, the fraction with the smaller denominator is larger.`,
        `3.3H-b-${index}`
      )
    );
  }
  return questions;
}

function build34A() {
  const questions = [];
  for (let index = 0; index < 20; index += 1) {
    const start = 120 + index * 23;
    const change = 80 + index * 11;
    const name = pick(NAMES, index);
    const item = pick(ITEMS, index);
    const correct = start + change;
    questions.push(
      makeQuestion(
        `${name} collected ${formatNumber(start)} ${item} on Monday and ${formatNumber(change)} more on Tuesday. How many ${item} did ${name} collect in all?`,
        formatNumber(correct),
        [formatNumber(correct - 10), formatNumber(correct + 100), formatNumber(start - change)],
        `Add ${formatNumber(start)} and ${formatNumber(change)} to get ${formatNumber(correct)}.`,
        `3.4A-a-${index}`
      )
    );
  }

  for (let index = 0; index < 15; index += 1) {
    const total = 500 + index * 19;
    const used = 130 + index * 9;
    const name = pick(NAMES, index, 4);
    const item = pick(ITEMS, index, 3);
    const correct = total - used;
    questions.push(
      makeQuestion(
        `${name} had ${formatNumber(total)} ${item}. ${name} gave away ${formatNumber(used)} ${item}. How many ${item} are left?`,
        formatNumber(correct),
        [formatNumber(correct + 10), formatNumber(total + used), formatNumber(used - total)],
        `Subtract ${formatNumber(used)} from ${formatNumber(total)} to get ${formatNumber(correct)}.`,
        `3.4A-b-${index}`
      )
    );
  }

  for (let index = 0; index < 15; index += 1) {
    const first = 180 + index * 17;
    const second = 95 + index * 13;
    const third = 70 + index * 7;
    const correct = first + second - third;
    const name = pick(NAMES, index, 7);
    const item = pick(["cans", "books", "tickets", "cards", "markers"], index);
    questions.push(
      makeQuestion(
        `${name}'s class collected ${formatNumber(first)} ${item} in week 1 and ${formatNumber(second)} in week 2. They used ${formatNumber(third)} ${item}. How many ${item} were left?`,
        formatNumber(correct),
        [formatNumber(first + second + third), formatNumber(first - second - third), formatNumber(first + second)],
        `Add the first two weeks and then subtract the amount used: ${formatNumber(correct)}.`,
        `3.4A-c-${index}`
      )
    );
  }
  return questions;
}

function build34B() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const left = 120 + index * 17;
    const right = 260 + index * 13;
    const roundTo = index % 2 === 0 ? 10 : 100;
    const correct = Math.round(left / roundTo) * roundTo + Math.round(right / roundTo) * roundTo;
    questions.push(
      makeQuestion(
        `Estimate ${formatNumber(left)} + ${formatNumber(right)} by rounding each number to the nearest ${roundTo}.`,
        formatNumber(correct),
        [formatNumber(Math.floor(left / roundTo) * roundTo + Math.floor(right / roundTo) * roundTo), formatNumber(correct + roundTo * 2), formatNumber(left + right)],
        `Round each number first, then add the rounded numbers.`,
        `3.4B-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const left = 340 + index * 21;
    const right = 90 + index * 7;
    const roundTo = index % 2 === 0 ? 10 : 100;
    const correct = Math.round(left / roundTo) * roundTo - Math.round(right / roundTo) * roundTo;
    questions.push(
      makeQuestion(
        `Estimate ${formatNumber(left)} - ${formatNumber(right)} by rounding each number to the nearest ${roundTo}.`,
        formatNumber(correct),
        [formatNumber(Math.floor(left / roundTo) * roundTo - Math.floor(right / roundTo) * roundTo), formatNumber(correct + roundTo), formatNumber(left - right)],
        `Round each number first, then subtract the rounded numbers.`,
        `3.4B-b-${index}`
      )
    );
  }
  return questions;
}

function build34C() {
  const questions = [];
  const billValues = [
    ["one-dollar bill", 100],
    ["five-dollar bill", 500],
    ["ten-dollar bill", 1000],
    ["twenty-dollar bill", 2000]
  ];
  const coinValues = [
    ["penny", 1],
    ["nickel", 5],
    ["dime", 10],
    ["quarter", 25]
  ];

  for (let index = 0; index < 50; index += 1) {
    const bill = pick(billValues, index);
    const coinA = pick(coinValues, index);
    const coinB = pick(coinValues, index, 2);
    const billCount = (index % 3) + 1;
    const coinCountA = (index % 4) + 1;
    const coinCountB = ((index + 2) % 4) + 1;
    const total = bill[1] * billCount + coinA[1] * coinCountA + coinB[1] * coinCountB;
    questions.push(
      makeQuestion(
        `What is the value of ${countObjectsPhrase(billCount, bill[0])}, ${countObjectsPhrase(coinCountA, coinA[0])}, and ${countObjectsPhrase(coinCountB, coinB[0])}?`,
        formatMoney(total),
        [formatMoney(total + coinA[1]), formatMoney(total + coinB[1] * 2), formatMoney(Math.max(0, total - bill[1]))],
        `Add the values of the bills and coins to find ${formatMoney(total)}.`,
        `3.4C-${index}`
      )
    );
  }
  return questions;
}

function build34D() {
  const questions = [];
  for (let index = 0; index < 50; index += 1) {
    const groups = (index % 10) + 1;
    const perGroup = ((index + 3) % 10) + 1;
    const item = pick(GROUP_ITEMS, index);
    const correct = groups * perGroup;
    questions.push(
      makeQuestion(
        `There are ${groups} equal groups with ${perGroup} ${item} in each group. How many ${item} are there in all?`,
        formatNumber(correct),
        [formatNumber(correct + perGroup), formatNumber(groups + perGroup), formatNumber(correct - groups)],
        `${groups} groups of ${perGroup} means ${groups} x ${perGroup} = ${correct}.`,
        `3.4D-${index}`
      )
    );
  }
  return questions;
}

function repeatedAddition(factor, groups) {
  return Array.from({ length: groups }, () => String(factor)).join(" + ");
}

function build34E() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const groups = (index % 9) + 2;
    const size = ((index + 4) % 9) + 2;
    questions.push(
      makeQuestion(
        `Which repeated addition matches ${groups} x ${size}?`,
        repeatedAddition(size, groups),
        [repeatedAddition(groups, size), repeatedAddition(size + 1, groups), repeatedAddition(size, Math.max(1, groups - 1))],
        `${groups} x ${size} means ${groups} groups of ${size}.`,
        `3.4E-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const rows = (index % 8) + 2;
    const columns = ((index + 5) % 8) + 2;
    questions.push(
      makeQuestion(
        `An array has ${rows} rows with ${columns} squares in each row. Which multiplication fact does the array show?`,
        `${rows} x ${columns}`,
        [`${columns} x ${rows + 1}`, `${rows + 1} x ${columns}`, `${rows} + ${columns}`],
        `${rows} rows of ${columns} shows ${rows} x ${columns}.`,
        `3.4E-b-${index}`
      )
    );
  }
  return questions;
}

function build34F() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const left = (index % 10) + 1;
    const right = ((index + 3) % 10) + 1;
    const correct = left * right;
    questions.push(
      makeQuestion(
        `What is ${left} x ${right}?`,
        String(correct),
        [String(correct + left), String(correct - right), String(left + right)],
        `${left} x ${right} = ${correct}.`,
        `3.4F-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const divisor = (index % 10) + 1;
    const quotient = ((index + 4) % 10) + 1;
    const dividend = divisor * quotient;
    questions.push(
      makeQuestion(
        `If ${divisor} x ${quotient} = ${dividend}, what is ${dividend} / ${divisor}?`,
        String(quotient),
        [String(divisor), String(dividend), String(quotient + 1)],
        `Use the related multiplication fact: ${dividend} / ${divisor} = ${quotient}.`,
        `3.4F-b-${index}`
      )
    );
  }
  return questions;
}

function build34G() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const twoDigit = 12 + index * 3;
    const oneDigit = (index % 8) + 2;
    const correct = twoDigit * oneDigit;
    questions.push(
      makeQuestion(
        `What is ${twoDigit} x ${oneDigit}?`,
        String(correct),
        [String(correct + twoDigit), String(twoDigit + oneDigit), String(correct - oneDigit)],
        `${twoDigit} x ${oneDigit} = ${correct}.`,
        `3.4G-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const boxes = 11 + index * 2;
    const each = (index % 7) + 2;
    const correct = boxes * each;
    const item = pick(["pencils", "cards", "stickers", "erasers", "markers"], index);
    questions.push(
      makeQuestion(
        `A teacher has ${boxes} boxes. Each box holds ${each} ${item}. How many ${item} are there in all?`,
        String(correct),
        [String(correct + each), String(boxes + each), String(correct - boxes)],
        `${boxes} groups of ${each} is ${correct}.`,
        `3.4G-b-${index}`
      )
    );
  }
  return questions;
}

function build34H() {
  const questions = [];
  for (let index = 0; index < 50; index += 1) {
    const groups = (index % 8) + 2;
    const perGroup = ((index + 5) % 9) + 2;
    const total = groups * perGroup;
    const item = pick(GROUP_ITEMS, index, 3);
    questions.push(
      makeQuestion(
        `${total} ${item} are shared equally into ${groups} groups. How many ${item} are in each group?`,
        String(perGroup),
        [String(groups), String(perGroup + 1), String(total - perGroup)],
        `${total} divided by ${groups} equals ${perGroup}.`,
        `3.4H-${index}`
      )
    );
  }
  return questions;
}

function build34I() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const number = 102 + index * 7;
    const correct = number % 2 === 0 ? "even" : "odd";
    questions.push(
      makeQuestion(
        `Is ${number} even or odd?`,
        correct,
        [correct === "even" ? "odd" : "even", "prime", "zero"],
        `A number ending in ${number % 10} is ${correct}.`,
        `3.4I-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const number = 230 + index * 9;
    const correct = number % 2 === 0 ? "It is divisible by 2" : "It is not divisible by 2";
    questions.push(
      makeQuestion(
        `Which statement is true about ${number}?`,
        correct,
        [correct === "It is divisible by 2" ? "It is not divisible by 2" : "It is divisible by 2", "It must end with 5", "It has an odd ones digit"],
        `A number is even and divisible by 2 when the ones digit is 0, 2, 4, 6, or 8.`,
        `3.4I-b-${index}`
      )
    );
  }
  return questions;
}

function build34J() {
  const questions = [];
  for (let index = 0; index < 50; index += 1) {
    const factorA = (index % 10) + 1;
    const factorB = ((index + 2) % 10) + 1;
    const product = factorA * factorB;
    questions.push(
      makeQuestion(
        `Use multiplication to find the quotient: ${product} / ${factorA} = ?`,
        String(factorB),
        [String(factorA), String(product), String(factorB + 1)],
        `Because ${factorA} x ${factorB} = ${product}, ${product} / ${factorA} = ${factorB}.`,
        `3.4J-${index}`
      )
    );
  }
  return questions;
}

function build34K() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const groups = (index % 8) + 2;
    const perGroup = ((index + 3) % 8) + 2;
    const total = groups * perGroup;
    const item = pick(["pencils", "muffins", "baseballs", "flowers", "beads"], index);
    questions.push(
      makeQuestion(
        `${groups} bags each have ${perGroup} ${item}. How many ${item} are there in all?`,
        String(total),
        [String(total + perGroup), String(groups + perGroup), String(total - groups)],
        `${groups} x ${perGroup} = ${total}.`,
        `3.4K-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const firstGroups = (index % 5) + 2;
    const firstEach = ((index + 1) % 7) + 2;
    const secondGroups = ((index + 2) % 5) + 2;
    const secondEach = ((index + 4) % 6) + 2;
    const correct = firstGroups * firstEach + secondGroups * secondEach;
    const item = pick(["tickets", "plant pots", "juice boxes", "gift bags"], index);
    questions.push(
      makeQuestion(
        `One shelf has ${firstGroups} rows of ${firstEach} ${item}. Another shelf has ${secondGroups} rows of ${secondEach} ${item}. How many ${item} are there in all?`,
        String(correct),
        [String(firstGroups * firstEach), String(secondGroups * secondEach), String(correct + firstEach)],
        `Find each shelf total, then add them together.`,
        `3.4K-b-${index}`
      )
    );
  }
  return questions;
}

function build35A() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const start = 150 + index * 21;
    const add = 40 + index * 6;
    const sub = 18 + index * 4;
    const name = pick(NAMES, index);
    const item = pick(ITEMS, index);
    questions.push(
      makeQuestion(
        `${name} had ${start} ${item}, got ${add} more, and then used ${sub}. Which equation can represent the story?`,
        `${start} + ${add} - ${sub} = n`,
        [`${start} - ${add} + ${sub} = n`, `${start} + ${sub} - ${add} = n`, `${add} + ${sub} = ${start}`],
        `The story starts with ${start}, adds ${add}, and subtracts ${sub}.`,
        `3.5A-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const total = 400 + index * 13;
    const change = 120 + index * 5;
    const correct = total - change;
    questions.push(
      makeQuestion(
        `Which equation helps solve this problem: A class had ${total} books and gave away ${change} books.`,
        `${total} - ${change} = ${correct}`,
        [`${total} + ${change} = ${correct}`, `${change} - ${total} = ${correct}`, `${total} - ${correct} = ${change + 1}`],
        `Subtract the books given away from the starting amount.`,
        `3.5A-b-${index}`
      )
    );
  }
  return questions;
}

function build35B() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const rows = (index % 8) + 2;
    const columns = ((index + 2) % 8) + 2;
    const total = rows * columns;
    questions.push(
      makeQuestion(
        `An array has ${rows} rows and ${columns} columns. Which equation matches the array?`,
        `${rows} x ${columns} = ${total}`,
        [`${rows} + ${columns} = ${total}`, `${total} / ${columns} = ${rows + 1}`, `${rows} x ${columns + 1} = ${total}`],
        `Multiply rows by columns to match the array.`,
        `3.5B-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const total = ((index % 8) + 2) * (((index + 3) % 8) + 2);
    const groups = (index % 8) + 2;
    const each = total / groups;
    questions.push(
      makeQuestion(
        `${total} counters are shared equally into ${groups} groups. Which equation can be used to solve the problem?`,
        `${total} / ${groups} = ${each}`,
        [`${total} + ${groups} = ${each}`, `${groups} / ${total} = ${each}`, `${groups} x ${groups} = ${each}`],
        `Division represents equal sharing, so use ${total} / ${groups}.`,
        `3.5B-b-${index}`
      )
    );
  }
  return questions;
}

function build35C() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const factor = (index % 6) + 2;
    const amount = ((index + 3) % 9) + 3;
    questions.push(
      makeQuestion(
        `Which expression shows "${factor} times as much as ${amount}"?`,
        `${factor} x ${amount}`,
        [`${factor} + ${amount}`, `${amount} - ${factor}`, `${amount} / ${factor}`],
        `"${factor} times as much as ${amount}" means multiply ${amount} by ${factor}.`,
        `3.5C-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const factor = (index % 5) + 2;
    const amount = ((index + 4) % 10) + 4;
    const correct = factor * amount;
    const nameA = pick(NAMES, index);
    const nameB = pick(NAMES, index, 5);
    const item = pick(ITEMS, index, 2);
    questions.push(
      makeQuestion(
        `${nameA} has ${factor} times as many ${item} as ${nameB}. ${nameB} has ${amount} ${item}. How many ${item} does ${nameA} have?`,
        String(correct),
        [String(correct + factor), String(amount + factor), String(correct - amount)],
        `${factor} times ${amount} equals ${correct}.`,
        `3.5C-b-${index}`
      )
    );
  }
  return questions;
}

function build35D() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const factor = (index % 8) + 2;
    const other = ((index + 3) % 8) + 2;
    const product = factor * other;
    questions.push(
      makeQuestion(
        `What number makes this equation true? ${factor} x n = ${product}`,
        String(other),
        [String(factor), String(product), String(other + 1)],
        `${factor} x ${other} = ${product}, so n = ${other}.`,
        `3.5D-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const divisor = (index % 8) + 2;
    const quotient = ((index + 2) % 8) + 2;
    const dividend = divisor * quotient;
    questions.push(
      makeQuestion(
        `What number makes this equation true? ${dividend} / n = ${quotient}`,
        String(divisor),
        [String(quotient), String(dividend), String(divisor + 1)],
        `${dividend} / ${divisor} = ${quotient}, so n = ${divisor}.`,
        `3.5D-b-${index}`
      )
    );
  }
  return questions;
}

function build35E() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const multiplier = (index % 5) + 2;
    const input = (index % 6) + 2;
    const output = input * multiplier;
    questions.push(
      makeQuestion(
        `A table shows input ${input} and output ${output}. Which rule could describe the relationship?`,
        `Output = input x ${multiplier}`,
        [`Output = input + ${multiplier}`, `Output = input - ${multiplier}`, `Output = input x ${multiplier + 1}`],
        `The output is ${multiplier} times the input.`,
        `3.5E-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const addend = (index % 7) + 2;
    const input = (index % 8) + 3;
    const output = input + addend;
    questions.push(
      makeQuestion(
        `A table follows the rule "add ${addend}." If the input is ${input}, what is the output?`,
        String(output),
        [String(input), String(output + addend), String(input - addend)],
        `Add ${addend} to ${input} to get ${output}.`,
        `3.5E-b-${index}`
      )
    );
  }
  return questions;
}

function build36A() {
  const questions = [];
  const prompts = [
    ["Which solid has 2 flat circular faces and 1 curved surface?", "cylinder", ["sphere", "cube", "cone"]],
    ["Which solid has 1 vertex and 1 curved surface?", "cone", ["cube", "sphere", "rectangular prism"]],
    ["Which solid has 6 square faces?", "cube", ["sphere", "cone", "cylinder"]],
    ["Which figure is two-dimensional?", "rectangle", ["cube", "cylinder", "sphere"]],
    ["Which figure is three-dimensional?", "triangular prism", ["triangle", "rectangle", "rhombus"]]
  ];

  for (let index = 0; index < 50; index += 1) {
    const [prompt, correct, wrongs] = pick(prompts, index);
    questions.push(makeQuestion(prompt, correct, wrongs, "Use the figure's faces, edges, and surfaces to classify it.", `3.6A-${index}`));
  }
  return questions;
}

function build36B() {
  const questions = [];
  const prompts = [
    ["Which quadrilateral has 4 right angles and 4 equal sides?", "square", ["rectangle", "trapezoid", "parallelogram"]],
    ["Which quadrilateral has 1 pair of parallel sides?", "trapezoid", ["square", "rectangle", "rhombus"]],
    ["Which quadrilateral has 2 pairs of parallel sides and all sides equal?", "rhombus", ["trapezoid", "rectangle", "triangle"]],
    ["Which shape is a quadrilateral but not a rectangle, square, rhombus, or trapezoid?", "an irregular 4-sided figure", ["square", "rectangle", "trapezoid"]],
    ["Which quadrilateral always has opposite sides parallel?", "parallelogram", ["trapezoid", "triangle", "circle"]]
  ];

  for (let index = 0; index < 50; index += 1) {
    const [prompt, correct, wrongs] = pick(prompts, index);
    questions.push(makeQuestion(prompt, correct, wrongs, "Use the attributes of the quadrilateral to classify it.", `3.6B-${index}`));
  }
  return questions;
}

function build36C() {
  const questions = [];
  for (let index = 0; index < 50; index += 1) {
    const length = (index % 9) + 2;
    const width = ((index + 3) % 8) + 2;
    const area = length * width;
    questions.push(
      makeQuestion(
        `What is the area of a rectangle with side lengths ${length} units and ${width} units?`,
        `${area} square units`,
        [`${length + width} square units`, `${area + length} square units`, `${area - width} square units`],
        `Area of a rectangle is rows times columns: ${length} x ${width} = ${area}.`,
        `3.6C-${index}`
      )
    );
  }
  return questions;
}

function build36D() {
  const questions = [];
  for (let index = 0; index < 50; index += 1) {
    const a = (index % 6) + 2;
    const b = ((index + 2) % 6) + 2;
    const c = ((index + 4) % 5) + 2;
    const d = ((index + 1) % 5) + 2;
    const area = a * b + c * d;
    questions.push(
      makeQuestion(
        `A composite figure is made from a ${a} by ${b} rectangle and a ${c} by ${d} rectangle. What is the total area?`,
        `${area} square units`,
        [`${a + b + c + d} square units`, `${a * b} square units`, `${area + a} square units`],
        `Add the area of each non-overlapping rectangle.`,
        `3.6D-${index}`
      )
    );
  }
  return questions;
}

function build36E() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const parts = FRACTION_DENOMINATORS[index % FRACTION_DENOMINATORS.length];
    questions.push(
      makeQuestion(
        `A rectangle is split into ${parts} equal-area parts. What fraction of the whole is one part?`,
        fraction(1, parts),
        [fraction(2, parts), fraction(parts, 1), fraction(parts - 1, parts)],
        `One equal-area part out of ${parts} is ${fraction(1, parts)}.`,
        `3.6E-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    questions.push(
      makeQuestion(
        "Two identical wholes are each split into 4 equal-area parts, but the parts have different shapes. Which statement is true?",
        "Each part still has area 1/4 of its whole",
        ["The parts cannot be equal if the shapes are different", "One whole must have a larger area than the other", "Only squares can show fourths"],
        `Equal shares of identical wholes do not need to have the same shape.`,
        `3.6E-b-${index}`
      )
    );
  }
  return questions;
}

function build37A() {
  const questions = [];
  const denominators = [2, 4, 8];
  for (let index = 0; index < 50; index += 1) {
    const denominator = denominators[index % denominators.length];
    const numerator = (index % denominator) + 1;
    questions.push(
      makeQuestion(
        `A point is ${numerator} equal parts from 0 on a number line split into ${denominator} equal parts from 0 to 1. Which fraction names the point?`,
        fraction(numerator, denominator),
        [fraction(Math.max(1, numerator - 1), denominator), fraction(Math.min(denominator, numerator + 1), denominator), fraction(numerator, denominator === 8 ? 4 : denominator * 2)],
        `${numerator} parts out of ${denominator} equal parts is ${fraction(numerator, denominator)}.`,
        `3.7A-${index}`
      )
    );
  }
  return questions;
}

function build37B() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const length = (index % 8) + 3;
    const width = ((index + 3) % 7) + 2;
    const perimeter = 2 * (length + width);
    questions.push(
      makeQuestion(
        `What is the perimeter of a rectangle with side lengths ${length} units and ${width} units?`,
        `${perimeter} units`,
        [`${length + width} units`, `${length * width} units`, `${perimeter + 2} units`],
        `Perimeter is the distance around the shape, so add all side lengths.`,
        `3.7B-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const knownA = (index % 9) + 3;
    const knownB = ((index + 2) % 8) + 2;
    const missing = ((index + 4) % 7) + 2;
    const perimeter = knownA + knownB + knownA + missing;
    questions.push(
      makeQuestion(
        `A quadrilateral has side lengths ${knownA} units, ${knownB} units, ${knownA} units, and one unknown side. The perimeter is ${perimeter} units. What is the missing side length?`,
        `${missing} units`,
        [`${perimeter - missing} units`, `${knownB} units`, `${missing + 2} units`],
        `Subtract the known side lengths from the perimeter to find the missing length.`,
        `3.7B-b-${index}`
      )
    );
  }
  return questions;
}

function formatTime(hour, minute) {
  const safeHour = ((hour - 1) % 12) + 1;
  const safeMinute = String(minute).padStart(2, "0");
  return `${safeHour}:${safeMinute}`;
}

function addMinutes(hour, minute, change) {
  const total = hour * 60 + minute + change;
  const normalized = ((total % (12 * 60)) + 12 * 60) % (12 * 60);
  const nextHour = Math.floor(normalized / 60) || 12;
  const nextMinute = normalized % 60;
  return [nextHour, nextMinute];
}

function build37C() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const hour = (index % 8) + 1;
    const minute = (index % 4) * 15;
    const interval = ((index % 5) + 1) * 15;
    const [endHour, endMinute] = addMinutes(hour, minute, interval);
    questions.push(
      makeQuestion(
        `An event starts at ${formatTime(hour, minute)} and lasts ${interval} minutes. What time does it end?`,
        formatTime(endHour, endMinute),
        [formatTime(hour, minute), formatTime(...addMinutes(hour, minute, interval + 15)), formatTime(...addMinutes(hour, minute, Math.max(15, interval - 15)))],
        `Add ${interval} minutes to the start time.`,
        `3.7C-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const first = ((index % 4) + 1) * 15;
    const second = (((index + 2) % 4) + 1) * 15;
    const total = first + second;
    questions.push(
      makeQuestion(
        `A game lasts ${first} minutes and the class discussion lasts ${second} minutes. How many minutes is that altogether?`,
        `${total} minutes`,
        [`${first + second + 15} minutes`, `${Math.abs(first - second)} minutes`, `${first} minutes`],
        `Add the two time intervals: ${first} + ${second} = ${total}.`,
        `3.7C-b-${index}`
      )
    );
  }
  return questions;
}

function build37D() {
  const questions = [];
  const capacityItems = ["juice in a pitcher", "water in a fish tank", "milk in a carton", "soup in a pot", "lemonade in a cooler"];
  const weightItems = ["a watermelon", "a backpack", "a bag of potatoes", "a pumpkin", "a sack of flour"];

  for (let index = 0; index < 25; index += 1) {
    const item = pick(capacityItems, index);
    questions.push(
      makeQuestion(
        `Would you use liquid volume or weight to measure ${item}?`,
        "liquid volume",
        ["weight", "temperature", "length"],
        `${item} is measured by how much liquid it can hold.`,
        `3.7D-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const item = pick(weightItems, index);
    questions.push(
      makeQuestion(
        `Would you use liquid volume or weight to measure ${item}?`,
        "weight",
        ["liquid volume", "time", "area"],
        `${item} is measured by how heavy it is.`,
        `3.7D-b-${index}`
      )
    );
  }
  return questions;
}

function build37E() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    questions.push(
      makeQuestion(
        "Which tool is best for measuring the liquid volume of juice?",
        "measuring cup",
        ["ruler", "protractor", "thermometer"],
        `A measuring cup is used to measure liquid volume.`,
        `3.7E-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const weight = (index % 9) + 2;
    questions.push(
      makeQuestion(
        `A scale shows that a bag of apples weighs ${weight} pounds. What is the weight of the bag?`,
        `${weight} pounds`,
        [`${weight} liters`, `${weight + 2} pounds`, `${weight - 1} pounds`],
        `Read the weight directly from the scale in pounds.`,
        `3.7E-b-${index}`
      )
    );
  }
  return questions;
}

function build38A() {
  const questions = [];
  const categories = [
    ["dog", "cat", "fish", "bird"],
    ["red", "blue", "green", "yellow"],
    ["soccer", "basketball", "baseball", "tennis"],
    ["apple", "banana", "orange", "grape"]
  ];

  for (let index = 0; index < 50; index += 1) {
    const labels = pick(categories, index);
    const counts = labels.map((_, offset) => ((index + offset) % 5) + 2);
    const data = [];
    labels.forEach((label, labelIndex) => {
      for (let count = 0; count < counts[labelIndex]; count += 1) {
        data.push(label);
      }
    });
    const correct = barTableText(labels.map((label, labelIndex) => ({ label, value: counts[labelIndex] })));
    const wrongA = barTableText(labels.map((label, labelIndex) => ({ label, value: counts[(labelIndex + 1) % counts.length] })));
    const wrongB = barTableText(labels.map((label, labelIndex) => ({ label, value: counts[labelIndex] + 1 })));
    const wrongC = barTableText(labels.map((label, labelIndex) => ({ label, value: Math.max(1, counts[labelIndex] - 1) })));
    questions.push(
      makeQuestion(
        `Which summary matches this data set? ${data.join(", ")}`,
        correct,
        [wrongA, wrongB, wrongC],
        `Count how many times each category appears to make the summary table.`,
        `3.8A-${index}`
      )
    );
  }
  return questions;
}

function build38B() {
  const questions = [];
  const labels = ["dog", "cat", "fish", "bird"];
  for (let index = 0; index < 25; index += 1) {
    const rows = labels.map((label, offset) => ({ label, value: ((index + offset) % 6) + 2 }));
    const target = rows[index % rows.length];
    questions.push(
      makeQuestion(
        `A frequency table shows ${barTableText(rows)}. How many chose ${target.label}?`,
        String(target.value),
        [String(target.value + 1), String(Math.max(1, target.value - 1)), String(rows[(index + 1) % rows.length].value)],
        `Read the count for ${target.label} directly from the table.`,
        `3.8B-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const rows = labels.map((label, offset) => ({ label, value: ((index + offset) % 5) + 3 }));
    const left = rows[index % rows.length];
    const right = rows[(index + 2) % rows.length];
    const total = left.value + right.value;
    questions.push(
      makeQuestion(
        `A bar graph shows ${barTableText(rows)}. How many chose ${left.label} or ${right.label} altogether?`,
        String(total),
        [String(left.value), String(right.value), String(total + 2)],
        `Add the two categories: ${left.value} + ${right.value} = ${total}.`,
        `3.8B-b-${index}`
      )
    );
  }
  return questions;
}

function build39A() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const [job, skill] = pick(JOBS, index);
    questions.push(
      makeQuestion(
        `How are ${skill} connected to income for a ${job}?`,
        "Better skills can help a worker earn income",
        ["Skills stop a worker from earning income", "Income means the same thing as spending", "Skills are not related to work"],
        `Human capital includes skills and knowledge that help people earn income.`,
        `3.9A-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const [job, skill] = pick(JOBS, index, 3);
    questions.push(
      makeQuestion(
        `Which choice is an example of human capital for a ${job}?`,
        skill,
        ["a broken tool", "a store receipt", "a toy shelf"],
        `Human capital is a person's knowledge, skills, and training.`,
        `3.9A-b-${index}`
      )
    );
  }
  return questions;
}

function build39B() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const resource = pick(RESOURCES, index);
    questions.push(
      makeQuestion(
        `If ${resource} become scarce, what usually happens to the cost?`,
        "The cost usually goes up",
        ["The cost always becomes zero", "The cost usually goes down", "The cost stays the same every time"],
        `When something is scarce, there is less of it available, so the cost often increases.`,
        `3.9B-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const resource = pick(RESOURCES, index, 4);
    questions.push(
      makeQuestion(
        `Which situation shows scarcity affecting cost for ${resource}?`,
        "There are fewer available, so buyers may have to pay more",
        ["There are plenty available, so everyone pays more anyway", "There are fewer available, so the item is free", "Scarcity means the item is not useful"],
        `Scarcity means not enough of a resource is available, which can raise cost.`,
        `3.9B-b-${index}`
      )
    );
  }
  return questions;
}

function build39C() {
  const questions = [];
  const plannedScenarios = [
    ["saving allowance for a bike", "planned spending decision"],
    ["making a shopping list before going to the store", "planned spending decision"],
    ["comparing prices before buying shoes", "planned spending decision"],
    ["setting aside money for a class trip", "planned spending decision"],
    ["waiting to buy a game until enough money is saved", "planned spending decision"]
  ];
  const unplannedScenarios = [
    ["buying candy at the checkout line without planning", "unplanned spending decision"],
    ["spending all your money on a toy you just saw", "unplanned spending decision"],
    ["ordering an extra snack because it looked good", "unplanned spending decision"],
    ["buying stickers on impulse at the store", "unplanned spending decision"],
    ["using allowance right away on a surprise sale item", "unplanned spending decision"]
  ];

  for (let index = 0; index < 25; index += 1) {
    const [scenario, label] = index % 2 === 0 ? pick(plannedScenarios, index) : pick(unplannedScenarios, index);
    questions.push(
      makeQuestion(
        `Which type of spending decision is this: ${scenario}?`,
        label,
        [label === "planned spending decision" ? "unplanned spending decision" : "planned spending decision", "charitable giving", "credit use"],
        `A planned decision is thought out ahead of time. An unplanned decision happens without a plan.`,
        `3.9C-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const item = pick(["school backpack", "birthday gift", "pair of shoes", "new bike helmet", "board game"], index);
    questions.push(
      makeQuestion(
        `What is one benefit of planning before buying a ${item}?`,
        "You can compare choices and decide if it fits your budget",
        ["You will always get the item for free", "You never have to think about cost", "Planning means you must spend all your money"],
        `Planning helps a buyer compare options, think about needs, and stay within a budget.`,
        `3.9C-b-${index}`
      )
    );
  }
  return questions;
}

function build39D() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    questions.push(
      makeQuestion(
        "When is credit used?",
        "When wants or needs are more than the money a person has right now",
        ["Only when a person has extra money to spend", "Only when buying something that is free", "Whenever a person wants to avoid saving money forever"],
        `Credit is used when a person borrows money to pay for wants or needs now.`,
        `3.9D-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    questions.push(
      makeQuestion(
        "What is the borrower's responsibility when using credit?",
        "Pay back the lender, usually with interest",
        ["Keep the money without paying it back", "Pay back only if the item breaks", "Let the lender pay the bill"],
        `Borrowers must repay the lender and may also pay interest.`,
        `3.9D-b-${index}`
      )
    );
  }
  return questions;
}

function build39E() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    questions.push(
      makeQuestion(
        "Which is a good reason to save money?",
        "To be ready for future goals and needs",
        ["To make sure money is never used", "To avoid planning for anything", "To spend more than you earn every week"],
        `Saving helps people prepare for future goals, emergencies, and larger purchases.`,
        `3.9E-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const savePerWeek = (index % 8) + 2;
    const weeks = ((index + 1) % 6) + 3;
    const total = savePerWeek * weeks;
    questions.push(
      makeQuestion(
        `A student saves $${savePerWeek} each week for ${weeks} weeks. How much will the student save?`,
        `$${total}`,
        [`$${total + savePerWeek}`, `$${weeks}`, `$${total - savePerWeek}`],
        `Multiply the amount saved each week by the number of weeks.`,
        `3.9E-b-${index}`
      )
    );
  }
  return questions;
}

function build39F() {
  const questions = [];
  const classificationPrompts = [
    ["earning money for doing yard work", "income"],
    ["buying lunch at school", "spending"],
    ["putting money into a jar for later", "saving"],
    ["borrowing money to buy something now", "credit"],
    ["donating canned food to a shelter", "charitable giving"]
  ];

  for (let index = 0; index < 25; index += 1) {
    const [scenario, category] = pick(classificationPrompts, index);
    questions.push(
      makeQuestion(
        `Which financial idea matches this situation: ${scenario}?`,
        category,
        uniqueStrings(
          classificationPrompts
            .map((entry) => entry[1])
            .filter((entry) => entry !== category)
            .slice(0, 3)
        ),
        `${scenario} is an example of ${category}.`,
        `3.9F-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const category = pick(["income", "spending", "saving", "credit", "charitable giving"], index);
    const correct =
      category === "income"
        ? "Money a person earns"
        : category === "spending"
          ? "Money used to buy goods or services"
          : category === "saving"
            ? "Money set aside for later"
            : category === "credit"
              ? "Using borrowed money that must be repaid"
              : "Giving money, goods, or time to help others";
    questions.push(
      makeQuestion(
        `Which description matches ${category}?`,
        correct,
        [
          "Money that disappears and never has to be tracked",
          "Only something adults can do",
          "A way to avoid making financial decisions"
        ],
        `${category} has a specific role in managing money and resources.`,
        `3.9F-b-${index}`
      )
    );
  }
  return questions;
}

function makeQuiz(id, label, teksCode, description, questions) {
  if (GENERATED_IDS.has(id)) {
    throw new Error(`Duplicate generated id: ${id}`);
  }
  GENERATED_IDS.add(id);
  assertQuestionCount(teksCode, questions);
  return {
    id,
    label,
    uploadedBy: GENERATED_BY,
    uploadedAt: NOW,
    description,
    coverImage: "",
    visibility: "public",
    creationMethod: "manual",
    category: CATEGORY,
    tags: ["texas", "teks", "staar", "grade 3", "math", teksCode.toLowerCase()],
    questions
  };
}

const QUIZ_BUILDERS = [
  ["3.1A", "Math Grade 3 3.1A", "Apply mathematics to problems arising in everyday life, society, and the workplace.", build31A],
  ["3.1B", "Math Grade 3 3.1B", "Use a problem-solving model that includes analyzing, planning, solving, justifying, and evaluating.", build31B],
  ["3.1C", "Math Grade 3 3.1C", "Select appropriate tools and techniques, including mental math, estimation, and number sense.", build31C],
  ["3.1D", "Math Grade 3 3.1D", "Communicate mathematical ideas and reasoning using multiple representations.", build31D],
  ["3.1E", "Math Grade 3 3.1E", "Create and use representations to organize, record, and communicate mathematical ideas.", build31E],
  ["3.1F", "Math Grade 3 3.1F", "Analyze mathematical relationships to connect and communicate mathematical ideas.", build31F],
  ["3.1G", "Math Grade 3 3.1G", "Display, explain, and justify mathematical ideas using precise mathematical language.", build31G],
  ["3.2A", "Math Grade 3 3.2A", "Compose and decompose whole numbers through 100,000.", build32A],
  ["3.2B", "Math Grade 3 3.2B", "Describe place-value relationships in the base-10 system.", build32B],
  ["3.2C", "Math Grade 3 3.2C", "Round whole numbers by locating them between consecutive multiples.", build32C],
  ["3.2D", "Math Grade 3 3.2D", "Compare and order whole numbers through 100,000.", build32D],
  ["3.3A", "Math Grade 3 3.3A", "Represent fractions with denominators 2, 3, 4, 6, and 8.", build33A],
  ["3.3B", "Math Grade 3 3.3B", "Name fractions shown at points on number lines.", build33B],
  ["3.3C", "Math Grade 3 3.3C", "Explain unit fractions as one part of equal parts.", build33C],
  ["3.3D", "Math Grade 3 3.3D", "Compose and decompose fractions as sums of unit fractions.", build33D],
  ["3.3E", "Math Grade 3 3.3E", "Solve equal-sharing problems with fraction models.", build33E],
  ["3.3F", "Math Grade 3 3.3F", "Represent equivalent fractions with models and number lines.", build33F],
  ["3.3G", "Math Grade 3 3.3G", "Explain why equivalent fractions represent the same amount.", build33G],
  ["3.3H", "Math Grade 3 3.3H", "Compare fractions with the same numerator or denominator.", build33H],
  ["3.4A", "Math Grade 3 3.4A", "Solve one- and two-step addition and subtraction problems through 1,000.", build34A],
  ["3.4B", "Math Grade 3 3.4B", "Estimate addition and subtraction using rounding or compatible numbers.", build34B],
  ["3.4C", "Math Grade 3 3.4C", "Determine the value of collections of coins and bills.", build34C],
  ["3.4D", "Math Grade 3 3.4D", "Find totals in equal groups and arrays.", build34D],
  ["3.4E", "Math Grade 3 3.4E", "Represent multiplication facts in multiple ways.", build34E],
  ["3.4F", "Math Grade 3 3.4F", "Recall multiplication facts and related division facts.", build34F],
  ["3.4G", "Math Grade 3 3.4G", "Multiply a two-digit number by a one-digit number.", build34G],
  ["3.4H", "Math Grade 3 3.4H", "Find the number in each group when sharing equally.", build34H],
  ["3.4I", "Math Grade 3 3.4I", "Determine whether numbers are even or odd.", build34I],
  ["3.4J", "Math Grade 3 3.4J", "Find quotients using the relationship between multiplication and division.", build34J],
  ["3.4K", "Math Grade 3 3.4K", "Solve one- and two-step multiplication and division problems.", build34K],
  ["3.5A", "Math Grade 3 3.5A", "Represent addition and subtraction problems with equations.", build35A],
  ["3.5B", "Math Grade 3 3.5B", "Represent and solve multiplication and division problems.", build35B],
  ["3.5C", "Math Grade 3 3.5C", "Describe multiplication as a comparison.", build35C],
  ["3.5D", "Math Grade 3 3.5D", "Find the unknown number in multiplication and division equations.", build35D],
  ["3.5E", "Math Grade 3 3.5E", "Represent relationships using number pairs in tables.", build35E],
  ["3.6A", "Math Grade 3 3.6A", "Classify and sort two- and three-dimensional figures.", build36A],
  ["3.6B", "Math Grade 3 3.6B", "Recognize quadrilaterals and their subcategories.", build36B],
  ["3.6C", "Math Grade 3 3.6C", "Determine the area of rectangles.", build36C],
  ["3.6D", "Math Grade 3 3.6D", "Decompose composite figures to find area.", build36D],
  ["3.6E", "Math Grade 3 3.6E", "Express equal-area parts as unit fractions.", build36E],
  ["3.7A", "Math Grade 3 3.7A", "Represent halves, fourths, and eighths on number lines.", build37A],
  ["3.7B", "Math Grade 3 3.7B", "Determine perimeter and missing side lengths.", build37B],
  ["3.7C", "Math Grade 3 3.7C", "Solve problems with elapsed time in minutes.", build37C],
  ["3.7D", "Math Grade 3 3.7D", "Choose whether to measure capacity or weight.", build37D],
  ["3.7E", "Math Grade 3 3.7E", "Measure liquid volume and weight with appropriate tools and units.", build37E],
  ["3.8A", "Math Grade 3 3.8A", "Summarize categorical data with tables and graphs.", build38A],
  ["3.8B", "Math Grade 3 3.8B", "Solve problems using categorical data.", build38B],
  ["3.9A", "Math Grade 3 3.9A", "Explain the connection between human capital, labor, and income.", build39A],
  ["3.9B", "Math Grade 3 3.9B", "Describe how scarcity of resources affects cost.", build39B],
  ["3.9C", "Math Grade 3 3.9C", "Identify the costs and benefits of planned and unplanned spending decisions. Included by request beyond the assessed-only list.", build39C],
  ["3.9D", "Math Grade 3 3.9D", "Explain how credit works and the borrower's responsibility.", build39D],
  ["3.9E", "Math Grade 3 3.9E", "List reasons to save and explain the benefit of a savings plan.", build39E],
  ["3.9F", "Math Grade 3 3.9F", "Identify decisions involving income, spending, saving, credit, and charitable giving. Included by request beyond the original 3.9E cutoff.", build39F]
];

function generateQuizzes() {
  return QUIZ_BUILDERS.map(([teksCode, label, summary, builder]) =>
    makeQuiz(
      `tx_grade3_math_${teksCode.toLowerCase().replace(".", "_")}`,
      label,
      teksCode,
      `${teksCode}: ${summary} Sources: ${ASSESSED_CURRICULUM_URL} and ${BLUEPRINT_URL}`,
      builder()
    )
  );
}

function loadExistingPayload() {
  if (!fs.existsSync(OUTPUT_FILE)) {
    return { schemaVersion: 1, quizzes: [] };
  }
  const raw = fs.readFileSync(OUTPUT_FILE, "utf8").trim();
  if (!raw) {
    return { schemaVersion: 1, quizzes: [] };
  }
  const parsed = JSON.parse(raw);
  return { schemaVersion: 1, quizzes: Array.isArray(parsed.quizzes) ? parsed.quizzes : [] };
}

function main() {
  const generatedQuizzes = generateQuizzes();
  const generatedIds = new Set(generatedQuizzes.map((quiz) => quiz.id));
  const existing = loadExistingPayload();
  const preserved = existing.quizzes.filter((quiz) => !generatedIds.has(String(quiz && quiz.id ? quiz.id : "")));
  const nextPayload = { schemaVersion: 1, savedAt: NOW, quizzes: [...generatedQuizzes, ...preserved] };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(nextPayload, null, 2)}\n`, "utf8");

  const totalQuestions = generatedQuizzes.reduce((sum, quiz) => sum + (Array.isArray(quiz.questions) ? quiz.questions.length : 0), 0);
  console.log(`Wrote ${generatedQuizzes.length} Texas Grade 3 math TEKS sets and ${totalQuestions} questions to ${OUTPUT_FILE}`);
}

main();
