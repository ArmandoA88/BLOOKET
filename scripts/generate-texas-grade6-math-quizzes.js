const fs = require("fs");
const path = require("path");

const CUSTOM_QUIZZES_FILE = path.join(__dirname, "..", "data", "custom-quizzes.json");
const IMPLEMENTATION_FILE = path.join(__dirname, "..", "data", "grade6-math-staar-implementation.json");
const NOW = new Date().toISOString();
const GENERATED_BY = "Local Curriculum";
const CATEGORY = "Texas Grade 6 Math";
const LOCAL_PDF = "C:/Users/Casa-Desktop/Downloads/6thmath.pdf";
const ASSESSED_CURRICULUM_URL = "https://tea.texas.gov/student-assessment/staar/staar-6-math-assessed-curriculum.pdf";
const BLUEPRINT_URL = "https://tea.texas.gov/student-assessment/staar/staar-6-math-blueprint.pdf";
const GENERATED_IDS = new Set();

const ITEMS = ["tickets", "markers", "books", "stickers", "bags", "boxes", "cups", "pencils"];
const COLORS = ["red", "blue", "green", "yellow", "purple", "orange"];
const PROCESS_CODES = ["6.1A", "6.1B", "6.1C", "6.1D", "6.1E", "6.1F", "6.1G"];

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

function trimDecimal(value, digits = 3) {
  return String(Number(Number(value).toFixed(digits)));
}

function money(value) {
  return `$${Number(value).toFixed(2)}`;
}

