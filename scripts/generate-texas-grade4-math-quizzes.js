const fs = require("fs");
const path = require("path");

const CUSTOM_QUIZZES_FILE = path.join(__dirname, "..", "data", "custom-quizzes.json");
const IMPLEMENTATION_FILE = path.join(__dirname, "..", "data", "grade4-math-staar-implementation.json");
const NOW = new Date().toISOString();
const GENERATED_BY = "Local Curriculum";
const CATEGORY = "Texas Grade 4 Math";
const LOCAL_PDF = "C:/Users/Casa-Desktop/Downloads/4thmath.pdf";
const ASSESSED_CURRICULUM_URL = "https://tea.texas.gov/student-assessment/staar/staar-4-math-assessed-curriculum.pdf";
const BLUEPRINT_URL = "https://tea.texas.gov/student-assessment/staar/staar-4-math-blueprint.pdf";
const GENERATED_IDS = new Set();

const NAMES = ["Ava", "Liam", "Mia", "Noah", "Sofia", "Ethan", "Isla", "Lucas", "Zoe", "Mateo", "Ella", "Levi"];
const ITEMS = ["books", "stickers", "cards", "crayons", "markers", "tickets", "shells", "beads", "erasers", "coins"];
const OBJECTS = ["boxes", "bags", "trays", "rows", "shelves", "tables", "packs", "crates"];
const WHOLES = ["pizza", "pan", "tray", "strip", "cake", "brownie", "garden plot", "paper strip"];
const MEASURE_OBJECTS = ["rope", "board", "ribbon", "table", "book", "jar", "bucket", "melon"];
const PROCESSES = [
  ["4.1A", "Math Grade 4 4.1A", "Apply mathematics to problems arising in everyday life, society, and the workplace."],
  ["4.1B", "Math Grade 4 4.1B", "Use a problem-solving model that incorporates analyzing information, planning, solving, justifying, and evaluating reasonableness."],
  ["4.1C", "Math Grade 4 4.1C", "Select appropriate tools and techniques, including mental math, estimation, and number sense, to solve problems."],
  ["4.1D", "Math Grade 4 4.1D", "Communicate mathematical ideas and reasoning using multiple representations."],
  ["4.1E", "Math Grade 4 4.1E", "Create and use representations to organize, record, and communicate mathematical ideas."],
  ["4.1F", "Math Grade 4 4.1F", "Analyze mathematical relationships to connect and communicate mathematical ideas."],
  ["4.1G", "Math Grade 4 4.1G", "Display, explain, and justify mathematical ideas using precise mathematical language."]
];

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

function formatMoney(value) {
  return `$${Number(value).toFixed(2)}`;
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

function simplifyFraction(numerator, denominator) {
  const factor = gcd(numerator, denominator);
  return fraction(numerator / factor, denominator / factor);
}

function parseFraction(text) {
  const [left, right] = String(text).split("/").map((piece) => Number(piece));
  return [left, right];
}

function decimalText(value) {
  return Number(value).toFixed(value % 1 === 0 ? 1 : 2);
}

function paddedExpandedWhole(number) {
  const raw = String(Math.floor(number)).padStart(10, "0").split("").map((digit) => Number(digit));
  const labels = ["billions", "hundred millions", "ten millions", "millions", "hundred thousands", "ten thousands", "thousands", "hundreds", "tens", "ones"];
  return raw.map((digit, index) => `${digit} ${labels[index]}`).join(" + ");
}

function expandedDecimal(number) {
  const [whole, decimal] = Number(number).toFixed(2).split(".");
  return `${Number(whole)} + ${Number(decimal[0])}/10 + ${Number(decimal[1])}/100`;
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
    const [left, right] = parseFraction(correctText);
    choices.push(fraction(Math.max(1, left - 1), right));
    choices.push(fraction(left + 1, right));
    choices.push(fraction(left, right + 1));
  }
  if (/^\d+(\.\d+)?$/.test(correctText)) {
    const amount = Number(correctText);
    choices.push(decimalText(amount + 0.1));
    choices.push(decimalText(Math.max(0, amount - 0.1)));
    choices.push(decimalText(amount + 1));
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

function buildProcessApply(code) {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const name = pick(NAMES, index);
    const item = pick(ITEMS, index);
    questions.push(
      makeQuestion(
        `Which situation best shows ${name} applying mathematics to an everyday problem?`,
        `Comparing prices to decide which ${item} costs less`,
        [`Picking a favorite color for ${item}`, `Choosing the ${item} that looks nicest`, `Guessing which ${item} is best without using numbers`],
        `Applying mathematics means using numbers or measurements to solve a real problem.`,
        `${code}-a-${index}`
      )
    );
  }
  for (let index = 0; index < 25; index += 1) {
    const count = (index % 10) + 15;
    const item = pick(ITEMS, index, 3);
    questions.push(
      makeQuestion(
        `A class needs enough ${item} for ${count} students. Which action shows using mathematics?`,
        `Use numbers to figure out how many ${item} are needed`,
        [`Guess and hope there are enough ${item}`, `Choose the most colorful ${item}`, `Wait and see what happens`],
        `Mathematics helps solve classroom and workplace problems by finding exact or reasonable amounts.`,
        `${code}-b-${index}`
      )
    );
  }
  return questions;
}

function buildProcessModel(code) {
  const steps = [
    "analyze the given information",
    "formulate a plan or strategy",
    "determine a solution",
    "justify the solution",
    "evaluate the problem-solving process and the reasonableness of the solution"
  ];
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const stage = index % 4;
    questions.push(
      makeQuestion(
        `A student has just completed this step: ${steps[stage]}. What should happen next in the problem-solving model?`,
        steps[stage + 1],
        uniqueStrings(steps.filter((step) => step !== steps[stage + 1]).slice(0, 3)),
        `The model moves from analyze, to plan, to solve, to justify, to evaluate.`,
        `${code}-a-${index}`
      )
    );
  }
  for (let index = 0; index < 25; index += 1) {
    const prompt = index % 2 === 0 ? "Why should a student check whether an answer is reasonable?" : "Why should a student justify a solution?";
    const correct = index % 2 === 0 ? "To see if the answer makes sense for the problem" : "To explain why the strategy and answer are correct";
    questions.push(
      makeQuestion(
        prompt,
        correct,
        ["To skip writing any work", "To make numbers larger", "To avoid planning"],
        `Good problem solving includes explaining and checking the answer, not just writing a number.`,
        `${code}-b-${index}`
      )
    );
  }
  return questions;
}

