const fs = require("fs");
const path = require("path");

const CUSTOM_QUIZZES_FILE = path.join(__dirname, "..", "data", "custom-quizzes.json");
const IMPLEMENTATION_FILE = path.join(__dirname, "..", "data", "algebra1-math-staar-implementation.json");
const NOW = new Date().toISOString();
const GENERATED_BY = "Local Curriculum";
const CATEGORY = "Texas Algebra I Math";
const LOCAL_PDF = "C:/Users/Casa-Desktop/Downloads/staar-algebra-i-assessed-curriculum.pdf";
const ASSESSED_CURRICULUM_URL = "https://tea.texas.gov/student-assessment/staar/staar-algebra-i-assessed-curriculum.pdf";
const BLUEPRINT_URL = "https://tea.texas.gov/student-assessment/staar/staar-algebra-i-blueprint.pdf";
const GENERATED_IDS = new Set();

const ITEMS = ["tickets", "markers", "books", "stickers", "bags", "boxes", "cups", "pencils"];
const COLORS = ["red", "blue", "green", "yellow", "purple", "orange"];
const PROCESS_CODES = ["A.1A", "A.1B", "A.1C", "A.1D", "A.1E", "A.1F", "A.1G"];

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
    tags: ["texas", "teks", "staar", "algebra i", "math", teksCode.toLowerCase().replace(".", "").replace(/\s+/g, "")],
    questions
  };
}

function numberText(value, digits = 2) {
  return trimDecimal(value, digits);
}

function ratioText(left, right) {
  const factor = gcd(left, right);
  return `${left / factor}:${right / factor}`;
}

function lineDescription(value, operator) {
  if (operator === ">") {
    return `open circle at ${value} and shade right`;
  }
  if (operator === ">=") {
    return `closed circle at ${value} and shade right`;
  }
  if (operator === "<") {
    return `open circle at ${value} and shade left`;
  }
  return `closed circle at ${value} and shade left`;
}

function setIdFor(teksCode) {
  return `tx_algebra1_math_${teksCode.toLowerCase().replace(".", "_")}`;
}

function buildQuestionSet(factory) {
  return Array.from({ length: 50 }, (_, index) => factory(index));
}

function signedConstant(value) {
  return value >= 0 ? `+ ${value}` : `- ${Math.abs(value)}`;
}

function signedGroup(value) {
  return value >= 0 ? `+ ${value}` : `- ${Math.abs(value)}`;
}

function formatLinearExpression(m, b) {
  const slopePart = m === 1 ? "x" : m === -1 ? "-x" : `${m}x`;
  if (b === 0) {
    return slopePart;
  }
  return `${slopePart} ${signedConstant(b)}`;
}

function formatLinearEquation(m, b) {
  return `y = ${formatLinearExpression(m, b)}`;
}

function formatPoint(x, y) {
  return `(${x}, ${y})`;
}

function formatPointSlope(m, x1, y1) {
  const left = y1 >= 0 ? `y - ${y1}` : `y + ${Math.abs(y1)}`;
  const right = x1 >= 0 ? `x - ${x1}` : `x + ${Math.abs(x1)}`;
  return `${left} = ${m}(${right})`;
}

function formatStandardEquation(a, b, c) {
  const leftSecond = b >= 0 ? `+ ${b}y` : `- ${Math.abs(b)}y`;
  return `${a}x ${leftSecond} = ${c}`;
}

function formatQuadraticStandard(a, b, c) {
  const parts = [`${a === 1 ? "" : a}x^2`];
  if (b !== 0) {
    parts.push(`${b >= 0 ? "+ " : "- "}${Math.abs(b)}x`);
  }
  if (c !== 0) {
    parts.push(`${c >= 0 ? "+ " : "- "}${Math.abs(c)}`);
  }
  return `y = ${parts.join(" ")}`;
}

function formatPolynomial(a, b, c) {
  const parts = [];
  if (a !== 0) {
    parts.push(`${a === 1 ? "" : a === -1 ? "-" : a}x^2`);
  }
  if (b !== 0) {
    parts.push(`${b >= 0 && parts.length ? "+ " : b < 0 ? "- " : ""}${Math.abs(b) === 1 ? "" : Math.abs(b)}x`);
  }
  if (c !== 0 || parts.length === 0) {
    parts.push(`${c >= 0 && parts.length ? "+ " : c < 0 ? "- " : ""}${Math.abs(c)}`);
  }
  return parts.join(" ");
}

function formatQuadraticVertex(a, h, k) {
  const aPart = a === 1 ? "" : a === -1 ? "-" : String(a);
  const hPart = h >= 0 ? `x - ${h}` : `x + ${Math.abs(h)}`;
  const kPart = k === 0 ? "" : ` ${signedConstant(k)}`;
  return `y = ${aPart}(${hPart})^2${kPart}`;
}

function formatExponentialEquation(a, b) {
  return `y = ${a}(${trimDecimal(b, 3)})^x`;
}

function buildGrade7SetsSubsets(code) {
  const valueCases = [
    ["5", "natural numbers", ["whole numbers", "integers", "rational numbers"]],
    ["0", "whole numbers", ["natural numbers", "integers", "rational numbers"]],
    ["-4", "integers", ["whole numbers", "natural numbers", "rational numbers"]],
    ["3/4", "rational numbers", ["integers", "whole numbers", "natural numbers"]],
    ["-2.5", "rational numbers", ["integers", "whole numbers", "natural numbers"]],
    ["12", "natural numbers", ["whole numbers", "integers", "rational numbers"]]
  ];
  const statements = [
    ["Integers are a subset of rational numbers", ["Rational numbers are a subset of integers", "Whole numbers are a subset of rational numbers only", "Fractions are a subset of whole numbers"]],
    ["Whole numbers are a subset of integers", ["Integers are a subset of whole numbers", "Rational numbers are a subset of whole numbers", "Natural numbers include every rational number"]],
    ["Natural numbers are a subset of whole numbers", ["Whole numbers are a subset of natural numbers", "Integers are not rational numbers", "Decimals cannot be rational numbers"]],
    ["Every integer is also a rational number", ["No integer is rational", "Only positive integers are rational", "Fractions are never rational"]]
  ];
  const questions = [];
  for (let index = 0; index < 25; index += 1) {
    const [value, correct, wrongs] = pick(valueCases, index);
    questions.push(makeQuestion(`Which is the smallest set that contains ${value}?`, correct, wrongs, `Natural numbers are inside whole numbers, whole numbers are inside integers, and integers are inside rational numbers.`, `${code}-a-${index}`));
  }
  for (let index = 0; index < 25; index += 1) {
    const [correct, wrongs] = pick(statements, index);
    questions.push(makeQuestion(`Which statement correctly describes a subset relationship between sets of rational numbers?`, correct, wrongs, `A subset relationship shows that every element of one set is also in a larger set.`, `${code}-b-${index}`));
  }
  return questions;
}

function buildGrade7RationalOpsFluent(code) {
  return buildQuestionSet((index) => {
    const kind = index % 4;
    if (kind === 0) {
      const left = Number((((index % 9) - 4) * 0.5).toFixed(2));
      const right = Number((((index % 7) - 3) * 0.25).toFixed(2));
      const correct = numberText(left + right);
      return makeQuestion(`Find ${numberText(left)} + ${numberText(right)}.`, correct, [numberText(left - right), numberText(-(left + right)), numberText(left + right + 1)], `Add rational numbers while paying close attention to the signs.`, `${code}-${index}`);
    }
    if (kind === 1) {
      const left = Number((((index % 8) - 2) * 0.75).toFixed(2));
      const right = Number((((index % 5) + 1) * 0.5).toFixed(2));
      const correct = numberText(left - right);
      return makeQuestion(`Find ${numberText(left)} - ${numberText(right)}.`, correct, [numberText(left + right), numberText(right - left), numberText(left - right + 1)], `Subtracting a rational number changes the value by the amount and direction of the second number.`, `${code}-${index}`);
    }
    if (kind === 2) {
      const left = Number((((index % 6) + 1) * 0.5 * (index % 2 === 0 ? 1 : -1)).toFixed(2));
      const right = Number((((index % 4) + 2) * 0.25 * (index % 3 === 0 ? -1 : 1)).toFixed(2));
      const product = Number((left * right).toFixed(3));
      return makeQuestion(`Find ${numberText(left)} x ${numberText(right)}.`, numberText(product, 3), [numberText(left + right), numberText(Math.abs(product), 3), numberText(product + 0.5, 3)], `Multiply the absolute values and then use the signs to determine the sign of the product.`, `${code}-${index}`);
    }
    const dividend = Number((((index % 8) + 2) * (index % 2 === 0 ? 1 : -1)).toFixed(2));
    const divisor = pick([0.5, -0.5, 0.25, -0.25, 2, -2, 4, -4], index);
    const quotient = Number((dividend / divisor).toFixed(3));
    return makeQuestion(`Find ${numberText(dividend)} / ${numberText(divisor)}.`, numberText(quotient, 3), [numberText(dividend * divisor, 3), numberText(divisor / dividend, 3), numberText(-quotient, 3)], `Dividing rational numbers follows the same sign rules as multiplying.`, `${code}-${index}`);
  });
}

function buildGrade7RationalOpProblems(code) {
  return buildQuestionSet((index) => {
    const kind = index % 5;
    if (kind === 0) {
      const start = Number((-4 + (index % 5) * 0.5).toFixed(2));
      const change = Number((1.25 + (index % 4) * 0.25).toFixed(2));
      const result = Number((start + change).toFixed(2));
      return makeQuestion(`The morning temperature was ${numberText(start)} degrees. It increased by ${numberText(change)} degrees. What is the new temperature?`, numberText(result), [numberText(start - change), numberText(change - start), numberText(result + 1)], `An increase means add the change to the starting value.`, `${code}-${index}`);
    }
    if (kind === 1) {
      const balance = Number((-12 + (index % 6) * 1.5).toFixed(2));
      const payment = Number((3.5 + (index % 4) * 0.5).toFixed(2));
      const result = Number((balance + payment).toFixed(2));
      return makeQuestion(`A student account balance is ${money(balance)}. After a payment of ${money(payment)}, what is the new balance?`, money(result), [money(balance - payment), money(result + 2), money(Math.abs(result))], `Adding a payment raises the balance by the amount paid.`, `${code}-${index}`);
    }
    if (kind === 2) {
      const total = Number((6 + (index % 5) * 1.5).toFixed(2));
      const groups = (index % 4) + 2;
      const result = Number((total / groups).toFixed(2));
      return makeQuestion(`A ribbon that is ${numberText(total)} meters long is cut into ${groups} equal pieces. How long is each piece?`, numberText(result), [numberText(total * groups), numberText(total - groups), numberText(result + 1)], `Division splits a total amount into equal groups.`, `${code}-${index}`);
    }
    if (kind === 3) {
      const elevation = Number((-1.5 - (index % 4) * 0.75).toFixed(2));
      const descent = Number((0.5 + (index % 5) * 0.5).toFixed(2));
      const result = Number((elevation - descent).toFixed(2));
      return makeQuestion(`A diver is at ${numberText(elevation)} meters relative to sea level and then descends ${numberText(descent)} more meters. What is the diver's new position?`, numberText(result), [numberText(elevation + descent), numberText(Math.abs(result)), numberText(result + 2)], `Descending means subtracting another amount from the current position.`, `${code}-${index}`);
    }
    const totalWeight = Number((10 + (index % 5) * 2.5).toFixed(2));
    const bagWeight = Number((2 + (index % 4) * 0.5).toFixed(2));
    const bags = Number((totalWeight / bagWeight).toFixed(2));
    return makeQuestion(`A pantry has ${numberText(totalWeight)} pounds of rice. If each bag holds ${numberText(bagWeight)} pounds, how many bags can be filled?`, numberText(bags), [numberText(totalWeight * bagWeight), numberText(totalWeight - bagWeight), numberText(bags + 1)], `Dividing the total amount by the amount in each bag tells how many bags can be filled.`, `${code}-${index}`);
  });
}

function buildGrade7ConstantRate(code) {
  return buildQuestionSet((index) => {
    const rate = (index % 8 + 2) * 5;
    if (index % 2 === 0) {
      return makeQuestion(`A car travels at a constant rate of ${rate} miles per hour. Which equation gives the distance d after t hours?`, `d = ${rate}t`, [`d = t + ${rate}`, `d = ${rate + 5}t`, `d = ${rate} + t`], `For a constant rate, distance equals rate times time.`, `${code}-${index}`);
    }
    return makeQuestion(`A table shows time values 1, 2, and 3 with distances ${rate}, ${rate * 2}, and ${rate * 3}. What is the constant rate of change?`, `${rate} units per 1 time unit`, [`${rate * 2} units per 1 time unit`, `${rate - 5} units per 1 time unit`, `${rate + 10} units per 1 time unit`], `A constant rate of change is the amount the output changes for each increase of 1 in the input.`, `${code}-${index}`);
  });
}

function buildGrade7UnitRate(code) {
  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const items = (index % 6) + 2;
      const totalCost = Number((items * (0.75 + (index % 4) * 0.25)).toFixed(2));
      const unitCost = Number((totalCost / items).toFixed(2));
      return makeQuestion(`${items} notebooks cost ${money(totalCost)}. What is the unit price?`, `${money(unitCost)} per notebook`, [`${money(totalCost)} per notebook`, `${money(items)} per notebook`, `${money(unitCost + 0.5)} per notebook`], `A unit rate compares the total cost to exactly 1 notebook.`, `${code}-${index}`);
    }
    const miles = (index % 7 + 3) * 12;
    const hours = (index % 4) + 2;
    const unitRate = Number((miles / hours).toFixed(2));
    return makeQuestion(`A runner travels ${miles} miles in ${hours} hours. What is the unit rate?`, `${numberText(unitRate)} miles per hour`, [`${numberText(miles * hours)} miles per hour`, `${numberText(miles - hours)} miles per hour`, `${numberText(unitRate + 5)} miles per hour`], `A unit rate tells the amount for one hour.`, `${code}-${index}`);
  });
}

function buildGrade7ConstantOfProportionality(code) {
  return buildQuestionSet((index) => {
    const k = (index % 7) + 2;
    if (index % 2 === 0) {
      const x1 = (index % 4) + 2;
      const x2 = x1 + 2;
      const x3 = x2 + 2;
      return makeQuestion(`A proportional table has x-values ${x1}, ${x2}, ${x3} and y-values ${k * x1}, ${k * x2}, ${k * x3}. What is the constant of proportionality k?`, String(k), [String(k + 1), String(k - 1), String(k * 2)], `For a proportional relationship, divide y by x to find k.`, `${code}-${index}`);
    }
    return makeQuestion(`In the proportional relationship y = ${k}x, what is the constant of proportionality?`, String(k), [String(k + 2), String(k - 1), String(k * 3)], `The constant of proportionality is the number multiplying x in y = kx.`, `${code}-${index}`);
  });
}

function buildGrade7PercentProblems(code) {
  return buildQuestionSet((index) => {
    const base = 40 + (index % 6) * 10;
    const rate = pick([5, 8, 10, 15, 20, 25], index);
    if (index % 4 === 0) {
      const result = Number((base * (1 + rate / 100)).toFixed(2));
      return makeQuestion(`A price of ${money(base)} increases by ${rate}%. What is the new price?`, money(result), [money(base + rate), money(base * (1 - rate / 100)), money(result + 5)], `Percent increase means add the increase amount to the original price.`, `${code}-${index}`);
    }
    if (index % 4 === 1) {
      const result = Number((base * (1 - rate / 100)).toFixed(2));
      return makeQuestion(`A price of ${money(base)} decreases by ${rate}%. What is the new price?`, money(result), [money(base * (1 + rate / 100)), money(base - rate), money(result + 5)], `Percent decrease means subtract the decrease amount from the original price.`, `${code}-${index}`);
    }
    if (index % 4 === 2) {
      const total = Number((base * (1 + rate / 100)).toFixed(2));
      return makeQuestion(`An item costs ${money(base)} and sales tax is ${rate}%. What is the total cost?`, money(total), [money(base), money(base * rate / 100), money(total + 4)], `To find the total cost, add the sales tax to the original price.`, `${code}-${index}`);
    }
    const discountRate = pick([10, 15, 20, 25], index);
    const afterDiscount = base * (1 - discountRate / 100);
    const total = Number((afterDiscount * 1.08).toFixed(2));
    return makeQuestion(`A jacket costs ${money(base)}. It is discounted ${discountRate}% and then taxed 8%. What is the final cost?`, money(total), [money(Number(afterDiscount.toFixed(2))), money(Number((base * 1.08).toFixed(2))), money(total + 5)], `Solve multi-step percent problems in order: discount first, then add tax to the discounted price.`, `${code}-${index}`);
  });
}

function buildGrade7MeasurementConversions(code) {
  const cases = [
    ["feet", "inches", 12],
    ["yards", "feet", 3],
    ["pounds", "ounces", 16],
    ["meters", "centimeters", 100],
    ["liters", "milliliters", 1000],
    ["kilometers", "meters", 1000]
  ];
  return buildQuestionSet((index) => {
    const [fromUnit, toUnit, factor] = pick(cases, index);
    const amount = (index % 6) + 2;
    const result = amount * factor;
    return makeQuestion(`Convert ${amount} ${fromUnit} to ${toUnit}.`, `${formatNumber(result)} ${toUnit}`, [`${formatNumber(amount + factor)} ${toUnit}`, `${formatNumber(Math.max(1, Math.round(amount / factor)))} ${toUnit}`, `${formatNumber(result + factor)} ${toUnit}`], `Use the unit-rate conversion factor to convert between units in a measurement system.`, `${code}-${index}`);
  });
}