function percentText(value) {
  return `${trimDecimal(value, 3)}%`;
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

function fractionOrWhole(numerator, denominator) {
  const factor = gcd(numerator, denominator);
  const left = numerator / factor;
  const right = denominator / factor;
  return right === 1 ? String(left) : fraction(left, right);
}

function sortNumbers(values) {
  return values.slice().sort((left, right) => left - right);
}

function median(values) {
  const sorted = sortNumbers(values);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function interquartileRange(values) {
  const sorted = sortNumbers(values);
  const middle = Math.floor(sorted.length / 2);
  const lower = sorted.slice(0, middle);
  const upper = sorted.slice(sorted.length % 2 === 0 ? middle : middle + 1);
  return median(upper) - median(lower);
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
    choices.push(formatNumber(amount - 1));
    choices.push(formatNumber(amount + 10));
  }
  if (/^-?\d+(\.\d+)?$/.test(correctText)) {
    const amount = Number(correctText);
    choices.push(trimDecimal(amount + 0.1));
    choices.push(trimDecimal(amount - 0.1));
    choices.push(trimDecimal(amount + 1));
  }
  if (/^\d+\/\d+$/.test(correctText)) {
    const [left, right] = correctText.split("/").map((piece) => Number(piece));
    choices.push(fraction(Math.max(1, left - 1), right));
    choices.push(fraction(left + 1, right));
    choices.push(fraction(left, right + 1));
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
    const item = pick(ITEMS, index);
    questions.push(makeQuestion(`Which situation best shows applying mathematics to a real-world problem involving ${item}?`, `Using numbers to decide which ${item} option costs less`, [`Picking the ${item} with the brightest color`, `Choosing the ${item} at random`, `Ignoring the prices completely`], `Applying mathematics means using numbers, measurements, or relationships to solve a real problem.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const count = (index % 12) + 18;
    const item = pick(ITEMS, index, 2);
    questions.push(makeQuestion(`A class needs enough ${item} for ${count} students. Which action shows using mathematics?`, `Use numbers to determine how many ${item} are needed`, [`Guess and hope there are enough ${item}`, `Choose the most colorful ${item}`, `Wait to solve it later`], `Mathematics helps solve real classroom and workplace problems by finding exact or reasonable amounts.`, `${code}-b-${index}`));
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
    questions.push(makeQuestion(`A student has just completed this step: ${steps[stage]}. What should happen next?`, steps[stage + 1], uniqueStrings(steps.filter((step) => step !== steps[stage + 1]).slice(0, 3)), `The problem-solving model moves from analyze, to plan, to solve, to justify, to evaluate.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const prompt = index % 2 === 0 ? "Why should a student check whether an answer is reasonable?" : "Why should a student justify a solution?";
    const correct = index % 2 === 0 ? "To see if the answer makes sense for the problem" : "To explain why the strategy and answer are correct";
    questions.push(makeQuestion(prompt, correct, ["To skip showing work", "To make numbers larger", "To avoid planning"], `Good problem solving includes explaining and checking the solution, not just writing an answer.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildProcessTools(code) {
  const toolCases = [
    ["show a decimal value", "base-ten blocks", ["protractor", "clock", "ruler"]],
    ["find the area of a triangle", "formula and calculator", ["thermometer", "paint brush", "dice"]],
    ["compare two ratios", "table or double number line", ["calendar", "thermometer", "abacus"]],
    ["estimate a product quickly", "mental math", ["random guessing", "sorting colors", "measuring height"]],
    ["solve a one-step equation", "inverse operations", ["counting only colors", "drawing a circle", "using a ruler"]]
  ];
  return Array.from({ length: 50 }, (_, index) => {
    const [task, correct, wrongs] = pick(toolCases, index);
    return makeQuestion(`Which tool or technique is most appropriate to ${task}?`, correct, wrongs, `Students should choose tools and techniques that fit the math task.`, `${code}-${index}`);
  });
}

function buildProcessCommunicate(code) {
  const cases = [
    ["compare two integers", "a number line and an inequality", ["a blank page", "a color choice", "a guess"]],
    ["show a percent model", "a 10 by 10 grid and words", ["an unlabeled drawing", "a random list", "a song title"]],
    ["justify a one-step equation solution", "equation steps and an explanation", ["only the final number", "an unrelated picture", "a favorite color"]],
    ["describe a data set", "a graph and a written summary", ["a blank table", "a doodle", "an unrelated number"]],
    ["show a ratio relationship", "a table and a verbal explanation", ["a blank page", "a guess", "a random shape"]]
  ];
  return Array.from({ length: 50 }, (_, index) => {
    const [task, correct, wrongs] = pick(cases, index);
    return makeQuestion(`Which choice best communicates a mathematical idea to ${task}?`, correct, wrongs, `Clear math communication uses words, symbols, diagrams, tables, or graphs together.`, `${code}-${index}`);
  });
}

function buildProcessRepresent(code) {
  const cases = [
    ["organize ratio data", "table", ["glue stick", "clock", "shoe box"]],
    ["show integer positions", "number line", ["paint brush", "folder", "calendar"]],
    ["represent percent of a whole", "10 by 10 grid", ["eraser", "string", "dice"]],
    ["show paired data", "scatterplot", ["flashlight", "bookmark", "crayon box"]],
    ["model a one-step equation", "strip diagram", ["dice", "shoe", "pencil pouch"]]
  ];
  return Array.from({ length: 50 }, (_, index) => {
    const [task, correct, wrongs] = pick(cases, index);
    return makeQuestion(`Which representation should a student create to ${task}?`, correct, wrongs, `A good representation helps organize, record, and communicate math ideas.`, `${code}-${index}`);
  });
}

function buildProcessRelationships(code) {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const x = (index % 6) + 1;
    const y = 3 * x;
    questions.push(makeQuestion(`Which equation shows the same relationship as the ordered pair (${x}, ${y})?`, "y = 3x", ["y = x + 3", "y = x - 3", "y = x + 1"], `Analyzing mathematical relationships helps connect tables, graphs, and equations.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const x = (index % 5) + 2;
    const additive = x + 4;
    const multiplicative = 4 * x;
    questions.push(makeQuestion(`For x = ${x}, which rule shows a multiplicative relationship?`, `y = 4x because the output is ${multiplicative}`, [`y = x + 4 because the output is ${additive}`, `y = x - 4 because the output is ${x - 4}`, `y = x + 5 because the output is ${x + 5}`], `Multiplicative relationships use a constant factor, while additive relationships use a constant difference.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildProcessLanguage(code) {
  const cases = [
    ["Which statement uses precise mathematical language about absolute value?", "Absolute value is the distance from 0 on a number line", ["Absolute value is whether a number is large", "Absolute value means opposite number only", "Absolute value means positive sign"]],
    ["Which statement uses precise mathematical language about ratio?", "A ratio compares two quantities multiplicatively", ["A ratio always adds two quantities", "A ratio is just a random number pair", "A ratio means one quantity must be negative"]],
    ["Which statement uses precise mathematical language about mean?", "Mean is found by dividing the sum of the data by the number of data values", ["Mean is always the greatest number", "Mean is any middle number", "Mean is the same as range"]],
    ["Which statement uses precise mathematical language about solution?", "A solution makes an equation or inequality true", ["A solution is any number that appears", "A solution is always zero", "A solution never needs checking"]],
    ["Which statement uses precise mathematical language about percent?", "Percent means per hundred", ["Percent means per ten", "Percent means any fraction", "Percent only applies to money"]]
  ];
  return Array.from({ length: 50 }, (_, index) => {
    const [prompt, correct, wrongs] = pick(cases, index);
    return makeQuestion(prompt, correct, wrongs, `Precise mathematical language explains why an idea is correct.`, `${code}-${index}`);
  });
}

function buildNumberClassification(code) {
  const questions = [];
  const values = [-8, -3, -1, 0, 2, 5, 11, 0.5, -2.5, fraction(3, 4), fraction(-7, 3)];
  for (let index = 0; index < 25; index += 1) {
    const value = pick(values, index);
    const numericValue = typeof value === "number" ? value : null;
    const isWhole = numericValue !== null && Number.isInteger(numericValue) && numericValue >= 0;
    const isInteger = numericValue !== null && Number.isInteger(numericValue);
    const correct = isWhole ? "whole number, integer, and rational number" : isInteger ? "integer and rational number" : "rational number";
    questions.push(makeQuestion(`How should ${value} be classified?`, correct, ["whole number only", "integer only", "not a rational number"], `Whole numbers are a subset of integers, and integers are a subset of rational numbers.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    questions.push(makeQuestion(`Which set contains both whole numbers and integers?`, "rational numbers", ["natural numbers only", "opposites only", "absolute values only"], `Whole numbers and integers are both subsets of the rational numbers.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildOppositeAbsolute(code) {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const value = (index % 10) - 5;
    questions.push(makeQuestion(`What is the opposite of ${value}?`, String(-value), [String(value), String(Math.abs(value)), String(-value + 1)], `Opposites are the same distance from 0 on a number line but on opposite sides.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const value = (index % 12) - 6;
    questions.push(makeQuestion(`What is the absolute value of ${value}?`, String(Math.abs(value)), [String(-Math.abs(value)), String(value), String(Math.abs(value) + 1)], `Absolute value is the distance from 0 on a number line.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildCompareOrderRationals(code) {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const values = [
      -3 + (index % 3),
      -(index % 4) - 0.5,
      Number((index % 3 + 0.25).toFixed(2)),
      Number((index % 4 + 0.75).toFixed(2))
    ];
    const correct = values.slice().sort((a, b) => a - b).map((value) => trimDecimal(value, 2)).join(", ");
    const wrongA = values.slice().sort((a, b) => b - a).map((value) => trimDecimal(value, 2)).join(", ");
    const wrongB = [values[0], values[2], values[1], values[3]].map((value) => trimDecimal(value, 2)).join(", ");
    const wrongC = [values[3], values[1], values[0], values[2]].map((value) => trimDecimal(value, 2)).join(", ");
    questions.push(makeQuestion(`Which list is in ascending order? ${values.map((value) => trimDecimal(value, 2)).join(", ")}`, correct, [wrongA, wrongB, wrongC], `Rational numbers are ordered from least to greatest by their positions on the number line.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const left = Number((-3 + index * 0.5).toFixed(2));
    const right = Number((-2 + index * 0.4).toFixed(2));
    const correct = left > right ? ">" : left < right ? "<" : "=";
    questions.push(makeQuestion(`Which symbol makes this true? ${trimDecimal(left, 2)} __ ${trimDecimal(right, 2)}`, correct, [correct === ">" ? "<" : ">", "=", "!="], `Compare rational numbers by their positions on the number line.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildOrderContextRationals(code) {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const values = [
      Number((-2.5 + (index % 5) * 0.5).toFixed(2)),
      Number((-1.25 + (index % 4) * 0.75).toFixed(2)),
      Number((0.5 + (index % 3) * 0.4).toFixed(2)),
      Number((1.2 + (index % 4) * 0.35).toFixed(2))
    ];
    const correct = values.slice().sort((a, b) => a - b).map((value) => trimDecimal(value, 2)).join(", ");
    const wrongA = values.slice().sort((a, b) => b - a).map((value) => trimDecimal(value, 2)).join(", ");
    const wrongB = [values[1], values[0], values[3], values[2]].map((value) => trimDecimal(value, 2)).join(", ");
    const wrongC = [values[2], values[3], values[0], values[1]].map((value) => trimDecimal(value, 2)).join(", ");
    questions.push(makeQuestion(`A hiker recorded elevation changes of ${values.map((value) => trimDecimal(value, 2)).join(", ")}. Which list orders the values from least to greatest?`, correct, [wrongA, wrongB, wrongC], `Real-world rational numbers can still be ordered on a number line from least to greatest.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const values = [
      Number((-4 + index * 0.2).toFixed(2)),
      Number((-1.5 + index * 0.1).toFixed(2)),
      Number((0.25 + index * 0.05).toFixed(2)),
      Number((1.75 + index * 0.08).toFixed(2))
    ];
    const smallest = values.reduce((least, value) => Math.min(least, value), values[0]);
    questions.push(makeQuestion(`Which value is the least in this set: ${values.map((value) => trimDecimal(value, 2)).join(", ")}?`, trimDecimal(smallest, 2), values.filter((value) => value !== smallest).slice(0, 3).map((value) => trimDecimal(value, 2)), `The least rational number is the one farthest left on the number line.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildDivisionFractionNotation(code) {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const a = (index % 8) + 3;
    const b = ((index + 2) % 6) + 2;
    questions.push(makeQuestion(`Which fraction represents ${a} / ${b}?`, fraction(a, b), [fraction(b, a), fraction(a + 1, b), fraction(a, b + 1)], `Division can be written as a fraction, where a / b is the same as a over b.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const a = (index % 7) + 4;
    const b = ((index + 3) % 5) + 2;
    questions.push(makeQuestion(`Which division expression has the same value as ${fraction(a, b)}?`, `${a} / ${b}`, [`${b} / ${a}`, `${a + 1} / ${b}`, `${a} + ${b}`], `A fraction is another way to write a division expression.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildReciprocal(code) {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const numerator = (index % 7) + 1;
    const denominator = ((index + 2) % 7) + 2;
    questions.push(makeQuestion(`What is the reciprocal of ${fraction(numerator, denominator)}?`, fraction(denominator, numerator), [fraction(numerator, denominator), fraction(denominator + 1, numerator), fraction(denominator, numerator + 1)], `The reciprocal of a fraction is found by swapping its numerator and denominator.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const numerator = (index % 6) + 1;
    const denominator = ((index + 3) % 5) + 2;
    const divisor = fraction(numerator, denominator);
    const reciprocal = fraction(denominator, numerator);
    questions.push(makeQuestion(`Which expression is equivalent to dividing by ${divisor}?`, `multiplying by ${reciprocal}`, [`subtracting ${reciprocal}`, `dividing by ${reciprocal}`, `adding ${divisor}`], `Dividing by a nonzero rational number is equivalent to multiplying by its reciprocal.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildFractionMultiplierEffect(code) {
  const questions = [];
  const cases = [
    [fraction(1, 2), "decreased"],
    [fraction(3, 4), "decreased"],
    [fraction(5, 4), "increased"],
    [fraction(7, 6), "increased"],
    [fraction(1, 1), "stayed the same"]
  ];
  for (let index = 0; index < 50; index += 1) {
    const [multiplier, result] = pick(cases, index);
    questions.push(makeQuestion(`What happens to a positive quantity when it is multiplied by ${multiplier}?`, result, uniqueStrings(["increased", "decreased", "stayed the same"].filter((value) => value !== result)), `Multiplying by a fraction less than 1 decreases a quantity, greater than 1 increases it, and 1 keeps it the same.`, `${code}-${index}`));
  }
  return questions;
}

function buildIntegerOperations(code, includeModel) {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const left = (index % 7) - 3;
    const right = ((index + 2) % 9) - 4;
    const answer = left + right;
    questions.push(makeQuestion(`${includeModel ? "A chip model represents the sum. " : ""}What is ${left} + (${right})?`, String(answer), [String(answer + 1), String(answer - 1), String(left - right)], `Add integers by combining values above and below zero.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const left = (index % 8) - 4;
    const right = ((index + 3) % 6) + 1;
    const answer = index % 2 === 0 ? left - right : left * right;
    const prompt = index % 2 === 0 ? `${left} - ${right}` : `${left} x ${right}`;
    questions.push(makeQuestion(`What is ${prompt}?`, String(answer), [String(answer + 1), String(answer - 1), String(Math.abs(answer))], `Apply the rules for operations with integers.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildPositiveRationalOps(code) {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const whole = (index % 5) + 2;
    const decimal = Number(((index % 7) / 10 + 0.2).toFixed(2));
    const answer = whole * decimal;
    questions.push(makeQuestion(`What is ${whole} x ${trimDecimal(decimal, 2)}?`, trimDecimal(answer, 2), [trimDecimal(answer + 0.1, 2), trimDecimal(answer - 0.1, 2), trimDecimal(whole + decimal, 2)], `Multiply positive rational numbers using place value.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const dividend = Number((((index % 5) + 2) + ((index * 3) % 10) / 10).toFixed(2));
    const divisor = pick([2, 4, 5, 10], index);
    const answer = dividend / divisor;
    questions.push(makeQuestion(`What is ${trimDecimal(dividend, 2)} / ${divisor}?`, trimDecimal(answer, 2), [trimDecimal(answer + 0.1, 2), trimDecimal(answer - 0.1, 2), trimDecimal(dividend * divisor, 2)], `Divide positive rational numbers using place value and fraction concepts.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildRuleComparison(code) {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const factor = (index % 4) + 2;
    const addend = (index % 5) + 3;
    questions.push(makeQuestion(`Which statement correctly compares the rules y = ${factor}x and y = x + ${addend}?`, `y = ${factor}x is multiplicative and y = x + ${addend} is additive`, [`Both rules are additive`, `Both rules are multiplicative`, `y = x + ${addend} is multiplicative and y = ${factor}x is additive`], `Rules of the form y = ax are multiplicative, and rules of the form y = x + a are additive.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const x = (index % 4) + 1;
    const addend = (index % 5) + 2;
    const factor = (index % 4) + 2;
    const additivePairs = `${x}->${x + addend}, ${x + 1}->${x + 1 + addend}, ${x + 2}->${x + 2 + addend}`;
    const multiplicativePairs = `${x}->${x * factor}, ${x + 1}->${(x + 1) * factor}, ${x + 2}->${(x + 2) * factor}`;
    questions.push(makeQuestion(`Which table shows an additive relationship instead of a multiplicative relationship?`, additivePairs, [multiplicativePairs, `${x}->${x}, ${x + 1}->${x + 2}, ${x + 2}->${x + 5}`, `${x}->${factor}, ${x + 1}->${factor}, ${x + 2}->${factor}`], `Additive relationships change by a constant amount, while multiplicative relationships scale by a constant factor.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildRatioRate(kind) {
  const questions = [];
  if (kind === "6.4B") {
    for (let index = 0; index < 25; index += 1) {
      const leftItems = 6 + index;
      const leftCost = 3 + (index % 4);
      const rightItems = 8 + index;
      const rightCost = leftCost + 2;
      const leftRate = leftItems / leftCost;
      const rightRate = rightItems / rightCost;
      const correct = leftRate > rightRate ? `Store A, because it gives ${trimDecimal(leftRate, 2)} items per dollar` : `Store B, because it gives ${trimDecimal(rightRate, 2)} items per dollar`;
      const wrong = leftRate > rightRate ? `Store B, because ${trimDecimal(rightRate, 2)} is greater` : `Store A, because ${trimDecimal(leftRate, 2)} is greater`;
      questions.push(makeQuestion(`Store A sells ${leftItems} notebooks for $${leftCost}. Store B sells ${rightItems} notebooks for $${rightCost}. Which is the better buy?`, correct, [wrong, "Both stores are exactly the same", "There is not enough information"], `Compare unit rates to decide which ratio or rate gives the better value.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      const miles = 12 + index * 2;
      const minutes = 3 + (index % 4);
      const predictMinutes = minutes * 2;
      const correct = `${miles * 2} miles`;
      questions.push(makeQuestion(`A runner travels ${miles} miles in ${minutes} minutes at a constant rate. How far will the runner travel in ${predictMinutes} minutes?`, correct, [`${miles + minutes} miles`, `${miles} miles`, `${miles * 3} miles`], `Use the ratio or rate to make a prediction about an equivalent situation.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  if (kind === "6.4C") {
    for (let index = 0; index < 50; index += 1) {
      const red = (index % 5) + 2;
      const blue = (index % 6) + 3;
      questions.push(makeQuestion(`Which comparison is a ratio describing the same attribute?`, `${red} red marbles to ${blue} blue marbles`, [`${red} marbles to ${blue} minutes`, `${red} dollars to ${blue} pounds`, `${red} books to ${blue} inches`], `A ratio compares two quantities with the same attribute, such as two counts or two lengths.`, `${kind}-${index}`));
    }
    return questions;
  }

  if (kind === "6.4D") {
    for (let index = 0; index < 25; index += 1) {
      const miles = 40 + index * 2;
      const hours = (index % 4) + 2;
      questions.push(makeQuestion(`Which comparison is a rate?`, `${miles} miles in ${hours} hours`, [`${hours} red shirts to ${hours + 1} blue shirts`, `${miles} marbles to ${hours} marbles`, `${hours} pencils to ${hours + 2} pencils`], `A rate compares two quantities with different attributes, such as miles and hours.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      const pages = 24 + index * 3;
      const hours = (index % 5) + 2;
      const unitRate = pages / hours;
      questions.push(makeQuestion(`A student reads ${pages} pages in ${hours} hours. What is the unit rate?`, `${trimDecimal(unitRate, 2)} pages per hour`, [`${trimDecimal(hours / pages, 3)} hours per page`, `${pages + hours} pages per hour`, `${pages - hours} pages per hour`], `Find a unit rate by dividing the amount by the number of units.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  for (let index = 0; index < 25; index += 1) {
    const left = (index % 5) + 2;
    const right = left * 3;
    const multiplier = 4;
    const correct = `${left}:${right} = ${left * multiplier}:${right * multiplier}`;
    questions.push(makeQuestion(`Which proportion represents the same ratio as ${left}:${right}?`, correct, [`${left}:${right} = ${left + multiplier}:${right + multiplier}`, `${left}:${right} = ${right}:${left}`, `${left}:${right} = ${left * multiplier}:${right + multiplier}`], `Equivalent ratios are made by multiplying both terms by the same scale factor.`, `${kind}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const input = (index % 4) + 2;
    const output = input * 5;
    const table = `x:${input}, ${input + 1}, ${input + 2}; y:${output}, ${output + 5}, ${output + 10}`;
    questions.push(makeQuestion(`Which representation shows the ratio rule y = 5x?`, table, [`x:${input}, ${input + 1}, ${input + 2}; y:${output}, ${output + 1}, ${output + 2}`, `x:${input}, ${input + 1}, ${input + 2}; y:${output}, ${output + 4}, ${output + 8}`, `x:${input}, ${input + 1}, ${input + 2}; y:${output}, ${output - 5}, ${output - 10}`], `Tables, graphs, and proportions can all represent the same ratio relationship.`, `${kind}-b-${index}`));
  }
  return questions;
}

function buildPercentQuestions(kind) {
  const questions = [];
  if (kind === "6.4E") {
    for (let index = 0; index < 25; index += 1) {
      const numerator = pick([1, 2, 3, 4, 5, 6, 7, 8], index);
      const denominator = 10;
      const decimalValue = numerator / denominator;
      questions.push(makeQuestion(`Which decimal and percent are equivalent to ${fraction(numerator, denominator)}?`, `${trimDecimal(decimalValue, 2)} and ${percentText(decimalValue * 100)}`, [`${trimDecimal(decimalValue + 0.1, 2)} and ${percentText(decimalValue * 100 + 10)}`, `${trimDecimal(decimalValue, 2)} and ${percentText(decimalValue * 10)}`, `${trimDecimal(decimalValue * 10, 2)} and ${percentText(decimalValue * 100)}`], `Fractions, decimals, and percents can represent the same ratio or part of a whole.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      const percent = pick([10, 20, 25, 40, 50, 60, 75, 80], index);
      const decimalValue = percent / 100;
      questions.push(makeQuestion(`Which fraction is equivalent to ${percent}%?`, fractionOrWhole(percent, 100), [fractionOrWhole(percent + 10, 100), fractionOrWhole(percent, 10), fractionOrWhole(100, Math.max(1, percent))], `Percent means out of 100, so percents can be rewritten as fractions and decimals.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  if (kind === "6.4F") {
    const benchmarks = [
      [fraction(1, 100), "1%"],
      [fraction(1, 10), "10%"],
      [fraction(1, 4), "25%"],
      [fraction(1, 3), "33 1/3%"],
      [fraction(1, 2), "50%"],
      [fraction(3, 4), "75%"]
    ];
    for (let index = 0; index < 50; index += 1) {
      const [left, right] = pick(benchmarks, index);
      questions.push(makeQuestion(`Which benchmark percent is equivalent to ${left}?`, right, uniqueStrings(benchmarks.map((entry) => entry[1]).filter((value) => value !== right).slice(0, 3)), `Benchmark fractions and benchmark percents describe common parts of a whole.`, `${kind}-${index}`));
    }
    return questions;
  }

  if (kind === "6.4G") {
    for (let index = 0; index < 25; index += 1) {
      const cents = pick([5, 10, 20, 25, 40, 50, 75], index);
      questions.push(makeQuestion(`$${(cents / 100).toFixed(2)} is what percent of $1.00?`, `${cents}%`, [`${cents / 10}%`, `${cents + 5}%`, `${100 - cents}%`], `Money contexts can be converted into equivalent fractions, decimals, and percents.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      const numerator = pick([1, 2, 3, 4, 6, 8, 9], index);
      const denominator = pick([2, 4, 5, 10], index, 1);
      const value = numerator / denominator;
      questions.push(makeQuestion(`Which percent is equivalent to ${fraction(numerator, denominator)}?`, percentText(value * 100), [percentText(value * 10), percentText(value * 100 + 5), percentText(Math.max(0, value * 100 - 10))], `Equivalent forms let students move between fractions, decimals, and percents in real-world problems.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  if (kind === "6.5B") {
    for (let index = 0; index < 50; index += 1) {
      const mode = index % 3;
      if (mode === 0) {
        const percent = pick([10, 20, 25, 40, 50, 75], index);
        const whole = 40 + (index % 5) * 20;
        const part = (whole * percent) / 100;
        questions.push(makeQuestion(`${part} is ${percent}% of what number?`, String(whole), [String(part), String(whole + 10), String(whole - 10)], `Divide the part by the percent written as a decimal to find the whole.`, `${kind}-${index}`));
      } else if (mode === 1) {
        const percent = pick([10, 20, 25, 40, 50, 75], index);
        const whole = 60 + (index % 4) * 20;
        const part = (whole * percent) / 100;
        questions.push(makeQuestion(`What is ${percent}% of ${whole}?`, trimDecimal(part, 2), [trimDecimal(part + 5, 2), trimDecimal(part - 5, 2), trimDecimal(whole / percent, 2)], `Multiply the whole by the percent written as a decimal to find the part.`, `${kind}-${index}`));
      } else {
        const whole = 40 + (index % 5) * 20;
        const part = pick([10, 20, 30, 40, 50], index);
        const percent = (part / whole) * 100;
        questions.push(makeQuestion(`${part} is what percent of ${whole}?`, percentText(percent), [percentText(percent + 10), percentText(Math.max(0, percent - 10)), percentText(whole)], `Divide the part by the whole and multiply by 100 to find the percent.`, `${kind}-${index}`));
      }
    }
    return questions;
  }

  for (let index = 0; index < 50; index += 1) {
    const numerator = pick([1, 2, 3, 4, 5, 6, 8, 9], index);
    const denominator = pick([2, 4, 5, 10], index, 1);
    const value = numerator / denominator;
    const correct = `${fraction(numerator, denominator)}, ${trimDecimal(value, 2)}, ${percentText(value * 100)}`;
    questions.push(makeQuestion(`Which set shows equal parts of the same whole?`, correct, [`${fraction(numerator, denominator)}, ${trimDecimal(value + 0.1, 2)}, ${percentText(value * 100)}`, `${fraction(numerator + 1, denominator)}, ${trimDecimal(value, 2)}, ${percentText(value * 100)}`, `${fraction(numerator, denominator)}, ${trimDecimal(value, 2)}, ${percentText(value * 10)}`], `Equivalent fractions, decimals, and percents represent equal parts of the same whole.`, `${kind}-${index}`));
  }
  return questions;
}

function buildIndependentDependent(kind) {
  const questions = [];
  if (kind === "6.6A") {
    const cases = [
      ["the number of tickets and the total cost", "the number of tickets is independent and the total cost is dependent"],
      ["the hours worked and the money earned", "the hours worked is independent and the money earned is dependent"],
      ["the number of boxes and the total markers", "the number of boxes is independent and the total markers is dependent"],
      ["the distance driven and the gallons used", "the distance driven is independent and the gallons used is dependent"]
    ];
    for (let index = 0; index < 50; index += 1) {
      const [prompt, correct] = pick(cases, index);
      questions.push(makeQuestion(`In a table that relates ${prompt}, which statement is correct?`, correct, ["both quantities are always independent", "both quantities are always dependent", "the second quantity must be independent"], `The independent quantity is the input, and the dependent quantity changes because of it.`, `${kind}-${index}`));
    }
    return questions;
  }

  if (kind === "6.6B") {
    for (let index = 0; index < 50; index += 1) {
      const factor = (index % 4) + 2;
      const x = (index % 3) + 1;
      const table = `x:${x}, ${x + 1}, ${x + 2}; y:${x * factor}, ${(x + 1) * factor}, ${(x + 2) * factor}`;
      questions.push(makeQuestion(`Which equation matches this table? ${table}`, `y = ${factor}x`, [`y = x + ${factor}`, `y = x - ${factor}`, `y = ${factor} + x + 1`], `A table with a constant factor can be written as y = kx.`, `${kind}-${index}`));
    }
    return questions;
  }

  for (let index = 0; index < 25; index += 1) {
    const factor = (index % 4) + 2;
    questions.push(makeQuestion(`A scooter rental costs $${factor} per hour. Which equation represents the total cost y for x hours?`, `y = ${factor}x`, [`y = x + ${factor}`, `y = x - ${factor}`, `y = ${factor} + x + 1`], `Multiplicative situations with a constant rate can be represented by y = kx.`, `${kind}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const addend = (index % 6) + 3;
    questions.push(makeQuestion(`A club charges a $${addend} signup fee plus $1 per event attended. Which equation matches the relationship?`, `y = x + ${addend}`, [`y = ${addend}x`, `y = x - ${addend}`, `y = ${addend} - x`], `Additive situations with a starting amount can be represented by y = x + b.`, `${kind}-b-${index}`));
  }
  return questions;
}

function buildExpressionQuestions(kind) {
  const questions = [];
  if (kind === "6.7A") {
    for (let index = 0; index < 25; index += 1) {
      const a = (index % 4) + 2;
      const b = (index % 5) + 3;
      const answer = a + b * 2;
      questions.push(makeQuestion(`What is ${a} + ${b} x 2?`, String(answer), [String((a + b) * 2), String(a * b * 2), String(a + b + 2)], `Use the order of operations: multiply before adding.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      const base = (index % 4) + 2;
      const exponent = 2;
      const value = base ** exponent;
      questions.push(makeQuestion(`What is ${base}^${exponent}?`, String(value), [String(value + 1), String(base * exponent), String(base + exponent)], `Whole-number exponents show repeated multiplication.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  if (kind === "6.7B") {
    for (let index = 0; index < 25; index += 1) {
      questions.push(makeQuestion(`Which is an equation?`, `3x + 2 = 11`, [`3x + 2`, `4 + y`, `7 - 3`], `An equation includes an equals sign.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      questions.push(makeQuestion(`Which is an expression?`, `5a - 7`, [`5a - 7 = 18`, `b = 9`, `x / 2 = 4`], `An expression has numbers, variables, or operations but no equals sign.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  if (kind === "6.7C") {
    for (let index = 0; index < 50; index += 1) {
      const a = (index % 5) + 2;
      const b = (index % 4) + 3;
      questions.push(makeQuestion(`Which expression is equivalent to ${a} + ${b}?`, `${b} + ${a}`, [`${a * b}`, `${a + b + 1}`, `${a} - ${b}`], `Equivalent expressions have the same value, even if they look different.`, `${kind}-${index}`));
    }
    return questions;
  }

  const properties = [
    ["4 + 7 = 7 + 4", "commutative property"],
    ["(2 + 3) + 5 = 2 + (3 + 5)", "associative property"],
    ["6 x 1 = 6", "identity property"],
    ["8 + (-8) = 0", "inverse property"],
    ["3(4 + 2) = 3 x 4 + 3 x 2", "distributive property"]
  ];
  for (let index = 0; index < 25; index += 1) {
    const [statement, property] = pick(properties, index);
    questions.push(makeQuestion(`Which property is shown by ${statement}?`, property, uniqueStrings(properties.map((entry) => entry[1]).filter((value) => value !== property).slice(0, 3)), `Properties of operations help generate equivalent expressions.`, `${kind}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const factor = (index % 4) + 2;
    const left = (index % 5) + 3;
    const right = (index % 3) + 4;
    questions.push(makeQuestion(`Which expression is equivalent to ${factor}(${left} + ${right})?`, `${factor * left} + ${factor * right}`, [`${factor + left} + ${right}`, `${factor * left} + ${right}`, `${factor + left + right}`], `Use the distributive property to rewrite the expression.`, `${kind}-b-${index}`));
  }
  return questions;
}

function buildUnitConversionQuestions(code) {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const feet = (index % 8) + 2;
    questions.push(makeQuestion(`How many inches are in ${feet} feet?`, String(feet * 12), [String(feet * 10), String(feet * 6), String(feet * 24)], `There are 12 inches in 1 foot.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const liters = (index % 6) + 3;
    questions.push(makeQuestion(`How many milliliters are in ${liters} liters?`, String(liters * 1000), [String(liters * 100), String(liters * 10), String(liters * 10000)], `There are 1,000 milliliters in 1 liter.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildGeometryQuestions(kind) {
  const questions = [];
  if (kind === "6.8A") {
    for (let index = 0; index < 20; index += 1) {
      const angleA = 40 + (index % 5) * 10;
      const angleB = 30 + (index % 4) * 10;
      const angleC = 180 - angleA - angleB;
      questions.push(makeQuestion(`Two angles of a triangle measure ${angleA} degrees and ${angleB} degrees. What is the third angle?`, String(angleC), [String(angleC + 10), String(angleC - 10), String(angleA + angleB)], `The angles in a triangle always add to 180 degrees.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 15; index += 1) {
      const first = 3 + index;
      const second = 4 + index;
      const third = index % 2 === 0 ? 6 + index : 10 + index + 10;
      const correct = first + second > third ? "yes, the lengths can form a triangle" : "no, the lengths cannot form a triangle";
      questions.push(makeQuestion(`Can lengths ${first}, ${second}, and ${third} form a triangle?`, correct, uniqueStrings(["yes, the lengths can form a triangle", "no, the lengths cannot form a triangle", "only if all sides are equal", "only if one angle is 90 degrees"].filter((value) => value !== correct)).slice(0, 3), `The sum of any two side lengths must be greater than the third side.`, `${kind}-b-${index}`));
    }
    for (let index = 0; index < 15; index += 1) {
      const largestAngle = 90 + (index % 3) * 10;
      questions.push(makeQuestion(`In a triangle, the side opposite the ${largestAngle}-degree angle is`, "the longest side", ["the shortest side", "equal to every other side", "always a vertical side"], `The longest side is opposite the largest angle.`, `${kind}-c-${index}`));
    }
    return questions;
  }

  if (kind === "6.8B") {
    for (let index = 0; index < 25; index += 1) {
      questions.push(makeQuestion(`Which formula gives the area of a triangle?`, "A = bh / 2", ["A = bh", "A = 2b + 2h", "A = lwh"], `A triangle's area is half the area of a rectangle or parallelogram with the same base and height.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      questions.push(makeQuestion(`A parallelogram can be rearranged into which shape with the same area formula?`, "a rectangle", ["a circle", "a sphere", "a cube"], `A parallelogram can be decomposed and rearranged into a rectangle with the same base and height.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  if (kind === "6.8C") {
    for (let index = 0; index < 25; index += 1) {
      const base = (index % 5) + 4;
      const height = (index % 4) + 2;
      questions.push(makeQuestion(`Which equation represents the area A of a triangle with base ${base} and height ${height}?`, `A = ${base} x ${height} / 2`, [`A = ${base} + ${height}`, `A = ${base} x ${height}`, `A = 2(${base} + ${height})`], `Write an equation that matches the correct area formula.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      const length = (index % 5) + 3;
      const width = (index % 4) + 2;
      const height = (index % 3) + 2;
      questions.push(makeQuestion(`Which equation represents the volume V of a right rectangular prism with length ${length}, width ${width}, and height ${height}?`, `V = ${length} x ${width} x ${height}`, [`V = ${length} + ${width} + ${height}`, `V = 2(${length} + ${width} + ${height})`, `V = ${length} x ${width}`], `Volume of a right rectangular prism is length times width times height.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  for (let index = 0; index < 25; index += 1) {
    const base = (index % 5) + 4;
    const height = (index % 4) + 2;
    const area = (base * height) / 2;
    questions.push(makeQuestion(`What is the area of a triangle with base ${base} units and height ${height} units?`, trimDecimal(area, 2), [trimDecimal(base * height, 2), trimDecimal(area + 2, 2), trimDecimal(base + height, 2)], `Use A = bh / 2 to find the area.`, `${kind}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const length = Number(((index % 4) + 2.5).toFixed(1));
    const width = Number(((index % 3) + 1.5).toFixed(1));
    const height = Number(((index % 5) + 2).toFixed(1));
    const volume = length * width * height;
    questions.push(makeQuestion(`What is the volume of a right rectangular prism with length ${length}, width ${width}, and height ${height}?`, trimDecimal(volume, 2), [trimDecimal(volume + 2, 2), trimDecimal(length * width, 2), trimDecimal(length + width + height, 2)], `Multiply length, width, and height to determine the volume.`, `${kind}-b-${index}`));
  }
  return questions;
}

function buildEquationQuestions(kind) {
  const questions = [];
  if (kind === "6.9A") {
    for (let index = 0; index < 25; index += 1) {
      const total = 18 + index;
      const addend = (index % 5) + 4;
      questions.push(makeQuestion(`A student has ${addend} stickers and needs ${total} stickers in all. Which equation represents the unknown number x still needed?`, `x + ${addend} = ${total}`, [`x - ${addend} = ${total}`, `${addend} - x = ${total}`, `${total} + x = ${addend}`], `Write an equation that matches the relationship in the problem.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      const limit = 12 + index;
      const spent = (index % 5) + 3;
      questions.push(makeQuestion(`A student can spend no more than $${limit} and has already spent $${spent}. Which inequality shows the remaining amount x that can still be spent?`, `x + ${spent} <= ${limit}`, [`x + ${spent} >= ${limit}`, `x - ${spent} <= ${limit}`, `${limit} - x <= ${spent}`], `Constraints in word problems can be represented with inequalities.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  if (kind === "6.9B") {
    for (let index = 0; index < 25; index += 1) {
      const start = (index % 5) + 2;
      questions.push(makeQuestion(`An open circle at ${start} with an arrow pointing right represents which inequality?`, `x > ${start}`, [`x < ${start}`, `x >= ${start}`, `x <= ${start}`], `An open circle means the endpoint is not included, and an arrow right means greater than.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      const boundary = (index % 6) + 1;
      questions.push(makeQuestion(`Which value is a solution to x <= ${boundary}?`, String(boundary - 1), [String(boundary + 1), String(boundary + 2), String(boundary + 3)], `A solution to an inequality must make the inequality true.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  if (kind === "6.9C") {
    for (let index = 0; index < 50; index += 1) {
      const total = 18 + index;
      const addend = (index % 5) + 4;
      questions.push(makeQuestion(`Which real-world problem matches x + ${addend} = ${total}?`, `A student has ${addend} stickers and needs ${total} total. How many more stickers are needed?`, [`A student has ${total} stickers and gives away ${addend}. How many are left?`, `A student has x stickers and buys ${total} more. How many are there now?`, `A student has ${addend} stickers in each pack and ${total} packs. How many stickers are there?`], `A matching real-world problem must use the same operation and unknown.`, `${kind}-${index}`));
    }
    return questions;
  }

  if (kind === "6.10A") {
    for (let index = 0; index < 25; index += 1) {
      const answer = (index % 6) + 3;
      const addend = (index % 5) + 4;
      const total = answer + addend;
      questions.push(makeQuestion(`Solve x + ${addend} = ${total}.`, String(answer), [String(answer + 1), String(answer - 1), String(total)], `Use inverse operations to solve the one-step equation.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      const answer = (index % 6) + 2;
      const factor = pick([2, 3, 4, 5], index);
      const total = answer * factor;
      questions.push(makeQuestion(`Solve x / ${factor} = ${answer}.`, String(total), [String(answer), String(total + factor), String(total - factor)], `Undo division by multiplying both sides by the divisor.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  for (let index = 0; index < 50; index += 1) {
    const value = (index % 6) + 2;
    const addend = (index % 5) + 4;
    const total = value + addend;
    questions.push(makeQuestion(`Which value makes x + ${addend} = ${total} true?`, String(value), [String(value + 1), String(value - 1), String(total)], `Substitute the value into the equation to check whether it keeps the equation true.`, `${kind}-${index}`));
  }
  return questions;
}

function buildCoordinatePlaneQuestions(code) {
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const x = Number((index % 5 + 0.5).toFixed(1));
    const y = Number(((index % 4) + 1.5).toFixed(1));
    const signs = pick([
      [-1, 1, "Quadrant II"],
      [1, 1, "Quadrant I"],
      [-1, -1, "Quadrant III"],
      [1, -1, "Quadrant IV"]
    ], index);
    questions.push(makeQuestion(`In which quadrant is the point (${trimDecimal(signs[0] * x, 1)}, ${trimDecimal(signs[1] * y, 1)}) located?`, signs[2], uniqueStrings(["Quadrant I", "Quadrant II", "Quadrant III", "Quadrant IV"].filter((value) => value !== signs[2])), `The signs of the x- and y-coordinates determine the quadrant.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const x = Number((((index % 5) + 1) * 0.5).toFixed(1));
    const y = Number((((index % 4) + 1) * 0.5).toFixed(1));
    const correct = `(${trimDecimal(-x, 1)}, ${trimDecimal(-y, 1)})`;
    questions.push(makeQuestion(`Which ordered pair is ${trimDecimal(x, 1)} units left of the origin and ${trimDecimal(y, 1)} units down from the origin?`, correct, [`(${trimDecimal(x, 1)}, ${trimDecimal(-y, 1)})`, `(${trimDecimal(-x, 1)}, ${trimDecimal(y, 1)})`, `(${trimDecimal(x, 1)}, ${trimDecimal(y, 1)})`], `Moving left makes x negative, and moving down makes y negative.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildDataQuestions(kind) {
  const questions = [];
  if (kind === "6.12A") {
    const prompts = [
      ["show each individual data value", "dot plot"],
      ["show grouped intervals of data", "histogram"],
      ["show a five-number summary", "box plot"],
      ["list values by stems and leaves", "stem-and-leaf plot"]
    ];
    for (let index = 0; index < 50; index += 1) {
      const [task, correct] = pick(prompts, index);
      questions.push(makeQuestion(`Which graph is best used to ${task}?`, correct, uniqueStrings(["dot plot", "stem-and-leaf plot", "histogram", "box plot"].filter((value) => value !== correct).slice(0, 3)), `Different graph types highlight different parts of a numeric data set.`, `${kind}-${index}`));
    }
    return questions;
  }

  if (kind === "6.12B") {
    for (let index = 0; index < 25; index += 1) {
      const data = [2, 3, 3, 4, 5 + index % 3, 10 + index % 4];
      const center = median(data);
      questions.push(makeQuestion(`The data set is ${data.join(", ")}. Which statement best describes its center?`, `The median is ${trimDecimal(center, 2)}`, [`The median is ${trimDecimal(center + 1, 2)}`, `The median is ${trimDecimal(center - 1, 2)}`, "The median cannot be found"], `Measures of center describe where the data values cluster.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      const data = [1 + index % 2, 2, 3, 3, 4, 9 + index % 4];
      const range = Math.max(...data) - Math.min(...data);
      questions.push(makeQuestion(`The data set is ${data.join(", ")}. Which statement best describes its spread?`, `The range is ${range}`, [`The range is ${range + 1}`, `The range is ${range - 1}`, "The range is the same as the median"], `Measures of spread describe how far apart the data values are.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  if (kind === "6.12C") {
    for (let index = 0; index < 25; index += 1) {
      const data = [6, 8, 10, 12, 14 + index % 3];
      const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
      questions.push(makeQuestion(`What is the mean of the data set ${data.join(", ")}?`, trimDecimal(mean, 2), [trimDecimal(mean + 1, 2), trimDecimal(mean - 1, 2), trimDecimal(median(data), 2)], `The mean is the sum of the data divided by the number of values.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      const data = sortNumbers([2 + index % 3, 4, 5, 7, 9, 11, 12, 14 + index % 4]);
      const spread = interquartileRange(data);
      questions.push(makeQuestion(`What is the interquartile range of ${data.join(", ")}?`, trimDecimal(spread, 2), [trimDecimal(spread + 1, 2), trimDecimal(spread - 1, 2), trimDecimal(Math.max(...data) - Math.min(...data), 2)], `The interquartile range is the upper quartile minus the lower quartile.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  if (kind === "6.12D") {
    for (let index = 0; index < 25; index += 1) {
      const cats = [10 + index, 6 + index % 4, 4 + index % 3];
      const total = cats.reduce((sum, value) => sum + value, 0);
      const percent = (cats[0] / total) * 100;
      questions.push(makeQuestion(`A survey found ${cats[0]} students chose pizza, ${cats[1]} chose tacos, and ${cats[2]} chose sandwiches. What percent chose pizza?`, percentText(percent), [percentText(percent + 10), percentText(Math.max(0, percent - 10)), percentText((cats[1] / total) * 100)], `Relative frequency describes the percent of data in a category.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      const values = ["blue", "red", "blue", "green", "blue", "red", "yellow", "blue"];
      questions.push(makeQuestion(`What is the mode of this categorical data set? ${values.join(", ")}`, "blue", ["red", "green", "yellow"], `The mode is the category that appears most often.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  if (kind === "6.13A") {
    for (let index = 0; index < 25; index += 1) {
      const data = sortNumbers([2, 4, 4, 5, 6, 8, 9 + index % 3]);
      questions.push(makeQuestion(`The data set is ${data.join(", ")}. What is the median?`, trimDecimal(median(data), 2), [trimDecimal(median(data) + 1, 2), trimDecimal(median(data) - 1, 2), trimDecimal((Math.max(...data) + Math.min(...data)) / 2, 2)], `Interpreting a numeric graph often means finding or comparing values such as the median.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      const data = [3, 4, 5, 7, 8, 10 + index % 4];
      const range = Math.max(...data) - Math.min(...data);
      questions.push(makeQuestion(`The data set is ${data.join(", ")}. What is the range?`, String(range), [String(range + 1), String(range - 1), String(median(data))], `Range describes how far apart the smallest and largest values are.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  const cases = [
    ["the number of minutes different students read each night", "with variability"],
    ["the number of days in each week", "without variability"],
    ["the shoe sizes in a class", "with variability"],
    ["the number of months in one year", "without variability"]
  ];
  for (let index = 0; index < 50; index += 1) {
    const [prompt, correct] = pick(cases, index);
    questions.push(makeQuestion(`Which phrase best describes the data from ${prompt}?`, correct, uniqueStrings(["with variability", "without variability", "always categorical", "always impossible to graph"].filter((value) => value !== correct)).slice(0, 3), `Data has variability when values can differ from one observation to another.`, `${kind}-${index}`));
  }
  return questions;
}

function buildFinanceQuestions(kind) {
  const questions = [];
  if (kind === "6.14A") {
    for (let index = 0; index < 25; index += 1) {
      const feeA = 4 + (index % 3);
      const feeB = 6 + (index % 4);
      questions.push(makeQuestion(`Bank A charges a monthly checking fee of $${feeA}. Bank B charges $${feeB}. Which account has the lower monthly cost?`, `Bank A`, [`Bank B`, `They cost the same`, `A debit card always costs more`], `Comparing features and costs helps decide which financial option is less expensive.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      questions.push(makeQuestion(`Which feature is commonly part of a checking account?`, `writing checks and tracking deposits`, [`borrowing money with interest`, `owning company stock`, `earning a college degree`], `Checking accounts are used to store money and handle deposits, withdrawals, and payments.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  if (kind === "6.14B") {
    const cases = [
      ["takes money directly from your bank account", "debit card"],
      ["lets you borrow money that must be paid back later", "credit card"],
      ["usually needs a checking account behind it", "debit card"],
      ["can charge interest if the balance is not paid", "credit card"]
    ];
    for (let index = 0; index < 50; index += 1) {
      const [prompt, correct] = pick(cases, index);
      questions.push(makeQuestion(`Which card ${prompt}?`, correct, uniqueStrings(["debit card", "credit card", "gift card", "library card"].filter((value) => value !== correct).slice(0, 3)), `Debit cards use money you already have, while credit cards borrow money.`, `${kind}-${index}`));
    }
    return questions;
  }

  if (kind === "6.14C") {
    for (let index = 0; index < 25; index += 1) {
      const start = 200 + index * 15;
      const deposit = 40 + (index % 5) * 10;
      const end = start + deposit;
      questions.push(makeQuestion(`A check register starts at ${money(start)}. A deposit of ${money(deposit)} is made. What is the new balance?`, money(end), [money(start - deposit), money(deposit), money(end + 10)], `Add a deposit to the current balance.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      const start = 300 + index * 12;
      const withdrawal = 20 + (index % 4) * 10;
      const transfer = 15 + (index % 3) * 5;
      const end = start - withdrawal - transfer;
      questions.push(makeQuestion(`A register balance is ${money(start)}. A withdrawal of ${money(withdrawal)} and a transfer out of ${money(transfer)} are recorded. What is the new balance?`, money(end), [money(start - withdrawal), money(start + transfer), money(end + 10)], `Subtract withdrawals and transfers out from the current balance.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  if (kind === "6.14E") {
    const prompts = [
      ["Which item is commonly found in a credit report?", "payment history"],
      ["How long can many negative credit report items stay on a report?", "up to 7 years"],
      ["Which item is not usually part of a credit report?", "favorite school subject"]
    ];
    for (let index = 0; index < 50; index += 1) {
      const [prompt, correct] = pick(prompts, index);
      const wrongs = prompt.includes("not usually") ? ["credit account balances", "payment history", "loan accounts"] : ["favorite pizza topping", "locker number", "shoe color"];
      questions.push(makeQuestion(prompt, correct, wrongs, `Credit reports include information about borrowing and payment history, and many negative items can remain for years.`, `${kind}-${index}`));
    }
    return questions;
  }

  if (kind === "6.14F") {
    const cases = [
      ["Why do lenders read a credit report?", "to judge how risky it may be to lend money"],
      ["Why might a borrower care about a credit report?", "it can affect whether the borrower is approved for loans"],
      ["Why is a strong credit report useful?", "it can help show responsible borrowing habits"]
    ];
    for (let index = 0; index < 50; index += 1) {
      const [prompt, correct] = pick(cases, index);
      questions.push(makeQuestion(prompt, correct, ["to choose a favorite color", "to measure height", "to count months in a year"], `Credit reports help borrowers and lenders make decisions about borrowing money.`, `${kind}-${index}`));
    }
    return questions;
  }

  if (kind === "6.14G") {
    const cases = [
      ["Which method helps pay for college without being repaid?", "scholarship"],
      ["Which method usually must be repaid after college?", "student loan"],
      ["Which method means earning money while attending school?", "work-study"],
      ["Which method uses money saved ahead of time?", "savings"]
    ];
    for (let index = 0; index < 50; index += 1) {
      const [prompt, correct] = pick(cases, index);
      questions.push(makeQuestion(prompt, correct, uniqueStrings(["savings", "grant", "scholarship", "student loan", "work-study"].filter((value) => value !== correct).slice(0, 3)), `Different ways to pay for college include savings, grants, scholarships, loans, and work-study.`, `${kind}-${index}`));
    }
    return questions;
  }

  if (kind === "6.14H") {
    for (let index = 0; index < 25; index += 1) {
      const salaryA = 32000 + index * 1500;
      const salaryB = salaryA + 8000;
      questions.push(makeQuestion(`Occupation A pays ${money(salaryA)} each year and Occupation B pays ${money(salaryB)} each year. Which has the greater annual salary?`, `Occupation B`, [`Occupation A`, `They are the same`, `There is not enough information`], `Compare the yearly salaries directly to determine which is greater.`, `${kind}-a-${index}`));
    }
    for (let index = 0; index < 25; index += 1) {
      const salaryA = 36000 + index * 1000;
      const salaryB = salaryA + 6000;
      const years = 30;
      const difference = (salaryB - salaryA) * years;
      questions.push(makeQuestion(`One career pays ${money(salaryA)} per year and another pays ${money(salaryB)} per year. Over ${years} years, how much more money would the higher-paying career earn?`, money(difference), [money(difference + 6000), money(difference - 6000), money(salaryB - salaryA)], `Multiply the annual difference by the number of years to compare lifetime income.`, `${kind}-b-${index}`));
    }
    return questions;
  }

  return questions;
}

function cleanDescription(description) {
  return String(description)
    .replace(/\s+/g, " ")
    .replace(/a \/ b/g, "a/b")
    .replace(/!=/g, "not equal to")
    .trim();
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
    tags: ["texas", "teks", "staar", "grade 6", "math", teksCode.toLowerCase().replace(".", "")],
    questions
  };
}

const QUIZ_BUILDERS = [
  ["6.1A", "Math Grade 6 6.1A", "Apply mathematics to problems arising in everyday life, society, and the workplace.", 0, "Mathematical Process Standards", "Core", () => buildProcessApply("6.1A")],
  ["6.1B", "Math Grade 6 6.1B", "Use a problem-solving model that incorporates analyzing information, formulating a plan, determining a solution, justifying the solution, and evaluating the problem-solving process and the reasonableness of the solution.", 0, "Mathematical Process Standards", "Core", () => buildProcessModel("6.1B")],
  ["6.1C", "Math Grade 6 6.1C", "Select tools, including real objects, manipulatives, paper and pencil, and technology as appropriate, and techniques, including mental math, estimation, and number sense as appropriate, to solve problems.", 0, "Mathematical Process Standards", "Core", () => buildProcessTools("6.1C")],
  ["6.1D", "Math Grade 6 6.1D", "Communicate mathematical ideas, reasoning, and their implications using multiple representations, including symbols, diagrams, graphs, and language as appropriate.", 0, "Mathematical Process Standards", "Core", () => buildProcessCommunicate("6.1D")],
  ["6.1E", "Math Grade 6 6.1E", "Create and use representations to organize, record, and communicate mathematical ideas.", 0, "Mathematical Process Standards", "Core", () => buildProcessRepresent("6.1E")],
  ["6.1F", "Math Grade 6 6.1F", "Analyze mathematical relationships to connect and communicate mathematical ideas.", 0, "Mathematical Process Standards", "Core", () => buildProcessRelationships("6.1F")],
  ["6.1G", "Math Grade 6 6.1G", "Display, explain, and justify mathematical ideas and arguments using precise mathematical language in written or oral communication.", 0, "Mathematical Process Standards", "Core", () => buildProcessLanguage("6.1G")],
  ["6.2A", "Math Grade 6 6.2A", cleanDescription("classify whole numbers, integers, and rational numbers using a visual representation such as a Venn diagram to describe relationships between sets of numbers"), 1, "Numerical Representations and Relationships", "Supporting", () => buildNumberClassification("6.2A")],
  ["6.2B", "Math Grade 6 6.2B", cleanDescription("identify a number, its opposite, and its absolute value"), 1, "Numerical Representations and Relationships", "Supporting", () => buildOppositeAbsolute("6.2B")],
  ["6.2C", "Math Grade 6 6.2C", cleanDescription("locate, compare, and order integers and rational numbers using a number line"), 1, "Numerical Representations and Relationships", "Supporting", () => buildCompareOrderRationals("6.2C")],
  ["6.2D", "Math Grade 6 6.2D", cleanDescription("order a set of rational numbers arising from mathematical and real-world contexts"), 1, "Numerical Representations and Relationships", "Readiness", () => buildOrderContextRationals("6.2D")],
  ["6.2E", "Math Grade 6 6.2E", cleanDescription("extend representations for division to include fraction notation such as a/b represents the same number as a/b where b not equal to 0"), 1, "Numerical Representations and Relationships", "Supporting", () => buildDivisionFractionNotation("6.2E")],
  ["6.3A", "Math Grade 6 6.3A", cleanDescription("recognize that dividing by a rational number and multiplying by its reciprocal result in equivalent values"), 2, "Computations and Algebraic Relationships", "Supporting", () => buildReciprocal("6.3A")],
  ["6.3B", "Math Grade 6 6.3B", cleanDescription("determine, with and without computation, whether a quantity is increased or decreased when multiplied by a fraction, including values greater than or less than one"), 2, "Computations and Algebraic Relationships", "Supporting", () => buildFractionMultiplierEffect("6.3B")],
  ["6.3C", "Math Grade 6 6.3C", cleanDescription("represent integer operations with concrete models and connect the actions with the models to standardized algorithms"), 2, "Computations and Algebraic Relationships", "Supporting", () => buildIntegerOperations("6.3C", true)],
  ["6.3D", "Math Grade 6 6.3D", cleanDescription("add, subtract, multiply, and divide integers fluently"), 2, "Computations and Algebraic Relationships", "Readiness", () => buildIntegerOperations("6.3D", false)],
  ["6.3E", "Math Grade 6 6.3E", cleanDescription("multiply and divide positive rational numbers fluently"), 2, "Computations and Algebraic Relationships", "Readiness", () => buildPositiveRationalOps("6.3E")],
  ["6.4A", "Math Grade 6 6.4A", cleanDescription("compare two rules verbally, numerically, graphically, and symbolically in the form of y = ax or y = x + a in order to differentiate between additive and multiplicative relationships"), 2, "Computations and Algebraic Relationships", "Supporting", () => buildRuleComparison("6.4A")],
  ["6.4B", "Math Grade 6 6.4B", cleanDescription("apply qualitative and quantitative reasoning to solve prediction and comparison of real-world problems involving ratios and rates"), 2, "Computations and Algebraic Relationships", "Readiness", () => buildRatioRate("6.4B")],
  ["6.4C", "Math Grade 6 6.4C", cleanDescription("give examples of ratios as multiplicative comparisons of two quantities describing the same attribute"), 1, "Numerical Representations and Relationships", "Supporting", () => buildRatioRate("6.4C")],
  ["6.4D", "Math Grade 6 6.4D", cleanDescription("give examples of rates as the comparison by division of two quantities having different attributes, including rates as quotients"), 1, "Numerical Representations and Relationships", "Supporting", () => buildRatioRate("6.4D")],
  ["6.4E", "Math Grade 6 6.4E", cleanDescription("represent ratios and percents with concrete models, fractions, and decimals"), 1, "Numerical Representations and Relationships", "Supporting", () => buildPercentQuestions("6.4E")],
  ["6.4F", "Math Grade 6 6.4F", cleanDescription("represent benchmark fractions and percents such as 1%, 10%, 25%, 33 1/3%, and multiples of these values using 10 by 10 grids, strip diagrams, number lines, and numbers"), 1, "Numerical Representations and Relationships", "Supporting", () => buildPercentQuestions("6.4F")],
  ["6.4G", "Math Grade 6 6.4G", cleanDescription("generate equivalent forms of fractions, decimals, and percents using real-world problems, including problems that involve money"), 1, "Numerical Representations and Relationships", "Readiness", () => buildPercentQuestions("6.4G")],
  ["6.4H", "Math Grade 6 6.4H", cleanDescription("convert units within a measurement system, including the use of proportions and unit rates"), 3, "Geometry and Measurement", "Readiness", () => buildUnitConversionQuestions("6.4H")],
  ["6.5A", "Math Grade 6 6.5A", cleanDescription("represent mathematical and real-world problems involving ratios and rates using scale factors, tables, graphs, and proportions"), 2, "Computations and Algebraic Relationships", "Supporting", () => buildRatioRate("6.5A")],
  ["6.5B", "Math Grade 6 6.5B", cleanDescription("solve real-world problems to find the whole given a part and the percent, to find the part given the whole and the percent, and to find the percent given the part and the whole, including the use of concrete and pictorial models"), 2, "Computations and Algebraic Relationships", "Readiness", () => buildPercentQuestions("6.5B")],
  ["6.5C", "Math Grade 6 6.5C", cleanDescription("use equivalent fractions, decimals, and percents to show equal parts of the same whole"), 1, "Numerical Representations and Relationships", "Supporting", () => buildPercentQuestions("6.5C")],
  ["6.6A", "Math Grade 6 6.6A", cleanDescription("identify independent and dependent quantities from tables and graphs"), 2, "Computations and Algebraic Relationships", "Supporting", () => buildIndependentDependent("6.6A")],
  ["6.6B", "Math Grade 6 6.6B", cleanDescription("write an equation that represents the relationship between independent and dependent quantities from a table"), 2, "Computations and Algebraic Relationships", "Supporting", () => buildIndependentDependent("6.6B")],
  ["6.6C", "Math Grade 6 6.6C", cleanDescription("represent a given situation using verbal descriptions, tables, graphs, and equations in the form y = kx or y = x + b"), 2, "Computations and Algebraic Relationships", "Readiness", () => buildIndependentDependent("6.6C")],
  ["6.7A", "Math Grade 6 6.7A", cleanDescription("generate equivalent numerical expressions using order of operations, including whole number exponents and prime factorization"), 1, "Numerical Representations and Relationships", "Readiness", () => buildExpressionQuestions("6.7A")],
  ["6.7B", "Math Grade 6 6.7B", cleanDescription("distinguish between expressions and equations verbally, numerically, and algebraically"), 1, "Numerical Representations and Relationships", "Supporting", () => buildExpressionQuestions("6.7B")],
  ["6.7C", "Math Grade 6 6.7C", cleanDescription("determine if two expressions are equivalent using concrete models, pictorial models, and algebraic representations"), 1, "Numerical Representations and Relationships", "Supporting", () => buildExpressionQuestions("6.7C")],
  ["6.7D", "Math Grade 6 6.7D", cleanDescription("generate equivalent expressions using the properties of operations: inverse, identity, commutative, associative, and distributive properties"), 1, "Numerical Representations and Relationships", "Readiness", () => buildExpressionQuestions("6.7D")],
  ["6.8A", "Math Grade 6 6.8A", cleanDescription("extend previous knowledge of triangles and their properties to include the sum of angles of a triangle, the relationship between the lengths of sides and measures of angles in a triangle, and determining when three lengths form a triangle"), 3, "Geometry and Measurement", "Supporting", () => buildGeometryQuestions("6.8A")],
  ["6.8B", "Math Grade 6 6.8B", cleanDescription("model area formulas for parallelograms, trapezoids, and triangles by decomposing and rearranging parts of these shapes"), 3, "Geometry and Measurement", "Supporting", () => buildGeometryQuestions("6.8B")],
  ["6.8C", "Math Grade 6 6.8C", cleanDescription("write equations that represent problems related to the area of rectangles, parallelograms, trapezoids, and triangles and volume of right rectangular prisms where dimensions are positive rational numbers"), 3, "Geometry and Measurement", "Supporting", () => buildGeometryQuestions("6.8C")],
  ["6.8D", "Math Grade 6 6.8D", cleanDescription("determine solutions for problems involving the area of rectangles, parallelograms, trapezoids, and triangles and volume of right rectangular prisms where dimensions are positive rational numbers"), 3, "Geometry and Measurement", "Readiness", () => buildGeometryQuestions("6.8D")],
  ["6.9A", "Math Grade 6 6.9A", cleanDescription("write one-variable, one-step equations and inequalities to represent constraints or conditions within problems"), 2, "Computations and Algebraic Relationships", "Supporting", () => buildEquationQuestions("6.9A")],
  ["6.9B", "Math Grade 6 6.9B", cleanDescription("represent solutions for one-variable, one-step equations and inequalities on number lines"), 2, "Computations and Algebraic Relationships", "Supporting", () => buildEquationQuestions("6.9B")],
  ["6.9C", "Math Grade 6 6.9C", cleanDescription("write corresponding real-world problems given one-variable, one-step equations or inequalities"), 2, "Computations and Algebraic Relationships", "Supporting", () => buildEquationQuestions("6.9C")],
  ["6.10A", "Math Grade 6 6.10A", cleanDescription("model and solve one-variable, one-step equations and inequalities that represent problems, including geometric concepts"), 2, "Computations and Algebraic Relationships", "Readiness", () => buildEquationQuestions("6.10A")],
  ["6.10B", "Math Grade 6 6.10B", cleanDescription("determine if the given value(s) make(s) one-variable, one-step equations or inequalities true"), 2, "Computations and Algebraic Relationships", "Supporting", () => buildEquationQuestions("6.10B")],
  ["6.11A", "Math Grade 6 6.11A", cleanDescription("graph points in all four quadrants using ordered pairs of rational numbers"), 3, "Geometry and Measurement", "Readiness", () => buildCoordinatePlaneQuestions("6.11A")],
  ["6.12A", "Math Grade 6 6.12A", cleanDescription("represent numeric data graphically, including dot plots, stem-and-leaf plots, histograms, and box plots"), 4, "Data Analysis and Personal Financial Literacy", "Supporting", () => buildDataQuestions("6.12A")],
  ["6.12B", "Math Grade 6 6.12B", cleanDescription("use the graphical representation of numeric data to describe the center, spread, and shape of the data distribution"), 4, "Data Analysis and Personal Financial Literacy", "Supporting", () => buildDataQuestions("6.12B")],
  ["6.12C", "Math Grade 6 6.12C", cleanDescription("summarize numeric data with numerical summaries, including the mean and median (measures of center) and the range and interquartile range (IQR) (measures of spread), and use these summaries to describe the center, spread, and shape of the data distribution"), 4, "Data Analysis and Personal Financial Literacy", "Readiness", () => buildDataQuestions("6.12C")],
  ["6.12D", "Math Grade 6 6.12D", cleanDescription("summarize categorical data with numerical and graphical summaries, including the mode, the percent of values in each category (relative frequency table), and the percent bar graph, and use these summaries to describe the data distribution"), 4, "Data Analysis and Personal Financial Literacy", "Readiness", () => buildDataQuestions("6.12D")],
  ["6.13A", "Math Grade 6 6.13A", cleanDescription("interpret numeric data summarized in dot plots, stem-and-leaf plots, histograms, and box plots"), 4, "Data Analysis and Personal Financial Literacy", "Readiness", () => buildDataQuestions("6.13A")],
  ["6.13B", "Math Grade 6 6.13B", cleanDescription("distinguish between situations that yield data with and without variability"), 4, "Data Analysis and Personal Financial Literacy", "Supporting", () => buildDataQuestions("6.13B")],
  ["6.14A", "Math Grade 6 6.14A", cleanDescription("compare the features and costs of a checking account and a debit card offered by different local financial institutions"), 4, "Data Analysis and Personal Financial Literacy", "Supporting", () => buildFinanceQuestions("6.14A")],
  ["6.14B", "Math Grade 6 6.14B", cleanDescription("distinguish between debit cards and credit cards"), 4, "Data Analysis and Personal Financial Literacy", "Supporting", () => buildFinanceQuestions("6.14B")],
  ["6.14C", "Math Grade 6 6.14C", cleanDescription("balance a check register that includes deposits, withdrawals, and transfers"), 4, "Data Analysis and Personal Financial Literacy", "Supporting", () => buildFinanceQuestions("6.14C")],
  ["6.14E", "Math Grade 6 6.14E", cleanDescription("describe the information in a credit report and how long it is retained"), 4, "Data Analysis and Personal Financial Literacy", "Supporting", () => buildFinanceQuestions("6.14E")],
  ["6.14F", "Math Grade 6 6.14F", cleanDescription("describe the value of credit reports to borrowers and to lenders"), 4, "Data Analysis and Personal Financial Literacy", "Supporting", () => buildFinanceQuestions("6.14F")],
  ["6.14G", "Math Grade 6 6.14G", cleanDescription("explain various methods to pay for college, including through savings, grants, scholarships, student loans, and work-study"), 4, "Data Analysis and Personal Financial Literacy", "Supporting", () => buildFinanceQuestions("6.14G")],
  ["6.14H", "Math Grade 6 6.14H", cleanDescription("compare the annual salary of several occupations requiring various levels of post-secondary education or vocational training and calculate the effects of the different annual salaries on lifetime income"), 4, "Data Analysis and Personal Financial Literacy", "Supporting", () => buildFinanceQuestions("6.14H")]
];

function generateQuizzes() {
  return QUIZ_BUILDERS.map(([teksCode, label, summary, , , , builder]) =>
    makeQuiz(
      `tx_grade6_math_${teksCode.toLowerCase().replace(".", "_")}`,
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
    const setId = `tx_grade6_math_${teksCode.toLowerCase().replace(".", "_")}`;
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
    title: "Grade 6 Math TEKS Implementation",
    source: {
      localPdf: LOCAL_PDF,
      officialAssessedCurriculum: ASSESSED_CURRICULUM_URL,
      officialBlueprint: BLUEPRINT_URL,
      notes: "Grade 6 Math implementation continues after Grade 5 was fully completed. The local 6thmath.pdf was used as a local reference, and the official TEA assessed curriculum and blueprint were used to define the Grade 6 STAAR scope."
    },
    namingConvention: "Math Grade 6 {TEKS}",
    questionTargetPerSet: 50,
    scope: {
      firstTeks: "6.1A",
      assessedFirstTeks: "6.2A",
      assessedLastTeks: "6.14H",
      implementedLastTeks: "6.14H",
      includedAssessedTeksCount: QUIZ_BUILDERS.length - PROCESS_CODES.length,
      includedImplementationTeksCount: QUIZ_BUILDERS.length,
      includedBeyondAssessedScope: PROCESS_CODES,
      excludedFromImplementationScope: ["6.14D"]
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
  console.log(`Wrote ${generatedQuizzes.length} Texas Grade 6 math TEKS sets and ${totalQuestions} questions to ${CUSTOM_QUIZZES_FILE}`);
  console.log(`Wrote Grade 6 implementation file to ${IMPLEMENTATION_FILE}`);
}

main();