function buildProcessTools(code) {
  const questions = [];
  const toolCases = [
    ["measure the length of a desk", "ruler", ["measuring cup", "clock", "calculator"]],
    ["show place value of a large number", "base-ten blocks", ["thermometer", "clock", "ruler"]],
    ["find liquid volume", "measuring cup", ["ruler", "compass", "number line"]],
    ["read elapsed time", "clock", ["measuring cup", "protractor", "ruler"]],
    ["estimate a sum quickly", "mental math", ["weighing", "measuring volume", "sorting shapes"]]
  ];
  for (let index = 0; index < 25; index += 1) {
    const [task, correct, wrongs] = pick(toolCases, index);
    questions.push(makeQuestion(`Which tool or technique is most appropriate to ${task}?`, correct, wrongs, `Students should choose tools and techniques that fit the problem.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const prompt = pick([
      ["about how many chairs are needed", "estimation"],
      ["solving 50 - 20 in your head", "mental math"],
      ["counting 5, 10, 15, 20", "skip counting"],
      ["knowing 399 is about 400", "number sense"],
      ["solving 4 x 6 with counters", "manipulatives"]
    ], index);
    questions.push(makeQuestion(`Which technique or tool best matches this task: ${prompt[0]}?`, prompt[1], ["graphing", "guessing without thinking", "using an unrelated tool"], `Choose the tool or technique that best supports the math thinking required.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildProcessCommunicate(code) {
  const cases = [
    ["show 12 x 4", "an area model and an equation", ["a blank page", "a color name only", "a guess"]],
    ["compare survey results", "a bar graph and a sentence", ["just saying maybe", "an unlabeled doodle", "a blank table"]],
    ["explain 7/10", "a number line and words", ["a color choice", "an unlabeled picture", "a guess only"]],
    ["justify rounding 398 to 400", "a number line and an explanation", ["only saying because", "an unrelated clock", "a random list"]],
    ["show an input-output rule", "a table and an equation", ["a shape with no numbers", "a song title", "a blank chart"]]
  ];
  return Array.from({ length: 50 }, (_, index) => {
    const [task, correct, wrongs] = pick(cases, index);
    return makeQuestion(`Which choice best communicates a mathematical idea to ${task}?`, correct, wrongs, `Clear math communication often uses words, symbols, diagrams, tables, or graphs together.`, `${code}-${index}`);
  });
}

function buildProcessRepresent(code) {
  const cases = [
    ["organize class survey data", "frequency table", ["glue stick", "clock", "shoe box"]],
    ["show equal groups", "array", ["thermometer", "ruler", "calendar"]],
    ["show a fraction from 0 to 1", "number line", ["paint brush", "folder", "pencil pouch"]],
    ["compare category totals", "bar graph", ["eraser", "dice", "string"]],
    ["show how parts make a whole", "strip diagram", ["bookmark", "flashlight", "crayon box"]]
  ];
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const [task, correct, wrongs] = pick(cases, index);
    questions.push(makeQuestion(`Which representation should a student create to ${task}?`, correct, wrongs, `A good representation helps organize, record, and communicate mathematical ideas.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const purpose = pick(["organize work", "record data", "show thinking", "share a solution", "track results"], index);
    questions.push(makeQuestion(`Why do students create mathematical representations such as tables, diagrams, and number lines?`, `To ${purpose} clearly`, ["To avoid using numbers", "To make the problem confusing", "To replace reasoning with guessing"], `Representations help students organize, record, and communicate mathematical ideas.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildProcessRelationships(code) {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const factorA = (index % 9) + 2;
    const factorB = ((index + 3) % 9) + 2;
    const product = factorA * factorB;
    questions.push(makeQuestion(`Which fact is related to ${factorA} x ${factorB} = ${product}?`, `${product} / ${factorA} = ${factorB}`, [`${product} + ${factorA} = ${factorB}`, `${factorA} - ${factorB} = ${product}`, `${factorA} x ${product} = ${factorB}`], `Analyzing relationships helps connect multiplication and division ideas.`, `${code}-a-${index}`));
  }
  const cases = [
    ["the same point on a number line", "equivalent fractions", ["random numbers", "different wholes only", "a measuring error"]],
    ["numbers increasing by 10 each time", "a growing pattern", ["an unrelated graph", "a fraction sum", "a rounding mistake"]],
    ["moving a digit one place left in base ten", "the value becomes 10 times as great", ["the value halves", "the value stays the same", "the number becomes odd"]],
    ["rows and columns in a rectangle", "multiplication can represent the total", ["only subtraction can be used", "there is no pattern", "the area is always 0"]],
    ["the same data shown in a table and graph", "both can represent the same relationship", ["only one can ever be correct", "tables cannot show numbers", "graphs cannot compare data"]]
  ];
  for (let index = 0; index < 25; index += 1) {
    const [clue, correct, wrongs] = pick(cases, index);
    questions.push(makeQuestion(`What mathematical relationship is shown by ${clue}?`, correct, wrongs, `Analyzing relationships helps students connect one math idea to another.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildProcessLanguage(code) {
  const cases = [
    ["Which explanation uses precise mathematical language to compare 3/4 and 2/4?", "They have the same denominator, and 3 parts is greater than 2 parts", ["It is bigger because it feels bigger", "The 3 looks larger", "Fractions are always different"]],
    ["Which statement clearly justifies rounding 398 to 400?", "398 is between 390 and 400 and is closer to 400", ["398 looks large", "398 always rounds to 300", "All numbers round to 0"]],
    ["Which sentence uses precise mathematical language about perimeter?", "Perimeter is the distance around a figure", ["Perimeter is how big it feels", "Perimeter is any number", "Perimeter means color the shape"]],
    ["Which statement best explains an equivalent fraction?", "Two equivalent fractions represent the same amount of the same-size whole", ["Equivalent means the numerators match", "Equivalent means random", "Equivalent means odd denominators"]],
    ["Which explanation best justifies 5 x 4 = 20?", "Five groups of four make a total of twenty", ["It just is twenty", "I guessed", "Twenty is a favorite number"]]
  ];
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const [prompt, correct, wrongs] = pick(cases, index);
    questions.push(makeQuestion(prompt, correct, wrongs, `Precise mathematical language explains why an idea is correct.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const topic = pick(["area", "perimeter", "fraction", "product", "quotient"], index);
    questions.push(makeQuestion(`Why should a student use precise mathematical language when explaining a ${topic} solution?`, "So the reasoning is clear and can be understood by others", ["So no one can follow the explanation", "So the answer sounds longer but not clearer", "So numbers do not need to match the work"], `Precise language helps students display, explain, and justify mathematical ideas clearly.`, `${code}-b-${index}`));
  }
  return questions;
}

function build42A() {
  const questions = [];
  const places = [
    ["ones", "tens"], ["tens", "hundreds"], ["hundreds", "thousands"], ["thousands", "ten thousands"],
    ["tenths", "ones"], ["hundredths", "tenths"]
  ];
  for (let index = 0; index < 25; index += 1) {
    const [right, left] = pick(places, index);
    questions.push(makeQuestion(`Compared with the ${right} place, the value in the ${left} place is...`, "10 times as great", ["1/10 as great", "the same value", "100 times as great"], `Each place to the left in base ten is 10 times the value of the place to its right.`, `4.2A-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const [right, left] = pick(places, index, 2);
    questions.push(makeQuestion(`Compared with the ${left} place, the value in the ${right} place is...`, "one-tenth as great", ["10 times as great", "the same value", "100 times as great"], `Each place to the right in base ten is one-tenth the value of the place to its left.`, `4.2A-b-${index}`));
  }
  return questions;
}

function build42B() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const number = 123456789 + index * 2345671;
    const wrongA = String(number).replace(/^(\d)(\d)/, "$2$1");
    const wrongB = String(number).replace(/(\d)$/, "0");
    const wrongC = String(number).replace(/(\d{3})$/, "111");
    questions.push(makeQuestion(`Which expanded notation matches ${formatNumber(number)}?`, paddedExpandedWhole(number), [paddedExpandedWhole(Number(wrongA)), paddedExpandedWhole(Number(wrongB)), paddedExpandedWhole(Number(wrongC))], `${formatNumber(number)} can be written in expanded notation by place value.`, `4.2B-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const whole = (index % 7) + 4;
    const tenths = (index * 3) % 10;
    const hundredths = (index * 7) % 10;
    const number = Number(`${whole}.${tenths}${hundredths}`);
    questions.push(makeQuestion(`What decimal is represented by ${expandedDecimal(number)}?`, decimalText(number), [decimalText(number + 0.1), decimalText(Math.max(0, number - 0.1)), decimalText(whole + hundredths / 10 + tenths / 100)], `${expandedDecimal(number)} equals ${decimalText(number)}.`, `4.2B-b-${index}`));
  }
  return questions;
}

function build42C() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const left = 100000000 + index * 23456789;
    const right = left + (index % 2 === 0 ? 54321 : -67890);
    const symbol = left > right ? ">" : "<";
    questions.push(makeQuestion(`Which symbol makes this true? ${formatNumber(left)} __ ${formatNumber(right)}`, symbol, [symbol === ">" ? "<" : ">", "=", "<>"], `Compare whole numbers from the greatest place value to the least.`, `4.2C-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const values = [420000000 + index * 1000, 420000000 + index * 1000 + 300, 420000000 + index * 1000 + 700, 420000000 + index * 1000 + 50];
    const ascending = values.slice().sort((a, b) => a - b).map((value) => formatNumber(value)).join(", ");
    const wrongA = values.slice().sort((a, b) => b - a).map((value) => formatNumber(value)).join(", ");
    const wrongB = [values[0], values[2], values[1], values[3]].map((value) => formatNumber(value)).join(", ");
    const wrongC = [values[3], values[1], values[2], values[0]].map((value) => formatNumber(value)).join(", ");
    questions.push(makeQuestion(`Which list is in ascending order? ${values.map((value) => formatNumber(value)).join(", ")}`, ascending, [wrongA, wrongB, wrongC], `Use place value to order whole numbers from least to greatest.`, `4.2C-b-${index}`));
  }
  return questions;
}

function build42D() {
  const questions = [];
  const placeNames = [
    ["nearest ten", 10], ["nearest hundred", 100], ["nearest thousand", 1000], ["nearest ten thousand", 10000], ["nearest hundred thousand", 100000]
  ];
  for (let index = 0; index < 50; index += 1) {
    const [label, place] = pick(placeNames, index);
    const number = 345678 + index * 4311;
    const correct = Math.round(number / place) * place;
    questions.push(makeQuestion(`Round ${formatNumber(number)} to the ${label}.`, formatNumber(correct), [formatNumber(Math.floor(number / place) * place), formatNumber(correct + place), formatNumber(Math.max(0, correct - place))], `${formatNumber(number)} rounds to ${formatNumber(correct)} at the ${label}.`, `4.2D-${index}`));
  }
  return questions;
}

function build42E() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const cents = ((index % 9) + 1) * 10;
    questions.push(makeQuestion(`Which decimal matches ${cents} cents?`, decimalText(cents / 100), [decimalText(cents / 10), decimalText(cents / 1000), decimalText(cents / 100 + 0.1)], `${cents} cents is ${decimalText(cents / 100)} of a dollar.`, `4.2E-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const tenths = (index % 10);
    const hundredths = ((index * 3) % 10);
    const decimal = Number(`0.${tenths}${hundredths}`);
    questions.push(makeQuestion(`A model shows ${tenths} tenths and ${hundredths} hundredths shaded. What decimal does it represent?`, decimalText(decimal), [decimalText(Number(`0.${hundredths}${tenths}`)), decimalText(Math.min(0.99, decimal + 0.1)), decimalText(Math.max(0, decimal - 0.1))], `Tenths and hundredths combine to make ${decimalText(decimal)}.`, `4.2E-b-${index}`));
  }
  return questions;
}

function build42F() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const left = Number(`${(index % 7) + 1}.${index % 10}${(index * 3) % 10}`);
    const right = Number(`${(index % 7) + 1}.${(index * 5) % 10}${(index * 7) % 10}`);
    const correct = left > right ? ">" : left < right ? "<" : "=";
    questions.push(makeQuestion(`Which symbol makes this true? ${decimalText(left)} __ ${decimalText(right)}`, correct, [correct === ">" ? "<" : ">", "=", "<>"], `Compare decimals by comparing whole-number parts, tenths, then hundredths.`, `4.2F-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const values = [Number(`0.${index % 10}${(index * 2) % 10}`), Number(`0.${(index + 3) % 10}${(index * 5) % 10}`), Number(`0.${(index + 6) % 10}${(index * 7) % 10}`), Number(`0.${(index + 1) % 10}${(index * 9) % 10}`)];
    const correct = values.slice().sort((a, b) => a - b).map((value) => decimalText(value)).join(", ");
    const wrongA = values.slice().sort((a, b) => b - a).map((value) => decimalText(value)).join(", ");
    const wrongB = [values[0], values[2], values[1], values[3]].map((value) => decimalText(value)).join(", ");
    const wrongC = [values[3], values[1], values[0], values[2]].map((value) => decimalText(value)).join(", ");
    questions.push(makeQuestion(`Which list is in ascending order? ${values.map((value) => decimalText(value)).join(", ")}`, correct, [wrongA, wrongB, wrongC], `Order decimals by whole-number parts, tenths, and hundredths.`, `4.2F-b-${index}`));
  }
  return questions;
}

function fixedDecimal(value, digits = 2) {
  return Number(value).toFixed(digits);
}

function fractionValue(numerator, denominator) {
  return Number(numerator) / Number(denominator);
}

function unitFractionSum(numerator, denominator) {
  return Array.from({ length: numerator }, () => fraction(1, denominator)).join(" + ");
}

function compareFractions(leftNumerator, leftDenominator, rightNumerator, rightDenominator) {
  const left = leftNumerator * rightDenominator;
  const right = rightNumerator * leftDenominator;
  return left > right ? ">" : left < right ? "<" : "=";
}

function benchmarkFractionLabel(value) {
  const benchmarks = [
    [0, "0"],
    [0.25, "1/4"],
    [0.5, "1/2"],
    [0.75, "3/4"],
    [1, "1"]
  ];
  let bestLabel = benchmarks[0][1];
  let bestDistance = Math.abs(Number(value) - benchmarks[0][0]);
  for (const [benchmarkValue, label] of benchmarks.slice(1)) {
    const distance = Math.abs(Number(value) - benchmarkValue);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestLabel = label;
    }
  }
  return bestLabel;
}

function frequencyTableText(rows) {
  return rows.map(([label, count]) => `${label}: ${count}`).join("; ");
}

function dotPlotText(rows) {
  return rows.map(([label, count]) => `${label}|${"x".repeat(count)}`).join("; ");
}

function stemLeafText(stem, leaves) {
  return `${stem} | ${leaves.join(" ")}`;
}

function countLabels(labels) {
  const counts = new Map();
  for (const label of labels) {
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return Array.from(counts.entries());
}

function build42G() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const denominator = index % 2 === 0 ? 10 : 100;
    const numerator = denominator === 10 ? (index % 9) + 1 : ((index * 7) % 89) + 10;
    const decimal = denominator === 10 ? fixedDecimal(numerator / 10, 1) : fixedDecimal(numerator / 100);
    questions.push(
      makeQuestion(
        `Which fraction names the same value as ${decimal}?`,
        fraction(numerator, denominator),
        [
          fraction(numerator, denominator === 10 ? 100 : 10),
          fraction(Math.max(1, numerator - 1), denominator),
          fraction(Math.min(denominator, numerator + 1), denominator)
        ],
        `${decimal} is the same value as ${fraction(numerator, denominator)}.`,
        `4.2G-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const denominator = index % 2 === 0 ? 10 : 100;
    const numerator = denominator === 10 ? ((index + 3) % 9) + 1 : ((index * 9) % 88) + 11;
    const correct = denominator === 10 ? fixedDecimal(numerator / 10, 1) : fixedDecimal(numerator / 100);
    const swapped = denominator === 100 ? fixedDecimal(((numerator % 10) * 10 + Math.floor(numerator / 10)) / 100) : fixedDecimal(Math.min(0.9, numerator / 10 + 0.1), 1);
    questions.push(
      makeQuestion(
        `Which decimal names the same value as ${fraction(numerator, denominator)}?`,
        correct,
        [swapped, denominator === 10 ? fixedDecimal(numerator / 100) : fixedDecimal(Math.min(0.99, numerator / 100 + 0.1)), denominator === 10 ? fixedDecimal(Math.max(0, numerator / 10 - 0.1), 1) : fixedDecimal(Math.max(0, numerator / 100 - 0.01))],
        `${fraction(numerator, denominator)} is ${correct}.`,
        `4.2G-b-${index}`
      )
    );
  }
  return questions;
}

function build42H() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const tick = index % 10;
    const correct = fixedDecimal(tick / 10, 1);
    questions.push(
      makeQuestion(
        `A number line from 0 to 1 is divided into 10 equal parts. A point is at tick ${tick} after 0. Which decimal names the point?`,
        correct,
        [fixedDecimal(Math.min(1, (tick + 1) / 10), 1), fixedDecimal(Math.max(0, (tick - 1) / 10), 1), fixedDecimal(tick / 100)],
        `${tick} tenths from 0 is ${correct}.`,
        `4.2H-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const hundredths = ((index * 8) % 91) + 4;
    const correct = fixedDecimal(hundredths / 100);
    questions.push(
      makeQuestion(
        `A point on a number line is ${hundredths} hundredths from 0. Which decimal names the point?`,
        correct,
        [fixedDecimal(Math.min(0.99, hundredths / 100 + 0.01)), fixedDecimal(Math.max(0, hundredths / 100 - 0.01)), fixedDecimal(hundredths / 10)],
        `${hundredths} hundredths from 0 is ${correct}.`,
        `4.2H-b-${index}`
      )
    );
  }
  return questions;
}

function build43A() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const denominator = pick([3, 4, 5, 6, 8], index);
    const numerator = Math.min(denominator - 1, (index % (denominator - 1)) + 2);
    questions.push(
      makeQuestion(
        `Which sum of unit fractions is equal to ${fraction(numerator, denominator)}?`,
        unitFractionSum(numerator, denominator),
        [unitFractionSum(numerator - 1, denominator), unitFractionSum(numerator + 1, denominator), unitFractionSum(numerator, denominator + 1)],
        `${fraction(numerator, denominator)} is ${numerator} copies of ${fraction(1, denominator)}.`,
        `4.3A-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const denominator = pick([2, 3, 4, 5, 6], index, 2);
    const numerator = denominator + (index % 4) + 1;
    questions.push(
      makeQuestion(
        `Which sum of unit fractions is equal to ${fraction(numerator, denominator)}?`,
        unitFractionSum(numerator, denominator),
        [unitFractionSum(numerator - 1, denominator), unitFractionSum(numerator + 1, denominator), unitFractionSum(numerator, denominator + 1)],
        `${fraction(numerator, denominator)} can still be written as repeated unit fractions when the numerator is greater than the denominator.`,
        `4.3A-b-${index}`
      )
    );
  }
  return questions;
}

function build43B() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const denominator = pick([4, 5, 6, 8, 10], index);
    const numerator = (index % (denominator - 1)) + 2;
    const split = Math.max(1, Math.floor(numerator / 2));
    questions.push(
      makeQuestion(
        `Which equation correctly decomposes ${fraction(numerator, denominator)} into a sum of fractions with the same denominator?`,
        `${fraction(numerator, denominator)} = ${fraction(split, denominator)} + ${fraction(numerator - split, denominator)}`,
        [
          `${fraction(numerator, denominator)} = ${fraction(split, denominator)} + ${fraction(Math.max(1, numerator - split - 1), denominator)}`,
          `${fraction(numerator, denominator)} = ${fraction(split, denominator + 1)} + ${fraction(numerator - split, denominator + 1)}`,
          `${fraction(numerator, denominator)} = ${fraction(numerator + 1, denominator)} + ${fraction(1, denominator)}`
        ],
        `A valid decomposition keeps the same denominator and uses numerators that total the original numerator.`,
        `4.3B-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const denominator = pick([4, 6, 8, 10, 12], index, 1);
    const numerator = denominator - (index % 3) - 1;
    const first = 1;
    const second = Math.max(1, Math.floor((numerator - first) / 2));
    const third = numerator - first - second;
    questions.push(
      makeQuestion(
        `Which is another correct way to decompose ${fraction(numerator, denominator)}?`,
        `${fraction(numerator, denominator)} = ${fraction(first, denominator)} + ${fraction(second, denominator)} + ${fraction(third, denominator)}`,
        [
          `${fraction(numerator, denominator)} = ${fraction(first, denominator)} + ${fraction(second, denominator)} + ${fraction(Math.max(1, third - 1), denominator)}`,
          `${fraction(numerator, denominator)} = ${fraction(first, denominator + 1)} + ${fraction(second, denominator + 1)} + ${fraction(third, denominator + 1)}`,
          `${fraction(numerator, denominator)} = ${fraction(numerator, denominator)} + ${fraction(1, denominator)}`
        ],
        `A fraction can be decomposed into more than one sum when the parts use the same denominator.`,
        `4.3B-b-${index}`
      )
    );
  }
  return questions;
}

function build43C() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const denominator = pick([2, 3, 4, 5, 6, 8], index);
    const numerator = Math.min(denominator - 1, (index % (denominator - 1)) + 1);
    const scale = index % 2 === 0 ? 2 : 3;
    questions.push(
      makeQuestion(
        `Which fraction is equivalent to ${fraction(numerator, denominator)}?`,
        fraction(numerator * scale, denominator * scale),
        [
          fraction(numerator * scale, denominator),
          fraction(numerator, denominator * scale),
          fraction((numerator + 1) * scale, denominator * scale)
        ],
        `Equivalent fractions name the same amount when the numerator and denominator are multiplied by the same number.`,
        `4.3C-a-${index}`
      )
    );
  }

  const pairs = [
    [1, 2, 2, 4],
    [2, 3, 4, 6],
    [3, 4, 6, 8],
    [2, 5, 4, 10],
    [3, 5, 6, 10],
    [4, 6, 2, 3]
  ];
  for (let index = 0; index < 25; index += 1) {
    const [a, b, c, d] = pick(pairs, index);
    questions.push(
      makeQuestion(
        `Which pair shows equivalent fractions?`,
        `${fraction(a, b)} and ${fraction(c, d)}`,
        [`${fraction(a, b)} and ${fraction(a + 1, d)}`, `${fraction(a, b)} and ${fraction(c + 1, d)}`, `${fraction(a, b)} and ${fraction(a, d)}`],
        `${fraction(a, b)} and ${fraction(c, d)} name the same amount.`,
        `4.3C-b-${index}`
      )
    );
  }
  return questions;
}

function build43D() {
  const questions = [];
  const pairs = [
    [1, 2, 2, 3],
    [3, 4, 4, 5],
    [2, 5, 1, 3],
    [5, 8, 3, 4],
    [1, 4, 2, 5],
    [4, 6, 5, 8],
    [3, 10, 2, 5],
    [7, 8, 5, 6]
  ];

  for (let index = 0; index < 25; index += 1) {
    const [a, b, c, d] = pick(pairs, index);
    const symbol = compareFractions(a, b, c, d);
    questions.push(
      makeQuestion(
        `Which symbol makes this comparison true? ${fraction(a, b)} __ ${fraction(c, d)}`,
        symbol,
        [symbol === ">" ? "<" : ">", "=", "<>"],
        `Compare the fractions by reasoning about their values or by using common denominators.`,
        `4.3D-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const [a, b, c, d] = pick(pairs, index, 2);
    const correct = compareFractions(a, b, c, d) === ">" ? fraction(a, b) : fraction(c, d);
    questions.push(
      makeQuestion(
        `Which fraction is greater: ${fraction(a, b)} or ${fraction(c, d)}?`,
        correct,
        [correct === fraction(a, b) ? fraction(c, d) : fraction(a, b), "They are equal", "There is not enough information"],
        `Compare the two fractions to decide which one names the greater amount.`,
        `4.3D-b-${index}`
      )
    );
  }
  return questions;
}

function build43E() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const denominator = pick([4, 5, 6, 8, 10], index);
    const first = (index % (denominator - 1)) + 1;
    const second = ((index + 2) % (denominator - 1)) + 1;
    const sum = first + second;
    questions.push(
      makeQuestion(
        `What is ${fraction(first, denominator)} + ${fraction(second, denominator)}?`,
        fraction(sum, denominator),
        [fraction(sum + 1, denominator), fraction(Math.max(1, sum - 1), denominator), fraction(sum, denominator + 1)],
        `When fractions have the same denominator, add the numerators and keep the denominator.`,
        `4.3E-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const denominator = pick([4, 5, 6, 8, 10], index, 1);
    const subtrahend = (index % (denominator - 2)) + 1;
    const minuend = subtrahend + (index % 3) + 1;
    questions.push(
      makeQuestion(
        `What is ${fraction(minuend, denominator)} - ${fraction(subtrahend, denominator)}?`,
        fraction(minuend - subtrahend, denominator),
        [fraction(minuend + subtrahend, denominator), fraction(subtrahend, denominator), fraction(minuend - subtrahend, denominator + 1)],
        `When fractions have the same denominator, subtract the numerators and keep the denominator.`,
        `4.3E-b-${index}`
      )
    );
  }
  return questions;
}

function build43F() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const denominator = 8;
    const first = (index % 6) + 1;
    const second = ((index + 3) % 6) + 1;
    const total = Math.min(8, first + second);
    const correct = benchmarkFractionLabel(total / denominator);
    questions.push(
      makeQuestion(
        `Without finding the exact answer, which benchmark fraction is ${fraction(first, denominator)} + ${fraction(second, denominator)} closest to?`,
        correct,
        uniqueStrings(["0", "1/4", "1/2", "3/4", "1"].filter((label) => label !== correct).slice(0, 3)),
        `Benchmark fractions such as 0, 1/4, 1/2, 3/4, and 1 help estimate whether a sum is reasonable.`,
        `4.3F-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const denominator = 8;
    const minuend = ((index + 4) % 7) + 1;
    const subtrahend = index % Math.max(1, minuend);
    const difference = minuend - subtrahend;
    const correct = benchmarkFractionLabel(difference / denominator);
    questions.push(
      makeQuestion(
        `Without finding the exact answer, which benchmark fraction is ${fraction(minuend, denominator)} - ${fraction(subtrahend, denominator)} closest to?`,
        correct,
        uniqueStrings(["0", "1/4", "1/2", "3/4", "1"].filter((label) => label !== correct).slice(0, 3)),
        `Benchmark fractions help estimate whether a difference is reasonable.`,
        `4.3F-b-${index}`
      )
    );
  }
  return questions;
}

function build43G() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const numerator = (index % 9) + 1;
    questions.push(
      makeQuestion(
        `Which fraction names a point that is ${numerator} tenths from 0 on a number line?`,
        fraction(numerator, 10),
        [fraction(numerator, 100), fraction(Math.max(1, numerator - 1), 10), fixedDecimal(numerator / 10, 1)],
        `${numerator} tenths from 0 is ${fraction(numerator, 10)}.`,
        `4.3G-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const hundredths = ((index * 9) % 91) + 4;
    const correct = fixedDecimal(hundredths / 100);
    questions.push(
      makeQuestion(
        `Which decimal names a point that is ${fraction(hundredths, 100)} unit from 0 on a number line?`,
        correct,
        [fixedDecimal(Math.min(0.99, hundredths / 100 + 0.01)), fixedDecimal(Math.max(0, hundredths / 100 - 0.01)), fraction(hundredths, 100)],
        `${fraction(hundredths, 100)} and ${correct} name the same distance from zero.`,
        `4.3G-b-${index}`
      )
    );
  }
  return questions;
}

function build44A() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const left = 24876 + index * 319;
    const right = 1350 + index * 47;
    if (index % 2 === 0) {
      const answer = left + right;
      questions.push(makeQuestion(`Find ${formatNumber(left)} + ${formatNumber(right)}.`, formatNumber(answer), [formatNumber(answer + 10), formatNumber(answer - 10), formatNumber(left - right)], `Use the standard algorithm to add by place value.`, `4.4A-a-${index}`));
    } else {
      const answer = left - right;
      questions.push(makeQuestion(`Find ${formatNumber(left)} - ${formatNumber(right)}.`, formatNumber(answer), [formatNumber(answer + 10), formatNumber(answer - 10), formatNumber(left + right)], `Use the standard algorithm to subtract by place value.`, `4.4A-a-${index}`));
    }
  }

  for (let index = 0; index < 25; index += 1) {
    const left = Number(`${(index % 7) + 4}.${(index * 3) % 10}${(index * 7) % 10}`);
    const right = Number(`${(index % 5) + 1}.${(index * 5) % 10}${(index * 2) % 10}`);
    if (index % 2 === 0) {
      const answer = left + right;
      questions.push(makeQuestion(`Find ${fixedDecimal(left)} + ${fixedDecimal(right)}.`, fixedDecimal(answer), [fixedDecimal(answer + 0.1), fixedDecimal(Math.max(0, answer - 0.1)), fixedDecimal(Math.abs(left - right))], `Line up the decimal points and add to the hundredths place.`, `4.4A-b-${index}`));
    } else {
      const bigger = Math.max(left, right);
      const smaller = Math.min(left, right);
      const answer = bigger - smaller;
      questions.push(makeQuestion(`Find ${fixedDecimal(bigger)} - ${fixedDecimal(smaller)}.`, fixedDecimal(answer), [fixedDecimal(answer + 0.1), fixedDecimal(Math.max(0, answer - 0.1)), fixedDecimal(bigger + smaller)], `Line up the decimal points and subtract to the hundredths place.`, `4.4A-b-${index}`));
    }
  }
  return questions;
}

function build44B() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const number = 13 + index * 3;
    const product = number * 10;
    questions.push(makeQuestion(`What is ${number} x 10?`, formatNumber(product), [formatNumber(product + 10), formatNumber(product - 10), formatNumber(number + 10)], `Multiplying by 10 makes each digit 10 times the value it had before.`, `4.4B-a-${index}`));
  }

  for (let index = 0; index < 25; index += 1) {
    const number = 17 + index * 4;
    const product = number * 100;
    questions.push(makeQuestion(`What is ${number} x 100?`, formatNumber(product), [formatNumber(product + 100), formatNumber(product - 100), formatNumber(number * 10)], `Multiplying by 100 makes each digit 100 times the value it had before.`, `4.4B-b-${index}`));
  }
  return questions;
}

function build44C() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const rows = (index % 6) + 10;
    const columns = ((index + 2) % 6) + 10;
    const product = rows * columns;
    questions.push(
      makeQuestion(
        `A rectangular array has ${rows} rows and ${columns} columns. What product does the array represent?`,
        formatNumber(product),
        [formatNumber(rows + columns), formatNumber(product + 10), formatNumber(product - 10)],
        `Rows times columns gives the product shown by the array.`,
        `4.4C-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const left = (index % 6) + 10;
    const right = index % 2 === 0 ? left : ((index + 3) % 6) + 10;
    const product = left * right;
    questions.push(
      makeQuestion(
        `An area model represents ${left} x ${right}. What is the product?`,
        formatNumber(product),
        [formatNumber(product + 10), formatNumber(product - 10), formatNumber(left + right)],
        `Add the partial products in the area model to find the total product.`,
        `4.4C-b-${index}`
      )
    );
  }
  return questions;
}

function build44D() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const left = 1200 + index * 137;
    const right = (index % 7) + 2;
    const product = left * right;
    questions.push(makeQuestion(`Find ${formatNumber(left)} x ${right}.`, formatNumber(product), [formatNumber(product + right), formatNumber(product - right), formatNumber(left + right)], `Use place value strategies or the standard algorithm to find the product.`, `4.4D-a-${index}`));
  }

  for (let index = 0; index < 25; index += 1) {
    const left = (index % 8) + 12;
    const right = ((index + 3) % 8) + 12;
    const product = left * right;
    questions.push(makeQuestion(`Find ${left} x ${right}.`, formatNumber(product), [formatNumber(product + 10), formatNumber(product - 10), formatNumber(left + right)], `Multiply the two-digit numbers using an efficient strategy or algorithm.`, `4.4D-b-${index}`));
  }
  return questions;
}

function build44E() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const divisor = (index % 7) + 2;
    const quotient = ((index + 4) % 12) + 24;
    const dividend = divisor * quotient;
    questions.push(
      makeQuestion(
        `Which multiplication equation represents ${formatNumber(dividend)} / ${divisor}?`,
        `${divisor} x ${quotient} = ${formatNumber(dividend)}`,
        [`${quotient} x ${quotient} = ${formatNumber(dividend)}`, `${divisor} x ${quotient + 1} = ${formatNumber(dividend)}`, `${formatNumber(dividend)} + ${divisor} = ${quotient}`],
        `A quotient can be represented by a related multiplication equation.`,
        `4.4E-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const width = (index % 8) + 3;
    const length = ((index + 5) % 12) + 20;
    const area = width * length;
    questions.push(
      makeQuestion(
        `A rectangle has area ${formatNumber(area)} square units and one side length ${width} units. What missing side length does ${formatNumber(area)} / ${width} represent?`,
        `${length} units`,
        [`${width} units`, `${length + 1} units`, `${Math.max(1, length - 1)} units`],
        `The missing side length is the quotient when the area is divided by the known side length.`,
        `4.4E-b-${index}`
      )
    );
  }
  return questions;
}

function build44F() {
  const questions = [];
  for (let index = 0; index < 50; index += 1) {
    const divisor = (index % 8) + 2;
    const quotient = ((index * 3) % 40) + 15;
    const dividend = divisor * quotient;
    questions.push(
      makeQuestion(
        `Find ${formatNumber(dividend)} / ${divisor}.`,
        formatNumber(quotient),
        [formatNumber(quotient + 1), formatNumber(Math.max(1, quotient - 1)), formatNumber(divisor + quotient)],
        `Divide using place value strategies or the standard algorithm.`,
        `4.4F-${index}`
      )
    );
  }
  return questions;
}

function build44G() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const left = 3240 + index * 118;
    const right = 1650 + index * 93;
    const rounded = Math.round(left / 100) * 100 + Math.round(right / 100) * 100;
    questions.push(
      makeQuestion(
        `Which is the best estimate for ${formatNumber(left)} + ${formatNumber(right)} by rounding to the nearest hundred?`,
        formatNumber(rounded),
        [formatNumber(rounded + 100), formatNumber(Math.max(0, rounded - 100)), formatNumber(left + right)],
        `Round each addend to a nearby hundred to estimate the sum.`,
        `4.4G-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    if (index % 2 === 0) {
      const left = 48 + (index % 6) * 10;
      const right = 19 + (index % 5) * 10;
      const estimate = Math.round(left / 10) * 10 * (Math.round(right / 10) * 10);
      questions.push(
        makeQuestion(
          `Which is the best estimate for ${left} x ${right} using compatible numbers?`,
          formatNumber(estimate),
          [formatNumber(estimate + 100), formatNumber(Math.max(0, estimate - 100)), formatNumber(left * right)],
          `Compatible numbers are close, easy-to-use numbers that help estimate products.`,
          `4.4G-b-${index}`
        )
      );
    } else {
      const divisor = pick([4, 5, 6, 8, 9], index);
      const compatibleDividend = divisor * (((index + 3) % 7) * 10 + 20);
      const dividend = compatibleDividend + pick([-7, -4, 3, 6], index);
      const estimate = compatibleDividend / divisor;
      questions.push(
        makeQuestion(
          `Which is the best estimate for ${formatNumber(dividend)} / ${divisor} using compatible numbers?`,
          formatNumber(estimate),
          [formatNumber(estimate + 10), formatNumber(Math.max(0, estimate - 10)), formatNumber(Math.round(dividend / divisor))],
          `Choose a nearby dividend that divides easily by the divisor to estimate the quotient.`,
          `4.4G-b-${index}`
        )
      );
    }
  }
  return questions;
}

function build44H() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const students = 41 + index;
    const seats = pick([4, 5, 6, 8], index);
    const vans = Math.ceil(students / seats);
    questions.push(
      makeQuestion(
        `${students} students are riding in vans that hold ${seats} students each. How many vans are needed?`,
        `${vans} vans`,
        [`${Math.floor(students / seats)} vans`, `${vans + 1} vans`, `${students - seats} vans`],
        `Because every student needs a seat, divide and round up when there is a remainder.`,
        `4.4H-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const boxes = (index % 6) + 4;
    const perBox = ((index + 3) % 7) + 6;
    const extras = (index % 5) + 3;
    const total = boxes * perBox + extras;
    questions.push(
      makeQuestion(
        `A teacher has ${boxes} boxes of markers with ${perBox} markers in each box and buys ${extras} more markers. How many markers does the teacher have now?`,
        formatNumber(total),
        [formatNumber(boxes + perBox + extras), formatNumber(boxes * perBox), formatNumber(total + perBox)],
        `Solve the multiplication step first, then add the extra markers.`,
        `4.4H-b-${index}`
      )
    );
  }
  return questions;
}

function build45A() {
  const questions = [];
  for (let index = 0; index < 50; index += 1) {
    const packs = (index % 6) + 3;
    const perPack = ((index + 2) % 7) + 4;
    const extra = (index % 5) + 2;
    if (index % 2 === 0) {
      questions.push(
        makeQuestion(
          `Which equation with x best represents this problem? A class buys ${packs} packs of pencils with ${perPack} pencils in each pack and then receives ${extra} more pencils. How many pencils does the class have?`,
          `x = (${packs} x ${perPack}) + ${extra}`,
          [`x = ${packs} + ${perPack} + ${extra}`, `x = (${packs} x ${perPack}) - ${extra}`, `x = ${packs} x (${perPack} + ${extra})`],
          `A multiplication step shows the equal groups, and then the extra amount is added.`,
          `4.5A-${index}`
        )
      );
    } else {
      const total = packs * perPack + extra;
      questions.push(
        makeQuestion(
          `Which equation with x best represents this problem? ${total} stickers were packed into ${packs} equal groups after ${extra} extra stickers were added. How many stickers were in each original group?`,
          `x = (${total} - ${extra}) / ${packs}`,
          [`x = (${total} + ${extra}) / ${packs}`, `x = ${total} - (${extra} / ${packs})`, `x = ${packs} x ${extra}`],
          `Subtract the extra amount first, then divide the remaining total into equal groups.`,
          `4.5A-${index}`
        )
      );
    }
  }
  return questions;
}

function build45B() {
  const questions = [];
  const rules = [
    ["2n + 1", (n) => 2 * n + 1],
    ["3n + 2", (n) => 3 * n + 2],
    ["4n", (n) => 4 * n],
    ["5n - 3", (n) => 5 * n - 3],
    ["n + 7", (n) => n + 7]
  ];

  for (let index = 0; index < 25; index += 1) {
    const [ruleText, ruleFn] = pick(rules, index);
    const input = (index % 6) + 1;
    const output = ruleFn(input);
    questions.push(
      makeQuestion(
        `An input-output table follows the rule ${ruleText}. What is the output when the input is ${input}?`,
        formatNumber(output),
        [formatNumber(output + 1), formatNumber(Math.max(0, output - 1)), formatNumber(input + output)],
        `Substitute the input into the rule to find the output.`,
        `4.5B-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const [ruleText, ruleFn] = pick(rules, index, 2);
    const pairs = [1, 2, 3].map((input) => `${input}->${ruleFn(input)}`).join(", ");
    questions.push(
      makeQuestion(
        `Which rule matches this input-output table: ${pairs}?`,
        ruleText,
        uniqueStrings(rules.map((entry) => entry[0]).filter((text) => text !== ruleText).slice(0, 3)),
        `The rule describes the relationship between each input and output in the table.`,
        `4.5B-b-${index}`
      )
    );
  }
  return questions;
}

function build45D() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const length = (index % 9) + 4;
    const width = ((index + 3) % 7) + 3;
    const area = length * width;
    questions.push(
      makeQuestion(
        `A rectangle is ${length} units long and ${width} units wide. What is its area?`,
        `${area} square units`,
        [`${2 * (length + width)} square units`, `${length + width} square units`, `${area + length} square units`],
        `Area of a rectangle is length times width.`,
        `4.5D-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const length = (index % 8) + 6;
    const width = ((index + 4) % 6) + 2;
    const perimeter = 2 * (length + width);
    questions.push(
      makeQuestion(
        `A rectangle is ${length} units long and ${width} units wide. What is its perimeter?`,
        `${perimeter} units`,
        [`${length * width} units`, `${length + width} units`, `${perimeter + 2} units`],
        `Perimeter of a rectangle is the total distance around it: 2(length + width).`,
        `4.5D-b-${index}`
      )
    );
  }
  return questions;
}

function build46A() {
  const questions = [];
  const definitionCases = [
    ["a dot that shows an exact location", "point", ["line", "ray", "angle"]],
    ["a straight path that goes on forever in both directions", "line", ["line segment", "ray", "point"]],
    ["a part of a line with two endpoints", "line segment", ["ray", "line", "angle"]],
    ["a part of a line with one endpoint that goes on forever in one direction", "ray", ["line segment", "point", "parallel lines"]],
    ["two rays that share an endpoint", "angle", ["point", "line", "parallel lines"]],
    ["lines that never meet", "parallel lines", ["perpendicular lines", "line segments", "angles"]],
    ["lines that intersect to form right angles", "perpendicular lines", ["parallel lines", "rays", "points"]]
  ];

  for (let index = 0; index < 25; index += 1) {
    const [prompt, correct, wrongs] = pick(definitionCases, index);
    questions.push(makeQuestion(`Which mathematical term matches this description: ${prompt}?`, correct, wrongs, `Use the attributes in the description to identify the correct geometric term.`, `4.6A-a-${index}`));
  }

  for (let index = 0; index < 25; index += 1) {
    const [prompt, correct] = pick(definitionCases, index, 3);
    questions.push(makeQuestion(`Which description matches ${correct}?`, prompt, definitionCases.map((entry) => entry[0]).filter((entry) => entry !== prompt).slice(0, 3), `Geometric vocabulary describes specific attributes such as endpoints, intersections, and direction.`, `4.6A-b-${index}`));
  }
  return questions;
}

function build46B() {
  const questions = [];
  const symmetryCases = [
    ["square", "4"],
    ["rectangle", "2"],
    ["equilateral triangle", "3"],
    ["isosceles triangle", "1"],
    ["scalene triangle", "0"],
    ["regular hexagon", "6"]
  ];

  for (let index = 0; index < 25; index += 1) {
    const [figure, correct] = pick(symmetryCases, index);
    questions.push(makeQuestion(`How many lines of symmetry does a ${figure} have?`, correct, uniqueStrings(["0", "1", "2", "3", "4", "6"].filter((value) => value !== correct).slice(0, 3)), `A line of symmetry divides a figure into two matching halves.`, `4.6B-a-${index}`));
  }

  const prompts = [
    ["exactly 1 line of symmetry", "isosceles triangle"],
    ["exactly 2 lines of symmetry", "rectangle"],
    ["exactly 3 lines of symmetry", "equilateral triangle"],
    ["exactly 4 lines of symmetry", "square"],
    ["no lines of symmetry", "scalene triangle"]
  ];
  for (let index = 0; index < 25; index += 1) {
    const [description, correct] = pick(prompts, index);
    questions.push(makeQuestion(`Which figure has ${description}?`, correct, uniqueStrings(prompts.map((entry) => entry[1]).filter((value) => value !== correct).slice(0, 3)), `A figure's lines of symmetry depend on how its halves match when folded.`, `4.6B-b-${index}`));
  }
  return questions;
}

function build46C() {
  const questions = [];
  const triangles = [
    [[90, 45, 45], "right triangle"],
    [[110, 35, 35], "obtuse triangle"],
    [[70, 60, 50], "acute triangle"],
    [[95, 50, 35], "obtuse triangle"],
    [[90, 60, 30], "right triangle"],
    [[55, 65, 60], "acute triangle"]
  ];

  for (let index = 0; index < 25; index += 1) {
    const [angles, correct] = pick(triangles, index);
    questions.push(makeQuestion(`A triangle has angle measures ${angles.join(", ")} degrees. What type of triangle is it?`, correct, uniqueStrings(["acute triangle", "right triangle", "obtuse triangle"].filter((value) => value !== correct)), `A triangle is classified by whether it has an acute, right, or obtuse angle.`, `4.6C-a-${index}`));
  }

  for (let index = 0; index < 25; index += 1) {
    const correct = pick(["acute triangle", "right triangle", "obtuse triangle"], index);
    const clue = correct === "acute triangle" ? "all three angles are less than 90 degrees" : correct === "right triangle" ? "one angle measures exactly 90 degrees" : "one angle is greater than 90 degrees";
    questions.push(makeQuestion(`Which type of triangle matches this clue: ${clue}?`, correct, uniqueStrings(["acute triangle", "right triangle", "obtuse triangle"].filter((value) => value !== correct)), `Use the angle information to classify the triangle.`, `4.6C-b-${index}`));
  }
  return questions;
}

function build46D() {
  const questions = [];
  const figures = [
    ["a quadrilateral with four right angles and two pairs of parallel sides", "rectangle"],
    ["a quadrilateral with four equal sides and four right angles", "square"],
    ["a quadrilateral with exactly one pair of parallel sides", "trapezoid"],
    ["a quadrilateral with two pairs of parallel sides and no right angles", "parallelogram"],
    ["a quadrilateral with four equal sides and opposite sides parallel but no right angles", "rhombus"]
  ];

  for (let index = 0; index < 25; index += 1) {
    const [description, correct] = pick(figures, index);
    questions.push(makeQuestion(`Which figure matches this description: ${description}?`, correct, uniqueStrings(figures.map((entry) => entry[1]).filter((value) => value !== correct).slice(0, 3)), `Use the presence or absence of parallel lines, perpendicular lines, and angle sizes to classify the figure.`, `4.6D-a-${index}`));
  }

  for (let index = 0; index < 25; index += 1) {
    const [description, correct] = pick(figures, index, 2);
    questions.push(makeQuestion(`Which description matches a ${correct}?`, description, figures.map((entry) => entry[0]).filter((value) => value !== description).slice(0, 3), `Geometric figures can be classified by their lines and angles.`, `4.6D-b-${index}`));
  }
  return questions;
}

function build47C() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const measure = 18 + index * 6;
    questions.push(makeQuestion(`A protractor reading is closest to ${measure} degrees. What is the approximate angle measure to the nearest whole degree?`, `${measure} degrees`, [`${measure + 5} degrees`, `${Math.max(1, measure - 5)} degrees`, "90 degrees"], `Read the protractor mark nearest the second ray and state the angle measure to the nearest whole degree.`, `4.7C-a-${index}`));
  }

  for (let index = 0; index < 25; index += 1) {
    const low = 20 + index * 4;
    const high = low + 10;
    const measure = low + 3;
    questions.push(makeQuestion(`On a protractor, the second ray falls between ${low} degrees and ${high} degrees, closer to ${measure} degrees. What is the best estimate of the angle measure?`, `${measure} degrees`, [`${low} degrees`, `${high} degrees`, `${90 - (index % 10)} degrees`], `Estimate the angle by choosing the degree mark the ray is closest to.`, `4.7C-b-${index}`));
  }
  return questions;
}

function build47D() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const measure = 15 + index * 5;
    questions.push(makeQuestion(`A student needs to draw an angle measuring ${measure} degrees. Which protractor mark should the second ray pass through?`, `${measure} degrees`, [`${measure + 10} degrees`, `${Math.max(1, measure - 10)} degrees`, "90 degrees"], `To draw an angle, place one ray at 0 degrees and draw the second ray through the given measure.`, `4.7D-a-${index}`));
  }

  for (let index = 0; index < 25; index += 1) {
    const measure = 95 + index * 2;
    questions.push(makeQuestion(`Which angle should a student draw to make an obtuse angle of ${measure} degrees?`, `${measure} degrees`, [`${measure - 40} degrees`, "90 degrees", `${Math.min(179, measure + 20)} degrees`], `An obtuse angle measures more than 90 degrees and less than 180 degrees.`, `4.7D-b-${index}`));
  }
  return questions;
}

function build47E() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const total = 90 + (index % 5) * 10;
    const part = 20 + (index % 6) * 5;
    const missing = total - part;
    questions.push(makeQuestion(`Two adjacent angles make a total angle of ${total} degrees. If one angle is ${part} degrees, what is the other angle?`, `${missing} degrees`, [`${total + part} degrees`, `${part} degrees`, `${missing + 10} degrees`], `Adjacent angle measures add to the total angle measure.`, `4.7E-a-${index}`));
  }

  for (let index = 0; index < 25; index += 1) {
    const part = 25 + (index % 10) * 5;
    const missing = 180 - part;
    questions.push(makeQuestion(`Two non-overlapping adjacent angles form a straight angle. If one angle measures ${part} degrees, what is the other angle?`, `${missing} degrees`, [`${part} degrees`, `${missing - 10} degrees`, `${180 + part} degrees`], `A straight angle measures 180 degrees, so the adjacent parts must add to 180 degrees.`, `4.7E-b-${index}`));
  }
  return questions;
}

function build48A() {
  const questions = [];
  const unitPairs = [
    ["inch", "foot", "foot"],
    ["foot", "yard", "yard"],
    ["yard", "mile", "mile"],
    ["cup", "gallon", "gallon"],
    ["ounce", "pound", "pound"],
    ["millimeter", "centimeter", "centimeter"],
    ["centimeter", "meter", "meter"],
    ["gram", "kilogram", "kilogram"],
    ["milliliter", "liter", "liter"]
  ];

  for (let index = 0; index < 25; index += 1) {
    const [smallUnit, largeUnit, correct] = pick(unitPairs, index);
    questions.push(makeQuestion(`Which unit is larger: ${smallUnit} or ${largeUnit}?`, correct, [smallUnit, "They are the same size", "There is no way to compare them"], `Within the same measurement system, some units represent larger amounts than others.`, `4.8A-a-${index}`));
  }

  for (let index = 0; index < 25; index += 1) {
    const [smallUnit, largeUnit] = pick(unitPairs, index, 3);
    questions.push(makeQuestion(`Which statement is true?`, `A ${largeUnit} is larger than a ${smallUnit}`, [`A ${smallUnit} is larger than a ${largeUnit}`, `${smallUnit} and ${largeUnit} are always equal`, `A ${smallUnit} cannot be compared with a ${largeUnit}`], `Compare the relative sizes of units within the same measurement system.`, `4.8A-b-${index}`));
  }
  return questions;
}

function build48B() {
  const questions = [];
  const tables = [
    ["1 foot = 12 inches", "foot", "inches", 12],
    ["1 yard = 3 feet", "yard", "feet", 3],
    ["1 gallon = 4 quarts", "gallon", "quarts", 4],
    ["1 pound = 16 ounces", "pound", "ounces", 16],
    ["1 meter = 100 centimeters", "meter", "centimeters", 100],
    ["1 centimeter = 10 millimeters", "centimeter", "millimeters", 10],
    ["1 liter = 1000 milliliters", "liter", "milliliters", 1000],
    ["1 kilogram = 1000 grams", "kilogram", "grams", 1000]
  ];

  for (let index = 0; index < 25; index += 1) {
    const [tableText, fromUnit, toUnit, factor] = pick(tables, index);
    const amount = (index % 5) + 2;
    const answer = amount * factor;
    questions.push(makeQuestion(`Table: ${tableText}. How many ${toUnit} are in ${amount} ${fromUnit}?`, formatNumber(answer), [formatNumber(answer + factor), formatNumber(Math.max(1, answer - factor)), formatNumber(amount + factor)], `Use the conversion table to multiply by the number of smaller units in one larger unit.`, `4.8B-a-${index}`));
  }

  for (let index = 0; index < 25; index += 1) {
    const [tableText, fromUnit, toUnit, factor] = pick(tables, index, 2);
    const amount = ((index % 5) + 2) * factor;
    const answer = amount / factor;
    questions.push(makeQuestion(`Table: ${tableText}. ${amount} ${toUnit} is equal to how many ${fromUnit}?`, formatNumber(answer), [formatNumber(answer + 1), formatNumber(Math.max(1, answer - 1)), formatNumber(amount * factor)], `Use the conversion table to divide by the number of smaller units in one larger unit.`, `4.8B-b-${index}`));
  }
  return questions;
}

function build48C() {
  const questions = [];
  const lengthUnits = ["inches", "feet", "yards", "meters"];
  const liquidUnits = ["cups", "quarts", "liters", "milliliters"];
  const massUnits = ["ounces", "pounds", "grams", "kilograms"];

  for (let index = 0; index < 10; index += 1) {
    const length = 24 + index * 3;
    const pieces = (index % 4) + 2;
    const unit = pick(lengthUnits, index);
    questions.push(makeQuestion(`A ribbon is ${length} ${unit} long. It is cut into ${pieces} equal pieces. How long is each piece?`, `${length / pieces} ${unit}`, [`${length + pieces} ${unit}`, `${length - pieces} ${unit}`, `${pieces} ${unit}`], `Divide the total length by the number of equal pieces.`, `4.8C-length-${index}`));
  }

  for (let index = 0; index < 10; index += 1) {
    const startHour = (index % 6) + 1;
    const startMinute = (index % 2) * 30;
    const minutesPassed = 35 + index * 5;
    questions.push(makeQuestion(`A movie starts at ${startHour}:${String(startMinute).padStart(2, "0")} and lasts ${minutesPassed} minutes. How many minutes after the hour does it end?`, `${(startMinute + minutesPassed) % 60} minutes after the hour`, [`${minutesPassed} minutes after the hour`, `${startMinute} minutes after the hour`, `${(startMinute + minutesPassed + 10) % 60} minutes after the hour`], `Add the elapsed minutes and interpret the ending time.`, `4.8C-time-${index}`));
  }

  for (let index = 0; index < 10; index += 1) {
    const containers = (index % 5) + 2;
    const perContainer = ((index + 2) % 6) + 3;
    const unit = pick(liquidUnits, index);
    questions.push(makeQuestion(`There are ${containers} containers with ${perContainer} ${unit} in each container. How much liquid is there in all?`, `${containers * perContainer} ${unit}`, [`${containers + perContainer} ${unit}`, `${containers * perContainer + perContainer} ${unit}`, `${perContainer} ${unit}`], `Multiply the amount in one container by the number of containers.`, `4.8C-liquid-${index}`));
  }

  for (let index = 0; index < 10; index += 1) {
    const bags = (index % 4) + 3;
    const perBag = ((index + 1) % 7) + 4;
    const unit = pick(massUnits, index);
    questions.push(makeQuestion(`A farmer fills ${bags} bags with ${perBag} ${unit} of produce in each bag. What is the total mass?`, `${bags * perBag} ${unit}`, [`${bags + perBag} ${unit}`, `${bags * perBag + bags} ${unit}`, `${perBag} ${unit}`], `Multiply the mass in one bag by the number of bags.`, `4.8C-mass-${index}`));
  }

  for (let index = 0; index < 10; index += 1) {
    const priceA = (index % 5) + 2;
    const priceB = ((index + 2) % 6) + 1;
    const total = priceA + priceB;
    questions.push(makeQuestion(`A student buys one snack for $${priceA} and one drink for $${priceB}. How much money is spent in all?`, `$${total}`, [`$${priceA * priceB}`, `$${total + 1}`, `$${Math.max(0, total - 1)}`], `Add the money amounts to find the total spent.`, `4.8C-money-${index}`));
  }
  return questions;
}

function build49A() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const data = index % 2 === 0 ? ["2", "2", "3", "3", "3", "4"] : ["1/4", "1/2", "1/2", "3/4", "3/4", "3/4"];
    const rows = countLabels(data);
    const correct = frequencyTableText(rows);
    const wrongA = frequencyTableText(rows.map(([label, count], rowIndex) => [label, rowIndex === 0 ? count + 1 : count]));
    const wrongB = frequencyTableText(rows.map(([label, count], rowIndex) => [label, rowIndex === 1 ? Math.max(0, count - 1) : count]));
    const wrongC = frequencyTableText(rows.slice().reverse());
    questions.push(
      makeQuestion(
        `Which frequency table correctly represents this data set: ${data.join(", ")}?`,
        correct,
        [wrongA, wrongB, wrongC],
        `A frequency table records how many times each data value appears.`,
        `4.9A-a-${index}`
      )
    );
  }

  for (let index = 0; index < 25; index += 1) {
    const rows = index % 2 === 0 ? [["1", 2], ["2", 3], ["3", 1]] : [["1/4", 1], ["1/2", 2], ["3/4", 3]];
    const correct = dotPlotText(rows);
    const wrongA = dotPlotText(rows.map(([label, count], rowIndex) => [label, rowIndex === 0 ? count + 1 : count]));
    const wrongB = dotPlotText(rows.map(([label, count], rowIndex) => [label, rowIndex === 1 ? Math.max(0, count - 1) : count]));
    const wrongC = dotPlotText(rows.slice().reverse());
    const data = rows.flatMap(([label, count]) => Array.from({ length: count }, () => label));
    questions.push(
      makeQuestion(
        `Which dot plot summary correctly represents this data set: ${data.join(", ")}?`,
        correct,
        [wrongA, wrongB, wrongC],
        `A dot plot shows one mark for each data value.`,
        `4.9A-b-${index}`
      )
    );
  }
  return questions;
}