function buildGrade7Similarity(code) {
  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const small = (index % 5) + 4;
      const factor = (index % 3) + 2;
      const large = small * factor;
      return makeQuestion(`A side measuring ${small} cm on one polygon corresponds to a side on a similar polygon with a scale factor of ${factor}. What is the corresponding side length?`, `${large} cm`, [`${small + factor} cm`, `${small * factor + factor} cm`, `${small} cm`], `Similar figures have proportional corresponding side lengths.`, `${code}-${index}`);
    }
    return makeQuestion(`Which statement is always true about similar figures?`, `Corresponding angles are congruent and corresponding side lengths are proportional`, [`All side lengths are equal in size`, `The figures must have the same perimeter`, `The figures must have the same area`], `Similarity preserves angle measures and keeps side lengths in a constant ratio.`, `${code}-${index}`);
  });
}

function buildGrade7Pi(code) {
  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const diameter = (index % 6 + 2) * 2;
      const circumference = Number((diameter * 3.14).toFixed(2));
      return makeQuestion(`A circle has diameter ${diameter} units and circumference ${numberText(circumference)} units. What is the ratio of circumference to diameter?`, `3.14`, [numberText(diameter / circumference, 3), numberText(circumference - diameter, 2), numberText(circumference / (diameter + 1), 3)], `Pi describes the constant ratio of a circle's circumference to its diameter.`, `${code}-${index}`);
    }
    return makeQuestion(`Which statement best describes pi?`, `Pi is the ratio of a circle's circumference to its diameter`, [`Pi is the ratio of area to radius`, `Pi is the same as the diameter of every circle`, `Pi is the ratio of radius to circumference`], `No matter the size of the circle, the circumference divided by the diameter is pi.`, `${code}-${index}`);
  });
}

function buildGrade7ScaleDrawings(code) {
  return buildQuestionSet((index) => {
    const scale = (index % 5) + 2;
    if (index % 2 === 0) {
      const drawing = (index % 6) + 3;
      const actual = drawing * scale;
      return makeQuestion(`On a map, 1 inch represents ${scale} miles. If two towns are ${drawing} inches apart on the map, how far apart are they in real life?`, `${actual} miles`, [`${drawing + scale} miles`, `${drawing} miles`, `${actual + scale} miles`], `Multiply the drawing distance by the scale factor to find the actual distance.`, `${code}-${index}`);
    }
    const actual = (index % 6 + 4) * scale;
    const drawing = Number((actual / scale).toFixed(2));
    return makeQuestion(`A scale drawing uses 1 centimeter to represent ${scale} meters. A real wall is ${actual} meters long. How long should it be in the drawing?`, `${numberText(drawing)} centimeters`, [`${actual} centimeters`, `${numberText(drawing + 1)} centimeters`, `${numberText(scale)} centimeters`], `Divide the actual distance by the scale to find the drawing length.`, `${code}-${index}`);
  });
}

function buildGrade7SampleSpace(code) {
  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const spinnerSections = (index % 4) + 2;
      const outcomes = spinnerSections * 2;
      return makeQuestion(`A coin is flipped and a spinner with ${spinnerSections} equal sections is spun. How many outcomes are in the sample space?`, `${outcomes} outcomes`, [`${spinnerSections + 2} outcomes`, `${spinnerSections} outcomes`, `${outcomes + 2} outcomes`], `For independent events, multiply the number of outcomes for each event.`, `${code}-${index}`);
    }
    return makeQuestion(`Which list shows the complete sample space for flipping a coin twice?`, `HH, HT, TH, TT`, [`H, T, HH`, `HH, TT`, `HT, TH, TT`], `A complete sample space lists every possible outcome once.`, `${code}-${index}`);
  });
}

function buildGrade7ExperimentalProbability(code) {
  return buildQuestionSet((index) => {
    const successes = (index % 8) + 6;
    const trials = successes + (index % 5) + 8;
    if (index % 2 === 0) {
      const nextTrials = trials * 2;
      const prediction = Math.round((successes / trials) * nextTrials);
      return makeQuestion(`A spinner landed on blue ${successes} times out of ${trials} spins. About how many blue results would you predict in ${nextTrials} more spins?`, String(prediction), [String(successes), String(nextTrials - prediction), String(prediction + 3)], `Use the experimental probability to predict future results by setting up a proportion.`, `${code}-${index}`);
    }
    return makeQuestion(`A bag draw experiment showed red ${successes} times out of ${trials} draws. What is the experimental probability of red?`, fractionOrWhole(successes, trials), [fractionOrWhole(trials, successes), fractionOrWhole(successes + 1, trials), fractionOrWhole(successes, trials + 1)], `Experimental probability is based on what actually happened in the trials.`, `${code}-${index}`);
  });
}

function buildGrade7TheoreticalProbability(code) {
  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const favorable = (index % 3) + 1;
      return makeQuestion(`A fair number cube is rolled. What is the theoretical probability of rolling a number less than or equal to ${favorable}?`, fractionOrWhole(favorable, 6), [fractionOrWhole(6 - favorable, 6), fractionOrWhole(favorable + 1, 6), fractionOrWhole(favorable, 5)], `Theoretical probability is favorable outcomes divided by all possible outcomes.`, `${code}-${index}`);
    }
    const green = (index % 4) + 2;
    const total = green + 2;
    const probability = fractionOrWhole(green, total * 2);
    return makeQuestion(`A spinner has ${green} green sections and 2 yellow sections, and then a coin is flipped. What is the theoretical probability of spinning green and landing heads?`, probability, [fractionOrWhole(green, total), fractionOrWhole(1, 2), fractionOrWhole(green + 1, total * 2)], `For compound events, multiply the probabilities of each independent event.`, `${code}-${index}`);
  });
}

function buildGrade7Complement(code) {
  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const numerator = (index % 5) + 1;
      const denominator = numerator + (index % 4) + 3;
      const complement = denominator - numerator;
      return makeQuestion(`The probability of drawing a red marble is ${fractionOrWhole(numerator, denominator)}. What is the probability of not drawing a red marble?`, fractionOrWhole(complement, denominator), [fractionOrWhole(numerator, denominator), fractionOrWhole(complement + 1, denominator), fractionOrWhole(complement, denominator + 1)], `The probabilities of an event and its complement add to 1 whole.`, `${code}-${index}`);
    }
    const probability = Number((0.1 * ((index % 6) + 2)).toFixed(2));
    const complement = Number((1 - probability).toFixed(2));
    return makeQuestion(`The probability of rain tomorrow is ${numberText(probability, 2)}. What is the probability that it will not rain?`, numberText(complement, 2), [numberText(probability, 2), numberText(probability + 0.1, 2), numberText(complement - 0.1, 2)], `A probability and its complement must total 1.`, `${code}-${index}`);
  });
}

function buildGrade7GraphData(code) {
  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const music = 10 + (index % 4) * 5;
      const art = 15 + (index % 3) * 5;
      const sports = 20 + (index % 5) * 5;
      const total = music + art + sports;
      return makeQuestion(`A bar graph shows ${music} students chose music, ${art} chose art, and ${sports} chose sports. What fraction chose art?`, fractionOrWhole(art, total), [fractionOrWhole(music, total), fractionOrWhole(sports, total), fractionOrWhole(art, total + art)], `Part-to-whole comparisons compare one category to the total number of responses.`, `${code}-${index}`);
    }
    const music = 20 + (index % 3) * 10;
    const sports = 40 + (index % 3) * 10;
    return makeQuestion(`A circle graph shows ${music}% for music and ${sports}% for sports. What is the simplified part-to-part ratio of music to sports?`, ratioText(music, sports), [ratioText(sports, music), `${music}:${100 - sports}`, `${music}:${sports + 10}`], `Part-to-part comparisons compare one category directly to another category.`, `${code}-${index}`);
  });
}

function buildGrade7ExperimentPredictions(code) {
  return buildQuestionSet((index) => {
    const red = 8 + (index % 6) * 2;
    const blue = 6 + (index % 4) * 2;
    const green = 4 + (index % 3) * 2;
    const total = red + blue + green;
    if (index % 2 === 0) {
      const future = total * 2;
      const prediction = Math.round((red / total) * future);
      return makeQuestion(`In an experiment, red occurred ${red} times, blue ${blue} times, and green ${green} times. About how many red results would you expect in the next ${future} trials?`, String(prediction), [String(red), String(future - prediction), String(prediction + 4)], `Use the experiment's relative frequency to make a quantitative prediction.`, `${code}-${index}`);
    }
    const correct = red >= blue && red >= green ? "red" : blue >= red && blue >= green ? "blue" : "green";
    return makeQuestion(`An experiment produced ${red} red, ${blue} blue, and ${green} green results. Based on the experiment, which color appears most likely next?`, correct, uniqueStrings(["red", "blue", "green"].filter((choice) => choice !== correct)), `The outcome with the greatest relative frequency in the experiment is the best prediction.`, `${code}-${index}`);
  });
}

function buildGrade7ExperimentalTheoretical(code) {
  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const heads = 8 + (index % 6);
      const flips = 20;
      return makeQuestion(`A fair coin was flipped ${flips} times and landed heads ${heads} times. Which pair shows the experimental probability and the theoretical probability of heads?`, `${fractionOrWhole(heads, flips)} and 1/2`, [`1/2 and ${fractionOrWhole(heads, flips)}`, `${fractionOrWhole(heads + 1, flips)} and 1/2`, `${fractionOrWhole(heads, flips)} and ${fractionOrWhole(heads, flips)}`], `Experimental probability comes from the data, while theoretical probability comes from the sample space.`, `${code}-${index}`);
    }
    const green = (index % 4) + 2;
    const total = green + 3;
    const experimental = fractionOrWhole(green + 2, total + 4);
    const theoretical = fractionOrWhole(green, total);
    return makeQuestion(`A bag has ${green} green tiles and 3 yellow tiles. An experiment gave an experimental probability of green as ${experimental}. What is the theoretical probability of green?`, theoretical, [experimental, fractionOrWhole(3, total), fractionOrWhole(green + 1, total)], `Theoretical probability is based on the actual contents of the sample space.`, `${code}-${index}`);
  });
}

function buildGrade7LinearRelationships(code) {
  return buildQuestionSet((index) => {
    const slope = (index % 5) + 2;
    const intercept = (index % 4) + 1;
    if (index % 2 === 0) {
      return makeQuestion(`A taxi charges ${money(intercept)} to start and ${money(slope)} for each mile. Which equation gives the total cost y for x miles?`, `y = ${slope}x + ${intercept}`, [`y = ${intercept}x + ${slope}`, `y = ${slope}x - ${intercept}`, `y = x + ${slope + intercept}`], `In y = mx + b, m is the rate per unit and b is the starting amount.`, `${code}-${index}`);
    }
    const y1 = intercept;
    const y2 = slope + intercept;
    const y3 = slope * 2 + intercept;
    return makeQuestion(`A table shows x-values 0, 1, 2 and y-values ${y1}, ${y2}, ${y3}. Which equation matches the relationship?`, `y = ${slope}x + ${intercept}`, [`y = ${intercept}x + ${slope}`, `y = ${slope}x - ${intercept}`, `y = x + ${y2}`], `The rate of change gives the slope and the value at x = 0 gives the y-intercept.`, `${code}-${index}`);
  });
}

function buildGrade7Volume(code) {
  return buildQuestionSet((index) => {
    const kind = index % 4;
    if (kind === 0) {
      const length = (index % 5) + 4;
      const width = (index % 4) + 3;
      const height = (index % 3) + 5;
      const volume = length * width * height;
      return makeQuestion(`What is the volume of a rectangular prism with length ${length}, width ${width}, and height ${height}?`, String(volume), [String(length * width + height), String(length + width + height), String(volume + length)], `Volume of a rectangular prism is length times width times height.`, `${code}-${index}`);
    }
    if (kind === 1) {
      const baseArea = (index % 5 + 3) * 6;
      const prismLength = (index % 4) + 4;
      const volume = baseArea * prismLength;
      return makeQuestion(`A triangular prism has a triangular base area of ${baseArea} square units and a prism length of ${prismLength} units. What is its volume?`, String(volume), [String(baseArea + prismLength), String(baseArea * prismLength / 2), String(volume + baseArea)], `Volume of any prism is base area times prism length.`, `${code}-${index}`);
    }
    if (kind === 2) {
      const baseArea = (index % 5 + 4) * 9;
      const height = ((index % 4) + 2) * 3;
      const volume = baseArea * height / 3;
      return makeQuestion(`A rectangular pyramid has a base area of ${baseArea} square units and height ${height} units. What is its volume?`, String(volume), [String(baseArea * height), String(baseArea + height), String(volume + baseArea / 3)], `Volume of a pyramid is one-third the product of base area and height.`, `${code}-${index}`);
    }
    const baseArea = (index % 4 + 5) * 6;
    const height = ((index % 3) + 2) * 3;
    const volume = baseArea * height / 3;
    return makeQuestion(`A triangular pyramid has a base area of ${baseArea} square units and height ${height} units. What is its volume?`, String(volume), [String(baseArea * height), String(baseArea + height), String(volume + height)], `A pyramid's volume is one-third of the matching prism with the same base area and height.`, `${code}-${index}`);
  });
}

function buildGrade7CircleMeasures(code) {
  return buildQuestionSet((index) => {
    const pi = 3.14;
    if (index % 2 === 0) {
      const diameter = (index % 6 + 2) * 2;
      const circumference = Number((pi * diameter).toFixed(2));
      return makeQuestion(`What is the circumference of a circle with diameter ${diameter} units? Use 3.14 for pi.`, numberText(circumference, 2), [numberText(pi * (diameter / 2), 2), numberText(pi * diameter * diameter, 2), numberText(circumference + 3.14, 2)], `Circumference is pi times the diameter.`, `${code}-${index}`);
    }
    const radius = (index % 5) + 3;
    const area = Number((pi * radius * radius).toFixed(2));
    return makeQuestion(`What is the area of a circle with radius ${radius} units? Use 3.14 for pi.`, numberText(area, 2), [numberText(pi * radius * 2, 2), numberText(pi * radius, 2), numberText(area + 6.28, 2)], `Area of a circle is pi times radius squared.`, `${code}-${index}`);
  });
}

function buildGrade7CompositeArea(code) {
  return buildQuestionSet((index) => {
    const pi = 3.14;
    const kind = index % 4;
    if (kind === 0) {
      const width = (index % 5) + 6;
      const rectHeight = (index % 4) + 4;
      const triHeight = (index % 3) + 3;
      const area = width * rectHeight + width * triHeight / 2;
      return makeQuestion(`A composite figure is made of a rectangle that is ${width} by ${rectHeight} and a triangle on top with base ${width} and height ${triHeight}. What is the total area?`, numberText(area, 2), [numberText(width * rectHeight, 2), numberText(width * triHeight / 2, 2), numberText(area + width, 2)], `Add the area of each simple shape to find the composite area.`, `${code}-${index}`);
    }
    if (kind === 1) {
      const diameter = (index % 4 + 3) * 2;
      const radius = diameter / 2;
      const rectHeight = (index % 4) + 4;
      const area = Number((diameter * rectHeight + 0.5 * pi * radius * radius).toFixed(2));
      return makeQuestion(`A figure is a rectangle ${diameter} by ${rectHeight} with a semicircle of diameter ${diameter} attached to one side. What is the total area?`, numberText(area, 2), [numberText(diameter * rectHeight, 2), numberText(0.5 * pi * radius * radius, 2), numberText(area + 5, 2)], `Find the area of the rectangle and the semicircle, then add them.`, `${code}-${index}`);
    }
    if (kind === 2) {
      const side = (index % 5) + 5;
      const area = Number((side * side + 0.25 * pi * side * side).toFixed(2));
      return makeQuestion(`A square with side length ${side} has a quarter circle of radius ${side} attached to one corner. What is the total area?`, numberText(area, 2), [numberText(side * side, 2), numberText(0.25 * pi * side * side, 2), numberText(area + 4, 2)], `The composite area is the square area plus the quarter-circle area.`, `${code}-${index}`);
    }
    const width = (index % 5) + 5;
    const rectHeight = (index % 3) + 3;
    const trapTop = width;
    const trapBottom = width + 4;
    const trapHeight = (index % 4) + 2;
    const area = width * rectHeight + ((trapTop + trapBottom) * trapHeight) / 2;
    return makeQuestion(`A figure is made of a rectangle ${width} by ${rectHeight} and a trapezoid with bases ${trapTop} and ${trapBottom} and height ${trapHeight}. What is the total area?`, numberText(area, 2), [numberText(width * rectHeight, 2), numberText(((trapTop + trapBottom) * trapHeight) / 2, 2), numberText(area + trapHeight, 2)], `Find the area of each piece and add the areas together.`, `${code}-${index}`);
  });
}

