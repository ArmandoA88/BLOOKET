const fs = require("fs");
const path = require("path");

const CUSTOM_QUIZZES_FILE = path.join(__dirname, "..", "data", "custom-quizzes.json");
const IMPLEMENTATION_FILE = path.join(__dirname, "..", "data", "grade5-math-staar-implementation.json");
const NOW = new Date().toISOString();
const GENERATED_BY = "Local Curriculum";
const CATEGORY = "Texas Grade 5 Math";
const LOCAL_PDF = "C:/Users/Casa-Desktop/Downloads/5thmath.pdf";
const ASSESSED_CURRICULUM_URL = "https://tea.texas.gov/student-assessment/staar/staar-5-math-assessed-curriculum.pdf";
const BLUEPRINT_URL = "https://tea.texas.gov/student-assessment/staar/staar-5-math-blueprint.pdf";
const GENERATED_IDS = new Set();

const NAMES = ["Ava", "Liam", "Mia", "Noah", "Sofia", "Ethan", "Isla", "Lucas", "Zoe", "Mateo", "Ella", "Levi"];
const ITEMS = ["books", "stickers", "cards", "crayons", "markers", "tickets", "shells", "beads", "erasers", "coins"];
const OBJECTS = ["boxes", "bags", "trays", "rows", "shelves", "tables", "packs", "crates"];
const WHOLES = ["pizza", "pan", "tray", "strip", "cake", "brownie", "garden plot", "paper strip"];

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

function fixedDecimal(value, digits = 3) {
  return Number(value).toFixed(digits);
}