function build49B() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const rows = [["2", 3 + (index % 2)], ["3", 2 + (index % 3)], ["4", 1 + (index % 2)]];
    const table = frequencyTableText(rows);
    const totalCount = rows.reduce((sum, [, count]) => sum + count, 0);
    const difference = rows[0][1] - rows[2][1];
    if (index % 2 === 0) {
      questions.push(makeQuestion(`Frequency table: ${table}. How many data points are shown in all?`, formatNumber(totalCount), [formatNumber(totalCount + 1), formatNumber(Math.max(0, totalCount - 1)), formatNumber(rows[1][1])], `Add the frequencies to find the total number of data points.`, `4.9B-a-${index}`));
    } else {
      questions.push(makeQuestion(`Frequency table: ${table}. How many more data points are 2 than 4?`, formatNumber(difference), [formatNumber(difference + 1), formatNumber(Math.max(0, difference - 1)), formatNumber(totalCount)], `Subtract the two frequencies to compare the categories.`, `4.9B-a-${index}`));
    }
  }

  for (let index = 0; index < 13; index += 1) {
    const rows = [["1/4", 1 + (index % 2)], ["1/2", 2 + (index % 2)], ["3/4", 1 + (index % 3)]];
    const plot = dotPlotText(rows);
    const answer = rows[1][1] + rows[2][1];
    questions.push(makeQuestion(`Dot plot: ${plot}. How many data points are 1/2 or 3/4?`, formatNumber(answer), [formatNumber(answer + 1), formatNumber(Math.max(0, answer - 1)), formatNumber(rows[0][1])], `Add the counts for the specified data values.`, `4.9B-b-${index}`));
  }

  for (let index = 13; index < 25; index += 1) {
    const leavesOne = [2, 4, 7];
    const leavesTwo = [0, 3 + (index % 2)];
    const plot = `${stemLeafText(1, leavesOne)}; ${stemLeafText(2, leavesTwo)}`;
    const answer = 2 + leavesTwo.length;
    questions.push(makeQuestion(`Stem-and-leaf plot: ${plot}. How many values are greater than 15?`, formatNumber(answer), [formatNumber(answer + 1), formatNumber(Math.max(0, answer - 1)), formatNumber(leavesOne.length + leavesTwo.length)], `Count the leaves that represent values greater than 15.`, `4.9B-b-${index}`));
  }
  return questions;
}