function buildGrade7SurfaceArea(code) {
  return buildQuestionSet((index) => {
    const kind = index % 4;
    if (kind === 0) {
      const a = 12 + (index % 4) * 2;
      const b = 15 + (index % 3) * 3;
      const c = 18 + (index % 5) * 2;
      const total = 2 * (a + b + c);
      return makeQuestion(`A rectangular prism net has two faces of area ${a}, two of area ${b}, and two of area ${c} square units. What is the total surface area?`, String(total), [String(a + b + c), String(2 * (a + b)), String(total + a)], `Total surface area is the sum of all face areas in the net.`, `${code}-${index}`);
    }
    if (kind === 1) {
      const a = 10 + (index % 4) * 2;
      const b = 16 + (index % 3) * 2;
      const lateral = 2 * (a + b);
      return makeQuestion(`A rectangular prism has four side faces in its net with areas ${a}, ${a}, ${b}, and ${b} square units. What is the lateral surface area?`, String(lateral), [String(a + b), String(2 * a + b), String(lateral + b)], `Lateral surface area includes only the side faces, not the bases.`, `${code}-${index}`);
    }
    if (kind === 2) {
      const rect1 = 18 + (index % 4) * 3;
      const rect2 = 18 + (index % 4) * 3;
      const rect3 = 24 + (index % 3) * 3;
      const baseArea = 12 + (index % 3) * 2;
      const total = rect1 + rect2 + rect3 + baseArea * 2;
      return makeQuestion(`A triangular prism net has rectangular faces with areas ${rect1}, ${rect2}, and ${rect3}, and two triangular bases each with area ${baseArea}. What is the total surface area?`, String(total), [String(rect1 + rect2 + rect3), String(total - baseArea), String(total + baseArea)], `A prism's total surface area is the sum of all lateral faces and both bases.`, `${code}-${index}`);
    }
    const triangle1 = 14 + (index % 4) * 2;
    const triangle2 = triangle1;
    const triangle3 = 18 + (index % 3) * 2;
    const triangle4 = triangle3;
    const baseArea = 20 + (index % 4) * 4;
    const total = triangle1 + triangle2 + triangle3 + triangle4 + baseArea;
    return makeQuestion(`A rectangular pyramid net has four triangular faces with areas ${triangle1}, ${triangle2}, ${triangle3}, and ${triangle4}, plus a rectangular base with area ${baseArea}. What is the total surface area?`, String(total), [String(total - baseArea), String(baseArea + triangle1 + triangle3), String(total + triangle1)], `For a pyramid, total surface area is the base area plus the areas of all triangular side faces.`, `${code}-${index}`);
  });
}

function buildGrade7WriteTwoStepEquation(code) {
  const cases = [
    ["Five more than twice a number is 21.", "2x + 5 = 21", ["2x - 5 = 21", "x + 2 = 21", "2 + 5x = 21"]],
    ["Three less than four times a number is at least 17.", "4x - 3 >= 17", ["4x + 3 >= 17", "4 - 3x >= 17", "4x - 3 <= 17"]],
    ["A number divided by 3, then increased by 8, equals 20.", "x/3 + 8 = 20", ["3x + 8 = 20", "x/3 - 8 = 20", "x + 3/8 = 20"]],
    ["Seven more than half a number is less than 19.", "x/2 + 7 < 19", ["2x + 7 < 19", "x/2 - 7 < 19", "x/2 + 7 > 19"]]
  ];
  return buildQuestionSet((index) => {
    const [prompt, correct, wrongs] = pick(cases, index);
    return makeQuestion(`Which equation or inequality matches this statement? ${prompt}`, correct, wrongs, `Translate the words into operations in the same order they happen to the variable.`, `${code}-${index}`);
  });
}

function buildGrade7NumberLineSolutions(code) {
  const cases = [
    ["x > 5", lineDescription(5, ">"), [lineDescription(5, ">="), lineDescription(5, "<"), lineDescription(5, "<=")]],
    ["x >= -2", lineDescription(-2, ">="), [lineDescription(-2, ">"), lineDescription(-2, "<"), lineDescription(-2, "<=")]],
    ["x < 7", lineDescription(7, "<"), [lineDescription(7, "<="), lineDescription(7, ">"), lineDescription(7, ">=")]],
    ["x <= 3", lineDescription(3, "<="), [lineDescription(3, "<"), lineDescription(3, ">"), lineDescription(3, ">=")]]
  ];
  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const [inequality, correct, wrongs] = pick(cases, index);
      return makeQuestion(`Which number line description matches ${inequality}?`, correct, wrongs, `Open circles mean the endpoint is not included, and closed circles mean the endpoint is included.`, `${code}-${index}`);
    }
    const [inequality, correct] = pick(cases, index);
    return makeQuestion(`A number line has ${correct}. Which inequality does it represent?`, inequality, uniqueStrings(cases.map(([text]) => text).filter((text) => text !== inequality).slice(0, 3)), `The shaded direction shows whether values are greater than or less than the endpoint.`, `${code}-${index}`);
  });
}

function buildGrade7ProblemFromEquation(code) {
  const cases = [
    ["2x + 5 = 19", "Two movie tickets cost x dollars each and a snack costs $5 for a total of $19.", ["Two movie tickets cost $2 each and a snack costs $5 for a total of x dollars.", "A movie ticket costs x dollars and 5 more tickets cost $19.", "Two movie tickets and $19 make $5."]],
    ["3x - 4 > 11", "Three times a number decreased by 4 is greater than 11.", ["Three times a number increased by 4 is greater than 11.", "A number minus 4 is greater than 11 and then multiplied by 3.", "Three less than a number is 4 greater than 11."]],
    ["x/4 + 6 = 14", "A number is divided by 4 and then 6 is added to get 14.", ["A number is multiplied by 4 and then 6 is added to get 14.", "A number divided by 6 and then 4 is added equals 14.", "A number is divided by 4 and then 6 is subtracted to get 14."]],
    ["5x + 2 <= 27", "Five times a number plus 2 is less than or equal to 27.", ["Five times a number minus 2 is less than or equal to 27.", "Five less than a number plus 2 is less than or equal to 27.", "Five times a number plus 2 is greater than or equal to 27."]]
  ];
  return buildQuestionSet((index) => {
    const [equation, correct, wrongs] = pick(cases, index);
    return makeQuestion(`Which real-world statement matches ${equation}?`, correct, wrongs, `A matching problem keeps the same operations, order, and comparison sign as the equation or inequality.`, `${code}-${index}`);
  });
}

function buildGrade7SolveTwoStep(code) {
  return buildQuestionSet((index) => {
    const kind = index % 4;
    if (kind === 0) {
      const solution = (index % 6) + 3;
      const constant = (index % 5) + 4;
      const total = solution * 2 + constant;
      return makeQuestion(`Solve 2x + ${constant} = ${total}.`, `x = ${solution}`, [`x = ${solution + 1}`, `x = ${total - constant}`, `x = ${solution - 1}`], `Use inverse operations to undo addition and then division or multiplication.`, `${code}-${index}`);
    }
    if (kind === 1) {
      const solution = (index % 5) + 4;
      const constant = (index % 4) + 3;
      const total = Number((solution / 2 + constant).toFixed(2));
      return makeQuestion(`Solve x/2 + ${constant} = ${numberText(total)}.`, `x = ${solution}`, [`x = ${solution * 2}`, `x = ${solution + constant}`, `x = ${solution - 2}`], `Reverse the operations in the opposite order to isolate x.`, `${code}-${index}`);
    }
    if (kind === 2) {
      const boundary = (index % 6) + 2;
      const constant = (index % 4) + 1;
      const total = boundary * 3 - constant;
      return makeQuestion(`Solve 3x - ${constant} < ${total}.`, `x < ${boundary}`, [`x > ${boundary}`, `x <= ${boundary}`, `x >= ${boundary}`], `Undo the subtraction and divide by 3 while keeping the inequality direction because the divisor is positive.`, `${code}-${index}`);
    }
    const boundary = (index % 5) + 4;
    const constant = (index % 4) + 2;
    const total = Number((boundary / 2 + constant).toFixed(2));
    return makeQuestion(`Solve x/2 + ${constant} >= ${numberText(total)}.`, `x >= ${boundary}`, [`x <= ${boundary}`, `x > ${boundary}`, `x = ${boundary}`], `Isolate x and keep the inequality direction the same because the operation uses positive values.`, `${code}-${index}`);
  });
}

function buildGrade7CheckTwoStep(code) {
  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const answer = (index % 6) + 2;
      const total = answer * 3 + 4;
      return makeQuestion(`Which value makes 3x + 4 = ${total} true?`, String(answer), [String(answer + 1), String(answer - 1), String(total - 4)], `Substitute each value and check which one makes both sides equal.`, `${code}-${index}`);
    }
    const threshold = (index % 5) + 4;
    const choices = [threshold + 1, threshold - 1, threshold, threshold + 3];
    const correct = String(choices.find((value) => value / 2 - 1 > threshold / 2 - 1) || threshold + 3);
    return makeQuestion(`Which value makes x/2 - 1 > ${numberText(threshold / 2 - 1)} true?`, correct, uniqueStrings(choices.map(String).filter((choice) => choice !== correct)).slice(0, 3), `Substitute each option and decide which one keeps the inequality true.`, `${code}-${index}`);
  });
}

function buildGrade7GeometryEquations(code) {
  return buildQuestionSet((index) => {
    const kind = index % 3;
    if (kind === 0) {
      const x = (index % 6) + 15;
      const a = x + 20;
      const b = 50;
      const c = 110 - x;
      return makeQuestion(`A triangle has angle measures ${a}, ${b}, and ${c}. What is x?`, String(x), [String(x + 5), String(180 - a - b), String(c)], `The three angle measures in a triangle add to 180 degrees.`, `${code}-${index}`);
    }
    if (kind === 1) {
      const x = (index % 5) + 20;
      const a = x + 25;
      const b = 155 - x;
      return makeQuestion(`Two supplementary angles measure ${a} and ${b}. What is x?`, String(x), [String(x + 10), String(180 - a), String(b)], `Supplementary angles add to 180 degrees.`, `${code}-${index}`);
    }
    const x = (index % 6) + 8;
    const left = 3 * x + 6;
    const right = 5 * x - 10;
    return makeQuestion(`Vertical angles are labeled ${left} and ${right}. What is x?`, String(x), [String(x + 2), String(x - 2), String(left - right)], `Vertical angles are congruent, so set their expressions equal and solve.`, `${code}-${index}`);
  });
}

function buildGrade7ComparePlots(code) {
  return buildQuestionSet((index) => {
    const kind = index % 3;
    if (kind === 0) {
      const medianA = 15 + (index % 4);
      const medianB = medianA + 3;
      return makeQuestion(`Box plot A has a median of ${medianA}. Box plot B has a median of ${medianB}. Which group has the higher center?`, "Group B", ["Group A", "Both have the same center", "There is not enough information"], `The median is a measure of center. The larger median indicates the higher center.`, `${code}-${index}`);
    }
    if (kind === 1) {
      const iqrA = 4 + (index % 3);
      const iqrB = iqrA + 3;
      return makeQuestion(`Comparative box plots show Group A with IQR ${iqrA} and Group B with IQR ${iqrB}. Which group has the greater spread?`, "Group B", ["Group A", "Both have the same spread", "There is not enough information"], `A larger interquartile range means the middle half of the data is more spread out.`, `${code}-${index}`);
    }
    return makeQuestion(`Two groups have the same median, but Group B's comparative dot plot is spread out much more than Group A's. Which statement is true?`, "Group B has greater variability", ["Group A has greater variability", "Both groups have no variability", "Group B has the smaller spread"], `When the data are more spread out, the group has greater variability.`, `${code}-${index}`);
  });
}

function buildGrade7RandomSampleInference(code) {
  return buildQuestionSet((index) => {
    const sampleSize = 20 + (index % 4) * 10;
    const sampleYes = 6 + (index % 5) * 4;
    if (index % 2 === 0) {
      const population = sampleSize * 5;
      const estimate = Math.round((sampleYes / sampleSize) * population);
      return makeQuestion(`In a random sample of ${sampleSize} students, ${sampleYes} said they bring lunch from home. About how many in a population of ${population} students would you expect to bring lunch from home?`, String(estimate), [String(sampleYes), String(population - estimate), String(estimate + 10)], `Use the sample proportion to make an inference about the population.`, `${code}-${index}`);
    }
    const estimate = Math.round((sampleYes / sampleSize) * 100);
    return makeQuestion(`A random sample of ${sampleSize} voters found that ${sampleYes} support a proposal. Which is a reasonable inference about the population?`, `About ${estimate}% of the population may support the proposal`, [`Exactly ${sampleYes} people in the population support it`, `No one in the population supports it`, `The sample proves every person supports it`], `Random samples can suggest what may be true in the whole population, but they do not guarantee exact results.`, `${code}-${index}`);
  });
}

function buildGrade7ComparePopulations(code) {
  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const medianA = 12 + (index % 4);
      const medianB = medianA + 4;
      return makeQuestion(`A random sample from Town A has median travel time ${medianA} minutes. A random sample from Town B has median travel time ${medianB} minutes. Which population likely has the higher center?`, "Town B", ["Town A", "Both have the same center", "There is not enough information"], `When comparing samples from two populations, the larger median suggests a higher center.`, `${code}-${index}`);
    }
    const percentA = 30 + (index % 4) * 5;
    const percentB = percentA + 10;
    return makeQuestion(`A random sample from School A found ${percentA}% of students joined a club. A random sample from School B found ${percentB}%. Which population likely has the higher club participation rate?`, "School B", ["School A", "Both schools have the same rate", "There is not enough information"], `Comparing sample percentages can support informal inferences about differences between populations.`, `${code}-${index}`);
  });
}

function buildGrade7SalesIncomeTax(code) {
  return buildQuestionSet((index) => {
    const amount = 40 + (index % 6) * 15;
    const rate = pick([6, 8, 10, 12], index);
    if (index % 2 === 0) {
      const tax = Number((amount * rate / 100).toFixed(2));
      return makeQuestion(`What is the sales tax on a purchase of ${money(amount)} if the tax rate is ${rate}%?`, money(tax), [money(amount), money(amount + tax), money(tax + 2)], `Sales tax is found by multiplying the purchase amount by the tax rate.`, `${code}-${index}`);
    }
    const tax = Number((amount * rate / 100).toFixed(2));
    return makeQuestion(`A worker earns ${money(amount)}. If income tax is ${rate}%, how much income tax is withheld?`, money(tax), [money(amount - tax), money(amount + tax), money(tax + 3)], `Income tax withheld is the percent of the earnings taken for taxes.`, `${code}-${index}`);
  });
}

function buildGrade7Budget(code) {
  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const total = 2000 + (index % 5) * 200;
      const part = 200 + (index % 4) * 100;
      const percent = Number((part / total * 100).toFixed(2));
      return makeQuestion(`A monthly budget totals ${money(total)} and ${money(part)} goes to savings. What percent of the budget is savings?`, percentText(percent), [percentText(percent + 5), percentText(percent - 5), percentText(part)], `Find the part-to-whole percent by dividing the category amount by the total budget.`, `${code}-${index}`);
    }
    return makeQuestion(`Which expense is usually a fixed expense in a personal budget?`, "monthly rent", ["movie tickets", "restaurant meals", "games and hobbies"], `Fixed expenses stay about the same each month, while variable expenses can change.`, `${code}-${index}`);
  });
}

function buildGrade7NetWorth(code) {
  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const assets = 4000 + (index % 5) * 750;
      const liabilities = 1000 + (index % 4) * 500;
      const netWorth = assets - liabilities;
      return makeQuestion(`A family has assets totaling ${money(assets)} and liabilities totaling ${money(liabilities)}. What is the net worth?`, money(netWorth), [money(assets + liabilities), money(liabilities - assets), money(netWorth + 500)], `Net worth equals total assets minus total liabilities.`, `${code}-${index}`);
    }
    return makeQuestion(`Which item belongs in the liabilities section of a financial record?`, "credit card balance", ["savings account", "cash on hand", "the value of a car owned outright"], `Liabilities are debts or amounts owed, while assets are things of value that are owned.`, `${code}-${index}`);
  });
}

function buildGrade7HouseholdBudget(code) {
  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const monthly = 2800 + (index % 5) * 320;
      const annual = monthly * 12;
      return makeQuestion(`If a family's minimum household budget is ${money(monthly)} per month, what is the yearly budget?`, money(annual), [money(monthly), money(annual + monthly), money(annual - monthly)], `Multiply the monthly budget by 12 months to find the yearly budget.`, `${code}-${index}`);
    }
    const hourly = 16 + (index % 5) * 2;
    const annual = hourly * 2080;
    return makeQuestion(`A family needs ${money(annual)} per year to meet basic needs. Assuming 2,080 work hours in a year, what hourly wage is needed?`, money(hourly), [money(hourly + 2), money(annual / 12), money(hourly - 2)], `Divide the yearly budget by 2,080 to find the hourly wage needed for full-time work.`, `${code}-${index}`);
  });
}