function trimDecimal(text) {
  return String(Number(text));
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

function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

function simplifyFraction(numerator, denominator) {
  const factor = gcd(numerator, denominator);
  return [numerator / factor, denominator / factor];
}

function fractionOrWhole(numerator, denominator) {
  const [left, right] = simplifyFraction(numerator, denominator);
  return right === 1 ? String(left) : fraction(left, right);
}

function compareFractions(leftNumerator, leftDenominator, rightNumerator, rightDenominator) {
  const left = leftNumerator * rightDenominator;
  const right = rightNumerator * leftDenominator;
  return left > right ? ">" : left < right ? "<" : "=";
}

function expandedThousandths(number) {
  const [wholeText, decimalText] = fixedDecimal(number).split(".");
  return `${Number(wholeText)} + ${Number(decimalText[0])}/10 + ${Number(decimalText[1])}/100 + ${Number(decimalText[2])}/1000`;
}

function unitFractionSum(numerator, denominator) {
  return Array.from({ length: numerator }, () => fraction(1, denominator)).join(" + ");
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
  if (/^\d+(\.\d+)?$/.test(correctText)) {
    const amount = Number(correctText);
    choices.push(trimDecimal((amount + 0.1).toFixed(3)));
    choices.push(trimDecimal(Math.max(0, amount - 0.1).toFixed(3)));
    choices.push(trimDecimal((amount + 1).toFixed(3)));
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
    questions.push(makeQuestion(`Which situation best shows ${name} applying mathematics to an everyday problem?`, `Comparing prices to decide which ${item} costs less`, [`Picking a favorite color for ${item}`, `Choosing the ${item} that looks nicest`, `Guessing which ${item} is best without using numbers`], `Applying mathematics means using numbers or measurements to solve a real problem.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const count = (index % 10) + 15;
    const item = pick(ITEMS, index, 3);
    questions.push(makeQuestion(`A class needs enough ${item} for ${count} students. Which action shows using mathematics?`, `Use numbers to figure out how many ${item} are needed`, [`Guess and hope there are enough ${item}`, `Choose the most colorful ${item}`, `Wait and see what happens`], `Mathematics helps solve classroom and workplace problems by finding exact or reasonable amounts.`, `${code}-b-${index}`));
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
    questions.push(makeQuestion(`A student has just completed this step: ${steps[stage]}. What should happen next in the problem-solving model?`, steps[stage + 1], uniqueStrings(steps.filter((step) => step !== steps[stage + 1]).slice(0, 3)), `The model moves from analyze, to plan, to solve, to justify, to evaluate.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const prompt = index % 2 === 0 ? "Why should a student check whether an answer is reasonable?" : "Why should a student justify a solution?";
    const correct = index % 2 === 0 ? "To see if the answer makes sense for the problem" : "To explain why the strategy and answer are correct";
    questions.push(makeQuestion(prompt, correct, ["To skip writing any work", "To make numbers larger", "To avoid planning"], `Good problem solving includes explaining and checking the answer, not just writing a number.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildProcessTools(code) {
  const toolCases = [
    ["measure the length of a desk", "ruler", ["measuring cup", "clock", "calculator"]],
    ["show place value of a decimal", "base-ten blocks", ["thermometer", "clock", "ruler"]],
    ["find liquid volume", "measuring cup", ["ruler", "compass", "number line"]],
    ["read elapsed time", "clock", ["measuring cup", "protractor", "ruler"]],
    ["estimate a sum quickly", "mental math", ["weighing", "measuring volume", "sorting shapes"]]
  ];
  return Array.from({ length: 50 }, (_, index) => {
    const [task, correct, wrongs] = pick(toolCases, index);
    return makeQuestion(`Which tool or technique is most appropriate to ${task}?`, correct, wrongs, `Students should choose tools and techniques that fit the problem.`, `${code}-${index}`);
  });
}

function buildProcessCommunicate(code) {
  const cases = [
    ["show a decimal comparison", "a place-value chart and an inequality", ["a blank page", "a color name only", "a guess"]],
    ["compare survey results", "a bar graph and a sentence", ["just saying maybe", "an unlabeled doodle", "a blank table"]],
    ["explain 7/10", "a number line and words", ["a color choice", "an unlabeled picture", "a guess only"]],
    ["justify rounding 4.376 to 4.38", "a place-value explanation and a number line", ["only saying because", "an unrelated clock", "a random list"]],
    ["show an input-output rule", "a table and an equation", ["a shape with no numbers", "a song title", "a blank chart"]]
  ];
  return Array.from({ length: 50 }, (_, index) => {
    const [task, correct, wrongs] = pick(cases, index);
    return makeQuestion(`Which choice best communicates a mathematical idea to ${task}?`, correct, wrongs, `Clear math communication often uses words, symbols, diagrams, tables, or graphs together.`, `${code}-${index}`);
  });
}

function buildProcessRepresent(code) {
  const cases = [
    ["organize survey data", "frequency table", ["glue stick", "clock", "shoe box"]],
    ["show equal groups", "array", ["thermometer", "ruler", "calendar"]],
    ["show a fraction from 0 to 1", "number line", ["paint brush", "folder", "pencil pouch"]],
    ["compare category totals", "bar graph", ["eraser", "dice", "string"]],
    ["show how parts make a whole", "strip diagram", ["bookmark", "flashlight", "crayon box"]]
  ];
  return Array.from({ length: 50 }, (_, index) => {
    const [task, correct, wrongs] = pick(cases, index);
    return makeQuestion(`Which representation should a student create to ${task}?`, correct, wrongs, `A good representation helps organize, record, and communicate mathematical ideas.`, `${code}-${index}`);
  });
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
    ["numbers increasing by 10 each time", "a growing additive pattern", ["an unrelated graph", "a fraction sum", "a rounding mistake"]],
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
    ["Which explanation uses precise mathematical language to compare 0.45 and 0.5?", "0.5 is greater because 5 tenths is greater than 45 hundredths", ["It is bigger because it feels bigger", "The 5 looks larger", "Decimals are always different"]],
    ["Which statement clearly justifies rounding 4.376 to 4.38?", "The thousandths digit is 6, so the hundredths digit rounds up from 7 to 8", ["4.376 looks large", "4.376 always rounds to 4.30", "All decimals round to the nearest whole only"]],
    ["Which sentence uses precise mathematical language about volume?", "Volume is the amount of space inside a three-dimensional figure", ["Volume is how big it feels", "Volume is any number", "Volume means color the shape"]],
    ["Which statement best explains an equivalent fraction?", "Two equivalent fractions represent the same amount of the same-size whole", ["Equivalent means the numerators match", "Equivalent means random", "Equivalent means odd denominators"]],
    ["Which explanation best justifies 5 x 0.4 = 2?", "Five groups of four tenths make twenty tenths, which is 2 wholes", ["It just is 2", "I guessed", "Two is a favorite number"]]
  ];
  return Array.from({ length: 50 }, (_, index) => {
    const [prompt, correct, wrongs] = pick(cases, index);
    return makeQuestion(prompt, correct, wrongs, `Precise mathematical language explains why an idea is correct.`, `${code}-${index}`);
  });
}

function build52A() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const whole = (index % 7) + 2;
    const tenths = (index * 3) % 10;
    const hundredths = (index * 5) % 10;
    const thousandths = (index * 7) % 10;
    const number = Number(`${whole}.${tenths}${hundredths}${thousandths}`);
    questions.push(makeQuestion(`Which expanded notation matches ${trimDecimal(fixedDecimal(number))}?`, expandedThousandths(number), [expandedThousandths(number + 0.1), expandedThousandths(Number(`${whole}.${hundredths}${tenths}${thousandths}`)), expandedThousandths(Number(`${whole}.${tenths}${thousandths}${hundredths}`))], `${trimDecimal(fixedDecimal(number))} can be written in expanded notation by place value.`, `5.2A-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const whole = (index % 8) + 1;
    const tenths = (index * 2) % 10;
    const hundredths = (index * 4) % 10;
    const thousandths = (index * 6) % 10;
    const number = Number(`${whole}.${tenths}${hundredths}${thousandths}`);
    questions.push(makeQuestion(`What decimal is represented by ${expandedThousandths(number)}?`, trimDecimal(fixedDecimal(number)), [trimDecimal(fixedDecimal(number + 0.01)), trimDecimal(fixedDecimal(Math.max(0, number - 0.01))), trimDecimal(fixedDecimal(Number(`${whole}.${tenths}${thousandths}${hundredths}`)))], `${expandedThousandths(number)} equals ${trimDecimal(fixedDecimal(number))}.`, `5.2A-b-${index}`));
  }
  return questions;
}

function build52B() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const left = Number(`${(index % 6) + 1}.${(index * 3) % 10}${(index * 5) % 10}${(index * 7) % 10}`);
    const right = Number(`${(index % 6) + 1}.${(index * 2) % 10}${(index * 4) % 10}${(index * 6) % 10}`);
    const correct = left > right ? ">" : left < right ? "<" : "=";
    questions.push(makeQuestion(`Which symbol makes this true? ${trimDecimal(fixedDecimal(left))} __ ${trimDecimal(fixedDecimal(right))}`, correct, [correct === ">" ? "<" : ">", "=", "<>"], `Compare decimals by whole-number parts, tenths, hundredths, and thousandths.`, `5.2B-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const values = [
      Number(`0.${(index + 1) % 10}${(index * 2) % 10}${(index * 3) % 10}`),
      Number(`0.${(index + 2) % 10}${(index * 4) % 10}${(index * 5) % 10}`),
      Number(`0.${(index + 3) % 10}${(index * 6) % 10}${(index * 7) % 10}`),
      Number(`0.${(index + 4) % 10}${(index * 8) % 10}${(index * 9) % 10}`)
    ];
    const correct = values.slice().sort((a, b) => a - b).map((value) => trimDecimal(fixedDecimal(value))).join(", ");
    const wrongA = values.slice().sort((a, b) => b - a).map((value) => trimDecimal(fixedDecimal(value))).join(", ");
    const wrongB = [values[0], values[2], values[1], values[3]].map((value) => trimDecimal(fixedDecimal(value))).join(", ");
    const wrongC = [values[3], values[1], values[0], values[2]].map((value) => trimDecimal(fixedDecimal(value))).join(", ");
    questions.push(makeQuestion(`Which list is in ascending order? ${values.map((value) => trimDecimal(fixedDecimal(value))).join(", ")}`, correct, [wrongA, wrongB, wrongC], `Order decimals from least to greatest by comparing place values.`, `5.2B-b-${index}`));
  }
  return questions;
}

function build52C() {
  const questions = [];
  const places = [
    ["nearest tenth", 1],
    ["nearest hundredth", 2]
  ];
  for (let index = 0; index < 50; index += 1) {
    const [label, digits] = pick(places, index);
    const whole = (index % 8) + 1;
    const tenths = (index * 3) % 10;
    const hundredths = (index * 5) % 10;
    const thousandths = (index * 7) % 10;
    const number = Number(`${whole}.${tenths}${hundredths}${thousandths}`);
    const rounded = Number(number.toFixed(digits));
    const placeValue = digits === 1 ? 0.1 : 0.01;
    questions.push(makeQuestion(`Round ${trimDecimal(fixedDecimal(number))} to the ${label}.`, trimDecimal(rounded.toFixed(digits)), [trimDecimal((rounded + placeValue).toFixed(digits)), trimDecimal(Math.max(0, rounded - placeValue).toFixed(digits)), trimDecimal(number.toFixed(3))], `${trimDecimal(fixedDecimal(number))} rounds to ${trimDecimal(rounded.toFixed(digits))} at the ${label}.`, `5.2C-${index}`));
  }
  return questions;
}

function build54A() {
  const questions = [];
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
  const composites = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 25];
  for (let index = 0; index < 25; index += 1) {
    const number = index % 2 === 0 ? pick(primes, index) : pick(composites, index);
    const correct = primes.includes(number) ? "prime" : "composite";
    questions.push(makeQuestion(`How should ${number} be classified?`, correct, [correct === "prime" ? "composite" : "prime", "neither", "even only"], `A prime number has exactly two factors. A composite number has more than two factors.`, `5.4A-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const correct = index % 2 === 0 ? pick(primes, index, 2) : pick(composites, index, 2);
    const pool = index % 2 === 0 ? composites : primes;
    questions.push(makeQuestion(index % 2 === 0 ? "Which number is prime?" : "Which number is composite?", String(correct), [String(pick(pool, index)), String(pick(pool, index, 3)), String(pick(pool, index, 5))], `Use factor pairs to decide whether the number is prime or composite.`, `5.4A-b-${index}`));
  }
  return questions;
}

function build54E() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const a = (index % 6) + 2;
    const b = ((index + 3) % 7) + 2;
    const c = ((index + 5) % 8) + 2;
    questions.push(makeQuestion(`In the expression ${a} x (${b} + ${c}), what do the parentheses tell you to do first?`, `Add ${b} and ${c}`, [`Multiply ${a} and ${b}`, `Multiply ${a} and ${c}`, `Add ${a} and ${b}`], `Parentheses tell which part of an expression should be evaluated first.`, `5.4E-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const a = (index % 6) + 3;
    const b = ((index + 2) % 7) + 4;
    const c = ((index + 4) % 5) + 2;
    questions.push(makeQuestion(`Which expression means "multiply ${a} by the sum of ${b} and ${c}"?`, `${a} x (${b} + ${c})`, [`${a} x ${b} + ${c}`, `${a} + (${b} x ${c})`, `(${a} + ${b}) x ${c}`], `Parentheses and brackets show how numbers are grouped in a numeric expression.`, `5.4E-b-${index}`));
  }
  return questions;
}

function build54F() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const a = (index % 6) + 2;
    const b = ((index + 1) % 7) + 3;
    const c = ((index + 2) % 5) + 4;
    const answer = a * (b + c);
    questions.push(makeQuestion(`Simplify ${a} x (${b} + ${c}).`, formatNumber(answer), [formatNumber(answer + a), formatNumber(answer - a), formatNumber(a + b + c)], `Evaluate inside the parentheses first, then multiply.`, `5.4F-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const a = (index % 5) + 20;
    const b = ((index + 2) % 6) + 2;
    const c = ((index + 4) % 7) + 3;
    const answer = a - (b * c);
    questions.push(makeQuestion(`Simplify ${a} - [${b} x ${c}].`, formatNumber(answer), [formatNumber(answer + b), formatNumber(answer - b), formatNumber(a - b - c)], `Evaluate the grouped multiplication first, then subtract.`, `5.4F-b-${index}`));
  }
  return questions;
}

function build53A() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const left = 240 + index * 17;
    const right = 360 + index * 13;
    const estimate = Math.round(left / 10) * 10 + Math.round(right / 10) * 10;
    questions.push(makeQuestion(`Which is the best estimate for ${formatNumber(left)} + ${formatNumber(right)}?`, formatNumber(estimate), [formatNumber(estimate + 10), formatNumber(Math.max(0, estimate - 10)), formatNumber(left + right)], `Round to friendly numbers to estimate the sum.`, `5.3A-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    if (index % 2 === 0) {
      const left = 28 + (index % 8) * 10;
      const right = 41 + (index % 5) * 10;
      const estimate = Math.round(left / 10) * 10 * (Math.round(right / 10) * 10);
      questions.push(makeQuestion(`Which is the best estimate for ${left} x ${right}?`, formatNumber(estimate), [formatNumber(estimate + 100), formatNumber(Math.max(0, estimate - 100)), formatNumber(left * right)], `Use compatible numbers or rounding to estimate the product.`, `5.3A-b-${index}`));
    } else {
      const divisor = pick([4, 5, 6, 8, 9], index);
      const compatibleDividend = divisor * (((index + 2) % 7) * 10 + 20);
      const dividend = compatibleDividend + pick([-6, -3, 4, 7], index);
      const estimate = compatibleDividend / divisor;
      questions.push(makeQuestion(`Which is the best estimate for ${formatNumber(dividend)} / ${divisor}?`, formatNumber(estimate), [formatNumber(estimate + 10), formatNumber(Math.max(0, estimate - 10)), formatNumber(Math.round(dividend / divisor))], `Choose a nearby compatible dividend that divides easily by the divisor.`, `5.3A-b-${index}`));
    }
  }
  return questions;
}

function build53B() {
  const questions = [];
  for (let index = 0; index < 50; index += 1) {
    const left = index % 2 === 0 ? 100 + index * 11 : 1000 + index * 23;
    const right = 12 + (index % 15);
    const answer = left * right;
    questions.push(makeQuestion(`Find ${formatNumber(left)} x ${right}.`, formatNumber(answer), [formatNumber(answer + right), formatNumber(answer - right), formatNumber(left + right)], `Use the standard algorithm to multiply the whole numbers.`, `5.3B-${index}`));
  }
  return questions;
}

function build53C() {
  const questions = [];
  for (let index = 0; index < 50; index += 1) {
    const divisor = 12 + (index % 13);
    const quotient = 15 + ((index * 3) % 65);
    const dividend = divisor * quotient;
    questions.push(makeQuestion(`Find ${formatNumber(dividend)} / ${divisor}.`, formatNumber(quotient), [formatNumber(quotient + 1), formatNumber(Math.max(1, quotient - 1)), formatNumber(divisor + quotient)], `Use the standard algorithm or another valid strategy to divide the whole numbers.`, `5.3C-${index}`));
  }
  return questions;
}

function build53D() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const tenthsA = (index % 8) + 1;
    const tenthsB = ((index + 3) % 8) + 1;
    const product = tenthsA * tenthsB;
    questions.push(makeQuestion(`An area model shows ${tenthsA} tenths multiplied by ${tenthsB} tenths. What decimal product does the overlap represent?`, trimDecimal(fixedDecimal(product / 100, 2)), [trimDecimal(fixedDecimal(product / 10, 2)), trimDecimal(fixedDecimal((tenthsA + tenthsB) / 10, 2)), trimDecimal(fixedDecimal((product + 10) / 100, 2))], `${tenthsA} tenths times ${tenthsB} tenths is ${product} hundredths.`, `5.3D-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const left = Number(`${(index % 4) + 1}.${(index * 2) % 10}`);
    const right = Number(`0.${((index + 3) % 8) + 1}`);
    const product = left * right;
    questions.push(makeQuestion(`A model represents ${trimDecimal(left.toFixed(1))} x ${trimDecimal(right.toFixed(1))}. Which product matches the model?`, trimDecimal(fixedDecimal(product, 2)), [trimDecimal(fixedDecimal(product + 0.1, 2)), trimDecimal(fixedDecimal(Math.max(0, product - 0.1), 2)), trimDecimal(fixedDecimal(left + right, 2))], `Use place value to interpret the decimal multiplication model.`, `5.3D-b-${index}`));
  }
  return questions;
}

function build53E() {
  const questions = [];
  for (let index = 0; index < 50; index += 1) {
    const left = Number(`${(index % 7) + 1}.${(index * 2) % 10}`);
    const right = Number(`${((index + 3) % 4) + 1}.${(index * 5) % 10}`);
    const product = left * right;
    questions.push(makeQuestion(`Find ${trimDecimal(left.toFixed(1))} x ${trimDecimal(right.toFixed(1))}.`, trimDecimal(fixedDecimal(product, 2)), [trimDecimal(fixedDecimal(product + 0.1, 2)), trimDecimal(fixedDecimal(Math.max(0, product - 0.1), 2)), trimDecimal(fixedDecimal(left + right, 2))], `Multiply the decimals using place-value understanding and keep the product to the hundredths place.`, `5.3E-${index}`));
  }
  return questions;
}

function build53F() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const dividend = Number(`${(index % 5) + 2}.${(index * 4) % 10}`);
    const divisor = (index % 8) + 2;
    const quotient = dividend / divisor;
    questions.push(makeQuestion(`Which equation represents sharing ${trimDecimal(dividend.toFixed(1))} equally among ${divisor} groups?`, `${trimDecimal(dividend.toFixed(1))} / ${divisor} = ${trimDecimal(fixedDecimal(quotient, 2))}`, [`${divisor} / ${trimDecimal(dividend.toFixed(1))} = ${trimDecimal(fixedDecimal(quotient, 2))}`, `${trimDecimal(dividend.toFixed(1))} x ${divisor} = ${trimDecimal(fixedDecimal(quotient, 2))}`, `${trimDecimal(dividend.toFixed(1))} + ${divisor} = ${trimDecimal(fixedDecimal(quotient, 2))}`], `A quotient model for decimal division shows the total amount shared into equal groups.`, `5.3F-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const dividend = Number(`${(index % 3) + 1}.${(index * 3) % 10}${(index * 7) % 10}`);
    const divisor = pick([4, 5, 8, 10, 20], index);
    const quotient = dividend / divisor;
    questions.push(makeQuestion(`A strip diagram shows ${trimDecimal(fixedDecimal(dividend, 2))} split into ${divisor} equal parts. What quotient should the model show for each part?`, trimDecimal(fixedDecimal(quotient, 2)), [trimDecimal(fixedDecimal(quotient + 0.1, 2)), trimDecimal(fixedDecimal(Math.max(0, quotient - 0.1), 2)), trimDecimal(fixedDecimal(dividend * divisor, 2))], `Each equal part in the model is the quotient.`, `5.3F-b-${index}`));
  }
  return questions;
}

function build53G() {
  const questions = [];
  for (let index = 0; index < 50; index += 1) {
    const divisor = pick([4, 5, 8, 10, 20], index);
    const quotient = Number(`${(index % 5) + 1}.${(index * 3) % 10}${(index * 7) % 10}`);
    const dividend = quotient * divisor;
    questions.push(makeQuestion(`Find ${trimDecimal(fixedDecimal(dividend, 2))} / ${divisor}.`, trimDecimal(fixedDecimal(quotient, 2)), [trimDecimal(fixedDecimal(quotient + 0.1, 2)), trimDecimal(fixedDecimal(Math.max(0, quotient - 0.1), 2)), trimDecimal(fixedDecimal(dividend * divisor, 2))], `Use decimal division strategies or the standard algorithm to find the quotient.`, `5.3G-${index}`));
  }
  return questions;
}

function build53H() {
  const questions = [];
  const pairs = [
    [1, 2, 1, 4],
    [1, 3, 1, 6],
    [3, 4, 1, 8],
    [2, 5, 1, 10],
    [5, 6, 1, 3],
    [3, 8, 1, 4]
  ];
  for (let index = 0; index < 25; index += 1) {
    const [a, b, c, d] = pick(pairs, index);
    const common = lcm(b, d);
    const numerator = a * (common / b) + c * (common / d);
    questions.push(makeQuestion(`What is ${fraction(a, b)} + ${fraction(c, d)}?`, fractionOrWhole(numerator, common), [fractionOrWhole(numerator + 1, common), fractionOrWhole(Math.max(1, numerator - 1), common), fractionOrWhole(a + c, b + d)], `Find a common denominator, add the numerators, and simplify if needed.`, `5.3H-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const [a, b, c, d] = pick(pairs, index, 2);
    const common = lcm(b, d);
    const numerator = a * (common / b) - c * (common / d);
    questions.push(makeQuestion(`What is ${fraction(a, b)} - ${fraction(c, d)}?`, fractionOrWhole(numerator, common), [fractionOrWhole(numerator + 1, common), fractionOrWhole(Math.max(1, numerator - 1), common), fractionOrWhole(Math.abs(a - c), b + d)], `Find a common denominator, subtract the numerators, and simplify if needed.`, `5.3H-b-${index}`));
  }
  return questions;
}

function build53I() {
  const questions = [];
  for (let index = 0; index < 50; index += 1) {
    const whole = (index % 6) + 2;
    const numerator = ((index + 2) % 5) + 1;
    const denominator = pick([2, 3, 4, 5, 6, 8], index);
    const productNumerator = whole * numerator;
    questions.push(makeQuestion(`What is ${whole} x ${fraction(numerator, denominator)}?`, fractionOrWhole(productNumerator, denominator), [fractionOrWhole(productNumerator + denominator, denominator), fractionOrWhole(Math.max(1, productNumerator - denominator), denominator), fractionOrWhole(whole + numerator, denominator)], `Multiply the whole number by the numerator and keep the denominator the same, then simplify if possible.`, `5.3I-${index}`));
  }
  return questions;
}

function build53J() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const denominator = pick([2, 3, 4, 5, 6, 8], index);
    const whole = (index % 5) + 2;
    questions.push(makeQuestion(`Which equation represents ${whole} divided by ${fraction(1, denominator)}?`, `${whole} / ${fraction(1, denominator)} = ${whole * denominator}`, [`${fraction(1, denominator)} / ${whole} = ${whole * denominator}`, `${whole} / ${fraction(1, denominator)} = ${whole + denominator}`, `${whole} x ${fraction(1, denominator)} = ${whole * denominator}`], `Dividing by a unit fraction asks how many of those unit fractions fit into the whole number.`, `5.3J-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const denominator = pick([2, 3, 4, 5, 6, 8], index, 2);
    const whole = (index % 6) + 2;
    questions.push(makeQuestion(`Which equation represents ${fraction(1, denominator)} divided by ${whole}?`, `${fraction(1, denominator)} / ${whole} = ${fraction(1, denominator * whole)}`, [`${fraction(1, denominator)} / ${whole} = ${fraction(whole, denominator)}`, `${fraction(1, denominator)} / ${whole} = ${fraction(1, Math.max(1, denominator - whole))}`, `${fraction(1, denominator)} x ${whole} = ${fraction(1, denominator * whole)}`], `Dividing a unit fraction by a whole number makes smaller equal parts.`, `5.3J-b-${index}`));
  }
  return questions;
}

function build53K() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const left = Number(`${(index % 7) + 1}.${(index * 2) % 10}${(index * 3) % 10}`);
    const right = Number(`${((index + 3) % 5) + 1}.${(index * 4) % 10}${(index * 5) % 10}`);
    const answer = index % 2 === 0 ? left + right : Math.max(left, right) - Math.min(left, right);
    const prompt = index % 2 === 0 ? `${trimDecimal(fixedDecimal(left, 2))} + ${trimDecimal(fixedDecimal(right, 2))}` : `${trimDecimal(fixedDecimal(Math.max(left, right), 2))} - ${trimDecimal(fixedDecimal(Math.min(left, right), 2))}`;
    questions.push(makeQuestion(`Find ${prompt}.`, trimDecimal(fixedDecimal(answer, 2)), [trimDecimal(fixedDecimal(answer + 0.1, 2)), trimDecimal(fixedDecimal(Math.max(0, answer - 0.1), 2)), trimDecimal(fixedDecimal(left + right, 2))], `Positive rational numbers can be decimals, and they can be added or subtracted using place-value understanding.`, `5.3K-a-${index}`));
  }
  const pairs = [
    [1, 2, 1, 4],
    [2, 3, 1, 6],
    [3, 4, 1, 8],
    [2, 5, 3, 10],
    [5, 6, 1, 3]
  ];
  for (let index = 0; index < 25; index += 1) {
    const [a, b, c, d] = pick(pairs, index);
    const common = lcm(b, d);
    const numerator = index % 2 === 0 ? a * (common / b) + c * (common / d) : a * (common / b) - c * (common / d);
    const prompt = index % 2 === 0 ? `${fraction(a, b)} + ${fraction(c, d)}` : `${fraction(a, b)} - ${fraction(c, d)}`;
    questions.push(makeQuestion(`Find ${prompt}.`, fractionOrWhole(numerator, common), [fractionOrWhole(numerator + 1, common), fractionOrWhole(Math.max(1, numerator - 1), common), fractionOrWhole(a + c, b + d)], `Positive rational numbers can also be fractions that are added or subtracted using equivalent fractions.`, `5.3K-b-${index}`));
  }
  return questions;
}

function build53L() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const whole = (index % 6) + 2;
    const denominator = pick([2, 3, 4, 5, 6, 8], index);
    questions.push(makeQuestion(`What is ${whole} / ${fraction(1, denominator)}?`, formatNumber(whole * denominator), [formatNumber(whole + denominator), formatNumber(Math.max(1, whole * denominator - denominator)), formatNumber(whole)], `Dividing by a unit fraction tells how many of those fractional parts fit in the whole number.`, `5.3L-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const denominator = pick([2, 3, 4, 5, 6, 8], index, 3);
    const whole = (index % 5) + 2;
    questions.push(makeQuestion(`What is ${fraction(1, denominator)} / ${whole}?`, fraction(1, denominator * whole), [fraction(1, Math.max(1, denominator * (whole - 1))), fraction(whole, denominator), fraction(1, denominator + whole)], `Dividing a unit fraction by a whole number splits the unit fraction into more equal parts.`, `5.3L-b-${index}`));
  }
  return questions;
}

function build54B() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const packs = (index % 6) + 3;
    const perPack = ((index + 2) % 7) + 4;
    const extra = (index % 5) + 2;
    questions.push(makeQuestion(`Which equation with x best represents this problem? A class buys ${packs} packs of pencils with ${perPack} pencils in each pack and then receives ${extra} more pencils. How many pencils does the class have?`, `x = (${packs} x ${perPack}) + ${extra}`, [`x = ${packs} + ${perPack} + ${extra}`, `x = (${packs} x ${perPack}) - ${extra}`, `x = ${packs} x (${perPack} + ${extra})`], `A multiplication step shows the equal groups, and then the extra amount is added.`, `5.4B-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const groups = (index % 6) + 3;
    const perGroup = ((index + 4) % 6) + 5;
    const remove = (index % 4) + 2;
    const total = groups * perGroup - remove;
    questions.push(makeQuestion(`Which equation with x best represents this problem? A teacher had ${total} markers after using ${remove} markers from ${groups} equal groups. How many markers were in each group at first?`, `x = (${total} + ${remove}) / ${groups}`, [`x = (${total} - ${remove}) / ${groups}`, `x = ${groups} x ${remove}`, `x = (${groups} + ${remove}) / ${total}`], `Undo the subtraction first, then divide by the number of equal groups.`, `5.4B-b-${index}`));
  }
  return questions;
}

function build54C() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const a = (index % 5) + 2;
    const x = (index % 6) + 1;
    const y = a * x;
    questions.push(makeQuestion(`If a rule is y = ${a}x, what is y when x = ${x}?`, formatNumber(y), [formatNumber(y + a), formatNumber(Math.max(0, y - a)), formatNumber(x + a)], `Substitute the x-value into the rule and multiply.`, `5.4C-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const addend = (index % 7) + 3;
    const x = ((index + 2) % 6) + 1;
    const y = x + addend;
    questions.push(makeQuestion(`If a rule is y = x + ${addend}, which ordered pair is on the graph?`, `(${x}, ${y})`, [`(${x}, ${y + 1})`, `(${y}, ${x})`, `(${x + 1}, ${y})`], `Use the rule to calculate y from x, then write the ordered pair.`, `5.4C-b-${index}`));
  }
  return questions;
}

function build54D() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const type = index % 2 === 0 ? "additive" : "multiplicative";
    const table = type === "additive" ? "1->4, 2->7, 3->10, 4->13" : "1->3, 2->6, 3->9, 4->12";
    questions.push(makeQuestion(`Is this pattern additive or multiplicative? ${table}`, type, [type === "additive" ? "multiplicative" : "additive", "both", "neither"], `Additive patterns change by a constant difference. Multiplicative patterns change by a constant factor.`, `5.4D-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const type = index % 2 === 0 ? "additive" : "multiplicative";
    const start = (index % 4) + 2;
    const change = (index % 5) + 2;
    const sequence = type === "additive" ? `${start}, ${start + change}, ${start + 2 * change}, ${start + 3 * change}` : `${start}, ${start * change}, ${start * change * change}, ${start * change * change * change}`;
    const next = type === "additive" ? start + 4 * change : start * change * change * change * change;
    questions.push(makeQuestion(`The pattern is ${sequence}. Which number comes next?`, formatNumber(next), [formatNumber(type === "additive" ? next + change : next + change), formatNumber(type === "additive" ? next - change : Math.max(1, next / change)), formatNumber(start + change)], `Use the constant difference or constant factor to continue the pattern.`, `5.4D-b-${index}`));
  }
  return questions;
}

function build54H() {
  const questions = [];
  for (let index = 0; index < 18; index += 1) {
    const length = (index % 8) + 6;
    const width = ((index + 3) % 6) + 4;
    const perimeter = 2 * (length + width);
    questions.push(makeQuestion(`A rectangle is ${length} units long and ${width} units wide. What is its perimeter?`, `${perimeter} units`, [`${length * width} units`, `${length + width} units`, `${perimeter + 2} units`], `Perimeter is the distance around the figure.`, `5.4H-a-${index}`));
  }
  for (let index = 0; index < 16; index += 1) {
    const length = (index % 7) + 5;
    const width = ((index + 2) % 5) + 3;
    const area = length * width;
    questions.push(makeQuestion(`A rectangle is ${length} units long and ${width} units wide. What is its area?`, `${area} square units`, [`${2 * (length + width)} square units`, `${length + width} square units`, `${area + length} square units`], `Area of a rectangle is length times width.`, `5.4H-b-${index}`));
  }
  for (let index = 0; index < 16; index += 1) {
    const length = (index % 5) + 3;
    const width = ((index + 2) % 4) + 2;
    const height = ((index + 3) % 6) + 2;
    const volume = length * width * height;
    questions.push(makeQuestion(`A rectangular prism measures ${length} by ${width} by ${height} units. What is its volume?`, `${volume} cubic units`, [`${2 * (length + width + height)} cubic units`, `${length * width} cubic units`, `${volume + length} cubic units`], `Volume of a rectangular prism is length times width times height.`, `5.4H-c-${index}`));
  }
  return questions;
}

function build55A() {
  const questions = [];
  const statements = [
    ["A square is always a rectangle", "true"],
    ["A rectangle is always a square", "false"],
    ["A square is always a parallelogram", "true"],
    ["A trapezoid always has two pairs of parallel sides", "false"],
    ["A rhombus always has four equal sides", "true"],
    ["A triangle is a quadrilateral", "false"]
  ];
  for (let index = 0; index < 25; index += 1) {
    const [statement, correct] = pick(statements, index);
    questions.push(makeQuestion(`Is this statement true or false? ${statement}.`, correct, [correct === "true" ? "false" : "true", "sometimes", "not enough information"], `Use the hierarchy of two-dimensional figures and their attributes.`, `5.5A-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const figure = pick([
      ["square", "rectangle"],
      ["square", "parallelogram"],
      ["rectangle", "quadrilateral"],
      ["rhombus", "quadrilateral"],
      ["parallelogram", "quadrilateral"]
    ], index);
    questions.push(makeQuestion(`A ${figure[0]} always belongs to which larger category?`, figure[1], uniqueStrings(["triangle", "circle", "pentagon", "rectangle", "parallelogram", "quadrilateral"].filter((value) => value !== figure[1]).slice(0, 3)), `Use the attributes of the figure to place it in the correct hierarchy.`, `5.5A-b-${index}`));
  }
  return questions;
}

function build56A() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const length = (index % 4) + 2;
    const width = ((index + 2) % 4) + 2;
    const height = ((index + 3) % 4) + 2;
    const volume = length * width * height;
    questions.push(makeQuestion(`A rectangular prism is built with ${height} layers. Each layer has ${length * width} unit cubes. How many unit cubes are used in all?`, formatNumber(volume), [formatNumber(volume + length), formatNumber(volume - length), formatNumber(length + width + height)], `Volume is the number of unit cubes needed to fill the prism without gaps or overlaps.`, `5.6A-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const correct = "The number of unit cubes needed to fill a solid figure without gaps or overlaps";
    questions.push(makeQuestion(`Which statement describes volume?`, correct, ["The distance around a figure", "The amount of area on the top surface only", "The length of one edge of a figure"], `Volume measures the space inside a three-dimensional figure.`, `5.6A-b-${index}`));
  }
  return questions;
}

function build56B() {
  const questions = [];
  for (let index = 0; index < 50; index += 1) {
    const length = (index % 5) + 3;
    const width = ((index + 2) % 4) + 2;
    const height = ((index + 3) % 6) + 2;
    const volume = length * width * height;
    questions.push(makeQuestion(`Find the volume of a rectangular prism with length ${length} units, width ${width} units, and height ${height} units.`, `${volume} cubic units`, [`${2 * (length + width + height)} cubic units`, `${length * width} cubic units`, `${volume + width} cubic units`], `Use V = l x w x h for a rectangular prism.`, `5.6B-${index}`));
  }
  return questions;
}

function build57A() {
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
    questions.push(makeQuestion(`Table: ${tableText}. How many ${toUnit} are in ${amount} ${fromUnit}?`, formatNumber(amount * factor), [formatNumber(amount * factor + factor), formatNumber(Math.max(1, amount * factor - factor)), formatNumber(amount + factor)], `Use the conversion table to multiply by the number of smaller units in one larger unit.`, `5.7A-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const [tableText, fromUnit, toUnit, factor] = pick(tables, index, 2);
    const amount = ((index % 5) + 2) * factor;
    questions.push(makeQuestion(`Table: ${tableText}. ${amount} ${toUnit} is equal to how many ${fromUnit}?`, formatNumber(amount / factor), [formatNumber(amount / factor + 1), formatNumber(Math.max(1, amount / factor - 1)), formatNumber(amount * factor)], `Use the conversion table to divide by the number of smaller units in one larger unit.`, `5.7A-b-${index}`));
  }
  return questions;
}

function build58A() {
  const questions = [];
  const definitions = [
    ["origin", "(0, 0)"],
    ["x-axis", "the horizontal axis"],
    ["y-axis", "the vertical axis"],
    ["x-coordinate", "the first number in an ordered pair"],
    ["y-coordinate", "the second number in an ordered pair"],
    ["ordered pair", "a pair of numbers that names a point"]
  ];
  for (let index = 0; index < 25; index += 1) {
    const [term, correct] = pick(definitions, index);
    questions.push(makeQuestion(`Which description matches ${term}?`, correct, definitions.map((entry) => entry[1]).filter((value) => value !== correct).slice(0, 3), `Use the vocabulary of the coordinate plane to match the term and description.`, `5.8A-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const [term, correct] = pick(definitions, index, 2);
    questions.push(makeQuestion(`Which term matches this description: ${correct}?`, term, definitions.map((entry) => entry[0]).filter((value) => value !== term).slice(0, 3), `Each part of the coordinate plane has a specific name and purpose.`, `5.8A-b-${index}`));
  }
  return questions;
}

function build58B() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const x = (index % 8) + 1;
    const y = ((index + 3) % 8) + 1;
    questions.push(makeQuestion(`To graph the point (${x}, ${y}), what should you do first?`, `Move ${x} units right on the x-axis`, [`Move ${y} units up on the y-axis`, `Move ${x} units left on the x-axis`, `Start anywhere on the grid`], `Graph an ordered pair by starting at the origin, moving along the x-axis first, and then moving vertically.`, `5.8B-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const x = (index % 7) + 2;
    const y = ((index + 4) % 7) + 2;
    questions.push(makeQuestion(`After moving ${x} units right from the origin to graph (${x}, ${y}), what is the next step?`, `Move ${y} units up`, [`Move ${x} more units right`, `Move ${y} units left`, `Go back to the origin`], `The second number in an ordered pair tells how far to move on the y-axis.`, `5.8B-b-${index}`));
  }
  return questions;
}

function build58C() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const x = (index % 8) + 1;
    const y = ((index + 2) % 8) + 1;
    questions.push(makeQuestion(`A point is ${x} units right and ${y} units up from the origin. Which ordered pair names the point?`, `(${x}, ${y})`, [`(${y}, ${x})`, `(${x}, ${Math.max(0, y - 1)})`, `(${Math.max(0, x - 1)}, ${y})`], `The first number tells horizontal movement and the second tells vertical movement.`, `5.8C-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const rule = (index % 4) + 2;
    const x = (index % 5) + 1;
    const y = rule * x;
    questions.push(makeQuestion(`A numerical pattern follows y = ${rule}x. Which ordered pair belongs on the graph?`, `(${x}, ${y})`, [`(${y}, ${x})`, `(${x}, ${y + rule})`, `(${x + 1}, ${y})`], `Substitute x into the rule to find the ordered pair that should be graphed.`, `5.8C-b-${index}`));
  }
  return questions;
}

function build59A() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const data = index % 2 === 0 ? ["2", "2", "3", "3", "3", "4"] : ["1/4", "1/2", "1/2", "3/4", "3/4", "3/4"];
    const rows = countLabels(data);
    const correct = frequencyTableText(rows);
    const wrongA = frequencyTableText(rows.map(([label, count], rowIndex) => [label, rowIndex === 0 ? count + 1 : count]));
    const wrongB = frequencyTableText(rows.map(([label, count], rowIndex) => [label, rowIndex === 1 ? Math.max(0, count - 1) : count]));
    const wrongC = frequencyTableText(rows.slice().reverse());
    questions.push(makeQuestion(`Which frequency table correctly represents this data set: ${data.join(", ")}?`, correct, [wrongA, wrongB, wrongC], `A frequency table records how many times each data value appears.`, `5.9A-a-${index}`));
  }
  for (let index = 0; index < 13; index += 1) {
    const rows = [["1", 2], ["2", 3], ["3", 1]];
    const correct = dotPlotText(rows);
    const wrongA = dotPlotText(rows.map(([label, count], rowIndex) => [label, rowIndex === 0 ? count + 1 : count]));
    const wrongB = dotPlotText(rows.map(([label, count], rowIndex) => [label, rowIndex === 1 ? Math.max(0, count - 1) : count]));
    const wrongC = dotPlotText(rows.slice().reverse());
    questions.push(makeQuestion(`Which dot plot summary correctly represents this data set: 1, 1, 2, 2, 2, 3?`, correct, [wrongA, wrongB, wrongC], `A dot plot uses one mark for each data value.`, `5.9A-b-${index}`));
  }
  for (let index = 13; index < 25; index += 1) {
    const correct = `${stemLeafText(1, [2, 4, 7])}; ${stemLeafText(2, [0, 3, 8])}`;
    const wrongA = `${stemLeafText(1, [2, 4])}; ${stemLeafText(2, [0, 3, 8])}`;
    const wrongB = `${stemLeafText(1, [2, 4, 7])}; ${stemLeafText(2, [0, 8])}`;
    const wrongC = `${stemLeafText(1, [2, 7, 4])}; ${stemLeafText(2, [0, 3, 8])}`;
    questions.push(makeQuestion(`Which stem-and-leaf plot correctly shows the data set 12, 14, 17, 20, 23, 28?`, correct, [wrongA, wrongB, wrongC], `A stem-and-leaf plot groups the tens as stems and the ones as leaves in order.`, `5.9A-b-${index}`));
  }
  return questions;
}

function build59B() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const x = (index % 8) + 1;
    const y = ((index + 2) % 8) + 2;
    questions.push(makeQuestion(`A scatterplot includes a point with x-value ${x} and y-value ${y}. Which ordered pair should be plotted?`, `(${x}, ${y})`, [`(${y}, ${x})`, `(${x}, ${y + 1})`, `(${x + 1}, ${y})`], `A point on a scatterplot is represented by its ordered pair.`, `5.9B-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const x = (index % 6) + 1;
    const y = 2 * x + 1;
    questions.push(makeQuestion(`A scatterplot shows the relationship between x and y for the rule y = 2x + 1. Which point belongs on the scatterplot?`, `(${x}, ${y})`, [`(${y}, ${x})`, `(${x}, ${y + 2})`, `(${x + 1}, ${y})`], `Use the rule to generate the ordered pair that belongs on the scatterplot.`, `5.9B-b-${index}`));
  }
  return questions;
}

function build59C() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const rows = [["red", 4 + (index % 3)], ["blue", 3 + (index % 2)], ["green", 2 + (index % 4)]];
    const table = frequencyTableText(rows);
    const answer = rows[0][1] + rows[1][1];
    questions.push(makeQuestion(`Frequency table: ${table}. How many students chose red or blue?`, formatNumber(answer), [formatNumber(answer + 1), formatNumber(Math.max(0, answer - 1)), formatNumber(rows[2][1])], `Add the frequencies for the two requested categories.`, `5.9C-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const points = [
      [1, 4],
      [2, 6],
      [3, 8],
      [4, 10]
    ];
    const totalY = points.reduce((sum, point) => sum + point[1], 0);
    questions.push(makeQuestion(`A scatterplot includes these ordered pairs: ${points.map((point) => `(${point[0]}, ${point[1]})`).join(", ")}. What is the total of the y-values?`, formatNumber(totalY), [formatNumber(totalY + 2), formatNumber(Math.max(0, totalY - 2)), formatNumber(points.length)], `Add the y-values from the paired data.`, `5.9C-b-${index}`));
  }
  return questions;
}

function build510A() {
  const questions = [];
  const cases = [
    ["money added to the cost of an item when it is bought", "sales tax"],
    ["money taken out of a paycheck for the government", "income tax"],
    ["money charged on land or a house", "property tax"]
  ];
  for (let index = 0; index < 25; index += 1) {
    const [prompt, correct] = pick(cases, index);
    questions.push(makeQuestion(`Which type of tax matches this description: ${prompt}?`, correct, uniqueStrings(cases.map((entry) => entry[1]).filter((value) => value !== correct)), `Different taxes are charged in different situations.`, `5.10A-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const [prompt, correct] = pick(cases, index, 1);
    questions.push(makeQuestion(`Which description matches ${correct}?`, prompt, cases.map((entry) => entry[0]).filter((value) => value !== prompt).slice(0, 3), `A tax is money collected by the government for public services.`, `5.10A-b-${index}`));
  }
  return questions;
}

function build510B() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const gross = 220 + index * 15;
    const deductions = 20 + (index % 8) * 5;
    const net = gross - deductions;
    questions.push(makeQuestion(`A worker earns $${gross} before deductions and has $${deductions} taken out. What is the net income?`, `$${net}`, [`$${gross}`, `$${deductions}`, `$${net + 5}`], `Net income is gross income minus deductions.`, `5.10B-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const gross = 300 + index * 12;
    const deductions = 25 + (index % 6) * 5;
    const net = gross - deductions;
    questions.push(makeQuestion(`Which amount is the gross income if net income is $${net} and deductions are $${deductions}?`, `$${gross}`, [`$${net}`, `$${gross - deductions}`, `$${gross + deductions}`], `Gross income is the amount earned before deductions.`, `5.10B-b-${index}`));
  }
  return questions;
}

function build510E() {
  const questions = [];
  const actions = [
    ["expenses are greater than income", "reduce expenses or increase income"],
    ["a budget does not balance because spending is too high", "cut some spending categories"],
    ["income is not enough to cover all planned purchases", "adjust the budget before spending"]
  ];
  for (let index = 0; index < 25; index += 1) {
    const [prompt, correct] = pick(actions, index);
    questions.push(makeQuestion(`If ${prompt}, what is the best budgeting action?`, correct, ["ignore the difference", "spend even more money", "avoid tracking the budget"], `A budget must be adjusted when expenses are greater than income.`, `5.10E-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const income = 180 + index * 10;
    const expenses = income + 20 + (index % 4) * 10;
    const gap = expenses - income;
    questions.push(makeQuestion(`A budget has income of $${income} and expenses of $${expenses}. How much must the student reduce expenses or add income to balance the budget?`, `$${gap}`, [`$${expenses}`, `$${income}`, `$${gap + 10}`], `Find the difference between expenses and income to see how much the budget is over.`, `5.10E-b-${index}`));
  }
  return questions;
}

function build510F() {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const income = 250 + index * 12;
    const expenses = 180 + index * 9;
    const balance = income - expenses;
    questions.push(makeQuestion(`A simple budget shows income of $${income} and expenses of $${expenses}. What is the balance?`, `$${balance}`, [`$${income + expenses}`, `$${expenses - income}`, `$${balance + 5}`], `Subtract expenses from income to find the budget balance.`, `5.10F-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const income = 320 + index * 11;
    const savingsGoal = 25 + (index % 6) * 5;
    const spending = 200 + index * 7;
    const balance = income - savingsGoal - spending;
    questions.push(makeQuestion(`A budget has income of $${income}, savings of $${savingsGoal}, and spending of $${spending}. How much money is left?`, `$${balance}`, [`$${income - spending}`, `$${savingsGoal + spending}`, `$${balance + 10}`], `Subtract both savings and spending from income to find the amount left in the budget.`, `5.10F-b-${index}`));
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
    tags: ["texas", "teks", "staar", "grade 5", "math", teksCode.toLowerCase().replace(".", "")],
    questions
  };
}

const QUIZ_BUILDERS = [
  ["5.1A", "Math Grade 5 5.1A", "Apply mathematics to problems arising in everyday life, society, and the workplace.", 0, "Mathematical Process Standards", "Core", () => buildProcessApply("5.1A")],
  ["5.1B", "Math Grade 5 5.1B", "Use a problem-solving model that incorporates analyzing information, formulating a plan, determining a solution, justifying the solution, and evaluating the problem-solving process and the reasonableness of the solution.", 0, "Mathematical Process Standards", "Core", () => buildProcessModel("5.1B")],
  ["5.1C", "Math Grade 5 5.1C", "Select tools, including real objects, manipulatives, paper and pencil, and technology as appropriate, and techniques, including mental math, estimation, and number sense as appropriate, to solve problems.", 0, "Mathematical Process Standards", "Core", () => buildProcessTools("5.1C")],
  ["5.1D", "Math Grade 5 5.1D", "Communicate mathematical ideas, reasoning, and their implications using multiple representations, including symbols, diagrams, graphs, and language as appropriate.", 0, "Mathematical Process Standards", "Core", () => buildProcessCommunicate("5.1D")],
  ["5.1E", "Math Grade 5 5.1E", "Create and use representations to organize, record, and communicate mathematical ideas.", 0, "Mathematical Process Standards", "Core", () => buildProcessRepresent("5.1E")],
  ["5.1F", "Math Grade 5 5.1F", "Analyze mathematical relationships to connect and communicate mathematical ideas.", 0, "Mathematical Process Standards", "Core", () => buildProcessRelationships("5.1F")],
  ["5.1G", "Math Grade 5 5.1G", "Display, explain, and justify mathematical ideas and arguments using precise mathematical language in written or oral communication.", 0, "Mathematical Process Standards", "Core", () => buildProcessLanguage("5.1G")],
  ["5.2A", "Math Grade 5 5.2A", "Represent the value of the digit in decimals through the thousandths using expanded notation and numerals.", 1, "Numerical Representations and Relationships", "Supporting", build52A],
  ["5.2B", "Math Grade 5 5.2B", "Compare and order two decimals to thousandths and represent comparisons using the symbols >, <, or =.", 1, "Numerical Representations and Relationships", "Readiness", build52B],
  ["5.2C", "Math Grade 5 5.2C", "Round decimals to tenths or hundredths.", 1, "Numerical Representations and Relationships", "Supporting", build52C],
  ["5.3A", "Math Grade 5 5.3A", "Estimate to determine solutions to mathematical and real-world problems involving addition, subtraction, multiplication, or division.", 2, "Computations and Algebraic Relationships", "Supporting", build53A],
  ["5.3B", "Math Grade 5 5.3B", "Multiply with fluency a three-digit number by a two-digit number and a four-digit number by a two-digit number using the standard algorithm.", 2, "Computations and Algebraic Relationships", "Readiness", build53B],
  ["5.3C", "Math Grade 5 5.3C", "Solve with proficiency for quotients of up to a four-digit dividend by a two-digit divisor using strategies and the standard algorithm.", 2, "Computations and Algebraic Relationships", "Readiness", build53C],
  ["5.3D", "Math Grade 5 5.3D", "Represent multiplication of decimals with products to the hundredths using objects and pictorial models, including area models.", 1, "Numerical Representations and Relationships", "Supporting", build53D],
  ["5.3E", "Math Grade 5 5.3E", "Solve for products of decimals to the hundredths, including situations involving money, using strategies based on place-value understandings, properties of operations, and the relationship to the multiplication of whole numbers.", 2, "Computations and Algebraic Relationships", "Readiness", build53E],
  ["5.3F", "Math Grade 5 5.3F", "Represent quotients of decimals to the hundredths, up to four digits divided by a two-digit whole number, using objects and pictorial models, including area models.", 1, "Numerical Representations and Relationships", "Supporting", build53F],
  ["5.3G", "Math Grade 5 5.3G", "Solve for quotients of decimals to the hundredths, up to four digits divided by a two-digit whole number, using strategies and algorithms.", 2, "Computations and Algebraic Relationships", "Readiness", build53G],
  ["5.3H", "Math Grade 5 5.3H", "Represent and solve addition and subtraction of fractions with unequal denominators referring to the same whole using objects and pictorial models and properties of operations.", 1, "Numerical Representations and Relationships", "Supporting", build53H],
  ["5.3I", "Math Grade 5 5.3I", "Represent and solve multiplication of a whole number and a fraction that refers to the same whole using objects and pictorial models, including area models.", 1, "Numerical Representations and Relationships", "Supporting", build53I],
  ["5.3J", "Math Grade 5 5.3J", "Represent division of a unit fraction by a whole number and the division of a whole number by a unit fraction using objects and pictorial models, including area models.", 1, "Numerical Representations and Relationships", "Supporting", build53J],
  ["5.3K", "Math Grade 5 5.3K", "Add and subtract positive rational numbers fluently.", 2, "Computations and Algebraic Relationships", "Readiness", build53K],
  ["5.3L", "Math Grade 5 5.3L", "Divide whole numbers by unit fractions and unit fractions by whole numbers.", 2, "Computations and Algebraic Relationships", "Readiness", build53L],
  ["5.4A", "Math Grade 5 5.4A", "Identify prime and composite numbers.", 1, "Numerical Representations and Relationships", "Supporting", build54A],
  ["5.4E", "Math Grade 5 5.4E", "Describe how the use of parentheses and brackets around two levels of grouping symbols helps determine the order in which operations are performed.", 2, "Computations and Algebraic Relationships", "Supporting", build54E],
  ["5.4F", "Math Grade 5 5.4F", "Simplify numerical expressions that do not involve exponents, including up to two levels of grouping.", 2, "Computations and Algebraic Relationships", "Supporting", build54F],
  ["5.4B", "Math Grade 5 5.4B", "Represent and solve multi-step problems involving the four operations with whole numbers using equations with a letter standing for the unknown quantity.", 2, "Computations and Algebraic Relationships", "Readiness", build54B],
  ["5.4C", "Math Grade 5 5.4C", "Generate a numerical pattern when given a rule in the form y = ax or y = x + a and graph.", 2, "Computations and Algebraic Relationships", "Supporting", build54C],
  ["5.4D", "Math Grade 5 5.4D", "Recognize the difference between additive and multiplicative numerical patterns given in a table or graph.", 2, "Computations and Algebraic Relationships", "Supporting", build54D],
  ["5.4H", "Math Grade 5 5.4H", "Represent and solve problems related to perimeter, area, and volume.", 3, "Geometry and Measurement", "Readiness", build54H],
  ["5.5A", "Math Grade 5 5.5A", "Classify two-dimensional figures in a hierarchy of sets and subsets using graphic organizers based on attributes and properties.", 3, "Geometry and Measurement", "Supporting", build55A],
  ["5.6A", "Math Grade 5 5.6A", "Recognize a cube with side length of one unit as a unit cube having one cubic unit of volume and determine the volume of a rectangular prism by counting unit cubes.", 3, "Geometry and Measurement", "Supporting", build56A],
  ["5.6B", "Math Grade 5 5.6B", "Determine the volume of a rectangular prism with whole-number side lengths in cubic units.", 3, "Geometry and Measurement", "Readiness", build56B],
  ["5.7A", "Math Grade 5 5.7A", "Solve problems by calculating conversions within a measurement system, customary or metric.", 3, "Geometry and Measurement", "Readiness", build57A],
  ["5.8A", "Math Grade 5 5.8A", "Describe the key attributes of the coordinate plane, including perpendicular number lines, the origin, and the x- and y-coordinates.", 3, "Geometry and Measurement", "Supporting", build58A],
  ["5.8B", "Math Grade 5 5.8B", "Describe the process for graphing ordered pairs of numbers in the first quadrant of the coordinate plane.", 3, "Geometry and Measurement", "Supporting", build58B],
  ["5.8C", "Math Grade 5 5.8C", "Graph in the first quadrant ordered pairs of numbers arising from mathematical and real-world problems, including those generated by number patterns or found in an input-output table.", 3, "Geometry and Measurement", "Supporting", build58C],
  ["5.9A", "Math Grade 5 5.9A", "Represent categorical data with bar graphs or frequency tables and numerical data, including fractions and decimals, with dot plots or stem-and-leaf plots.", 4, "Data Analysis and Personal Financial Literacy", "Supporting", build59A],
  ["5.9B", "Math Grade 5 5.9B", "Represent discrete paired data on a scatterplot.", 4, "Data Analysis and Personal Financial Literacy", "Supporting", build59B],
  ["5.9C", "Math Grade 5 5.9C", "Solve one- and two-step problems using data from frequency tables, dot plots, stem-and-leaf plots, scatterplots, and bar graphs.", 4, "Data Analysis and Personal Financial Literacy", "Readiness", build59C],
  ["5.10A", "Math Grade 5 5.10A", "Define income tax, payroll tax, sales tax, and property tax.", 4, "Data Analysis and Personal Financial Literacy", "Supporting", build510A],
  ["5.10B", "Math Grade 5 5.10B", "Explain the difference between gross income and net income.", 4, "Data Analysis and Personal Financial Literacy", "Supporting", build510B],
  ["5.10E", "Math Grade 5 5.10E", "Explain actions that can be taken to balance a budget when expenses exceed income.", 4, "Data Analysis and Personal Financial Literacy", "Supporting", build510E],
  ["5.10F", "Math Grade 5 5.10F", "Balance a simple budget.", 4, "Data Analysis and Personal Financial Literacy", "Supporting", build510F]
];

function generateQuizzes() {
  return QUIZ_BUILDERS.map(([teksCode, label, summary, , , , builder]) =>
    makeQuiz(
      `tx_grade5_math_${teksCode.toLowerCase().replace(".", "_")}`,
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
    const setId = `tx_grade5_math_${teksCode.toLowerCase().replace(".", "_")}`;
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
    title: "Grade 5 Math TEKS Implementation",
    source: {
      localPdf: LOCAL_PDF,
      officialAssessedCurriculum: ASSESSED_CURRICULUM_URL,
      officialBlueprint: BLUEPRINT_URL,
      notes: "Grade 5 Math implementation continues after Grade 4 was fully completed. The local 5thmath.pdf was used as a local reference, and the official TEA assessed curriculum and blueprint were used to define the Grade 5 STAAR scope."
    },
    namingConvention: "Math Grade 5 {TEKS}",
    questionTargetPerSet: 50,
    scope: {
      firstTeks: "5.1A",
      assessedFirstTeks: "5.2A",
      assessedLastTeks: "5.10F",
      implementedLastTeks: "5.10F",
      includedAssessedTeksCount: 36,
      includedImplementationTeksCount: QUIZ_BUILDERS.length,
      includedBeyondAssessedScope: ["5.1A", "5.1B", "5.1C", "5.1D", "5.1E", "5.1F", "5.1G"],
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
  console.log(`Wrote ${generatedQuizzes.length} Texas Grade 5 math TEKS sets and ${totalQuestions} questions to ${CUSTOM_QUIZZES_FILE}`);
  console.log(`Wrote Grade 5 implementation file to ${IMPLEMENTATION_FILE}`);
}

main();