function build410A() {
  const questions = [];
  const fixedScenarios = ["monthly rent", "a set car payment", "a yearly membership fee", "monthly internet service"];
  const variableScenarios = ["the electric bill", "money spent on snacks", "gas for a car", "school lunch purchases"];

  for (let index = 0; index < 25; index += 1) {
    const scenario = index % 2 === 0 ? pick(fixedScenarios, index) : pick(variableScenarios, index);
    const correct = index % 2 === 0 ? "fixed expense" : "variable expense";
    questions.push(makeQuestion(`Which type of expense is ${scenario}?`, correct, [correct === "fixed expense" ? "variable expense" : "fixed expense", "profit", "income"], `Fixed expenses stay the same or are planned to be the same, while variable expenses can change.`, `4.10A-a-${index}`));
  }

  for (let index = 0; index < 25; index += 1) {
    const correct = index % 2 === 0 ? pick(fixedScenarios, index) : pick(variableScenarios, index);
    const prompt = index % 2 === 0 ? "Which is an example of a fixed expense?" : "Which is an example of a variable expense?";
    const wrongs = index % 2 === 0 ? variableScenarios.slice(0, 3) : fixedScenarios.slice(0, 3);
    questions.push(makeQuestion(prompt, correct, wrongs, `Use the definition of fixed and variable expenses to classify the example.`, `4.10A-b-${index}`));
  }
  return questions;
}