function buildGrade7Interest(code) {
  return buildQuestionSet((index) => {
    const principal = 500 + (index % 5) * 250;
    const rate = pick([4, 5, 6, 8], index) / 100;
    if (index % 3 === 0) {
      const years = (index % 3) + 1;
      const interest = Number((principal * rate * years).toFixed(2));
      return makeQuestion(`How much simple interest is earned on ${money(principal)} at ${percentText(rate * 100)} for ${years} years?`, money(interest), [money(principal * rate), money(interest + 20), money(principal + interest)], `Simple interest is found with principal times rate times time.`, `${code}-${index}`);
    }
    if (index % 3 === 1) {
      const years = 2;
      const total = Number((principal * Math.pow(1 + rate, years)).toFixed(2));
      return makeQuestion(`What is the total value of ${money(principal)} invested at ${percentText(rate * 100)} compound interest for ${years} years, compounded annually?`, money(total), [money(Number((principal * (1 + rate * years)).toFixed(2))), money(Number((principal * (1 + rate)).toFixed(2))), money(total + 25)], `Compound interest adds interest to the principal before the next year's interest is calculated.`, `${code}-${index}`);
    }
    return makeQuestion(`Two accounts use the same principal and rate for the same time. One uses simple interest and one uses compound interest. Which earns more?`, "the compound interest account", ["the simple interest account", "both earn the same amount", "the account with fewer deposits"], `Compound interest earns interest on both the principal and previously earned interest.`, `${code}-${index}`);
  });
}

function buildGrade7Incentives(code) {
  return buildQuestionSet((index) => {
    const price = 60 + (index % 6) * 10;
    if (index % 2 === 0) {
      const saleRate = pick([10, 15, 20, 25], index);
      const coupon = 8 + (index % 4) * 2;
      const salePrice = Number((price * (1 - saleRate / 100)).toFixed(2));
      const couponPrice = Number((price - coupon).toFixed(2));
      const best = salePrice <= couponPrice ? `the ${saleRate}% sale` : `the ${money(coupon)} coupon`;
      return makeQuestion(`An item costs ${money(price)}. Which gives the lower final price: a ${saleRate}% sale or a ${money(coupon)} coupon?`, best, [`both are the same`, `neither changes the price`, salePrice <= couponPrice ? `the ${money(coupon)} coupon` : `the ${saleRate}% sale`], `Compare the final prices after each incentive to decide which saves more.`, `${code}-${index}`);
    }
    const rebate = 10 + (index % 4) * 5;
    const saleRate = pick([10, 20, 25], index);
    const rebatePrice = Number((price - rebate).toFixed(2));
    const salePrice = Number((price * (1 - saleRate / 100)).toFixed(2));
    const better = rebatePrice <= salePrice ? `the ${money(rebate)} rebate` : `the ${saleRate}% sale`;
    return makeQuestion(`A purchase costs ${money(price)}. Which incentive gives the lower effective cost: a ${money(rebate)} rebate or a ${saleRate}% sale?`, better, [`both are the same`, `neither lowers the cost`, rebatePrice <= salePrice ? `the ${saleRate}% sale` : `the ${money(rebate)} rebate`], `Find the effective price under each incentive and compare them directly.`, `${code}-${index}`);
  });
}

function buildGrade8RealNumberSets(code) {
  const valueCases = [
    ["sqrt(2)", "irrational numbers", ["rational numbers", "integers", "whole numbers"]],
    ["pi", "irrational numbers", ["rational numbers", "integers", "natural numbers"]],
    ["-3", "integers", ["whole numbers", "natural numbers", "irrational numbers"]],
    ["0.75", "rational numbers", ["integers", "whole numbers", "irrational numbers"]],
    ["0", "whole numbers", ["natural numbers", "integers", "irrational numbers"]],
    ["9", "natural numbers", ["whole numbers", "integers", "irrational numbers"]]
  ];
  const statements = [
    ["All irrational numbers are real numbers", ["All irrational numbers are integers", "All real numbers are irrational", "Irrational numbers are not on the number line"]],
    ["Rational numbers and irrational numbers together make up the real numbers", ["Integers and irrational numbers make up only the natural numbers", "Whole numbers and rational numbers make up the irrational numbers", "Only decimals are real numbers"]],
    ["A terminating decimal is a rational number", ["A terminating decimal is always irrational", "A terminating decimal is never real", "A terminating decimal must be an integer"]],
    ["Every integer is also a rational number", ["No integer is rational", "Only positive integers are rational", "Integers are not real numbers"]]
  ];
  return buildQuestionSet((index) => {
    if (index < 25) {
      const [value, correct, wrongs] = pick(valueCases, index);
      return makeQuestion(`Which is the smallest set that contains ${value}?`, correct, wrongs, `Real numbers include both rational and irrational numbers, and some rational numbers belong to smaller subsets.`, `${code}-${index}`);
    }
    const [correct, wrongs] = pick(statements, index);
    return makeQuestion(`Which statement about sets of real numbers is true?`, correct, wrongs, `Set relationships help describe how rational, irrational, and real numbers fit together.`, `${code}-${index}`);
  });
}

function buildGrade8IrrationalApprox(code) {
  const radicands = [2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22];
  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const value = pick(radicands, index);
      const approx = numberText(Math.sqrt(value), 1);
      return makeQuestion(`Which decimal is the best approximation of sqrt(${value}) to the nearest tenth?`, approx, [numberText(Math.sqrt(value) + 0.2, 1), numberText(Math.sqrt(value) - 0.2, 1), numberText(Math.sqrt(value) + 1, 1)], `Use nearby perfect squares and decimal estimation to approximate irrational numbers.`, `${code}-${index}`);
    }
    if (index % 5 === 1) {
      return makeQuestion(`Between which two integers is pi located on a number line?`, `between 3 and 4`, [`between 2 and 3`, `between 4 and 5`, `between 1 and 2`], `Pi is about 3.14, so it lies between 3 and 4.`, `${code}-${index}`);
    }
    const value = pick(radicands, index);
    const root = Math.sqrt(value);
    const lower = Math.floor(root);
    return makeQuestion(`Between which two consecutive integers is sqrt(${value}) located?`, `between ${lower} and ${lower + 1}`, [`between ${lower - 1} and ${lower}`, `between ${lower + 1} and ${lower + 2}`, `between ${lower + 2} and ${lower + 3}`], `A square root lies between the whole numbers whose squares are on either side of the radicand.`, `${code}-${index}`);
  });
}

function buildGrade8ScientificNotation(code) {
  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const coefficient = Number((1 + (index % 8) * 0.5).toFixed(1));
      const exponent = (index % 5) + 3;
      const value = coefficient * Math.pow(10, exponent);
      return makeQuestion(`Write ${formatNumber(value)} in scientific notation.`, `${coefficient} x 10^${exponent}`, [`${coefficient * 10} x 10^${exponent - 1}`, `${coefficient} x 10^${exponent - 1}`, `${coefficient + 1} x 10^${exponent}`], `Scientific notation writes a number as a value between 1 and 10 multiplied by a power of 10.`, `${code}-${index}`);
    }
    const coefficient = Number((1 + (index % 7) * 0.4).toFixed(1));
    const exponent = -((index % 4) + 2);
    const value = Number((coefficient * Math.pow(10, exponent)).toFixed(6));
    return makeQuestion(`Write ${coefficient} x 10^${exponent} in standard decimal notation.`, numberText(value, 6), [numberText(value * 10, 6), numberText(value / 10, 6), numberText(Math.abs(value), 2)], `Moving the decimal left for negative exponents and right for positive exponents converts scientific notation to standard form.`, `${code}-${index}`);
  });
}

function buildGrade8OrderRealNumbers(code) {
  return buildQuestionSet((index) => {
    const values = [
      { text: "sqrt(5)", value: Math.sqrt(5) },
      { text: "2.3", value: 2.3 },
      { text: "9/4", value: 9 / 4 },
      { text: "pi", value: Math.PI },
      { text: "3.05", value: 3.05 }
    ];
    const rotated = values.map((_, offset) => values[(index + offset) % values.length]);
    const correct = rotated.slice().sort((left, right) => left.value - right.value).map((entry) => entry.text).join(", ");
    const wrongA = rotated.slice().sort((left, right) => right.value - left.value).map((entry) => entry.text).join(", ");
    const wrongB = [rotated[1], rotated[0], rotated[2], rotated[4], rotated[3]].map((entry) => entry.text).join(", ");
    const wrongC = [rotated[2], rotated[3], rotated[1], rotated[0], rotated[4]].map((entry) => entry.text).join(", ");
    return makeQuestion(`Which list orders these real numbers from least to greatest? ${rotated.map((entry) => entry.text).join(", ")}`, correct, [wrongA, wrongB, wrongC], `Compare real numbers by using decimal approximations when needed.`, `${code}-${index}`);
  });
}

function buildGrade8SlopeRelationships(kind) {
  return buildQuestionSet((index) => {
    if (kind === "8.4A") {
      if (index % 2 === 0) {
        const rise = (index % 5) + 2;
        const run = (index % 4) + 3;
        return makeQuestion(`A line passes through two points that create a right triangle with rise ${rise} and run ${run}. What is the slope of the line?`, fractionOrWhole(rise, run), [fractionOrWhole(run, rise), fractionOrWhole(rise + 1, run), fractionOrWhole(rise, run + 1)], `Slope is the ratio of the change in y to the change in x.`, `${kind}-${index}`);
      }
      const riseA = (index % 4) + 2;
      const runA = (index % 5) + 3;
      const scale = (index % 3) + 2;
      return makeQuestion(`Two right triangles lie on the same line. One has rise ${riseA} and run ${runA}. A larger similar triangle has rise ${riseA * scale} and run ${runA * scale}. Which statement is true?`, `Both triangles have slope ${fractionOrWhole(riseA, runA)}`, [`The larger triangle has slope ${fractionOrWhole(runA, riseA)}`, `Only the smaller triangle has a slope`, `The slopes are different because the triangles are different sizes`], `Similar right triangles on the same line have the same ratio of rise to run.`, `${kind}-${index}`);
    }
    if (kind === "8.4B") {
      const rate = (index % 6) + 2;
      if (index % 2 === 0) {
        return makeQuestion(`A relationship is proportional and has unit rate ${rate}. Which equation matches its graph?`, `y = ${rate}x`, [`y = ${rate}x + 1`, `y = x + ${rate}`, `y = ${rate} + x`], `A proportional relationship graphs as a line through the origin with equation y = kx.`, `${kind}-${index}`);
      }
      return makeQuestion(`Points (0, 0), (1, ${rate}), and (2, ${rate * 2}) lie on a graph. What is the slope of the line?`, String(rate), [String(rate + 1), String(rate - 1), fractionOrWhole(1, rate)], `For a proportional relationship, the unit rate is the slope.`, `${kind}-${index}`);
    }
    const slope = (index % 5) + 2;
    const intercept = (index % 4) + 1;
    if (index % 2 === 0) {
      return makeQuestion(`A table shows x-values 0, 1, 2 and y-values ${intercept}, ${slope + intercept}, ${slope * 2 + intercept}. What is the slope?`, String(slope), [String(intercept), String(slope + intercept), String(slope - 1)], `The slope is the constant change in y for each increase of 1 in x.`, `${kind}-${index}`);
    }
    return makeQuestion(`A line includes the points (0, ${intercept}) and (2, ${slope * 2 + intercept}). What is the y-intercept?`, String(intercept), [String(slope), String(slope * 2 + intercept), String(intercept + 1)], `The y-intercept is the y-value when x = 0.`, `${kind}-${index}`);
  });
}

function buildGrade8LinearFunctions(kind) {
  return buildQuestionSet((index) => {
    if (kind === "8.5A") {
      const k = (index % 6) + 2;
      if (index % 2 === 0) {
        return makeQuestion(`Which equation represents a linear proportional relationship with constant of proportionality ${k}?`, `y = ${k}x`, [`y = ${k}x + 3`, `y = x + ${k}`, `y = ${k} + x`], `A linear proportional relationship has the form y = kx and passes through the origin.`, `${kind}-${index}`);
      }
      return makeQuestion(`A proportional table has x-values 1, 2, 3 and y-values ${k}, ${k * 2}, ${k * 3}. Which equation matches the relationship?`, `y = ${k}x`, [`y = ${k}x + 1`, `y = x + ${k}`, `y = ${k - 1}x`], `A proportional relationship keeps the ratio y/x constant.`, `${kind}-${index}`);
    }
    if (kind === "8.5B" || kind === "8.5I") {
      const slope = (index % 5) + 2;
      const intercept = (index % 4) + 1;
      if (index % 2 === 0) {
        return makeQuestion(`A gym charges ${money(intercept)} to join and ${money(slope)} each visit. Which equation models the total cost y for x visits?`, `y = ${slope}x + ${intercept}`, [`y = ${slope}x`, `y = ${intercept}x + ${slope}`, `y = x + ${slope + intercept}`], `A non-proportional linear relationship has a starting amount and uses y = mx + b.`, `${kind}-${index}`);
      }
      return makeQuestion(`A table shows x-values 0, 1, 2 and y-values ${intercept}, ${slope + intercept}, ${slope * 2 + intercept}. Which equation matches the relationship?`, `y = ${slope}x + ${intercept}`, [`y = ${slope}x`, `y = ${intercept}x + ${slope}`, `y = x + ${slope}`], `Use the rate of change for m and the value at x = 0 for b.`, `${kind}-${index}`);
    }
    if (kind === "8.5C") {
      const prompts = [
        ["points that cluster around a straight line", "linear relationship"],
        ["points that curve upward", "not a linear relationship"],
        ["points with no clear pattern", "not a linear relationship"],
        ["points that fit close to a straight decreasing line", "linear relationship"]
      ];
      const [prompt, correct] = pick(prompts, index);
      return makeQuestion(`A scatterplot shows ${prompt}. What type of relationship does the data suggest?`, correct, uniqueStrings(["linear relationship", "not a linear relationship", "constant relationship", "perfect square relationship"].filter((choice) => choice !== correct)).slice(0, 3), `Linear relationships appear as points that follow an overall straight-line pattern.`, `${kind}-${index}`);
    }
    if (kind === "8.5D") {
      const slope = (index % 4) + 2;
      const intercept = (index % 5) + 3;
      const x = (index % 6) + 5;
      const prediction = slope * x + intercept;
      return makeQuestion(`A trend line for a data set is approximated by y = ${slope}x + ${intercept}. What does the trend line predict when x = ${x}?`, String(prediction), [String(prediction + slope), String(slope * x), String(intercept + x)], `Substitute the x-value into the trend-line equation to make a prediction.`, `${kind}-${index}`);
    }
    if (kind === "8.5E") {
      const x1 = (index % 5) + 2;
      const y1 = x1 * ((index % 4) + 3);
      const x2 = x1 + 3;
      const y2 = y1 * (x2 / x1);
      return makeQuestion(`If y varies directly with x and y = ${y1} when x = ${x1}, what is y when x = ${x2}?`, String(y2), [String(y1 + x2), String(y1), String(y2 + x1)], `In direct variation, y/x stays constant and the equation has the form y = kx.`, `${kind}-${index}`);
    }
    if (kind === "8.5F") {
      const equation = index % 2 === 0 ? `y = ${(index % 4) + 2}x` : `y = ${(index % 4) + 2}x + ${(index % 3) + 1}`;
      const correct = index % 2 === 0 ? "proportional" : "non-proportional";
      return makeQuestion(`Is the relationship ${equation} proportional or non-proportional?`, correct, correct === "proportional" ? ["non-proportional", "neither", "cannot be determined"] : ["proportional", "neither", "cannot be determined"], `Proportional relationships have the form y = kx and pass through the origin.`, `${kind}-${index}`);
    }
    if (kind === "8.5G") {
      const options = [
        ["(1, 3), (2, 5), (3, 7), (4, 9)", "function"],
        ["(1, 3), (1, 5), (2, 7), (3, 9)", "not a function"],
        ["(0, 4), (2, 4), (5, 4), (9, 4)", "function"],
        ["(2, 1), (2, 6), (3, 7), (4, 8)", "not a function"]
      ];
      const [pairs, correct] = pick(options, index);
      return makeQuestion(`Do these ordered pairs represent a function? ${pairs}`, correct, correct === "function" ? ["not a function", "linear only", "proportional only"] : ["function", "linear only", "proportional only"], `A function gives each input exactly one output.`, `${kind}-${index}`);
    }
    if (kind === "8.5H") {
      const correct = index % 2 === 0 ? "earning $12 per hour with no starting fee is proportional" : "a taxi fare with a starting charge and a per-mile cost is non-proportional";
      const wrongs = index % 2 === 0
        ? ["a taxi fare with a starting charge is proportional", "a flat membership fee only is proportional", "any relationship with a y-intercept is proportional"]
        : ["earning $12 per hour with no starting fee is non-proportional", "a line through the origin is non-proportional", "a constant ratio always creates a non-proportional function"];
      return makeQuestion(`Which statement about proportional and non-proportional functions is true?`, correct, wrongs, `Proportional functions start at zero; non-proportional linear functions have a nonzero y-intercept.`, `${kind}-${index}`);
    }
    const x = (index % 4) + 1;
    const y = (index % 5) + 2;
    const m = (index % 3) + 1;
    const b = y - m * x;
    return makeQuestion(`Two graphed lines intersect at (${x}, ${y}). Which ordered pair satisfies both equations at the intersection?`, `(${x}, ${y})`, [`(${x + 1}, ${y})`, `(${x}, ${y + 1})`, `(${m}, ${b})`], `The intersection point is the ordered pair that makes both equations true at the same time.`, `${kind}-${index}`);
  });
}

function buildGrade8VariablesBothSides(kind) {
  return buildQuestionSet((index) => {
    if (kind === "8.8A") {
      const left = (index % 4) + 2;
      const right = left + 1;
      const leftConstant = (index % 5) + 3;
      const rightConstant = leftConstant + 4;
      return makeQuestion(`Which equation models this statement: ${leftConstant} more than ${left} times a number equals ${rightConstant} more than ${right} times the same number?`, `${left}x + ${leftConstant} = ${right}x + ${rightConstant}`, [`${left}x - ${leftConstant} = ${right}x + ${rightConstant}`, `${left}x + ${rightConstant} = ${right}x + ${leftConstant}`, `${right}x + ${leftConstant} = ${left}x + ${rightConstant}`], `Variables on both sides can model situations where two expressions describe equal amounts.`, `${kind}-${index}`);
    }
    if (kind === "8.8B") {
      const equation = `2x + 5 = x + 11`;
      return makeQuestion(`Which real-world statement matches ${equation}?`, `Two identical notebooks and a $5 folder cost the same as one notebook and an $11 binder.`, [`Two identical notebooks and $11 cost the same as one notebook and $5.`, `Two notebooks cost $5 each and one notebook costs $11 each.`, `A notebook costs x dollars and a folder costs $11 more.`], `A matching context keeps the same variable on both sides and the same constants.`, `${kind}-${index}`);
    }
    const left = (index % 4) + 2;
    const right = (index % 3) + 1;
    const solution = (index % 5) + 3;
    const leftConstant = (index % 4) + 6;
    const rightConstant = left * solution + leftConstant - right * solution;
    return makeQuestion(`Solve ${left}x + ${leftConstant} = ${right}x + ${rightConstant}.`, `x = ${solution}`, [`x = ${solution + 1}`, `x = ${solution - 1}`, `x = ${rightConstant - leftConstant}`], `Combine variable terms on one side and constants on the other to solve.`, `${kind}-${index}`);
  });
}

function buildGrade8DilationAndTransformations(kind) {
  return buildQuestionSet((index) => {
    if (kind === "8.3A") {
      const small = (index % 5) + 4;
      const scale = pick([2, 3, 4], index);
      return makeQuestion(`A shape is dilated by a scale factor of ${scale}. If a side was ${small} units before the dilation, what is the corresponding side length after the dilation?`, `${small * scale} units`, [`${small + scale} units`, `${small} units`, `${small * scale + scale} units`], `Corresponding side lengths in a dilation are proportional by the scale factor.`, `${kind}-${index}`);
    }
    if (kind === "8.3B") {
      return makeQuestion(`Which statement correctly compares a figure and its dilation on a coordinate plane?`, `Angle measures stay the same while side lengths change by the scale factor`, [`Angle measures change but side lengths stay the same`, `Both angle measures and side lengths stay exactly the same`, `A dilation always turns the figure upside down`], `Dilations preserve angle measure and change lengths proportionally.`, `${kind}-${index}`);
    }
    if (kind === "8.3C") {
      const x = (index % 4) + 1;
      const y = (index % 5) + 2;
      const scale = pick([2, 3, 1 / 2, 3 / 2], index);
      return makeQuestion(`A dilation centered at the origin uses a scale factor of ${numberText(scale, 2)}. What is the image of (${x}, ${y})?`, `(${numberText(x * scale, 2)}, ${numberText(y * scale, 2)})`, [`(${numberText(x + scale, 2)}, ${numberText(y + scale, 2)})`, `(${numberText(x / scale, 2)}, ${numberText(y / scale, 2)})`, `(${y}, ${x})`], `A dilation from the origin multiplies each coordinate by the scale factor.`, `${kind}-${index}`);
    }
    if (kind === "8.10A") {
      return makeQuestion(`Which transformation preserves orientation and congruence?`, `a translation`, [`a reflection`, `a dilation with scale factor 2`, `a dilation with scale factor 1/2`], `Translations and rotations preserve both orientation and congruence; reflections reverse orientation.`, `${kind}-${index}`);
    }
    if (kind === "8.10B") {
      return makeQuestion(`Which transformation does not preserve congruence?`, `a dilation with scale factor 3`, [`a translation`, `a rotation`, `a reflection`], `Dilations change size when the scale factor is not 1, so they do not preserve congruence.`, `${kind}-${index}`);
    }
    if (kind === "8.10C") {
      const options = [
        ["translation 4 units right and 2 units up", "(x + 4, y + 2)"],
        ["reflection across the x-axis", "(x, -y)"],
        ["reflection across the y-axis", "(-x, y)"],
        ["rotation 180 degrees about the origin", "(-x, -y)"]
      ];
      const [prompt, correct] = pick(options, index);
      return makeQuestion(`Which algebraic rule matches a ${prompt}?`, correct, uniqueStrings(options.map((entry) => entry[1]).filter((value) => value !== correct).slice(0, 3)), `Algebraic rules show exactly how each coordinate changes under a transformation.`, `${kind}-${index}`);
    }
    const scale = pick([2, 3, 1 / 2, 3 / 2], index);
    const length = (index % 6) + 4;
    const area = length * length;
    return makeQuestion(`A square is dilated by a scale factor of ${numberText(scale, 2)}. If a side length was ${length}, what happens to the area?`, `${numberText(area * scale * scale, 2)} square units`, [`${numberText(area * scale, 2)} square units`, `${numberText(area, 2)} square units`, `${numberText(length * scale, 2)} square units`], `Linear measures scale by k and area measures scale by k squared.`, `${kind}-${index}`);
  });
}

function buildGrade8GeometryMeasurement(kind) {
  return buildQuestionSet((index) => {
    const pi = 3.14;
    if (kind === "8.6A") {
      const baseArea = (index % 5 + 3) * 6;
      const height = (index % 4) + 4;
      return makeQuestion(`A cylinder has base area ${baseArea} square units and height ${height} units. Which expression gives its volume?`, `${baseArea} x ${height}`, [`${baseArea} + ${height}`, `${baseArea} x ${height} / 3`, `${baseArea} x ${height} x 2`], `The volume of a cylinder is base area times height, written V = Bh.`, `${kind}-${index}`);
    }
    if (kind === "8.6C") {
      return makeQuestion(`Which statement explains the Pythagorean theorem?`, `In a right triangle, the area of the square on the hypotenuse equals the sum of the areas of the squares on the legs`, [`The longest side is always the sum of the other two sides`, `Every triangle has a hypotenuse`, `The area of a right triangle is always a square number`], `The Pythagorean theorem connects the squares built on the sides of a right triangle.`, `${kind}-${index}`);
    }
    if (kind === "8.7A") {
      const shape = index % 3;
      if (shape === 0) {
        const radius = (index % 4) + 2;
        const height = (index % 5) + 4;
        const volume = Number((pi * radius * radius * height).toFixed(2));
        return makeQuestion(`What is the volume of a cylinder with radius ${radius} and height ${height}? Use 3.14 for pi.`, numberText(volume, 2), [numberText(volume / 3, 2), numberText(volume + pi, 2), numberText(pi * radius * height, 2)], `Cylinder volume is pi times radius squared times height.`, `${kind}-${index}`);
      }
      if (shape === 1) {
        const radius = (index % 4) + 2;
        const height = (index % 5) + 3;
        const volume = Number((pi * radius * radius * height / 3).toFixed(2));
        return makeQuestion(`What is the volume of a cone with radius ${radius} and height ${height}? Use 3.14 for pi.`, numberText(volume, 2), [numberText(volume * 3, 2), numberText(volume + 5, 2), numberText(pi * radius * height, 2)], `Cone volume is one-third the volume of the matching cylinder.`, `${kind}-${index}`);
      }
      const radius = (index % 4) + 2;
      const volume = Number(((4 / 3) * pi * radius * radius * radius).toFixed(2));
      return makeQuestion(`What is the volume of a sphere with radius ${radius}? Use 3.14 for pi.`, numberText(volume, 2), [numberText(pi * radius * radius, 2), numberText(volume / 2, 2), numberText(volume + 10, 2)], `Sphere volume is four-thirds pi times radius cubed.`, `${kind}-${index}`);
    }
    if (kind === "8.7B") {
      if (index % 2 === 0) {
        const length = (index % 4) + 4;
        const width = (index % 3) + 3;
        const height = (index % 5) + 5;
        const total = 2 * (length * width + length * height + width * height);
        return makeQuestion(`What is the total surface area of a rectangular prism with length ${length}, width ${width}, and height ${height}?`, String(total), [String(length * width * height), String(total - length * width), String(total + 10)], `Add the areas of all faces or use the surface-area formula for a rectangular prism.`, `${kind}-${index}`);
      }
      const radius = (index % 4) + 2;
      const height = (index % 5) + 4;
      const total = Number((2 * pi * radius * height + 2 * pi * radius * radius).toFixed(2));
      return makeQuestion(`What is the total surface area of a cylinder with radius ${radius} and height ${height}? Use 3.14 for pi.`, numberText(total, 2), [numberText(2 * pi * radius * height, 2), numberText(pi * radius * radius, 2), numberText(total + 6.28, 2)], `Cylinder surface area includes the lateral area and both circular bases.`, `${kind}-${index}`);
    }
    if (kind === "8.7C") {
      if (index % 2 === 0) {
        const a = (index % 4) + 3;
        const b = (index % 5) + 4;
        const c = Math.sqrt(a * a + b * b);
        return makeQuestion(`A right triangle has legs ${a} and ${b}. What is the hypotenuse?`, numberText(c, 2), [numberText(a + b, 2), numberText(Math.abs(a - b), 2), numberText(c + 1, 2)], `Use the Pythagorean theorem to find a missing side in a right triangle.`, `${kind}-${index}`);
      }
      const options = [
        ["5, 12, 13", "yes, it forms a right triangle"],
        ["6, 8, 10", "yes, it forms a right triangle"],
        ["6, 7, 10", "no, it does not form a right triangle"],
        ["8, 15, 17", "yes, it forms a right triangle"]
      ];
      const [lengths, correct] = pick(options, index);
      return makeQuestion(`Do side lengths ${lengths} satisfy the converse of the Pythagorean theorem?`, correct, uniqueStrings(["yes, it forms a right triangle", "no, it does not form a right triangle", "only if the perimeter is even", "only if all sides are different"].filter((value) => value !== correct)).slice(0, 3), `If a^2 + b^2 = c^2, then the triangle is a right triangle.`, `${kind}-${index}`);
    }
    if (kind === "8.7D") {
      const x1 = 1;
      const y1 = 2;
      const dx = (index % 4) + 3;
      const dy = (index % 3) + 4;
      const x2 = x1 + dx;
      const y2 = y1 + dy;
      const distance = numberText(Math.sqrt(dx * dx + dy * dy), 2);
      return makeQuestion(`What is the distance between (${x1}, ${y1}) and (${x2}, ${y2})?`, distance, [numberText(dx + dy, 2), numberText(Math.abs(dx - dy), 2), numberText(Math.sqrt(dx * dx + dy * dy) + 1, 2)], `Form a right triangle using the horizontal and vertical differences, then apply the Pythagorean theorem.`, `${kind}-${index}`);
    }
    const prompts = [
      ["The interior angles of a triangle sum to", "180 degrees"],
      ["An exterior angle of a triangle equals", "the sum of the two remote interior angles"],
      ["If parallel lines are cut by a transversal, alternate interior angles are", "congruent"],
      ["If two triangles have two pairs of congruent angles, the triangles are", "similar by AA"]
    ];
    const [prompt, correct] = pick(prompts, index);
    return makeQuestion(prompt, correct, uniqueStrings(["180 degrees", "90 degrees", "congruent", "the sum of the two remote interior angles", "similar by AA", "supplementary only"].filter((choice) => choice !== correct).slice(0, 3)), `These angle facts help justify similarity and angle relationships in geometry.`, `${kind}-${index}`);
  });
}

function buildGrade8DataAndFinance(kind) {
  return buildQuestionSet((index) => {
    if (kind === "8.11A") {
      const prompts = [
        ["points that rise roughly in a straight pattern", "linear association"],
        ["points that curve upward", "non-linear association"],
        ["points scattered with no clear pattern", "no association"],
        ["points that fall roughly in a straight pattern", "linear association"]
      ];
      const [prompt, correct] = pick(prompts, index);
      return makeQuestion(`A scatterplot shows ${prompt}. What association is suggested?`, correct, uniqueStrings(["linear association", "non-linear association", "no association", "direct variation"].filter((value) => value !== correct).slice(0, 3)), `Scatterplots can show linear, non-linear, or no association between two variables.`, `${kind}-${index}`);
    }
    if (kind === "8.11B") {
      const data = sortNumbers([4 + index % 3, 6, 7, 9, 10 + index % 4]);
      const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
      const mad = data.reduce((sum, value) => sum + Math.abs(value - mean), 0) / data.length;
      return makeQuestion(`What is the mean absolute deviation of the data set ${data.join(", ")}?`, numberText(mad, 2), [numberText(mad + 1, 2), numberText(mean, 2), numberText(mad - 0.5, 2)], `Mean absolute deviation is the average distance each data point is from the mean.`, `${kind}-${index}`);
    }
    if (kind === "8.12A") {
      const principal = 1000 + (index % 4) * 500;
      const rateA = pick([4, 5, 6], index);
      const rateB = rateA + 2;
      const yearsA = 2 + (index % 3);
      const yearsB = yearsA + 2;
      const costA = principal * rateA * yearsA / 100;
      const costB = principal * rateB * yearsB / 100;
      const correct = costA < costB ? "Loan A has the lower cost of credit" : "Loan B has the lower cost of credit";
      return makeQuestion(`Loan A charges ${rateA}% interest for ${yearsA} years. Loan B charges ${rateB}% interest for ${yearsB} years on the same amount borrowed. Which loan has the lower cost of credit?`, correct, [correct === "Loan A has the lower cost of credit" ? "Loan B has the lower cost of credit" : "Loan A has the lower cost of credit", "Both loans cost the same", "The longer loan must always cost less"], `Lower interest rates and shorter loan lengths usually reduce the total cost of credit.`, `${kind}-${index}`);
    }
    if (kind === "8.12C") {
      const monthly = 20 + (index % 5) * 10;
      const years = 2 + (index % 4);
      const saved = monthly * 12 * years;
      return makeQuestion(`If a student saves ${money(monthly)} each month for ${years} years, how much will be saved before any interest is added?`, money(saved), [money(saved + 100), money(monthly * years), money(saved - 120)], `Saving small amounts regularly can build a much larger total over time.`, `${kind}-${index}`);
    }
    const annualCost = 12000 + (index % 5) * 3000;
    const familyContribution = 2000 + (index % 4) * 1000;
    const years = 3 + (index % 3);
    const months = years * 12;
    const need = annualCost - familyContribution;
    const monthly = Number((need / months).toFixed(2));
    return makeQuestion(`A first year of college is estimated to cost ${money(annualCost)} and the family can contribute ${money(familyContribution)}. If there are ${years} years until college starts, how much should be saved each month to cover the remaining first-year cost?`, money(monthly), [money(monthly + 25), money(need), money(need / years)], `Subtract the family contribution from the first-year cost, then divide by the number of months available for saving.`, `${kind}-${index}`);
  });
}

function buildAlgebra1PolynomialMethods(kind) {
  return buildQuestionSet((index) => {
    if (kind === "A.10A") {
      const addMode = index % 2 === 0;
      const a1 = (index % 3) + 1;
      const b1 = (index % 5) - 2;
      const c1 = (index % 7) - 3;
      const a2 = ((index + 1) % 4) + 1;
      const b2 = ((index + 2) % 5) - 2;
      const c2 = ((index + 3) % 7) - 3;
      const sign = addMode ? "+" : "-";
      const correct = formatPolynomial(addMode ? a1 + a2 : a1 - a2, addMode ? b1 + b2 : b1 - b2, addMode ? c1 + c2 : c1 - c2);
      return makeQuestion(`Simplify (${formatPolynomial(a1, b1, c1)}) ${sign} (${formatPolynomial(a2, b2, c2)}).`, correct, [formatPolynomial(a1 + a2, b1 - b2, c1 + c2), formatPolynomial(a1 - a2, b1 + b2, c1 - c2), formatPolynomial(a1 + a2, b1 + b2, c1 - c2)], `Combine like terms when adding or subtracting polynomials.`, `${kind}-${index}`);
    }
    if (kind === "A.10B") {
      const p = (index % 4) + 1;
      const q = (index % 5) + 2;
      const r = ((index + 1) % 3) + 1;
      const s = ((index + 2) % 4) + 2;
      const correct = formatPolynomial(p * r, p * s + q * r, q * s);
      return makeQuestion(`What is (${p}x + ${q})(${r}x + ${s})?`, correct, [formatPolynomial(p * r, p * s - q * r, q * s), formatPolynomial(p + r, q + s, q * s), formatPolynomial(p * r, p + s + q + r, q * s)], `Multiply each term in the first binomial by each term in the second binomial and combine like terms.`, `${kind}-${index}`);
    }
    if (kind === "A.10C") {
      const divisor = (index % 4) + 1;
      const quotient = (index % 5) + 2;
      const constant = ((index + 2) % 4) + 1;
      const dividend = formatPolynomial(divisor, divisor * constant + quotient, quotient * constant);
      return makeQuestion(`Find the quotient: (${dividend}) / (${divisor}x + ${quotient}).`, `x + ${constant}`, [`x - ${constant}`, `${divisor}x + ${constant}`, `${constant}`], `Use polynomial division or factor the dividend to identify the quotient.`, `${kind}-${index}`);
    }
    if (kind === "A.10D") {
      const a = (index % 4) + 2;
      const b = ((index + 1) % 5) + 1;
      const c = ((index + 2) % 4) + 1;
      return makeQuestion(`Which expression is equivalent to ${a}x(x + ${b}) + ${c}(x + ${b})?`, `(${a}x + ${c})(x + ${b})`, [`(${a}x - ${c})(x + ${b})`, `(${a + c}x)(x + ${b})`, `${a}x + ${c}x + ${b}`], `Factor out the common binomial to rewrite the polynomial in an equivalent form.`, `${kind}-${index}`);
    }
    if (kind === "A.10E") {
      const m = (index % 5) + 1;
      const n = ((index + 2) % 4) + 1;
      const middle = m + n;
      const constant = m * n;
      return makeQuestion(`Factor x^2 + ${middle}x + ${constant}.`, `(x + ${m})(x + ${n})`, [`(x - ${m})(x + ${n})`, `(x + ${constant})(x + ${middle})`, `(x + ${m + n})(x + 1)`], `Find two numbers that add to the middle coefficient and multiply to the constant term.`, `${kind}-${index}`);
    }
    const base = (index % 6) + 2;
    return makeQuestion(`Rewrite x^2 - ${base * base} as a product, if possible.`, `(x - ${base})(x + ${base})`, [`(x - ${base})(x - ${base})`, `(x + ${base})(x + ${base})`, `It cannot be factored`], `A difference of squares factors as (x - a)(x + a).`, `${kind}-${index}`);
  });
}