function build410B() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const cost = 8 + index;
    const sell = cost + (index % 7) + 3;
    const profit = sell - cost;
    questions.push(makeQuestion(`A student spends $${cost} making bracelets and sells them for $${sell}. What is the profit?`, `$${profit}`, [`$${sell}`, `$${cost}`, `$${profit + 1}`], `Profit is the amount earned after subtracting the cost from the selling price.`, `4.10B-a-${index}`));
  }

  for (let index = 0; index < 25; index += 1) {
    const cost = 12 + index * 2;
    const sell = cost + (index % 5) + 5;
    const profit = sell - cost;
    questions.push(makeQuestion(`A snack stand pays $${cost} for supplies and makes $${sell} from sales. What is the profit?`, `$${profit}`, [`$${sell + cost}`, `$${cost - 1}`, `$${profit + 2}`], `Subtract the cost from the money made from sales to find the profit.`, `4.10B-b-${index}`));
  }
  return questions;
}

function build410E() {
  const questions = [];
  const purposes = [
    ["keeping money safe", "keeping money safe"],
    ["borrowing money for a large purchase", "borrowing money"],
    ["lending money to approved borrowers", "lending money"]
  ];

  for (let index = 0; index < 25; index += 1) {
    const [scenario, correct] = pick(purposes, index);
    questions.push(makeQuestion(`Which basic purpose of a financial institution matches this situation: ${scenario}?`, correct, uniqueStrings(purposes.map((entry) => entry[1]).filter((value) => value !== correct)), `Financial institutions help keep money safe and support borrowing and lending.`, `4.10E-a-${index}`));
  }

  for (let index = 0; index < 25; index += 1) {
    const correct = pick([
      "People can deposit money there to help keep it safe",
      "People may borrow money there and repay it later",
      "The institution may lend money to qualified borrowers"
    ], index);
    questions.push(makeQuestion(`Which statement correctly describes a basic purpose of a financial institution?`, correct, ["It only sells toys and clothes", "It removes the need to repay borrowed money", "It replaces all budgeting decisions"], `Banks and similar institutions have basic financial purposes such as saving, borrowing, and lending.`, `4.10E-b-${index}`));
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
    tags: ["texas", "teks", "staar", "grade 4", "math", teksCode.toLowerCase().replace(".", "")],
    questions
  };
}