function buildAlgebra1RadicalsExponents(kind) {
  function simplifyRadical(value) {
    let outside = 1;
    let inside = value;
    for (let factor = 2; factor * factor <= inside; factor += 1) {
      while (inside % (factor * factor) === 0) {
        outside *= factor;
        inside /= factor * factor;
      }
    }
    return inside === 1 ? String(outside) : outside === 1 ? `sqrt(${inside})` : `${outside}sqrt(${inside})`;
  }

  return buildQuestionSet((index) => {
    if (kind === "A.11A") {
      const base = (index % 6) + 2;
      const multiplier = ((index + 1) % 4) + 2;
      const value = base * base * multiplier;
      return makeQuestion(`Simplify sqrt(${value}).`, simplifyRadical(value), [String(base * multiplier), `sqrt(${value / base})`, `${base}sqrt(${multiplier + 1})`], `Factor out the greatest perfect square from the radicand.`, `${kind}-${index}`);
    }
    const xPower = (index % 4) + 2;
    const yPower = ((index + 1) % 3) + 1;
    const mode = index % 4;
    if (mode === 0) {
      return makeQuestion(`Simplify x^${xPower} * x^${yPower}.`, `x^${xPower + yPower}`, [`x^${xPower - yPower}`, `x^${xPower * yPower}`, `x^${Math.max(xPower, yPower)}`], `When multiplying powers with the same base, add the exponents.`, `${kind}-${index}`);
    }
    if (mode === 1) {
      return makeQuestion(`Simplify x^${xPower + yPower} / x^${yPower}.`, `x^${xPower}`, [`x^${yPower}`, `x^${xPower + 2 * yPower}`, `x^${xPower - 1}`], `When dividing powers with the same base, subtract the exponents.`, `${kind}-${index}`);
    }
    if (mode === 2) {
      return makeQuestion(`Simplify (x^${xPower})^${yPower}.`, `x^${xPower * yPower}`, [`x^${xPower + yPower}`, `x^${xPower - yPower}`, `x^${xPower}`], `A power raised to a power multiplies the exponents.`, `${kind}-${index}`);
    }
    return makeQuestion(`Which expression is equivalent to x^(1/2)?`, `sqrt(x)`, [`x^2`, `1/sqrt(x)`, `2x`], `An exponent of 1/2 represents the square root.`, `${kind}-${index}`);
  });
}

function buildAlgebra1FunctionsAndSequences(kind) {
  return buildQuestionSet((index) => {
    if (kind === "A.12A") {
      const repeated = index % 2 === 0;
      const relation = repeated ? "{(1, 2), (1, 4), (2, 5)}" : "{(1, 2), (2, 4), (3, 5)}";
      const correct = repeated ? "No, because one input has two outputs" : "Yes, each input has exactly one output";
      return makeQuestion(`Does the relation ${relation} define a function?`, correct, ["Yes, because every output is different", "No, because the outputs are positive", "Yes, because there are ordered pairs"], `A relation is a function when each input is paired with exactly one output.`, `${kind}-${index}`);
    }
    if (kind === "A.12B") {
      const a = (index % 4) + 1;
      const b = ((index + 2) % 5) - 2;
      const input = (index % 5) - 1;
      const value = a * input + b;
      return makeQuestion(`If f(x) = ${formatLinearExpression(a, b)}, what is f(${input})?`, String(value), [String(value + 1), String(value - 1), String(a + b)], `Substitute the input value into the function rule.`, `${kind}-${index}`);
    }
    if (kind === "A.12C") {
      const start = (index % 4) + 2;
      const arithmetic = index % 2 === 0;
      const diff = ((index + 1) % 4) + 2;
      const ratio = ((index + 2) % 3) + 2;
      const next = arithmetic ? start + diff : start * ratio;
      const description = arithmetic ? `a_n = a_(n-1) + ${diff}, a_1 = ${start}` : `a_n = ${ratio}a_(n-1), a_1 = ${start}`;
      return makeQuestion(`For the recursive sequence ${description}, what is a_2?`, String(next), [String(next + diff), String(start), String(arithmetic ? start * diff : start + ratio)], `Use the recursive rule with the first term to generate the next term.`, `${kind}-${index}`);
    }
    if (kind === "A.12D") {
      const arithmetic = index % 2 === 0;
      const start = (index % 5) + 3;
      const diff = ((index + 1) % 4) + 2;
      const ratio = ((index + 2) % 3) + 2;
      const terms = arithmetic ? `${start}, ${start + diff}, ${start + 2 * diff}` : `${start}, ${start * ratio}, ${start * ratio * ratio}`;
      const correct = arithmetic ? `a_n = ${start} + (n - 1)(${diff})` : `a_n = ${start}(${ratio})^(n - 1)`;
      return makeQuestion(`Which formula gives the nth term of the sequence ${terms}, ...?`, correct, [arithmetic ? `a_n = ${start}(${diff})^(n - 1)` : `a_n = ${start} + (n - 1)(${ratio})`, arithmetic ? `a_n = ${start + diff} + (n - 1)(${diff})` : `a_n = ${start * ratio}(${ratio})^(n - 1)`, `a_n = n + ${start}`], `Arithmetic sequences use a common difference, while geometric sequences use a common ratio.`, `${kind}-${index}`);
    }
    const a = (index % 4) + 2;
    const b = ((index + 1) % 5) + 1;
    const c = ((index + 2) % 6) + 3;
    return makeQuestion(`Solve the literal equation ${a}x + ${b}y = ${c} for y.`, `y = (${c} - ${a}x)/${b}`, [`y = (${c} + ${a}x)/${b}`, `y = (${a}x - ${c})/${b}`, `y = ${a}x + ${c}`], `Isolate the requested variable by undoing the operations around it.`, `${kind}-${index}`);
  });
}

function buildAlgebra1LinearWriting(kind) {
  return buildQuestionSet((index) => {
    if (kind === "A.2A") {
      if (index % 2 === 0) {
        const m = (index % 4) + 1;
        const b = ((index + 2) % 5) - 2;
        return makeQuestion(`What are the domain and range of y = ${formatLinearExpression(m, b)}?`, "domain: all real numbers; range: all real numbers", ["domain: x >= 0; range: y >= 0", "domain: all real numbers; range: y >= 0", "domain: x is an integer; range: all real numbers"], `A non-constant linear function has all real numbers in its domain and range.`, `${kind}-${index}`);
      }
      const start = 3 + (index % 4);
      const rate = (index % 3) + 2;
      return makeQuestion(`A delivery service charges a ${money(start)} starting fee plus ${money(rate)} per mile. Which inequalities give a reasonable domain and range?`, `x >= 0 and y >= ${start}`, [`x <= 0 and y >= ${start}`, `x >= ${start} and y >= 0`, `x is all real numbers and y <= ${start}`], `Miles cannot be negative, and the total cost cannot be less than the starting fee.`, `${kind}-${index}`);
    }
    if (kind === "A.2B") {
      if (index % 2 === 0) {
        const m = (index % 4) + 1;
        const x1 = (index % 3) + 1;
        const y1 = m * x1 + ((index + 1) % 5) - 2;
        return makeQuestion(`Which equation passes through ${formatPoint(x1, y1)} with slope ${m}?`, formatPointSlope(m, x1, y1), [formatPointSlope(-m, x1, y1), formatPointSlope(m, y1, x1), formatLinearEquation(m, y1)], `Point-slope form uses a point on the line and the slope.`, `${kind}-${index}`);
      }
      const x1 = 1 + (index % 3);
      const y1 = 2 + (index % 4);
      const m = ((index + 1) % 4) + 1;
      const x2 = x1 + 2;
      const y2 = y1 + 2 * m;
      const b = y1 - m * x1;
      return makeQuestion(`Which equation goes through ${formatPoint(x1, y1)} and ${formatPoint(x2, y2)}?`, formatLinearEquation(m, b), [formatLinearEquation(-m, b), formatLinearEquation(m, y1), formatLinearEquation(m + 1, b)], `Find the slope from the two points and then determine the y-intercept.`, `${kind}-${index}`);
    }
    if (kind === "A.2C") {
      if (index % 2 === 0) {
        const m = (index % 4) + 1;
        const b = ((index + 1) % 6) - 2;
        const table = `x: 0, 1, 2 ; y: ${b}, ${m + b}, ${2 * m + b}`;
        return makeQuestion(`Which equation matches the table ${table}?`, formatLinearEquation(m, b), [formatLinearEquation(m, -b), formatLinearEquation(b, m), formatLinearEquation(m + 1, b)], `Use the constant rate of change and the value when x = 0.`, `${kind}-${index}`);
      }
      const start = 4 + (index % 4);
      const rate = (index % 3) + 2;
      return makeQuestion(`A gym charges a ${money(start)} sign-up fee and ${money(rate)} each month. Which equation models the total cost y after x months?`, `y = ${rate}x + ${start}`, [`y = ${start}x + ${rate}`, `y = ${rate}x - ${start}`, `y = ${rate + start}x`], `The starting fee is the y-intercept and the monthly charge is the slope.`, `${kind}-${index}`);
    }
    if (kind === "A.2D") {
      const k = (index % 5) + 2;
      const x = (index % 4) + 3;
      return makeQuestion(`If y varies directly with x and k = ${k}, what is y when x = ${x}?`, String(k * x), [String(k + x), String(k * x + 1), String(x / k)], `Direct variation has the form y = kx.`, `${kind}-${index}`);
    }
    if (kind === "A.2E") {
      const m = (index % 4) + 1;
      const x1 = (index % 3) + 1;
      const y1 = ((index + 2) % 6) + 1;
      const b = y1 - m * x1;
      return makeQuestion(`Write the equation of the line parallel to y = ${formatLinearExpression(m, 2)} that passes through ${formatPoint(x1, y1)}.`, formatLinearEquation(m, b), [formatLinearEquation(-m, b), formatLinearEquation(m, y1), formatLinearEquation(m + 1, b)], `Parallel lines have the same slope.`, `${kind}-${index}`);
    }
    if (kind === "A.2F") {
      const m = (index % 4) + 1;
      const perp = -1 / m;
      const x1 = (index % 3) + 1;
      const y1 = ((index + 1) % 5) + 2;
      const b = Number((y1 - perp * x1).toFixed(2));
      return makeQuestion(`Write the equation of the line perpendicular to y = ${formatLinearExpression(m, -2)} that passes through ${formatPoint(x1, y1)}.`, `y = ${trimDecimal(perp, 2)}x ${signedConstant(b)}`, [`y = ${m}x ${signedConstant(b)}`, `y = ${trimDecimal(-m, 2)}x ${signedConstant(b)}`, `y = ${trimDecimal(1 / m, 2)}x ${signedConstant(b)}`], `Perpendicular lines have slopes that are negative reciprocals.`, `${kind}-${index}`);
    }
    if (kind === "A.2G") {
      const horizontal = index % 2 === 0;
      const value = ((index + 2) % 6) - 2;
      const correct = horizontal ? `y = ${value}; slope is 0` : `x = ${value}; slope is undefined`;
      return makeQuestion(`Which equation describes a line ${horizontal ? "parallel to the x-axis" : "parallel to the y-axis"}?`, correct, horizontal ? [`x = ${value}; slope is 0`, `y = ${value}; slope is undefined`, `x = ${value}; slope is 1`] : [`y = ${value}; slope is undefined`, `x = ${value}; slope is 0`, `y = ${value}; slope is 1`], `Horizontal lines have slope 0 and vertical lines have undefined slope.`, `${kind}-${index}`);
    }
    if (kind === "A.2H") {
      const rate = (index % 4) + 1;
      const start = ((index + 1) % 5) + 2;
      return makeQuestion(`A school club must collect at least ${start} canned goods, plus ${rate} more each week. Which inequality can model the total y after x weeks?`, `y >= ${rate}x + ${start}`, [`y <= ${rate}x + ${start}`, `y >= ${start}x + ${rate}`, `y > ${rate}x - ${start}`], `Translate the verbal condition into slope, intercept, and inequality symbol.`, `${kind}-${index}`);
    }
    const m1 = (index % 3) + 1;
    const b1 = ((index + 1) % 5) - 1;
    const m2 = ((index + 2) % 4) + 1;
    const b2 = ((index + 3) % 6) - 2;
    return makeQuestion(`Which system matches the descriptions "Line 1 has slope ${m1} and y-intercept ${b1}. Line 2 has slope ${m2} and y-intercept ${b2}."`, `${formatLinearEquation(m1, b1)} and ${formatLinearEquation(m2, b2)}`, [`${formatLinearEquation(m1, b2)} and ${formatLinearEquation(m2, b1)}`, `${formatLinearEquation(-m1, b1)} and ${formatLinearEquation(m2, b2)}`, `${formatLinearEquation(m1, b1)} and ${formatLinearEquation(-m2, b2)}`], `A system is written by matching each verbal description to its equation.`, `${kind}-${index}`);
  });
}

function buildAlgebra1LinearGraphing(kind) {
  return buildQuestionSet((index) => {
    if (kind === "A.3A") {
      const mode = index % 4;
      const m = (index % 4) + 1;
      if (mode === 0) {
        return makeQuestion(`A table increases by ${m} in y each time x increases by 1. What is the slope?`, String(m), [String(-m), String(m + 1), String(1 / m)], `Slope is the change in y divided by the change in x.`, `${kind}-${index}`);
      }
      if (mode === 1) {
        const x1 = 1;
        const y1 = 2;
        const x2 = 3;
        const y2 = 2 + 2 * m;
        return makeQuestion(`What is the slope of the line through ${formatPoint(x1, y1)} and ${formatPoint(x2, y2)}?`, String(m), [String(-m), String(m + 2), String(2 / m)], `Use rise over run between the two points.`, `${kind}-${index}`);
      }
      if (mode === 2) {
        const b = ((index + 2) % 5) - 2;
        return makeQuestion(`What is the slope of y = ${formatLinearExpression(m, b)}?`, String(m), [String(-m), String(b), String(m + b)], `The coefficient of x in slope-intercept form is the slope.`, `${kind}-${index}`);
      }
      return makeQuestion(`In ${formatStandardEquation(m, -1, 4)}, what is the slope?`, String(m), [String(-m), "1", String(4)], `Rewrite the standard-form equation in slope-intercept form to identify the slope.`, `${kind}-${index}`);
    }
    if (kind === "A.3B") {
      const hours = (index % 4) + 2;
      const dollars = hours * (((index + 1) % 3) + 4);
      const rate = dollars / hours;
      return makeQuestion(`A bike rental costs ${money(dollars)} for ${hours} hours at a constant rate. What is the rate of change?`, `${money(rate)} per hour`, [`${money(dollars + hours)} per hour`, `${money(hours)} per dollar`, `${money(rate + 1)} per hour`], `Rate of change compares the change in output to the change in input.`, `${kind}-${index}`);
    }
    if (kind === "A.3C") {
      const m = (index % 4) + 1;
      const b = ((index + 1) % 6) - 3;
      const zero = -b / m;
      return makeQuestion(`For y = ${formatLinearExpression(m, b)}, which statement is true?`, `y-intercept is ${b} and x-intercept is ${trimDecimal(zero, 2)}`, [`y-intercept is ${m} and x-intercept is ${b}`, `y-intercept is ${trimDecimal(zero, 2)} and x-intercept is ${b}`, `slope is ${b} and y-intercept is ${m}`], `The y-intercept occurs when x = 0, and the x-intercept occurs when y = 0.`, `${kind}-${index}`);
    }
    if (kind === "A.3D") {
      const b = ((index + 2) % 4) + 1;
      return makeQuestion(`Which graph description matches y > x + ${b}?`, `dashed boundary line y = x + ${b} with shading above`, [`solid boundary line y = x + ${b} with shading above`, `dashed boundary line y = x + ${b} with shading below`, `solid boundary line y = x - ${b} with shading above`], `A strict inequality uses a dashed boundary, and greater than means shade above the line.`, `${kind}-${index}`);
    }
    if (kind === "A.3E") {
      const mode = index % 4;
      if (mode === 0) {
        return makeQuestion(`What is the effect of replacing f(x) = x with 3f(x)?`, "vertical stretch by a factor of 3", ["shift up 3 units", "shift right 3 units", "horizontal shrink by a factor of 3"], `Multiplying the output by 3 stretches the graph vertically.`, `${kind}-${index}`);
      }
      if (mode === 1) {
        return makeQuestion(`What is the effect of replacing f(x) = x with f(x) + 4?`, "shift up 4 units", ["shift right 4 units", "vertical stretch by 4", "reflect across the x-axis"], `Adding outside the function shifts the graph vertically.`, `${kind}-${index}`);
      }
      if (mode === 2) {
        return makeQuestion(`What is the effect of replacing f(x) = x with f(x - 5)?`, "shift right 5 units", ["shift left 5 units", "shift up 5 units", "horizontal stretch by 5"], `Subtracting inside the input shifts the graph right.`, `${kind}-${index}`);
      }
      return makeQuestion(`What is the effect of replacing f(x) = x with f(2x)?`, "horizontal shrink by a factor of 1/2", ["horizontal stretch by a factor of 2", "vertical stretch by a factor of 2", "shift left 2 units"], `Multiplying the input by 2 compresses the graph horizontally.`, `${kind}-${index}`);
    }
    if (kind === "A.3F") {
      const x = (index % 4) + 1;
      const y = ((index + 2) % 5) + 2;
      const m1 = (index % 3) + 1;
      const m2 = m1 + 1;
      const b1 = y - m1 * x;
      const b2 = y - m2 * x;
      return makeQuestion(`What is the solution to the system y = ${formatLinearExpression(m1, b1)} and y = ${formatLinearExpression(m2, b2)}?`, formatPoint(x, y), [formatPoint(x + 1, y), formatPoint(x, y + 1), "no solution"], `The solution to a system of linear equations is the point where the graphs intersect.`, `${kind}-${index}`);
    }
    if (kind === "A.3G") {
      const notebooks = (index % 4) + 2;
      const pencils = notebooks + 3;
      return makeQuestion(`A graph shows the lines x + y = ${notebooks + pencils} and y = x + 3 intersecting at one point. What does the intersection represent?`, `${notebooks} notebooks and ${pencils} pencils`, [`${pencils} notebooks and ${notebooks} pencils`, `${notebooks + pencils} notebooks and 3 pencils`, `No possible combination`], `In a context, the intersection gives the values that satisfy both conditions.`, `${kind}-${index}`);
    }
    return makeQuestion(`Which graph description matches the system y > x + 1 and y < -x + 5?`, `shade the region above y = x + 1 and below y = -x + 5`, [`shade above both lines`, `shade below both lines`, `shade only on the boundary lines`], `The solution to a system of inequalities is the overlap of the shaded regions.`, `${kind}-${index}`);
  });
}

function buildAlgebra1LinearData(kind) {
  return buildQuestionSet((index) => {
    if (kind === "A.4A") {
      const cases = [
        ["0.94", "a strong positive linear association"],
        ["-0.88", "a strong negative linear association"],
        ["0.12", "a weak linear association"],
        ["-0.05", "almost no linear association"]
      ];
      const [value, correct] = pick(cases, index);
      return makeQuestion(`What does a correlation coefficient of ${value} indicate?`, correct, uniqueStrings(["a strong positive linear association", "a strong negative linear association", "a weak linear association", "almost no linear association"].filter((item) => item !== correct).slice(0, 3)), `Correlation coefficients near 1 or -1 show stronger linear association.`, `${kind}-${index}`);
    }
    if (kind === "A.4B") {
      const causal = index % 2 === 0;
      return makeQuestion(`Which statement best distinguishes association from causation?`, causal ? "Association does not always mean one variable causes the other" : "Causation means one variable directly influences the other", causal ? ["Causation and association always mean the same thing", "Association proves a cause", "Causation is impossible to study"] : ["Association and causation always match", "Association proves a cause", "Causation means no relationship"], `Two variables may be associated without one causing changes in the other.`, `${kind}-${index}`);
    }
    const m = (index % 4) + 2;
    const b = ((index + 1) % 5) + 1;
    const x = (index % 5) + 4;
    return makeQuestion(`A line of best fit is y = ${formatLinearExpression(m, b)}. What is the predicted y-value when x = ${x}?`, String(m * x + b), [String(m * x + b + 1), String(m * x), String(m * (x + 1) + b)], `Substitute the x-value into the linear model to make a prediction.`, `${kind}-${index}`);
  });
}

function buildAlgebra1LinearSolving(kind) {
  return buildQuestionSet((index) => {
    if (kind === "A.5A") {
      const x = (index % 5) + 1;
      const a = (index % 4) + 2;
      const b = ((index + 1) % 5) + 1;
      const c = ((index + 2) % 3) + 1;
      const d = a * (x + b) - c * x;
      return makeQuestion(`Solve ${a}(x + ${b}) - ${c}x = ${d}.`, String(x), [String(x + 1), String(x - 1), String(d)], `Distribute, combine like terms, and isolate the variable.`, `${kind}-${index}`);
    }
    if (kind === "A.5B") {
      const x = (index % 5) + 2;
      const a = (index % 4) + 2;
      const b = ((index + 1) % 4) + 1;
      const boundary = a * x - b;
      return makeQuestion(`Solve ${a}x - ${b} > ${boundary}.`, `x > ${x}`, [`x < ${x}`, `x >= ${x}`, `x <= ${x}`], `Undo the operations on x and keep the inequality direction when dividing by a positive number.`, `${kind}-${index}`);
    }
    const x = (index % 4) + 1;
    const y = ((index + 2) % 5) + 3;
    const m1 = (index % 3) + 1;
    const m2 = m1 + 2;
    const b1 = y - m1 * x;
    const b2 = y - m2 * x;
    return makeQuestion(`Solve the system y = ${formatLinearExpression(m1, b1)} and y = ${formatLinearExpression(m2, b2)}.`, formatPoint(x, y), [formatPoint(x + 1, y), formatPoint(x, y + 1), "no solution"], `The ordered pair that satisfies both equations is the solution.`, `${kind}-${index}`);
  });
}

function buildAlgebra1QuadraticWriting(kind) {
  return buildQuestionSet((index) => {
    if (kind === "A.6A") {
      if (index % 2 === 0) {
        const h = (index % 3) + 1;
        const k = ((index + 1) % 4) + 2;
        return makeQuestion(`What are the domain and range of y = (x - ${h})^2 + ${k}?`, `domain: all real numbers; range: y >= ${k}`, [`domain: x >= ${h}; range: all real numbers`, `domain: all real numbers; range: y <= ${k}`, `domain: x is an integer; range: y >= ${k}`], `An upward-opening parabola has all real numbers in its domain and a minimum y-value at the vertex.`, `${kind}-${index}`);
      }
      const h = (index % 3) + 1;
      const k = -(((index + 1) % 4) + 2);
      return makeQuestion(`What are the domain and range of y = -(x - ${h})^2 ${signedConstant(k)}?`, `domain: all real numbers; range: y <= ${k}`, [`domain: x <= ${h}; range: all real numbers`, `domain: all real numbers; range: y >= ${k}`, `domain: x >= 0; range: y <= ${k}`], `A downward-opening parabola has a maximum y-value at the vertex.`, `${kind}-${index}`);
    }
    if (kind === "A.6B") {
      const a = (index % 3) + 1;
      const h = (index % 4) - 1;
      const k = ((index + 1) % 5) - 2;
      const x1 = h + 1;
      const y1 = a * (x1 - h) * (x1 - h) + k;
      const b = -2 * a * h;
      const c = a * h * h + k;
      return makeQuestion(`A parabola has vertex ${formatPoint(h, k)} and passes through ${formatPoint(x1, y1)}. Which equation is correct?`, `${formatQuadraticVertex(a, h, k)} and ${formatQuadraticStandard(a, b, c)}`, [`${formatQuadraticVertex(-a, h, k)} and ${formatQuadraticStandard(-a, b, c)}`, `${formatQuadraticVertex(a, -h, k)} and ${formatQuadraticStandard(a, -b, c)}`, `${formatQuadraticVertex(a, h, -k)} and ${formatQuadraticStandard(a, b, -c)}`], `Use vertex form with the given vertex, then expand to write the equation in standard form.`, `${kind}-${index}`);
    }
    const r1 = (index % 4) + 1;
    const r2 = ((index + 2) % 4) + 5;
    const sum = r1 + r2;
    const product = r1 * r2;
    return makeQuestion(`A quadratic has real zeros ${r1} and ${r2}. Which function could represent it?`, `y = x^2 - ${sum}x + ${product}`, [`y = x^2 + ${sum}x + ${product}`, `y = x^2 - ${product}x + ${sum}`, `y = x^2 + ${product}x - ${sum}`], `A quadratic with zeros r1 and r2 can be written as (x - r1)(x - r2).`, `${kind}-${index}`);
  });
}

function buildAlgebra1QuadraticGraphing(kind) {
  return buildQuestionSet((index) => {
    if (kind === "A.7A") {
      const h = (index % 4) - 1;
      const k = ((index + 1) % 5) - 2;
      return makeQuestion(`For y = (x - ${h})^2 ${signedConstant(k)}, what is the vertex and axis of symmetry?`, `vertex ${formatPoint(h, k)} and axis x = ${h}`, [`vertex ${formatPoint(k, h)} and axis y = ${h}`, `vertex ${formatPoint(-h, k)} and axis x = ${-h}`, `vertex ${formatPoint(h, -k)} and axis y = ${k}`], `The vertex form y = (x - h)^2 + k has vertex (h, k) and axis of symmetry x = h.`, `${kind}-${index}`);
    }
    if (kind === "A.7B") {
      const r1 = (index % 4) + 1;
      const r2 = ((index + 1) % 4) + 4;
      return makeQuestion(`What are the zeros of y = (x - ${r1})(x - ${r2})?`, `${r1} and ${r2}`, [`-${r1} and -${r2}`, `${r1 + r2} and 0`, `${r1} and -${r2}`], `Set each linear factor equal to zero to find the zeros.`, `${kind}-${index}`);
    }
    const mode = index % 4;
    if (mode === 0) {
      return makeQuestion(`What is the effect of replacing f(x) = x^2 with 2f(x)?`, "vertical stretch by a factor of 2", ["shift up 2 units", "shift right 2 units", "reflect across the x-axis"], `Multiplying the output by 2 stretches the parabola vertically.`, `${kind}-${index}`);
    }
    if (mode === 1) {
      return makeQuestion(`What is the effect of replacing f(x) = x^2 with f(x) - 3?`, "shift down 3 units", ["shift left 3 units", "vertical stretch by 3", "horizontal stretch by 3"], `Subtracting outside the function shifts the graph downward.`, `${kind}-${index}`);
    }
    if (mode === 2) {
      return makeQuestion(`What is the effect of replacing f(x) = x^2 with f(x - 4)?`, "shift right 4 units", ["shift left 4 units", "shift up 4 units", "horizontal shrink by 4"], `Subtracting inside the input shifts the graph right.`, `${kind}-${index}`);
    }
    return makeQuestion(`What is the effect of replacing f(x) = x^2 with f(3x)?`, "horizontal shrink by a factor of 1/3", ["horizontal stretch by a factor of 3", "vertical stretch by a factor of 3", "shift left 3 units"], `Multiplying the input compresses the graph horizontally.`, `${kind}-${index}`);
  });
}

function buildAlgebra1QuadraticSolving(kind) {
  return buildQuestionSet((index) => {
    if (kind === "A.8A") {
      const mode = index % 4;
      if (mode === 0) {
        const r1 = (index % 4) + 1;
        const r2 = ((index + 1) % 4) + 3;
        const sum = r1 + r2;
        const product = r1 * r2;
        return makeQuestion(`Solve x^2 - ${sum}x + ${product} = 0.`, `${r1} and ${r2}`, [`-${r1} and -${r2}`, `${sum} and ${product}`, `${r1} and -${r2}`], `Factor the quadratic and set each factor equal to zero.`, `${kind}-${index}`);
      }
      if (mode === 1) {
        const r = (index % 5) + 2;
        return makeQuestion(`Solve (x - ${r})^2 = 0.`, String(r), [String(-r), String(r + 1), `±${r}`], `Take the square root of both sides after isolating the squared expression.`, `${kind}-${index}`);
      }
      if (mode === 2) {
        const r1 = (index % 3) + 1;
        const r2 = -(((index + 1) % 3) + 2);
        const sum = -(r1 + r2);
        const product = r1 * r2;
        return makeQuestion(`Solve x^2 ${sum >= 0 ? "+ " : "- "}${Math.abs(sum)}x ${product >= 0 ? "+ " : "- "}${Math.abs(product)} = 0.`, `${r1} and ${r2}`, [`${-r1} and ${-r2}`, `${sum} and ${product}`, `${r1} and ${-r2}`], `Use a solving method such as factoring or the quadratic formula to find the real solutions.`, `${kind}-${index}`);
      }
      const r1 = (index % 4) + 1;
      const r2 = ((index + 2) % 4) + 5;
      const sum = -(r1 + r2);
      const product = r1 * r2;
      return makeQuestion(`Using the quadratic formula on x^2 ${sum >= 0 ? "+ " : "- "}${Math.abs(sum)}x + ${product} = 0, what are the solutions?`, `${r1} and ${r2}`, [`-${r1} and -${r2}`, `${product} and ${sum}`, `${r1 + 1} and ${r2}`], `The quadratic formula gives the real solutions of a quadratic equation.`, `${kind}-${index}`);
    }
    const a = 1;
    const b = -(index % 5 + 2);
    const c = ((index + 1) % 4) + 1;
    const y1 = a + b + c;
    const y2 = 4 * a + 2 * b + c;
    const y3 = 9 * a + 3 * b + c;
    return makeQuestion(`Data points (1, ${y1}), (2, ${y2}), and (3, ${y3}) lie on which quadratic model?`, formatQuadraticStandard(a, b, c), [formatQuadraticStandard(a, b + 1, c), formatQuadraticStandard(a, b, c + 1), formatQuadraticStandard(-a, b, c)], `Choose the quadratic function that fits the table of data.`, `${kind}-${index}`);
  });
}

function buildAlgebra1Exponential(kind) {
  return buildQuestionSet((index) => {
    if (kind === "A.9A") {
      const a = (index % 4) + 2;
      const b = 1.5 + (index % 3) * 0.5;
      return makeQuestion(`What are the domain and range of y = ${a}(${trimDecimal(b, 2)})^x?`, "domain: all real numbers; range: y > 0", ["domain: x >= 0; range: y >= 0", "domain: all real numbers; range: all real numbers", "domain: x is an integer; range: y > 0"], `An exponential growth or decay function with positive initial value stays above the x-axis.`, `${kind}-${index}`);
    }
    if (kind === "A.9B") {
      const a = (index % 4) + 2;
      const b = index % 2 === 0 ? 1.2 : 0.8;
      const interpretation = b > 1 ? "growth factor" : "decay factor";
      return makeQuestion(`In y = ${a}(${trimDecimal(b, 2)})^x, what do a and b represent?`, `a is the initial value and b is the ${interpretation}`, ["a is the x-intercept and b is the slope", "a is the rate of change and b is the y-intercept", "a is the asymptote and b is the vertex"], `In exponential form y = ab^x, a is the starting amount and b is the growth or decay factor.`, `${kind}-${index}`);
    }
    if (kind === "A.9C") {
      const a = 100 + (index % 4) * 50;
      const b = index % 2 === 0 ? 1.1 : 0.9;
      const phrase = b > 1 ? "grows by 10% each year" : "decreases by 10% each year";
      return makeQuestion(`A quantity starts at ${a} and ${phrase}. Which function models it?`, formatExponentialEquation(a, b), [formatExponentialEquation(a, b > 1 ? 0.1 : 1.1), formatLinearEquation(Math.round(a * (b - 1)), a), `y = ${a} + ${trimDecimal(b, 2)}x`], `Use exponential form y = ab^x for repeated percent growth or decay.`, `${kind}-${index}`);
    }
    if (kind === "A.9D") {
      const a = (index % 5) + 2;
      const b = index % 2 === 0 ? 1.5 : 0.5;
      return makeQuestion(`Which statement is true about y = ${a}(${trimDecimal(b, 2)})^x?`, `y-intercept is ${a} and the horizontal asymptote is y = 0`, ["y-intercept is 0 and the asymptote is x = 0", `y-intercept is ${trimDecimal(b, 2)} and the asymptote is y = ${a}`, "the graph has no asymptote"], `At x = 0 the value is a, and basic exponential functions approach y = 0.`, `${kind}-${index}`);
    }
    const a = 2 + (index % 3);
    const b = 2;
    const y1 = a * b;
    const y2 = a * b * b;
    const y3 = a * b * b * b;
    return makeQuestion(`Data points (1, ${y1}), (2, ${y2}), and (3, ${y3}) lie on which exponential model?`, formatExponentialEquation(a, b), [formatExponentialEquation(a + 1, b), formatExponentialEquation(a, 1.5), formatExponentialEquation(a, 0.5)], `Choose the exponential function that matches the repeated multiplicative pattern.`, `${kind}-${index}`);
  });
}