const QUIZ_BUILDERS = [
  ["4.1A", "Math Grade 4 4.1A", "Apply mathematics to problems arising in everyday life, society, and the workplace.", 0, "Mathematical Process Standards", "Core", () => buildProcessApply("4.1A")],
  ["4.1B", "Math Grade 4 4.1B", "Use a problem-solving model that incorporates analyzing information, formulating a plan, determining a solution, justifying the solution, and evaluating the problem-solving process and the reasonableness of the solution.", 0, "Mathematical Process Standards", "Core", () => buildProcessModel("4.1B")],
  ["4.1C", "Math Grade 4 4.1C", "Select tools, including real objects, manipulatives, paper and pencil, and technology as appropriate, and techniques, including mental math, estimation, and number sense as appropriate, to solve problems.", 0, "Mathematical Process Standards", "Core", () => buildProcessTools("4.1C")],
  ["4.1D", "Math Grade 4 4.1D", "Communicate mathematical ideas, reasoning, and their implications using multiple representations, including symbols, diagrams, graphs, and language as appropriate.", 0, "Mathematical Process Standards", "Core", () => buildProcessCommunicate("4.1D")],
  ["4.1E", "Math Grade 4 4.1E", "Create and use representations to organize, record, and communicate mathematical ideas.", 0, "Mathematical Process Standards", "Core", () => buildProcessRepresent("4.1E")],
  ["4.1F", "Math Grade 4 4.1F", "Analyze mathematical relationships to connect and communicate mathematical ideas.", 0, "Mathematical Process Standards", "Core", () => buildProcessRelationships("4.1F")],
  ["4.1G", "Math Grade 4 4.1G", "Display, explain, and justify mathematical ideas and arguments using precise mathematical language in written or oral communication.", 0, "Mathematical Process Standards", "Core", () => buildProcessLanguage("4.1G")],
  ["4.2A", "Math Grade 4 4.2A", "Interpret the value of each place-value position as 10 times the position to the right and as one-tenth of the value of the place to its left.", 1, "Numerical Representations and Relationships", "Readiness", build42A],
  ["4.2B", "Math Grade 4 4.2B", "Represent the value of the digit in whole numbers through 1,000,000,000 and decimals to the hundredths using expanded notation and numerals.", 1, "Numerical Representations and Relationships", "Supporting", build42B],
  ["4.2C", "Math Grade 4 4.2C", "Compare and order whole numbers to 1,000,000,000 and represent comparisons using the symbols >, <, or =.", 1, "Numerical Representations and Relationships", "Readiness", build42C],
  ["4.2D", "Math Grade 4 4.2D", "Round whole numbers to a given place value through the hundred thousands place.", 1, "Numerical Representations and Relationships", "Supporting", build42D],
  ["4.2E", "Math Grade 4 4.2E", "Represent decimals, including tenths and hundredths, using concrete and visual models and money.", 1, "Numerical Representations and Relationships", "Supporting", build42E],
  ["4.2F", "Math Grade 4 4.2F", "Compare and order decimals using concrete and visual models to the hundredths.", 1, "Numerical Representations and Relationships", "Readiness", build42F],
  ["4.2G", "Math Grade 4 4.2G", "Relate decimals to fractions that name tenths and hundredths.", 1, "Numerical Representations and Relationships", "Supporting", build42G],
  ["4.2H", "Math Grade 4 4.2H", "Determine the corresponding decimal to the tenths or hundredths place of a specified point on a number line.", 1, "Numerical Representations and Relationships", "Supporting", build42H],
  ["4.3A", "Math Grade 4 4.3A", "Represent a fraction a/b as a sum of fractions 1/b, where a and b are whole numbers and b > 0, including when a > b.", 1, "Numerical Representations and Relationships", "Supporting", build43A],
  ["4.3B", "Math Grade 4 4.3B", "Decompose a fraction in more than one way into a sum of fractions with the same denominator using concrete and pictorial models and symbolic representations.", 1, "Numerical Representations and Relationships", "Supporting", build43B],
  ["4.3C", "Math Grade 4 4.3C", "Determine if two given fractions are equivalent using a variety of methods.", 1, "Numerical Representations and Relationships", "Readiness", build43C],
  ["4.3D", "Math Grade 4 4.3D", "Compare two fractions with different numerators and different denominators and represent the comparison using the symbols >, <, or =.", 1, "Numerical Representations and Relationships", "Readiness", build43D],
  ["4.3E", "Math Grade 4 4.3E", "Represent and solve addition and subtraction of fractions with equal denominators using objects and pictorial models that build to the number line and properties of operations.", 2, "Computations and Algebraic Relationships", "Supporting", build43E],
  ["4.3F", "Math Grade 4 4.3F", "Evaluate the reasonableness of sums and differences of fractions using benchmark fractions 0, 1/4, 1/2, 3/4, and 1 referring to the same whole.", 2, "Computations and Algebraic Relationships", "Supporting", build43F],
  ["4.3G", "Math Grade 4 4.3G", "Represent fractions and decimals to the tenths or hundredths as distances from zero on a number line.", 1, "Numerical Representations and Relationships", "Supporting", build43G],
  ["4.4A", "Math Grade 4 4.4A", "Add and subtract whole numbers and decimals to the hundredths place using the standard algorithm.", 2, "Computations and Algebraic Relationships", "Readiness", build44A],
  ["4.4B", "Math Grade 4 4.4B", "Determine products of a number and 10 or 100 using properties of operations and place value understandings.", 2, "Computations and Algebraic Relationships", "Supporting", build44B],
  ["4.4C", "Math Grade 4 4.4C", "Represent the product of two two-digit numbers using arrays, area models, or equations, including perfect squares through 15 by 15.", 2, "Computations and Algebraic Relationships", "Supporting", build44C],
  ["4.4D", "Math Grade 4 4.4D", "Use strategies and algorithms, including the standard algorithm, to multiply up to a four-digit number by a one-digit number and to multiply two two-digit numbers.", 2, "Computations and Algebraic Relationships", "Readiness", build44D],
  ["4.4E", "Math Grade 4 4.4E", "Represent the quotient of up to a four-digit whole number divided by a one-digit whole number using arrays, area models, or equations.", 2, "Computations and Algebraic Relationships", "Supporting", build44E],
  ["4.4F", "Math Grade 4 4.4F", "Use strategies and algorithms, including the standard algorithm, to divide up to a four-digit dividend by a one-digit divisor.", 2, "Computations and Algebraic Relationships", "Readiness", build44F],
  ["4.4G", "Math Grade 4 4.4G", "Round to the nearest 10, 100, or 1,000 or use compatible numbers to estimate solutions involving whole numbers.", 2, "Computations and Algebraic Relationships", "Supporting", build44G],
  ["4.4H", "Math Grade 4 4.4H", "Solve with fluency one- and two-step problems involving multiplication and division, including interpreting remainders.", 2, "Computations and Algebraic Relationships", "Readiness", build44H],
  ["4.5A", "Math Grade 4 4.5A", "Represent multi-step problems involving the four operations with whole numbers using strip diagrams and equations with a letter standing for the unknown quantity.", 2, "Computations and Algebraic Relationships", "Readiness", build45A],
  ["4.5B", "Math Grade 4 4.5B", "Represent problems using an input-output table and numerical expressions to generate a number pattern that follows a given rule representing the relationship of the values in the resulting sequence and their position in the sequence.", 2, "Computations and Algebraic Relationships", "Supporting", build45B],
  ["4.5D", "Math Grade 4 4.5D", "Solve problems related to perimeter and area of rectangles where dimensions are whole numbers.", 3, "Geometry and Measurement", "Readiness", build45D],
  ["4.6A", "Math Grade 4 4.6A", "Identify points, lines, line segments, rays, angles, and perpendicular and parallel lines.", 3, "Geometry and Measurement", "Supporting", build46A],
  ["4.6B", "Math Grade 4 4.6B", "Identify and draw one or more lines of symmetry, if they exist, for a two-dimensional figure.", 3, "Geometry and Measurement", "Supporting", build46B],
  ["4.6C", "Math Grade 4 4.6C", "Apply knowledge of right angles to identify acute, right, and obtuse triangles.", 3, "Geometry and Measurement", "Supporting", build46C],
  ["4.6D", "Math Grade 4 4.6D", "Classify two-dimensional figures based on the presence or absence of parallel or perpendicular lines or the presence or absence of angles of a specified size.", 3, "Geometry and Measurement", "Supporting", build46D],
  ["4.7C", "Math Grade 4 4.7C", "Determine the approximate measures of angles in degrees to the nearest whole number using a protractor.", 3, "Geometry and Measurement", "Supporting", build47C],
  ["4.7D", "Math Grade 4 4.7D", "Draw an angle with a given measure.", 3, "Geometry and Measurement", "Supporting", build47D],
  ["4.7E", "Math Grade 4 4.7E", "Determine the measure of an unknown angle formed by two non-overlapping adjacent angles given one or both angle measures.", 3, "Geometry and Measurement", "Supporting", build47E],
  ["4.8A", "Math Grade 4 4.8A", "Identify relative sizes of measurement units within the customary and metric systems.", 3, "Geometry and Measurement", "Supporting", build48A],
  ["4.8B", "Math Grade 4 4.8B", "Convert measurements within the same measurement system, customary or metric, from a smaller unit into a larger unit or a larger unit into a smaller unit when given other equivalent measures represented in a table.", 3, "Geometry and Measurement", "Readiness", build48B],
  ["4.8C", "Math Grade 4 4.8C", "Solve problems that deal with measurements of length, intervals of time, liquid volumes, mass, and money using addition, subtraction, multiplication, or division as appropriate.", 3, "Geometry and Measurement", "Readiness", build48C],
  ["4.9A", "Math Grade 4 4.9A", "Represent data on a frequency table, dot plot, or stem-and-leaf plot marked with whole numbers and fractions.", 4, "Data Analysis and Personal Financial Literacy", "Supporting", build49A],
  ["4.9B", "Math Grade 4 4.9B", "Solve one- and two-step problems using data in whole number, decimal, and fraction form in a frequency table, dot plot, or stem-and-leaf plot.", 4, "Data Analysis and Personal Financial Literacy", "Readiness", build49B],
  ["4.10A", "Math Grade 4 4.10A", "Distinguish between fixed and variable expenses.", 4, "Data Analysis and Personal Financial Literacy", "Supporting", build410A],
  ["4.10B", "Math Grade 4 4.10B", "Calculate profit in a given situation.", 4, "Data Analysis and Personal Financial Literacy", "Supporting", build410B],
  ["4.10E", "Math Grade 4 4.10E", "Describe the basic purpose of financial institutions, including keeping money safe, borrowing money, and lending.", 4, "Data Analysis and Personal Financial Literacy", "Supporting", build410E]
];