const QUIZ_BUILDERS = [
  ["A.1A", "Math Algebra I A.1A", "Apply mathematics to problems arising in everyday life, society, and the workplace.", 0, "Mathematical Process Standards", "Core", () => buildProcessApply("A.1A")],
  ["A.1B", "Math Algebra I A.1B", "Use a problem-solving model that incorporates analyzing information, formulating a plan or strategy, determining a solution, justifying the solution, and evaluating the problem-solving process and the reasonableness of the solution.", 0, "Mathematical Process Standards", "Core", () => buildProcessModel("A.1B")],
  ["A.1C", "Math Algebra I A.1C", "Select tools, including real objects, manipulatives, paper and pencil, and technology as appropriate, and techniques, including mental math, estimation, and number sense as appropriate, to solve problems.", 0, "Mathematical Process Standards", "Core", () => buildProcessTools("A.1C")],
  ["A.1D", "Math Algebra I A.1D", "Communicate mathematical ideas, reasoning, and their implications using multiple representations, including symbols, diagrams, graphs, and language as appropriate.", 0, "Mathematical Process Standards", "Core", () => buildProcessCommunicate("A.1D")],
  ["A.1E", "Math Algebra I A.1E", "Create and use representations to organize, record, and communicate mathematical ideas.", 0, "Mathematical Process Standards", "Core", () => buildProcessRepresent("A.1E")],
  ["A.1F", "Math Algebra I A.1F", "Analyze mathematical relationships to connect and communicate mathematical ideas.", 0, "Mathematical Process Standards", "Core", () => buildProcessRelationships("A.1F")],
  ["A.1G", "Math Algebra I A.1G", "Display, explain, and justify mathematical ideas and arguments using precise mathematical language in written or oral communication.", 0, "Mathematical Process Standards", "Core", () => buildProcessLanguage("A.1G")],

  ["A.10A", "Math Algebra I A.10A", cleanDescription("add and subtract polynomials of degree one and degree two"), 1, "Number and Algebraic Methods", "Supporting", () => buildAlgebra1PolynomialMethods("A.10A")],
  ["A.10B", "Math Algebra I A.10B", cleanDescription("multiply polynomials of degree one and degree two"), 1, "Number and Algebraic Methods", "Supporting", () => buildAlgebra1PolynomialMethods("A.10B")],
  ["A.10C", "Math Algebra I A.10C", cleanDescription("determine the quotient of a polynomial of degree one and polynomial of degree two when divided by a polynomial of degree one and polynomial of degree two when the degree of the divisor does not exceed the degree of the dividend"), 1, "Number and Algebraic Methods", "Supporting", () => buildAlgebra1PolynomialMethods("A.10C")],
  ["A.10D", "Math Algebra I A.10D", cleanDescription("rewrite polynomial expressions of degree one and degree two in equivalent forms using the distributive property"), 1, "Number and Algebraic Methods", "Supporting", () => buildAlgebra1PolynomialMethods("A.10D")],
  ["A.10E", "Math Algebra I A.10E", cleanDescription("factor, if possible, trinomials with real factors in the form ax^2 + bx + c, including perfect square trinomials of degree two"), 1, "Number and Algebraic Methods", "Readiness", () => buildAlgebra1PolynomialMethods("A.10E")],
  ["A.10F", "Math Algebra I A.10F", cleanDescription("decide if a binomial can be written as the difference of two squares and, if possible, use the structure of a difference of two squares to rewrite the binomial"), 1, "Number and Algebraic Methods", "Supporting", () => buildAlgebra1PolynomialMethods("A.10F")],
  ["A.11A", "Math Algebra I A.11A", cleanDescription("simplify numerical radical expressions involving square roots"), 1, "Number and Algebraic Methods", "Supporting", () => buildAlgebra1RadicalsExponents("A.11A")],
  ["A.11B", "Math Algebra I A.11B", cleanDescription("simplify numeric and algebraic expressions using the laws of exponents, including integral and rational exponents"), 1, "Number and Algebraic Methods", "Readiness", () => buildAlgebra1RadicalsExponents("A.11B")],
  ["A.12A", "Math Algebra I A.12A", cleanDescription("decide whether relations represented verbally, tabularly, graphically, and symbolically define a function"), 1, "Number and Algebraic Methods", "Supporting", () => buildAlgebra1FunctionsAndSequences("A.12A")],
  ["A.12B", "Math Algebra I A.12B", cleanDescription("evaluate functions, expressed in function notation, given one or more elements in their domains"), 1, "Number and Algebraic Methods", "Supporting", () => buildAlgebra1FunctionsAndSequences("A.12B")],
  ["A.12C", "Math Algebra I A.12C", cleanDescription("identify terms of arithmetic and geometric sequences when the sequences are given in function form using recursive processes"), 1, "Number and Algebraic Methods", "Supporting", () => buildAlgebra1FunctionsAndSequences("A.12C")],
  ["A.12D", "Math Algebra I A.12D", cleanDescription("write a formula for the nth term of arithmetic and geometric sequences, given the value of several of their terms"), 1, "Number and Algebraic Methods", "Supporting", () => buildAlgebra1FunctionsAndSequences("A.12D")],
  ["A.12E", "Math Algebra I A.12E", cleanDescription("solve mathematic and scientific formulas, and other literal equations, for a specified variable"), 1, "Number and Algebraic Methods", "Supporting", () => buildAlgebra1FunctionsAndSequences("A.12E")],

  ["A.3A", "Math Algebra I A.3A", cleanDescription("determine the slope of a line given a table of values, a graph, two points on the line, and an equation written in various forms, including y = mx + b, Ax + By = C, and y - y1 = m(x - x1)"), 2, "Describing and Graphing Linear Functions, Equations, and Inequalities", "Supporting", () => buildAlgebra1LinearGraphing("A.3A")],
  ["A.3B", "Math Algebra I A.3B", cleanDescription("calculate the rate of change of a linear function represented tabularly, graphically, or algebraically in context of mathematical and real-world problems"), 2, "Describing and Graphing Linear Functions, Equations, and Inequalities", "Readiness", () => buildAlgebra1LinearGraphing("A.3B")],
  ["A.3C", "Math Algebra I A.3C", cleanDescription("graph linear functions on the coordinate plane and identify key features, including x-intercept, y-intercept, zeros, and slope, in mathematical and real-world problems"), 2, "Describing and Graphing Linear Functions, Equations, and Inequalities", "Readiness", () => buildAlgebra1LinearGraphing("A.3C")],
  ["A.3D", "Math Algebra I A.3D", cleanDescription("graph the solution set of linear inequalities in two variables on the coordinate plane"), 2, "Describing and Graphing Linear Functions, Equations, and Inequalities", "Readiness", () => buildAlgebra1LinearGraphing("A.3D")],
  ["A.3E", "Math Algebra I A.3E", cleanDescription("determine the effects on the graph of the parent function f(x) = x when f(x) is replaced by af(x), f(x) + d, f(x - c), f(bx) for specific values of a, b, c, and d"), 2, "Describing and Graphing Linear Functions, Equations, and Inequalities", "Supporting", () => buildAlgebra1LinearGraphing("A.3E")],
  ["A.3F", "Math Algebra I A.3F", cleanDescription("graph systems of two linear equations in two variables on the coordinate plane and determine the solutions if they exist"), 2, "Describing and Graphing Linear Functions, Equations, and Inequalities", "Supporting", () => buildAlgebra1LinearGraphing("A.3F")],
  ["A.3G", "Math Algebra I A.3G", cleanDescription("estimate graphically the solutions to systems of two linear equations with two variables in real-world problems"), 2, "Describing and Graphing Linear Functions, Equations, and Inequalities", "Supporting", () => buildAlgebra1LinearGraphing("A.3G")],
  ["A.3H", "Math Algebra I A.3H", cleanDescription("graph the solution set of systems of two linear inequalities in two variables on the coordinate plane"), 2, "Describing and Graphing Linear Functions, Equations, and Inequalities", "Supporting", () => buildAlgebra1LinearGraphing("A.3H")],
  ["A.4A", "Math Algebra I A.4A", cleanDescription("calculate, using technology, the correlation coefficient between two quantitative variables and interpret this quantity as a measure of the strength of the linear association"), 2, "Describing and Graphing Linear Functions, Equations, and Inequalities", "Supporting", () => buildAlgebra1LinearData("A.4A")],
  ["A.4B", "Math Algebra I A.4B", cleanDescription("compare and contrast association and causation in real-world problems"), 2, "Describing and Graphing Linear Functions, Equations, and Inequalities", "Supporting", () => buildAlgebra1LinearData("A.4B")],
  ["A.4C", "Math Algebra I A.4C", cleanDescription("write, with and without technology, linear functions that provide a reasonable fit to data to estimate solutions and make predictions for real-world problems"), 2, "Describing and Graphing Linear Functions, Equations, and Inequalities", "Supporting", () => buildAlgebra1LinearData("A.4C")],

  ["A.2A", "Math Algebra I A.2A", cleanDescription("determine the domain and range of a linear function in mathematical problems; determine reasonable domain and range values for real-world situations, both continuous and discrete; and represent domain and range using inequalities"), 3, "Writing and Solving Linear Functions, Equations, and Inequalities", "Readiness", () => buildAlgebra1LinearWriting("A.2A")],
  ["A.2B", "Math Algebra I A.2B", cleanDescription("write linear equations in two variables in various forms, including y = mx + b, Ax + By = C, and y - y1 = m(x - x1), given one point and the slope and given two points"), 3, "Writing and Solving Linear Functions, Equations, and Inequalities", "Supporting", () => buildAlgebra1LinearWriting("A.2B")],
  ["A.2C", "Math Algebra I A.2C", cleanDescription("write linear equations in two variables given a table of values, a graph, and a verbal description"), 3, "Writing and Solving Linear Functions, Equations, and Inequalities", "Readiness", () => buildAlgebra1LinearWriting("A.2C")],
  ["A.2D", "Math Algebra I A.2D", cleanDescription("write and solve equations involving direct variation"), 3, "Writing and Solving Linear Functions, Equations, and Inequalities", "Supporting", () => buildAlgebra1LinearWriting("A.2D")],
  ["A.2E", "Math Algebra I A.2E", cleanDescription("write the equation of a line that contains a given point and is parallel to a given line"), 3, "Writing and Solving Linear Functions, Equations, and Inequalities", "Supporting", () => buildAlgebra1LinearWriting("A.2E")],
  ["A.2F", "Math Algebra I A.2F", cleanDescription("write the equation of a line that contains a given point and is perpendicular to a given line"), 3, "Writing and Solving Linear Functions, Equations, and Inequalities", "Supporting", () => buildAlgebra1LinearWriting("A.2F")],
  ["A.2G", "Math Algebra I A.2G", cleanDescription("write an equation of a line that is parallel or perpendicular to the x-axis or y-axis and determine whether the slope of the line is zero or undefined"), 3, "Writing and Solving Linear Functions, Equations, and Inequalities", "Supporting", () => buildAlgebra1LinearWriting("A.2G")],
  ["A.2H", "Math Algebra I A.2H", cleanDescription("write linear inequalities in two variables given a table of values, a graph, and a verbal description"), 3, "Writing and Solving Linear Functions, Equations, and Inequalities", "Supporting", () => buildAlgebra1LinearWriting("A.2H")],
  ["A.2I", "Math Algebra I A.2I", cleanDescription("write systems of two linear equations given a table of values, a graph, and a verbal description"), 3, "Writing and Solving Linear Functions, Equations, and Inequalities", "Readiness", () => buildAlgebra1LinearWriting("A.2I")],
  ["A.5A", "Math Algebra I A.5A", cleanDescription("solve linear equations in one variable, including those for which the application of the distributive property is necessary and for which variables are included on both sides"), 3, "Writing and Solving Linear Functions, Equations, and Inequalities", "Readiness", () => buildAlgebra1LinearSolving("A.5A")],
  ["A.5B", "Math Algebra I A.5B", cleanDescription("solve linear inequalities in one variable, including those for which the application of the distributive property is necessary and for which variables are included on both sides"), 3, "Writing and Solving Linear Functions, Equations, and Inequalities", "Supporting", () => buildAlgebra1LinearSolving("A.5B")],
  ["A.5C", "Math Algebra I A.5C", cleanDescription("solve systems of two linear equations with two variables for mathematical and real-world problems"), 3, "Writing and Solving Linear Functions, Equations, and Inequalities", "Readiness", () => buildAlgebra1LinearSolving("A.5C")],

  ["A.6A", "Math Algebra I A.6A", cleanDescription("determine the domain and range of quadratic functions and represent the domain and range using inequalities"), 4, "Quadratic Functions and Equations", "Readiness", () => buildAlgebra1QuadraticWriting("A.6A")],
  ["A.6B", "Math Algebra I A.6B", cleanDescription("write equations of quadratic functions given the vertex and another point on the graph, write the equation in vertex form f(x) = a(x - h)^2 + k, and rewrite the equation from vertex form to standard form f(x) = ax^2 + bx + c"), 4, "Quadratic Functions and Equations", "Supporting", () => buildAlgebra1QuadraticWriting("A.6B")],
  ["A.6C", "Math Algebra I A.6C", cleanDescription("write quadratic functions when given real solutions and graphs of their related equations"), 4, "Quadratic Functions and Equations", "Supporting", () => buildAlgebra1QuadraticWriting("A.6C")],
  ["A.7A", "Math Algebra I A.7A", cleanDescription("graph quadratic functions on the coordinate plane and use the graph to identify key attributes, if possible, including x-intercept, y-intercept, zeros, maximum value, minimum value, vertex, and the equation of the axis of symmetry"), 4, "Quadratic Functions and Equations", "Readiness", () => buildAlgebra1QuadraticGraphing("A.7A")],
  ["A.7B", "Math Algebra I A.7B", cleanDescription("describe the relationship between the linear factors of quadratic expressions and the zeros of their associated quadratic functions"), 4, "Quadratic Functions and Equations", "Supporting", () => buildAlgebra1QuadraticGraphing("A.7B")],
  ["A.7C", "Math Algebra I A.7C", cleanDescription("determine the effects on the graph of the parent function f(x) = x^2 when f(x) is replaced by af(x), f(x) + d, f(x - c), f(bx) for specific values of a, b, c, and d"), 4, "Quadratic Functions and Equations", "Readiness", () => buildAlgebra1QuadraticGraphing("A.7C")],
  ["A.8A", "Math Algebra I A.8A", cleanDescription("solve quadratic equations having real solutions by factoring, taking square roots, completing the square, and applying the quadratic formula"), 4, "Quadratic Functions and Equations", "Readiness", () => buildAlgebra1QuadraticSolving("A.8A")],
  ["A.8B", "Math Algebra I A.8B", cleanDescription("write, using technology, quadratic functions that provide a reasonable fit to data to estimate solutions and make predictions for real-world problems"), 4, "Quadratic Functions and Equations", "Supporting", () => buildAlgebra1QuadraticSolving("A.8B")],

  ["A.9A", "Math Algebra I A.9A", cleanDescription("determine the domain and range of exponential functions of the form f(x) = ab^x and represent the domain and range using inequalities"), 5, "Exponential Functions and Equations", "Supporting", () => buildAlgebra1Exponential("A.9A")],
  ["A.9B", "Math Algebra I A.9B", cleanDescription("interpret the meaning of the values of a and b in exponential functions of the form f(x) = ab^x in real-world problems"), 5, "Exponential Functions and Equations", "Supporting", () => buildAlgebra1Exponential("A.9B")],
  ["A.9C", "Math Algebra I A.9C", cleanDescription("write exponential functions in the form f(x) = ab^x where b is a rational number to describe problems arising from mathematical and real-world situations, including growth and decay"), 5, "Exponential Functions and Equations", "Readiness", () => buildAlgebra1Exponential("A.9C")],
  ["A.9D", "Math Algebra I A.9D", cleanDescription("graph exponential functions that model growth and decay and identify key features, including y-intercept and asymptote, in mathematical and real-world problems"), 5, "Exponential Functions and Equations", "Readiness", () => buildAlgebra1Exponential("A.9D")],
  ["A.9E", "Math Algebra I A.9E", cleanDescription("write, using technology, exponential functions that provide a reasonable fit to data and make predictions for real-world problems"), 5, "Exponential Functions and Equations", "Supporting", () => buildAlgebra1Exponential("A.9E")]
];

function generateQuizzes() {
  return QUIZ_BUILDERS.map(([teksCode, label, summary, , , , builder]) =>
    makeQuiz(
      setIdFor(teksCode),
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
    const setId = setIdFor(teksCode);
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
    title: "Algebra I Math TEKS Implementation",
    source: {
      localPdf: LOCAL_PDF,
      officialAssessedCurriculum: ASSESSED_CURRICULUM_URL,
      officialBlueprint: BLUEPRINT_URL,
      notes: "Algebra I Math implementation continues after Grade 8 was fully completed. The local assessed curriculum PDF and the official TEA assessed curriculum and blueprint were used to define the Algebra I STAAR scope."
    },
    namingConvention: "Math Algebra I {TEKS}",
    questionTargetPerSet: 50,
    scope: {
      firstTeks: "A.1A",
      assessedFirstTeks: "A.10A",
      assessedLastTeks: "A.9E",
      implementedLastTeks: "A.9E",
      includedAssessedTeksCount: QUIZ_BUILDERS.length - PROCESS_CODES.length,
      includedImplementationTeksCount: QUIZ_BUILDERS.length,
      includedBeyondAssessedScope: PROCESS_CODES,
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
  console.log(`Wrote ${generatedQuizzes.length} Texas Algebra I math TEKS sets and ${totalQuestions} questions to ${CUSTOM_QUIZZES_FILE}`);
  console.log(`Wrote Algebra I implementation file to ${IMPLEMENTATION_FILE}`);
}

main();