function generateQuizzes() {
  return QUIZ_BUILDERS.map(([teksCode, label, summary, , , , builder]) =>
    makeQuiz(
      `tx_grade4_math_${teksCode.toLowerCase().replace(".", "_")}`,
      label,
      teksCode,
      `${teksCode}: ${summary} Sources: ${ASSESSED_CURRICULUM_URL} and ${BLUEPRINT_URL}`,
      builder()
    )
  );
}

function loadExistingPayload() {
  if (!fs.existsSync(CUSTOM_QUIZZES_FILE)) {
    return { schemaVersion: 1, quizzes: [] };
  }
  const raw = fs.readFileSync(CUSTOM_QUIZZES_FILE, "utf8").trim();
  if (!raw) {
    return { schemaVersion: 1, quizzes: [] };
  }
  const parsed = JSON.parse(raw);
  return { schemaVersion: 1, quizzes: Array.isArray(parsed.quizzes) ? parsed.quizzes : [] };
}

function writeImplementationFile(generatedQuizzes) {
  const quizMap = new Map(generatedQuizzes.map((quiz) => [quiz.id, quiz]));
  const teksEntries = QUIZ_BUILDERS.map(([teksCode, label, summary, reportingCategory, reportingCategoryName, staarType], index) => {
    const setId = `tx_grade4_math_${teksCode.toLowerCase().replace(".", "_")}`;
    const quiz = quizMap.get(setId);
    const implementedQuestionCount = Array.isArray(quiz && quiz.questions) ? quiz.questions.length : 0;
    return {
      order: index + 1,
      teks: teksCode,
      setLabel: label,
      setId,
      reportingCategory,
      reportingCategoryName,
      staarType,
      questionTarget: 50,
      description: summary,
      implementedQuestionCount,
      status: implementedQuestionCount === 50 ? "complete" : "incomplete",
      lastVerifiedAt: NOW
    };
  });

  const completeEntries = teksEntries.filter((entry) => entry.status === "complete");
  const payload = {
    title: "Grade 4 Math TEKS Implementation",
    source: {
      localPdf: LOCAL_PDF,
      officialAssessedCurriculum: ASSESSED_CURRICULUM_URL,
      officialBlueprint: BLUEPRINT_URL,
      notes: "Grade 4 Math implementation continues after Grade 3 was fully completed. The local 4thmath.pdf was used as a local reference, and the official TEA assessed curriculum and blueprint were used to define the Grade 4 STAAR scope."
    },
    namingConvention: "Math Grade 4 {TEKS}",
    questionTargetPerSet: 50,
    scope: {
      firstTeks: "4.1A",
      assessedFirstTeks: "4.2A",
      assessedLastTeks: "4.10E",
      implementedLastTeks: "4.10E",
      includedAssessedTeksCount: 41,
      includedImplementationTeksCount: QUIZ_BUILDERS.length,
      includedBeyondAssessedScope: ["4.1A", "4.1B", "4.1C", "4.1D", "4.1E", "4.1F", "4.1G"],
      excludedFromImplementationScope: []
    },
    completion: {
      verifiedAt: NOW,
      totalTeks: QUIZ_BUILDERS.length,
      completeCount: completeEntries.length,
      incompleteCount: QUIZ_BUILDERS.length - completeEntries.length,
      completedThrough: completeEntries.length ? completeEntries[completeEntries.length - 1].teks : ""
    },
    teks: teksEntries
  };

  fs.mkdirSync(path.dirname(IMPLEMENTATION_FILE), { recursive: true });
  fs.writeFileSync(IMPLEMENTATION_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function main() {
  const generatedQuizzes = generateQuizzes();
  const generatedIds = new Set(generatedQuizzes.map((quiz) => quiz.id));
  const existing = loadExistingPayload();
  const preserved = existing.quizzes.filter((quiz) => !generatedIds.has(String(quiz && quiz.id ? quiz.id : "")));
  const nextPayload = { schemaVersion: 1, savedAt: NOW, quizzes: [...generatedQuizzes, ...preserved] };

  fs.mkdirSync(path.dirname(CUSTOM_QUIZZES_FILE), { recursive: true });
  fs.writeFileSync(CUSTOM_QUIZZES_FILE, `${JSON.stringify(nextPayload, null, 2)}\n`, "utf8");
  writeImplementationFile(generatedQuizzes);

  const totalQuestions = generatedQuizzes.reduce((sum, quiz) => sum + (Array.isArray(quiz.questions) ? quiz.questions.length : 0), 0);
  console.log(`Wrote ${generatedQuizzes.length} Texas Grade 4 math TEKS sets and ${totalQuestions} questions to ${CUSTOM_QUIZZES_FILE}`);
  console.log(`Wrote Grade 4 implementation file to ${IMPLEMENTATION_FILE}`);
}

main();
