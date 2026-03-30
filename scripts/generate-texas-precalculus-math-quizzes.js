const fs = require("fs");
const path = require("path");

const CUSTOM_QUIZZES_FILE = path.join(__dirname, "..", "data", "custom-quizzes.json");
const IMPLEMENTATION_FILE = path.join(__dirname, "..", "data", "precalculus-math-teks-implementation.json");
const NOW = new Date().toISOString();
const GENERATED_BY = "Local Curriculum";
const CATEGORY = "Texas Precalculus Math";
const LOCAL_PDF = "C:/Users/Casa-Desktop/Downloads/precalculus-teks.pdf";
const ASSESSED_CURRICULUM_URL = "https://tea.texas.gov/academics/instructional-materials/review-and-adoption-process/breakout-documents/math-precalculus-breakout-p2015.pdf";
const BLUEPRINT_URL = "https://tea.texas.gov/about-tea/laws-and-rules/texas-administrative-code/19-tac-chapter-111";
const PROCESS_CODES = ["PC.1A", "PC.1B", "PC.1C", "PC.1D", "PC.1E", "PC.1F", "PC.1G"];
const GENERATED_IDS = new Set();
const ITEMS = ["budgets", "designs", "screens", "bridges", "paths", "plans", "models", "charts"];

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

function fraction(numerator, denominator) {
  return `${numerator}/${denominator}`;
}

function fractionOrWhole(numerator, denominator) {
  const factor = gcd(numerator, denominator);
  const left = numerator / factor;
  const right = denominator / factor;
  return right === 1 ? String(left) : fraction(left, right);
}

function numberText(value, digits = 3) {
  return String(Number(Number(value).toFixed(digits)));
}

function money(value) {
  return `$${Number(value).toFixed(2)}`;
}

function signedConstant(value) {
  return value >= 0 ? `+ ${Math.abs(value)}` : `- ${Math.abs(value)}`;
}

function coordinateTerm(variable, value) {
  if (value === 0) {
    return variable;
  }
  return `${variable} ${value > 0 ? "-" : "+"} ${Math.abs(value)}`;
}

function formatPoint(x, y) {
  return `(${numberText(x)}, ${numberText(y)})`;
}

function formatLinearExpression(m, b) {
  const slope = Number(numberText(m));
  const slopePart = slope === 1 ? "x" : slope === -1 ? "-x" : `${numberText(slope)}x`;
  if (b === 0) {
    return slopePart;
  }
  return `${slopePart} ${signedConstant(b)}`;
}

function formatLinearEquation(m, b) {
  return `y = ${formatLinearExpression(m, b)}`;
}

function formatVertexEquation(a, h, k) {
  return `y = ${numberText(a)}(${coordinateTerm("x", h)})^2 ${signedConstant(k)}`.replace("1(", "(");
}

function formatSqrtEquation(h, k) {
  return `y = sqrt(${coordinateTerm("x", h)}) ${signedConstant(k)}`;
}

function formatExponentialEquation(a, b, h = 0, k = 0) {
  return `y = ${numberText(a)}(${numberText(b)})^(${coordinateTerm("x", h)}) ${signedConstant(k)}`
    .replace("^x + 0", "^x")
    .replace("^x - 0", "^x");
}

function formatLogEquation(base, h = 0, k = 0) {
  return `y = log_${base}(${coordinateTerm("x", h)}) ${signedConstant(k)}`;
}

function formatAbsoluteEquation(a, h = 0, k = 0) {
  return `y = ${numberText(a)}abs(${coordinateTerm("x", h)}) ${signedConstant(k)}`.replace("1abs", "abs");
}

function formatCubicEquation(a, h = 0, k = 0) {
  return `y = ${numberText(a)}(${coordinateTerm("x", h)})^3 ${signedConstant(k)}`.replace("1(", "(");
}

function formatCubeRootEquation(h = 0, k = 0) {
  return `y = cuberoot(${coordinateTerm("x", h)}) ${signedConstant(k)}`;
}

function formatReciprocalEquation(a = 1, h = 0, k = 0) {
  return `y = ${numberText(a)}/(${coordinateTerm("x", h)}) ${signedConstant(k)}`;
}

function formatCircleEquation(h, k, r) {
  return `(${coordinateTerm("x", h)})^2 + (${coordinateTerm("y", k)})^2 = ${r * r}`;
}

function radicalText(multiplier, radicand) {
  if (multiplier === 1) {
    return `sqrt(${radicand})`;
  }
  return `${multiplier}sqrt(${radicand})`;
}

function piText(coefficient) {
  if (coefficient === 0) {
    return "0";
  }
  if (coefficient === 1) {
    return "pi";
  }
  return `${numberText(coefficient)}pi`;
}

function buildFallbackChoices(correctText) {
  const choices = [];
  if (/^-?\d+(\.\d+)?$/.test(correctText)) {
    const amount = Number(correctText);
    choices.push(numberText(amount + 1));
    choices.push(numberText(amount - 1));
    choices.push(numberText(amount + 2));
  }
  if (/^\d+\/\d+$/.test(correctText)) {
    const [left, right] = correctText.split("/").map((piece) => Number(piece));
    choices.push(fraction(Math.max(1, left + 1), right));
    choices.push(fraction(Math.max(1, left), right + 1));
    choices.push(fraction(Math.max(1, left + 1), right + 1));
  }
  if (/^\$-?\d+(\.\d+)?$/.test(correctText)) {
    const amount = Number(correctText.replace("$", ""));
    choices.push(money(amount + 1));
    choices.push(money(Math.max(0, amount - 1)));
    choices.push(money(amount + 10));
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
    options.push(fallback);
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

function buildQuestionSet(factory) {
  return Array.from({ length: 50 }, (_, index) => factory(index));
}

function assertQuestionCount(code, questions) {
  if (!Array.isArray(questions) || questions.length !== 50) {
    throw new Error(`${code} generated ${Array.isArray(questions) ? questions.length : 0} questions instead of 50.`);
  }
}

function cleanDescription(description) {
  return String(description).replace(/\s+/g, " ").trim();
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
    tags: ["texas", "teks", "math", "precalculus", teksCode.toLowerCase().replace(".", "").replace(/\s+/g, "")],
    questions
  };
}

function setIdFor(teksCode) {
  return `tx_precalculus_math_${teksCode.toLowerCase().replace(/\./g, "_")}`;
}

function buildProcessApply(code) {
  return buildQuestionSet((index) => {
    const item = pick(ITEMS, index);
    return makeQuestion(
      `Which action best shows applying mathematics to a problem about ${item}?`,
      `Use equations, graphs, or patterns to make a decision about the ${item}`,
      [
        `Choose the ${item} option with no calculations`,
        `Ignore the measurements and guess`,
        `Pick the ${item} based only on color`
      ],
      "Applying mathematics means using quantitative reasoning to solve a real problem.",
      `${code}-${index}`
    );
  });
}

function buildProcessModel(code) {
  const steps = [
    "analyze the given information",
    "formulate a plan or strategy",
    "determine a solution",
    "justify the solution",
    "evaluate the reasonableness of the result"
  ];
  return buildQuestionSet((index) => {
    const current = steps[index % (steps.length - 1)];
    const next = steps[(index % (steps.length - 1)) + 1];
    return makeQuestion(
      `A student has just finished this step in the problem-solving process: ${current}. What comes next?`,
      next,
      uniqueStrings(steps.filter((step) => step !== next).slice(0, 3)),
      "The mathematical process standards move from analyze, to plan, to solve, to justify, to evaluate.",
      `${code}-${index}`
    );
  });
}

function buildProcessTools(code) {
  const tools = ["graphing technology", "a table of values", "paper and pencil", "mental math", "estimation"];
  return buildQuestionSet((index) => {
    return makeQuestion(
      "Which tool is most appropriate for checking the intersection points of two complicated graphs?",
      "graphing technology",
      uniqueStrings(tools.filter((tool) => tool !== "graphing technology").slice(0, 3)),
      "Technology is an appropriate tool for graphing and checking complex equations and systems.",
      `${code}-${index}`
    );
  });
}

function buildProcessCommunicate(code) {
  return buildQuestionSet((index) => {
    return makeQuestion(
      "Which response best communicates a mathematical argument?",
      "A labeled graph, symbolic work, and an explanation that connects the steps",
      [
        "Only the final answer with no reasoning",
        "A guess with no graph or equations",
        "A list of numbers with no explanation"
      ],
      "Clear communication uses multiple representations and explains why the reasoning is valid.",
      `${code}-${index}`
    );
  });
}

function buildProcessRepresent(code) {
  return buildQuestionSet((index) => {
    return makeQuestion(
      "Which is a useful mathematical representation?",
      "A graph, table, or equation that organizes the relationships in the problem",
      [
        "A random sketch with no labels",
        "An answer choice copied without work",
        "A paragraph with no quantities"
      ],
      "Representations help organize, record, and communicate mathematical ideas.",
      `${code}-${index}`
    );
  });
}

function buildProcessRelationships(code) {
  return buildQuestionSet((index) => {
    return makeQuestion(
      "Which statement best shows analyzing a mathematical relationship?",
      "Noticing that an inverse function undoes the original function",
      [
        "Ignoring how the values are connected",
        "Choosing an answer without checking the pattern",
        "Using only the color of the graph"
      ],
      "Analyzing relationships means understanding how quantities, functions, and representations are connected.",
      `${code}-${index}`
    );
  });
}

function buildProcessLanguage(code) {
  return buildQuestionSet((index) => {
    return makeQuestion(
      "Which phrase uses precise mathematical language?",
      "The function is exponential because it has a constant multiplicative rate of change",
      [
        "The graph kind of curves upward",
        "The function looks bigger every time",
        "The pattern seems math-like"
      ],
      "Precise language clearly states the mathematical property being used.",
      `${code}-${index}`
    );
  });
}

function buildAlgebra2Functions(kind) {
  if (kind === "A2.2A") {
    const prompts = [
      {
        prompt: "Which parent function has domain x >= 0 and starts at the origin?",
        correct: "y = sqrt(x)",
        wrongs: ["y = x^3", "y = 1/x", "y = log_10(x)"]
      },
      {
        prompt: "Which parent function has a vertical asymptote at x = 0 and passes through (1, 0)?",
        correct: "y = log_10(x)",
        wrongs: ["y = 2^x", "y = abs(x)", "y = sqrt(x)"]
      },
      {
        prompt: "Which parent function has both domain and range equal to all real numbers and has an S-shaped graph through the origin?",
        correct: "y = x^3",
        wrongs: ["y = sqrt(x)", "y = abs(x)", "y = 1/x"]
      },
      {
        prompt: "Which parent function has horizontal asymptote y = 0 and y-intercept 1?",
        correct: "y = 2^x",
        wrongs: ["y = log_2(x)", "y = 1/x", "y = x^3"]
      },
      {
        prompt: "Which parent function is V-shaped with vertex at the origin?",
        correct: "y = abs(x)",
        wrongs: ["y = x^3", "y = sqrt(x)", "y = log_10(x)"]
      },
      {
        prompt: "Which parent function has vertical asymptote x = 0 and horizontal asymptote y = 0?",
        correct: "y = 1/x",
        wrongs: ["y = sqrt(x)", "y = x^3", "y = abs(x)"]
      },
      {
        prompt: "Which parent function is the inverse of y = x^3?",
        correct: "y = cuberoot(x)",
        wrongs: ["y = sqrt(x)", "y = 1/x", "y = abs(x)"]
      }
    ];
    return buildQuestionSet((index) => {
      const selected = pick(prompts, index);
      return makeQuestion(selected.prompt, selected.correct, selected.wrongs, "Algebra II compares parent functions by domain, range, asymptotes, intercepts, and overall shape.", `${kind}-${index}`);
    });
  }

  if (kind === "A2.2B") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        const m = pick([2, 3, -2], index);
        const b = pick([1, 4, -3], index, 1);
        const inverse = `y = (x ${b >= 0 ? "-" : "+"} ${Math.abs(b)})/${m}`;
        return makeQuestion(
          `Which function is the inverse of y = ${m}x ${signedConstant(b)}?`,
          inverse,
          [`y = ${m}x ${signedConstant(-b)}`, `y = x/${m} ${signedConstant(b)}`, `y = ${m}/x ${signedConstant(b)}`],
          "To find the inverse of a linear function, swap x and y and solve for y.",
          `${kind}-${index}`
        );
      }
      const base = pick([2, 3, 10], index);
      return makeQuestion(
        `Which function is the inverse of y = ${base}^x?`,
        `y = log_${base}(x)`,
        [`y = ${base}x`, `y = x^${base}`, `y = 1/${base}^x`],
        "Exponential and logarithmic functions with the same base are inverses.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.2C") {
    const prompts = [
      {
        prompt: "How are the graphs of a function and its inverse related?",
        correct: "They are reflections across the line y = x",
        wrongs: ["They are always parallel", "They have the same x-intercept only", "They are rotations of 180 degrees"]
      },
      {
        prompt: "Why must the domain of a quadratic sometimes be restricted before finding an inverse?",
        correct: "So the original function is one-to-one",
        wrongs: ["So the y-intercept becomes 0", "So the graph becomes linear", "So the inverse has no domain"]
      },
      {
        prompt: "Which pair of parent functions are inverses?",
        correct: "y = 2^x and y = log_2(x)",
        wrongs: ["y = x^2 and y = abs(x)", "y = x^3 and y = 1/x", "y = sqrt(x) and y = abs(x)"]
      },
      {
        prompt: "If y = x^2 is restricted to x >= 0, what type of inverse does it have?",
        correct: "a square root function",
        wrongs: ["a linear function", "a reciprocal function", "an absolute value function"]
      }
    ];
    return buildQuestionSet((index) => {
      const selected = pick(prompts, index);
      return makeQuestion(selected.prompt, selected.correct, selected.wrongs, "Inverse functions undo each other, and some functions need a domain restriction to become one-to-one.", `${kind}-${index}`);
    });
  }

  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const m = pick([2, 3, -2], index);
      const b = pick([5, -1, 4], index, 1);
      const value = 4 + (index % 4);
      return makeQuestion(
        `If f(x) = ${m}x ${signedConstant(b)} and f^-1 is its inverse, what is (f o f^-1)(${value})?`,
        String(value),
        [String(m * value + b), String((value - b) / m), String(value + b)],
        "A function composed with its inverse returns the input value.",
        `${kind}-${index}`
      );
    }
    const base = pick([2, 3, 5], index);
    const value = base ** 2;
    return makeQuestion(
      `If f(x) = ${base}^x and f^-1(x) = log_${base}(x), what is f^-1(${value})?`,
      "2",
      [String(base), String(value), "1"],
      "The inverse logarithm answers the question: to what exponent must the base be raised to get the given value?",
      `${kind}-${index}`
    );
  });
}

function buildAlgebra2Systems(kind) {
  if (kind === "A2.3A") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        const total = 20 + (index % 6);
        const revenue = 80 + index * 2;
        return makeQuestion(
          `A school sells adult tickets x at $5 each and student tickets y at $3 each. ${total} total tickets are sold for $${revenue}. Which system models the situation?`,
          `x + y = ${total}; 5x + 3y = ${revenue}`,
          [`x - y = ${total}; 5x + 3y = ${revenue}`, `x + y = ${revenue}; 5x + 3y = ${total}`, `5x + 3y = ${total}; x + y = ${revenue}`],
          "Formulating a system means matching each condition in the problem with an equation or inequality.",
          `${kind}-${index}`
        );
      }
      const m = 2;
      const b = 1 + (index % 4);
      const p = 3 + (index % 4);
      return makeQuestion(
        `A line is y = ${m}x ${signedConstant(b)} and a parabola is y = x^2 ${signedConstant(b - p)}. Which system models their intersection?`,
        `{ y = ${m}x ${signedConstant(b)}, y = x^2 ${signedConstant(b - p)} }`,
        [`{ y = ${m}x ${signedConstant(b)}, y = x^2 ${signedConstant(b + p)} }`, `{ y = ${m}x ${signedConstant(-b)}, y = x^2 ${signedConstant(b - p)} }`, `{ y = x^2 ${signedConstant(b - p)}, y = ${m}x ${signedConstant(-b)} }`],
        "A system containing a line and a parabola is formed by writing both equations together.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.3B") {
    return buildQuestionSet((index) => {
      const x = 1 + (index % 4);
      const y = 2 + ((index + 1) % 4);
      const z = 3 + ((index + 2) % 4);
      const s1 = x + y + z;
      const s2 = x - y + z;
      const s3 = x + 2 * y - z;
      return makeQuestion(
        `Solve the system: x + y + z = ${s1}, x - y + z = ${s2}, and x + 2y - z = ${s3}.`,
        `(${x}, ${y}, ${z})`,
        [`(${y}, ${x}, ${z})`, `(${x}, ${z}, ${y})`, `(${x + 1}, ${y}, ${z})`],
        "A three-variable system is solved by finding the ordered triple that satisfies all three equations.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.3C") {
    return buildQuestionSet((index) => {
      const r1 = 1 + (index % 3);
      const r2 = r1 + 2;
      const m = 1 + (index % 2);
      const b = index % 4;
      const line = formatLinearEquation(m, b);
      const quad = `y = (x - ${r1})(x - ${r2}) + ${m}x ${signedConstant(b)}`;
      const y1 = m * r1 + b;
      const y2 = m * r2 + b;
      return makeQuestion(
        `Solve the system { ${line}, ${quad} }.`,
        `${formatPoint(r1, y1)} and ${formatPoint(r2, y2)}`,
        [`${formatPoint(r1, y2)} and ${formatPoint(r2, y1)}`, `${formatPoint(r1, r1)} and ${formatPoint(r2, r2)}`, `${formatPoint(r1 + 1, y1)} and ${formatPoint(r2, y2)}`],
        "The intersections occur where the linear and quadratic expressions are equal, which here happens when (x - r1)(x - r2) = 0.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.3D") {
    return buildQuestionSet((index) => {
      const x = 1 + (index % 4);
      const y = 2 * x + 1;
      const point = index % 2 === 0 ? formatPoint(x, y) : formatPoint(x, y + 1);
      const truth = index % 2 === 0 ? "Yes" : "No";
      return makeQuestion(
        `Does the point ${point} satisfy both equations y = 2x + 1 and y = x^2 + x - ${x * x - x - 1}?`,
        truth,
        truth === "Yes" ? ["No", "Only the first equation", "Only the second equation"] : ["Yes", "Only the first equation", "Only the second equation"],
        "A reasonable solution to a system must satisfy every equation in the system.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.3E") {
    return buildQuestionSet((index) => {
      const total = 16 + (index % 6);
      const minX = 4 + (index % 3);
      return makeQuestion(
        `A student needs at least ${minX} science books x and no more than ${total} total books when combined with history books y. Which system models the situation?`,
        `x >= ${minX}; x + y <= ${total}; y >= 0`,
        [`x <= ${minX}; x + y <= ${total}; y >= 0`, `x >= ${minX}; x + y >= ${total}; y >= 0`, `x >= ${minX}; x - y <= ${total}; y >= 0`],
        "Formulating inequalities means matching words like at least, no more than, and nonnegative to inequality symbols.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.3F") {
    return buildQuestionSet((index) => {
      const a = 2 + (index % 3);
      const b = 10 + (index % 5);
      const correctPoint = formatPoint(a, b - a - 1);
      return makeQuestion(
        `Which point satisfies the system x >= ${a} and y < -x + ${b}?`,
        correctPoint,
        [formatPoint(a - 1, b - a - 1), formatPoint(a, b - a + 1), formatPoint(a - 1, b - a + 2)],
        "A solution to a system of inequalities must satisfy every inequality at the same time.",
        `${kind}-${index}`
      );
    });
  }

  return buildQuestionSet((index) => {
    const a = 1 + (index % 4);
    const b = 8 + (index % 5);
    const point = formatPoint(a + 1, b - a - 3);
    return makeQuestion(
      `For the system y <= -x + ${b} and x > ${a}, which point is a solution?`,
      point,
      [formatPoint(a, b - a - 3), formatPoint(a + 1, b - a + 1), formatPoint(a - 1, b - a - 3)],
      "The point must satisfy both the linear inequality and the domain restriction on x.",
      `${kind}-${index}`
    );
  });
}

function buildAlgebra2Quadratic(kind) {
  if (kind === "A2.4A") {
    return buildQuestionSet((index) => {
      const h = 1 + (index % 4);
      const k = (index % 3) - 2;
      const equation = formatVertexEquation(1, h, k);
      return makeQuestion(
        `Which quadratic function passes through the points ${formatPoint(h - 1, k + 1)}, ${formatPoint(h, k)}, and ${formatPoint(h + 1, k + 1)}?`,
        equation,
        [formatVertexEquation(1, h + 1, k), formatVertexEquation(1, h, k + 1), formatVertexEquation(-1, h, k)],
        "These three symmetric points identify a parabola in vertex form.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.4B") {
    return buildQuestionSet((index) => {
      const h = (index % 3) - 1;
      const k = (index % 4) - 2;
      const p = 1 + (index % 2);
      if (index % 2 === 0) {
        const equation = `(${coordinateTerm("x", h)})^2 = ${4 * p}(${coordinateTerm("y", k)})`;
        return makeQuestion(
          `What is the equation of the parabola with vertex ${formatPoint(h, k)} and focus ${formatPoint(h, k + p)}?`,
          equation,
          [`(${coordinateTerm("y", k)})^2 = ${4 * p}(${coordinateTerm("x", h)})`, `(${coordinateTerm("x", h)})^2 = ${-4 * p}(${coordinateTerm("y", k)})`, formatCircleEquation(h, k, p)],
          "A vertical parabola with vertex (h, k) and focus (h, k + p) has equation (x - h)^2 = 4p(y - k).",
          `${kind}-${index}`
        );
      }
      const equation = `(${coordinateTerm("y", k)})^2 = ${4 * p}(${coordinateTerm("x", h)})`;
      return makeQuestion(
        `What is the equation of the parabola with vertex ${formatPoint(h, k)} and focus ${formatPoint(h + p, k)}?`,
        equation,
        [`(${coordinateTerm("x", h)})^2 = ${4 * p}(${coordinateTerm("y", k)})`, `(${coordinateTerm("y", k)})^2 = ${-4 * p}(${coordinateTerm("x", h)})`, formatCircleEquation(h, k, p)],
        "A horizontal parabola with vertex (h, k) and focus (h + p, k) has equation (y - k)^2 = 4p(x - h).",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.4C") {
    return buildQuestionSet((index) => {
      const h = 2 + (index % 4);
      const k = (index % 3) - 1;
      return makeQuestion(
        `How is the graph of y = ${formatSqrtEquation(h, k).replace("y = ", "")} related to y = sqrt(x)?`,
        `right ${h} and ${k >= 0 ? "up" : "down"} ${Math.abs(k)}`,
        [`left ${h} and ${k >= 0 ? "up" : "down"} ${Math.abs(k)}`, `right ${h} and ${k >= 0 ? "down" : "up"} ${Math.abs(k)}`, `reflected across the x-axis`],
        "Replacing x by x - h shifts right h, and adding k shifts the graph vertically.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.4D") {
    return buildQuestionSet((index) => {
      const h = 1 + (index % 4);
      const k = (index % 3) - 2;
      const b = -2 * h;
      const c = h * h + k;
      const standard = `y = x^2 ${signedConstant(b)}x ${signedConstant(c)}`;
      return makeQuestion(
        `Rewrite ${standard} in vertex form.`,
        formatVertexEquation(1, h, k),
        [formatVertexEquation(1, h + 1, k), formatVertexEquation(1, h, k + 1), formatVertexEquation(-1, h, k)],
        "Completing the square rewrites a quadratic from standard form to vertex form.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.4E") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        const h = 1 + (index % 3);
        const k = (index % 3) - 1;
        return makeQuestion(
          `A table contains the points ${formatPoint(h - 1, k + 1)}, ${formatPoint(h, k)}, and ${formatPoint(h + 1, k + 1)}. Which equation matches the table?`,
          formatVertexEquation(1, h, k),
          [formatVertexEquation(1, h + 1, k), formatVertexEquation(-1, h, k), formatVertexEquation(1, h, k + 1)],
          "The table matches a parabola with vertex (h, k).",
          `${kind}-${index}`
        );
      }
      const h = 2 + (index % 4);
      const k = (index % 3) - 1;
      return makeQuestion(
        `A table contains the points ${formatPoint(h, k)}, ${formatPoint(h + 1, k + 1)}, and ${formatPoint(h + 4, k + 2)}. Which equation matches the table?`,
        formatSqrtEquation(h, k),
        [formatSqrtEquation(h + 1, k), formatSqrtEquation(h, k + 1), formatVertexEquation(1, h, k)],
        "These outputs increase like the square root parent function after a horizontal and vertical shift.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.4F") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        const r1 = 1 + (index % 4);
        const r2 = r1 + 2;
        const b = -(r1 + r2);
        const c = r1 * r2;
        return makeQuestion(
          `Solve x^2 ${signedConstant(b)}x ${signedConstant(c)} = 0.`,
          `${r1} and ${r2}`,
          [`${r1} and ${r2 + 1}`, `${r1 - 1} and ${r2}`, `${r1 + r2}`],
          "A factored quadratic equals zero when either factor equals zero.",
          `${kind}-${index}`
        );
      }
      const shift = 1 + (index % 4);
      const value = 2 + (index % 3);
      return makeQuestion(
        `Solve sqrt(x - ${shift}) = ${value}.`,
        String(value * value + shift),
        [String(value + shift), String(value * value), String(value * value + shift + 1)],
        "Square both sides and isolate x.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.4G") {
    return buildQuestionSet((index) => {
      return makeQuestion(
        "For sqrt(x + 1) = x - 1, which value is an extraneous solution after squaring both sides?",
        "0",
        ["3", "1", "4"],
        "After squaring, both 0 and 3 may appear algebraically, but x = 0 does not satisfy the original equation because the right side would be negative.",
        `${kind}-${index}`
      );
    });
  }

  return buildQuestionSet((index) => {
    const r1 = 2 + (index % 3);
    const r2 = r1 + 1;
    const expression = `x^2 ${signedConstant(-(r1 + r2))}x ${signedConstant(r1 * r2)}`;
    return makeQuestion(
      `Which is the solution set of ${expression} > 0?`,
      `x < ${r1} or x > ${r2}`,
      [`${r1} < x < ${r2}`, `x > ${r1}`, `x < ${r2}`],
      "A factored upward-opening quadratic is positive outside its real zeros and negative between them.",
      `${kind}-${index}`
    );
  });
}

function buildAlgebra2ExpLog(kind) {
  if (kind === "A2.5A") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        const h = 2 + (index % 4);
        const k = (index % 3) - 1;
        return makeQuestion(
          `What is the horizontal asymptote of y = ${formatExponentialEquation(1, 2, h, k).replace("y = ", "")}?`,
          `y = ${k}`,
          [`x = ${h}`, "y = 0", "x = 0"],
          "For y = a(b^(x-h)) + k, the horizontal asymptote is y = k.",
          `${kind}-${index}`
        );
      }
      const h = 3 + (index % 3);
      return makeQuestion(
        `What is the domain of y = ${formatLogEquation(2, h, 1).replace("y = ", "")}?`,
        `x > ${h}`,
        [`x < ${h}`, "all real numbers", `x >= ${h}`],
        "A logarithmic function is defined only when its argument is positive.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.5B") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        const start = 20 + index;
        return makeQuestion(
          `A bacteria culture starts with ${start} cells and doubles every hour. Which function models the situation after x hours?`,
          formatExponentialEquation(start, 2),
          [formatExponentialEquation(start, 1.5), formatLinearEquation(start, 2), `y = ${start} + 2x`],
          "Repeated multiplication by the same factor is modeled by an exponential function.",
          `${kind}-${index}`
        );
      }
      return makeQuestion(
        "Which equation models a logarithmic relationship between p and concentration c?",
        "p = -log_10(c)",
        ["p = 10^c", "p = c^2", "p = 1/c"],
        "A logarithmic equation models a quantity defined by an exponent or a scale based on powers of a base.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.5C") {
    return buildQuestionSet((index) => {
      const base = pick([2, 3, 5], index);
      const exponent = 2 + (index % 3);
      const value = base ** exponent;
      return makeQuestion(
        `Rewrite ${base}^${exponent} = ${value} in logarithmic form.`,
        `log_${base}(${value}) = ${exponent}`,
        [`log_${value}(${base}) = ${exponent}`, `log_${base}(${exponent}) = ${value}`, `${value}^${exponent} = ${base}`],
        "An exponential statement a^b = c is equivalent to log_a(c) = b.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.5D") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        const base = pick([2, 3, 5], index);
        const exponent = 2 + (index % 3);
        return makeQuestion(
          `Solve ${base}^x = ${base ** exponent}.`,
          String(exponent),
          [String(exponent + 1), String(base), String(exponent - 1)],
          "If the bases are equal and positive, the exponents must be equal.",
          `${kind}-${index}`
        );
      }
      const base = pick([2, 3, 10], index);
      const answer = 2 + (index % 3);
      return makeQuestion(
        `Solve log_${base}(x) = ${answer}.`,
        String(base ** answer),
        [String(base * answer), String(answer), String(base ** (answer - 1))],
        "Rewrite the logarithmic equation in exponential form.",
        `${kind}-${index}`
      );
    });
  }

  return buildQuestionSet((index) => {
    return makeQuestion(
      "Which value is a valid solution to log_2(x + 5) = 2?",
      "-1",
      ["-5", "4", "9"],
      "The argument must be positive and 2^2 = x + 5, so x = -1.",
      `${kind}-${index}`
    );
  });
}

function buildAlgebra2Advanced(kind) {
  if (kind === "A2.6A") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        const h = 1 + (index % 4);
        const k = (index % 3) - 1;
        return makeQuestion(
          `How is the graph of y = ${formatCubicEquation(1, h, k).replace("y = ", "")} related to y = x^3?`,
          `right ${h} and ${k >= 0 ? "up" : "down"} ${Math.abs(k)}`,
          [`left ${h} and ${k >= 0 ? "up" : "down"} ${Math.abs(k)}`, "right 1 and reflected", "vertical stretch only"],
          "For a cubic transformation, x - h shifts right and + k shifts vertically.",
          `${kind}-${index}`
        );
      }
      const h = 2 + (index % 3);
      const k = (index % 3) - 2;
      return makeQuestion(
        `How is the graph of y = ${formatCubeRootEquation(h, k).replace("y = ", "")} related to y = cuberoot(x)?`,
        `right ${h} and ${k >= 0 ? "up" : "down"} ${Math.abs(k)}`,
        [`left ${h} and ${k >= 0 ? "up" : "down"} ${Math.abs(k)}`, "reflected across the y-axis", "horizontal compression only"],
        "Cube root transformations follow the same horizontal and vertical shift rules as other parent functions.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.6B") {
    return buildQuestionSet((index) => {
      const shift = 1 + (index % 4);
      const right = 2 + (index % 3);
      return makeQuestion(
        `Solve cuberoot(x - ${shift}) = ${right}.`,
        String(right ** 3 + shift),
        [String(right ** 2 + shift), String(right + shift), String(right ** 3)],
        "Cube both sides to solve a cube root equation.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.6C") {
    return buildQuestionSet((index) => {
      const h = 1 + (index % 5);
      const k = (index % 3) - 1;
      return makeQuestion(
        `What is the vertex of y = ${formatAbsoluteEquation(1, h, k).replace("y = ", "")}?`,
        formatPoint(h, k),
        [formatPoint(-h, k), formatPoint(h, -k), formatPoint(0, k)],
        "For y = abs(x - h) + k, the vertex is (h, k).",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.6D") {
    return buildQuestionSet((index) => {
      const center = 2 + (index % 4);
      const distance = 3 + (index % 3);
      return makeQuestion(
        `Which equation models all real numbers x that are ${distance} units from ${center}?`,
        `abs(x - ${center}) = ${distance}`,
        [`abs(x + ${center}) = ${distance}`, `abs(x - ${center}) < ${distance}`, `abs(x - ${distance}) = ${center}`],
        "An absolute value equation models a distance from a center on the number line.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.6E") {
    return buildQuestionSet((index) => {
      const center = 1 + (index % 4);
      const distance = 2 + (index % 3);
      return makeQuestion(
        `Solve abs(x - ${center}) = ${distance}.`,
        `${center - distance} and ${center + distance}`,
        [`${center + distance}`, `${center - distance}`, `${center} and ${distance}`],
        "An absolute value equation gives two solutions the same distance from the center.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.6F") {
    return buildQuestionSet((index) => {
      const center = 3 + (index % 3);
      const distance = 2 + (index % 2);
      return makeQuestion(
        `Solve abs(x - ${center}) < ${distance}.`,
        `${center - distance} < x < ${center + distance}`,
        [`x < ${center - distance} or x > ${center + distance}`, `x > ${center - distance}`, `x < ${center + distance}`],
        "A less-than absolute value inequality gives values inside the interval around the center.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.6G") {
    return buildQuestionSet((index) => {
      const h = 2 + (index % 4);
      const k = (index % 3) - 1;
      return makeQuestion(
        `What are the asymptotes of y = ${formatReciprocalEquation(1, h, k).replace("y = ", "")}?`,
        `x = ${h} and y = ${k}`,
        [`x = ${k} and y = ${h}`, "x = 0 and y = 0", `x = ${h} only`],
        "For y = a/(x - h) + k, the vertical asymptote is x = h and the horizontal asymptote is y = k.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.6H") {
    return buildQuestionSet((index) => {
      const other = 4 + (index % 4);
      const together = 2 + (index % 3);
      return makeQuestion(
        `One worker can finish a job in x hours and another can finish the same job in ${other} hours. Together they finish in ${together} hours. Which equation models the situation?`,
        `1/x + 1/${other} = 1/${together}`,
        [`x + ${other} = ${together}`, `x/${other} = 1/${together}`, `1/x - 1/${other} = 1/${together}`],
        "Combined work-rate problems are modeled by adding the individual rates.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.6I") {
    return buildQuestionSet((index) => {
      const other = 2 + (index % 3);
      const target = 1;
      const solution = 1 / (target - 1 / other);
      return makeQuestion(
        `Solve 1/x + 1/${other} = ${target}.`,
        numberText(solution),
        [numberText(other), numberText(target), numberText(solution + 1)],
        "Clear the fractions or isolate 1/x, then solve for x.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.6J") {
    return buildQuestionSet((index) => {
      return makeQuestion(
        "Which value is not reasonable as a solution to 1/(x - 3) = 2 because it makes a denominator zero?",
        "3",
        ["2", "4", "5"],
        "A rational equation cannot have a value that makes any denominator equal to zero.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.6K") {
    return buildQuestionSet((index) => {
      const h = 2 + (index % 4);
      const k = (index % 3) - 1;
      if (index % 2 === 0) {
        return makeQuestion(
          `What is the domain of y = ${formatReciprocalEquation(1, h, k).replace("y = ", "")}?`,
          `x != ${h}`,
          [`x != ${k}`, "all real numbers", `x > ${h}`],
          "A reciprocal function is undefined where its denominator is zero.",
          `${kind}-${index}`
        );
      }
      return makeQuestion(
        `What is the range of y = ${formatReciprocalEquation(1, h, k).replace("y = ", "")}?`,
        `y != ${k}`,
        [`y != ${h}`, "all real numbers", `y > ${k}`],
        "A translated reciprocal function never takes its horizontal asymptote value.",
        `${kind}-${index}`
      );
    });
  }

  return buildQuestionSet((index) => {
    const x1 = 2 + (index % 4);
    const y1 = 6 + (index % 4);
    const constant = x1 * y1;
    return makeQuestion(
      `If y varies inversely with x and y = ${y1} when x = ${x1}, which equation represents the relationship?`,
      `y = ${constant}/x`,
      [`y = ${constant}x`, `y = x/${constant}`, `y = ${x1}/${y1}x`],
      "Inverse variation has the form y = k/x, where k is the constant of variation.",
      `${kind}-${index}`
    );
  });
}

function buildAlgebra2Number(kind) {
  if (kind === "A2.7A") {
    const iPowers = ["1", "i", "-1", "-i"];
    return buildQuestionSet((index) => {
      const mode = index % 3;
      if (mode === 0) {
        const power = 4 + (index % 4);
        const correct = pick(iPowers, power);
        return makeQuestion(`Simplify i^${power}.`, correct, iPowers.filter((choice) => choice !== correct).slice(0, 3), "Powers of i repeat every 4: i, -1, -i, 1.", `${kind}-${index}`);
      }
      if (mode === 1) {
        const a = 2 + (index % 4);
        const b = 3 + (index % 3);
        const c = 1 + (index % 3);
        const d = 2 + (index % 2);
        return makeQuestion(
          `Simplify (${a} + ${b}i) + (${c} - ${d}i).`,
          `${a + c} + ${b - d}i`,
          [`${a + c} + ${b + d}i`, `${a - c} + ${b - d}i`, `${a + c} - ${b - d}i`],
          "Add real parts together and imaginary parts together.",
          `${kind}-${index}`
        );
      }
      const a = 1 + (index % 3);
      const b = 2 + (index % 3);
      return makeQuestion(
        `Simplify (${a} + ${b}i)(${a} - ${b}i).`,
        String(a * a + b * b),
        [String(a * a - b * b), `${a * a + b * b}i`, String(a + b)],
        "A complex number times its conjugate equals a^2 + b^2.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.7B") {
    return buildQuestionSet((index) => {
      if (index % 3 === 0) {
        const linear = (index % 4) + 2;
        return makeQuestion(
          `Simplify (x^2 + ${linear}x + 1) + (2x^2 - x + 3).`,
          `3x^2 + ${linear - 1}x + 4`,
          [`3x^2 + ${linear + 1}x + 4`, `x^2 + ${linear - 1}x + 4`, `3x^2 + ${linear - 1}x + 3`],
          "Combine like terms when adding polynomials.",
          `${kind}-${index}`
        );
      }
      if (index % 3 === 1) {
        return makeQuestion(
          "Simplify (3x^2 + 4x + 5) - (x^2 + 2x + 1).",
          "2x^2 + 2x + 4",
          ["2x^2 + 6x + 6", "4x^2 + 2x + 4", "2x^2 + 2x + 6"],
          "Subtract corresponding polynomial terms carefully.",
          `${kind}-${index}`
        );
      }
      const b = 2 + (index % 3);
      const c = 1 + (index % 2);
      return makeQuestion(
        `Simplify (x + ${b})(x + ${c}).`,
        `x^2 + ${b + c}x + ${b * c}`,
        [`x^2 + ${b * c}x + ${b + c}`, `x^2 + ${b - c}x + ${b * c}`, `x^2 + ${b + c}x + ${b + c}`],
        "Multiply polynomials using the distributive property.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.7C") {
    return buildQuestionSet((index) => {
      const a = 1 + (index % 4);
      const b = 2 + (index % 3);
      return makeQuestion(
        `Divide x^2 + ${a + b}x + ${a * b} by x + ${a}.`,
        `x + ${b}`,
        [`x + ${a}`, `x - ${b}`, `${b}`],
        "Polynomial division can be checked by multiplying the quotient by the divisor.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.7D") {
    return buildQuestionSet((index) => {
      const zero = 1 + (index % 5);
      return makeQuestion(
        `If ${zero} is a zero of a polynomial, which binomial is a factor?`,
        `x - ${zero}`,
        [`x + ${zero}`, `${zero}x - 1`, `x^2 - ${zero}`],
        "If r is a zero, then x - r is a factor.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.7E") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        const a = 2 + (index % 4);
        return makeQuestion(
          `Factor x^3 - ${a ** 3}.`,
          `(x - ${a})(x^2 + ${a}x + ${a ** 2})`,
          [`(x + ${a})(x^2 - ${a}x + ${a ** 2})`, `(x - ${a})(x^2 - ${a}x + ${a ** 2})`, `(x - ${a})(x + ${a})`],
          "The difference of cubes factors as a^3 - b^3 = (a - b)(a^2 + ab + b^2).",
          `${kind}-${index}`
        );
      }
      return makeQuestion(
        "Factor x^3 + 3x^2 + 2x + 6 by grouping.",
        "(x + 3)(x^2 + 2)",
        ["(x + 2)(x^2 + 3)", "(x + 3)(x^2 + 6)", "(x - 3)(x^2 + 2)"],
        "Group the terms: x^2(x + 3) + 2(x + 3) = (x + 3)(x^2 + 2).",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.7F") {
    return buildQuestionSet((index) => {
      if (index % 3 === 0) {
        return makeQuestion(
          "Simplify 1/x + 1/(2x).",
          "3/(2x)",
          ["2/(3x)", "1/(3x)", "3/x"],
          "Use a common denominator to add rational expressions.",
          `${kind}-${index}`
        );
      }
      if (index % 3 === 1) {
        return makeQuestion(
          "Simplify (x^2 - 9)/(x + 3).",
          "x - 3",
          ["x + 3", "x^2 - 3", "1"],
          "Factor the numerator and cancel the common factor when allowed.",
          `${kind}-${index}`
        );
      }
      return makeQuestion(
        "Simplify (x/3) / (2/x).",
        "x^2/6",
        ["2x/3", "6/x^2", "x/6"],
        "To divide by a fraction, multiply by its reciprocal.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.7G") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        return makeQuestion(
          "Simplify sqrt(50x^2), assuming x >= 0.",
          "5x sqrt(2)",
          ["10x sqrt(5)", "5 sqrt(2x)", "25x sqrt(2)"],
          "Factor out perfect squares from under the radical.",
          `${kind}-${index}`
        );
      }
      return makeQuestion(
        "Simplify cuberoot(54x^6).",
        "3x^2 cuberoot(2)",
        ["9x^2 cuberoot(2)", "3x cuberoot(2)", "6x^2 cuberoot(3)"],
        "Factor out perfect cubes from under the cube root.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "A2.7H") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        return makeQuestion(
          "Solve x^(3/2) = 27.",
          "9",
          ["3", "6", "81"],
          "Raise both sides to the reciprocal power 2/3.",
          `${kind}-${index}`
        );
      }
      const answer = 2 + (index % 4);
      return makeQuestion(
        `Solve x^(1/3) = ${answer}.`,
        String(answer ** 3),
        [String(answer ** 2), String(answer), String(answer ** 3 + 1)],
        "Cube both sides to solve a cube-root exponent equation.",
        `${kind}-${index}`
      );
    });
  }

  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const shift = 2 + (index % 4);
      return makeQuestion(
        `What is the domain of y = sqrt(x - ${shift})?`,
        `x >= ${shift}`,
        [`x > ${shift}`, "all real numbers", `x <= ${shift}`],
        "A square root function requires the radicand to be nonnegative.",
        `${kind}-${index}`
      );
    }
    const k = -1 - (index % 3);
    return makeQuestion(
      `What is the range of y = (x - 2)^2 ${signedConstant(k)}?`,
      `y >= ${k}`,
      [`y <= ${k}`, "all real numbers", `y > ${k}`],
      "An upward-opening parabola has a minimum y-value at its vertex.",
      `${kind}-${index}`
    );
  });
}

function buildAlgebra2Data(kind) {
  if (kind === "A2.8A") {
    const cases = [
      {
        prompt: "A table has constant first differences. Which model is most appropriate?",
        correct: "linear",
        wrongs: ["quadratic", "exponential", "logarithmic"]
      },
      {
        prompt: "A table has constant second differences. Which model is most appropriate?",
        correct: "quadratic",
        wrongs: ["linear", "exponential", "inverse variation"]
      },
      {
        prompt: "A table multiplies by the same factor each step. Which model is most appropriate?",
        correct: "exponential",
        wrongs: ["linear", "quadratic", "cubic"]
      }
    ];
    return buildQuestionSet((index) => {
      const selected = pick(cases, index);
      return makeQuestion(selected.prompt, selected.correct, selected.wrongs, "Different data patterns suggest different families of functions.", `${kind}-${index}`);
    });
  }

  if (kind === "A2.8B") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        return makeQuestion(
          "Which function best fits the data points (0, 3), (1, 5), (2, 7), (3, 9)?",
          "y = 2x + 3",
          ["y = x^2 + 3", "y = 3(2)^x", "y = x + 3"],
          "The outputs increase by a constant amount, so a linear model is appropriate.",
          `${kind}-${index}`
        );
      }
      return makeQuestion(
        "Which function best fits the data points (0, 2), (1, 4), (2, 8), (3, 16)?",
        "y = 2(2)^x",
        ["y = 2x + 2", "y = x^2 + 2", "y = 2x^2"],
        "The outputs multiply by the same factor, so an exponential model is appropriate.",
        `${kind}-${index}`
      );
    });
  }

  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const x = 4 + (index % 4);
      return makeQuestion(
        `A linear model is y = 3x + 2. What does the model predict when x = ${x}?`,
        String(3 * x + 2),
        [String(2 * x + 3), String(3 * x), String(x + 2)],
        "Substitute the given x-value into the model to make a prediction.",
        `${kind}-${index}`
      );
    }
    const x = 3 + (index % 3);
    return makeQuestion(
      `An exponential model is y = 5(2)^x. What does the model predict when x = ${x}?`,
      String(5 * 2 ** x),
      [String(5 * x * 2), String(2 ** x), String(5 + 2 ** x)],
      "Use the model directly to make the prediction, then judge whether it is reasonable for the context.",
      `${kind}-${index}`
    );
  });
}

function buildPrecalcFunctions(kind) {
  const specialTrig = [
    { angle: 0, sin: "0", cos: "1", tan: "0" },
    { angle: 30, sin: "1/2", cos: "sqrt(3)/2", tan: "sqrt(3)/3" },
    { angle: 45, sin: "sqrt(2)/2", cos: "sqrt(2)/2", tan: "1" },
    { angle: 60, sin: "sqrt(3)/2", cos: "1/2", tan: "sqrt(3)" },
    { angle: 90, sin: "1", cos: "0", tan: "undefined" }
  ];
  switch (kind) {
    case "PC.2A":
      return buildQuestionSet((index) => {
        const base = 2 + (index % 4);
        const start = 5 + (index % 3);
        return makeQuestion(
          `A taxi charges $${start} plus $${base} per mile. If x is miles and C(x) = ${base}x + ${start}, then T(C) adds 8. Which composition models the total after an $8 toll is added?`,
          `T(C(x)) = ${base}x + ${start + 8}`,
          [`C(T(x)) = ${base}(x + 8) + ${start}`, `T(C(x)) = ${base + 8}x + ${start}`, `T(C(x)) = ${base}x + 8`],
          "Composition models applying one rule to the output of another rule.",
          `${kind}-${index}`
        );
      });
    case "PC.2B":
      return buildQuestionSet((index) => {
        return makeQuestion(
          "Why is function composition not always commutative?",
          "Because f(g(x)) and g(f(x)) can produce different outputs",
          ["Because composition only works for linear functions", "Because every composition has the same graph", "Because composition is the same as addition"],
          "Order matters in composition, so reversing the order can change the result.",
          `${kind}-${index}`
        );
      });
    case "PC.2C":
      return buildQuestionSet((index) => {
        const b = 2 + (index % 3);
        const c = 1 + (index % 4);
        return makeQuestion(
          `Which pair of functions can be composed to create h(x) = (${b}x + ${c})^2?`,
          `f(x) = ${b}x + ${c} and g(x) = x^2`,
          [`f(x) = x^2 and g(x) = ${b}x + ${c}`, `f(x) = ${b}x and g(x) = x + ${c}`, `f(x) = x + ${c} and g(x) = ${b}x`],
          "A composite function can be written by applying one function to the output of another.",
          `${kind}-${index}`
        );
      });
    case "PC.2D":
      return buildQuestionSet((index) => {
        const parity = index % 2 === 0 ? "even" : "odd";
        return makeQuestion(
          `Which symmetry describes an ${parity} function?`,
          parity === "even" ? "symmetry across the y-axis" : "symmetry about the origin",
          parity === "even"
            ? ["symmetry about the origin", "symmetry across the x-axis", "no symmetry is possible"]
            : ["symmetry across the y-axis", "symmetry across the x-axis", "no symmetry is possible"],
          "Even functions have y-axis symmetry; odd functions have origin symmetry.",
          `${kind}-${index}`
        );
      });
    case "PC.2E":
      return buildQuestionSet((index) => {
        const h = 1 + (index % 4);
        return makeQuestion(
          `If f(x) = (x - ${h})^2 with domain x >= ${h}, what is f^-1(x)?`,
          `y = sqrt(x) + ${h}`,
          [`y = -sqrt(x) + ${h}`, `y = x^2 + ${h}`, `y = sqrt(x - ${h})`],
          "Restricting the quadratic to one branch makes it one-to-one, so its inverse is a square root function.",
          `${kind}-${index}`
        );
      });
    case "PC.2F":
      return buildQuestionSet((index) => {
        const prompts = [
          ["Which parent function has a vertical asymptote at x = 0 and passes through (1, 0)?", "logarithmic", ["quadratic", "absolute value", "polynomial"]],
          ["Which parent function is periodic?", "trigonometric", ["rational", "linear", "logarithmic"]],
          ["Which parent function has two asymptotes, one vertical and one horizontal?", "rational", ["power", "piecewise only", "quadratic"]],
          ["Which parent function can be made of separate rules on different intervals?", "piecewise defined", ["inverse trigonometric", "quadratic only", "exponential only"]]
        ];
        const selected = pick(prompts, index);
        return makeQuestion(selected[0], selected[1], selected[2], "Different parent function families have different graph shapes and attributes.", `${kind}-${index}`);
      });
    case "PC.2G":
      return buildQuestionSet((index) => {
        const h = 1 + (index % 4);
        const k = (index % 3) - 1;
        return makeQuestion(
          `How is the graph of y = 2^(x - ${h}) ${signedConstant(k)} related to y = 2^x?`,
          `right ${h} and ${k >= 0 ? "up" : "down"} ${Math.abs(k)}`,
          [`left ${h} and ${k >= 0 ? "up" : "down"} ${Math.abs(k)}`, `right ${h} and reflected`, `vertical stretch only`],
          "Replacing x with x - h shifts right, and adding k shifts vertically.",
          `${kind}-${index}`
        );
      });
    case "PC.2H":
      return buildQuestionSet((index) => {
        return makeQuestion(
          index % 2 === 0 ? "What is the domain of y = arcsin(x)?" : "What is the domain of y = arccos(x)?",
          "[-1, 1]",
          ["all real numbers", "(0, pi)", "[0, pi]"],
          "The inverse sine and inverse cosine functions accept only inputs from -1 to 1.",
          `${kind}-${index}`
        );
      });
    case "PC.2I":
      return buildQuestionSet((index) => {
        const prompts = [
          ["Which feature is a zero of a function?", "an x-value where the output is 0", ["a y-value where x = 0", "an asymptote", "an interval of decrease"]],
          ["Which feature tells where a function is increasing?", "an interval over which outputs rise as x rises", ["the y-intercept only", "a single point", "the asymptote location only"]],
          ["Which feature describes the largest local output near a point?", "relative maximum", ["relative minimum", "zero", "discontinuity"]]
        ];
        const selected = pick(prompts, index);
        return makeQuestion(selected[0], selected[1], selected[2], "Key features include domain, range, zeros, extrema, asymptotes, and intervals of increase or decrease.", `${kind}-${index}`);
      });
    case "PC.2J":
      return buildQuestionSet((index) => {
        const n = 2 + (index % 3);
        return makeQuestion(
          `As x approaches infinity, what is the end behavior of y = x^${n}?`,
          "y approaches infinity",
          ["y approaches negative infinity", "y approaches 0", "y is undefined"],
          "For even and odd positive powers, x^n grows without bound as x approaches positive infinity.",
          `${kind}-${index}`
        );
      });
    case "PC.2K":
      return buildQuestionSet((index) => {
        const h = 1 + (index % 4);
        const k = (index % 3) - 1;
        return makeQuestion(
          `What are the asymptotes of y = 1/(x - ${h}) ${signedConstant(k)}?`,
          `x = ${h} and y = ${k}`,
          [`x = ${k} and y = ${h}`, "x = 0 and y = 0", `x = ${h}`],
          "A translated reciprocal function has a vertical asymptote where the denominator is zero and a horizontal asymptote at its vertical shift.",
          `${kind}-${index}`
        );
      });
    case "PC.2L":
      return buildQuestionSet((index) => {
        const prompts = [
          ["A graph has a hole at x = 2. What type of discontinuity is it?", "removable discontinuity", ["jump discontinuity", "infinite discontinuity", "no discontinuity"]],
          ["A graph has a vertical asymptote at x = -1. What type of discontinuity is it?", "infinite discontinuity", ["removable discontinuity", "jump discontinuity", "endpoint discontinuity"]],
          ["The left and right limits exist but are different. What type of discontinuity is it?", "jump discontinuity", ["removable discontinuity", "infinite discontinuity", "continuous behavior"]]
        ];
        const selected = pick(prompts, index);
        return makeQuestion(selected[0], selected[1], selected[2], "Precalculus distinguishes removable, jump, and infinite discontinuities.", `${kind}-${index}`);
      });
    case "PC.2M":
      return buildQuestionSet((index) => {
        return makeQuestion(
          "If f(x) = 1/(x - 2), what happens near x = 2?",
          "As x approaches 2 from the left, f(x) goes to negative infinity; from the right, it goes to positive infinity",
          [
            "Both sides go to positive infinity",
            "Both sides go to 0",
            "The function is continuous at x = 2"
          ],
          "Left-sided and right-sided behavior describe how the graph behaves around a discontinuity.",
          `${kind}-${index}`
        );
      });
    case "PC.2N":
      return buildQuestionSet((index) => {
        const prompts = [
          ["A quantity doubles every hour. Which family models the situation best?", "exponential", ["polynomial", "rational", "sinusoidal"]],
          ["Monthly daylight hours rise and fall in a repeating pattern. Which family models the situation best?", "sinusoidal", ["logarithmic", "quadratic", "inverse variation"]],
          ["The intensity of sound on a decibel scale is based on logarithms. Which family models the situation best?", "logarithmic", ["quadratic", "rational", "absolute value"]]
        ];
        const selected = pick(prompts, index);
        return makeQuestion(selected[0], selected[1], selected[2], "Different real-world contexts call for different function families.", `${kind}-${index}`);
      });
    case "PC.2O":
      return buildQuestionSet((index) => {
        const amplitude = 2 + (index % 3);
        const midline = 4 + (index % 3);
        return makeQuestion(
          `A ferris wheel seat oscillates between heights ${midline - amplitude} and ${midline + amplitude}. What is the amplitude of a sinusoidal model for its height?`,
          String(amplitude),
          [String(midline), String(midline + amplitude), String(midline - amplitude)],
          "The amplitude is half the distance between the maximum and minimum values.",
          `${kind}-${index}`
        );
      });
    default:
      return buildQuestionSet((index) => {
        const selected = pick(specialTrig, index);
        const mode = index % 3;
        if (mode === 0) {
          return makeQuestion(`What is sin(${selected.angle} degrees)?`, selected.sin, specialTrig.map((entry) => entry.sin).filter((value) => value !== selected.sin).slice(0, 3), "Use the unit circle special angles to evaluate sine.", `${kind}-${index}`);
        }
        if (mode === 1) {
          return makeQuestion(`What is cos(${selected.angle} degrees)?`, selected.cos, specialTrig.map((entry) => entry.cos).filter((value) => value !== selected.cos).slice(0, 3), "Use the unit circle special angles to evaluate cosine.", `${kind}-${index}`);
        }
        return makeQuestion(`What is tan(${selected.angle} degrees)?`, selected.tan, specialTrig.map((entry) => entry.tan).filter((value) => value !== selected.tan).slice(0, 3), "Use the unit circle special angles to evaluate tangent.", `${kind}-${index}`);
      });
  }
}

function buildPrecalcRelations(kind) {
  switch (kind) {
    case "PC.3A":
      return buildQuestionSet((index) => {
        const t = 1 + (index % 4);
        return makeQuestion(
          `For x = 2t + 1 and y = t - 3, what point is graphed when t = ${t}?`,
          formatPoint(2 * t + 1, t - 3),
          [formatPoint(2 * t - 1, t - 3), formatPoint(t + 1, 2 * t - 3), formatPoint(2 * t + 1, t + 3)],
          "A parametric graph is found by evaluating both x and y at the same parameter value.",
          `${kind}-${index}`
        );
      });
    case "PC.3B":
      return buildQuestionSet((index) => {
        return makeQuestion(
          "If x = 3t and y = t + 2, which rectangular relation is equivalent?",
          "y = x/3 + 2",
          ["y = 3x + 2", "x = y/3 + 2", "y = x + 2"],
          "Solve one parametric equation for t and substitute into the other to convert to a rectangular relation.",
          `${kind}-${index}`
        );
      });
    case "PC.3C":
      return buildQuestionSet((index) => {
        const t = 2 + (index % 4);
        return makeQuestion(
          `A particle is modeled by x = t and y = t^2. Where is the particle when t = ${t}?`,
          formatPoint(t, t * t),
          [formatPoint(t * t, t), formatPoint(t, 2 * t), formatPoint(t + 1, t * t)],
          "Parametric equations model motion by giving x and y coordinates in terms of a parameter, often time.",
          `${kind}-${index}`
        );
      });
    case "PC.3D":
      return buildQuestionSet((index) => {
        if (index % 2 === 0) {
          const r = 3 + (index % 4);
          const theta = pick([0, 90, 180, 270], index);
          const pointMap = { 0: formatPoint(r, 0), 90: formatPoint(0, r), 180: formatPoint(-r, 0), 270: formatPoint(0, -r) };
          return makeQuestion(
            `What rectangular point is represented by the polar coordinate (${r}, ${theta} degrees)?`,
            pointMap[theta],
            Object.values(pointMap).filter((value) => value !== pointMap[theta]).slice(0, 3),
            "Convert polar coordinates to rectangular coordinates using x = r cos(theta) and y = r sin(theta).",
            `${kind}-${index}`
          );
        }
        return makeQuestion(
          "Which polar coordinate represents the rectangular point (0, 4)?",
          "(4, 90 degrees)",
          ["(4, 0 degrees)", "(4, 180 degrees)", "(0, 4 degrees)"],
          "A point on the positive y-axis has angle 90 degrees and radius equal to its distance from the origin.",
          `${kind}-${index}`
        );
      });
    case "PC.3E":
      return buildQuestionSet((index) => {
        return makeQuestion(
          index % 2 === 0 ? "What graph is represented by the polar equation r = 4?" : "What graph is represented by the polar equation theta = 60 degrees?",
          index % 2 === 0 ? "a circle centered at the origin with radius 4" : "a line through the origin making a 60-degree angle with the positive x-axis",
          index % 2 === 0
            ? ["a vertical line x = 4", "a line through the origin", "a parabola"]
            : ["a circle of radius 60", "the x-axis", "a horizontal line y = 60"],
          "Common polar graphs include circles r = constant and lines theta = constant.",
          `${kind}-${index}`
        );
      });
    case "PC.3F":
      return buildQuestionSet((index) => {
        const prompts = [
          ["A plane cuts a cone parallel to its base. What conic section is formed?", "circle", ["parabola", "ellipse", "hyperbola"]],
          ["A plane cuts a cone at an angle parallel to one side of the cone. What conic section is formed?", "parabola", ["circle", "ellipse", "point"]],
          ["A plane cuts through both nappes of a double cone. What conic section is formed?", "hyperbola", ["circle", "ellipse", "line segment"]],
          ["A plane cuts one nappe of a cone at a slant that is not parallel to the base. What conic section is formed?", "ellipse", ["hyperbola", "circle only", "ray"]]
        ];
        const selected = pick(prompts, index);
        return makeQuestion(selected[0], selected[1], selected[2], "The shape of the plane’s intersection with the cone determines the conic section.", `${kind}-${index}`);
      });
    case "PC.3G":
      return buildQuestionSet((index) => {
        const prompts = [
          ["Which conic is the set of points equidistant from a fixed point and a fixed line?", "parabola", ["ellipse", "hyperbola", "circle"]],
          ["Which conic is the set of points whose distances to two fixed points have a constant sum?", "ellipse", ["hyperbola", "parabola", "line"]],
          ["Which conic is the set of points whose distances to two fixed points have a constant difference?", "hyperbola", ["ellipse", "circle", "parabola"]]
        ];
        const selected = pick(prompts, index);
        return makeQuestion(selected[0], selected[1], selected[2], "Each conic has a locus definition that matches its algebraic equation.", `${kind}-${index}`);
      });
    default:
      return buildQuestionSet((index) => {
        if (index % 2 === 0) {
          const a = 3 + (index % 3);
          const b = 2 + (index % 2);
          return makeQuestion(
            `Which equation represents an ellipse centered at the origin with semi-axis lengths ${a} and ${b}?`,
            `x^2/${a * a} + y^2/${b * b} = 1`,
            [`x^2/${a * a} - y^2/${b * b} = 1`, `x^2 + y^2 = ${a * a}`, `y = x^2/${a}`],
            "An ellipse centered at the origin has the form x^2/a^2 + y^2/b^2 = 1.",
            `${kind}-${index}`
          );
        }
        const a = 4 + (index % 3);
        const b = 2 + (index % 2);
        return makeQuestion(
          `Which equation represents a hyperbola centered at the origin with transverse axis along the x-axis?`,
          `x^2/${a * a} - y^2/${b * b} = 1`,
          [`x^2/${a * a} + y^2/${b * b} = 1`, `y^2/${a * a} - x^2/${b * b} = 1`, `x^2 + y^2 = ${a * a}`],
          "A horizontal hyperbola centered at the origin has the form x^2/a^2 - y^2/b^2 = 1.",
          `${kind}-${index}`
        );
      });
  }
}

function buildPrecalcNumberMeasure(kind) {
  const unitCircle = [
    { degrees: 0, radians: "0", sin: "0", cos: "1", tan: "0" },
    { degrees: 30, radians: "pi/6", sin: "1/2", cos: "sqrt(3)/2", tan: "sqrt(3)/3" },
    { degrees: 45, radians: "pi/4", sin: "sqrt(2)/2", cos: "sqrt(2)/2", tan: "1" },
    { degrees: 60, radians: "pi/3", sin: "sqrt(3)/2", cos: "1/2", tan: "sqrt(3)" },
    { degrees: 90, radians: "pi/2", sin: "1", cos: "0", tan: "undefined" },
    { degrees: 120, radians: "2pi/3", sin: "sqrt(3)/2", cos: "-1/2", tan: "-sqrt(3)" },
    { degrees: 135, radians: "3pi/4", sin: "sqrt(2)/2", cos: "-sqrt(2)/2", tan: "-1" },
    { degrees: 150, radians: "5pi/6", sin: "1/2", cos: "-sqrt(3)/2", tan: "-sqrt(3)/3" },
    { degrees: 180, radians: "pi", sin: "0", cos: "-1", tan: "0" }
  ];
  switch (kind) {
    case "PC.4A":
      return buildQuestionSet((index) => {
        const selected = pick(unitCircle, index);
        const mode = index % 3;
        if (mode === 0) {
          return makeQuestion(
            `Using the unit circle, what is sin(${selected.radians})?`,
            selected.sin,
            uniqueStrings(unitCircle.map((entry) => entry.sin).filter((value) => value !== selected.sin)).slice(0, 3),
            "The unit circle connects angle measure and periodic trigonometric function values.",
            `${kind}-${index}`
          );
        }
        if (mode === 1) {
          return makeQuestion(
            `Using the unit circle, what is cos(${selected.degrees} degrees)?`,
            selected.cos,
            uniqueStrings(unitCircle.map((entry) => entry.cos).filter((value) => value !== selected.cos)).slice(0, 3),
            "Coordinates on the unit circle determine cosine and sine values.",
            `${kind}-${index}`
          );
        }
        return makeQuestion(
          "Which statement shows that sine is periodic?",
          "sin(theta + 2pi) = sin(theta)",
          ["sin(theta + 2pi) = -sin(theta)", "sin(theta + pi) = sin(theta) for every theta", "sin(theta) never repeats values"],
          "A periodic function repeats after a fixed interval. For sine and cosine, that interval is 2pi.",
          `${kind}-${index}`
        );
      });
    case "PC.4B":
      return buildQuestionSet((index) => {
        if (index % 2 === 0) {
          const selected = pick(unitCircle.slice(1, 5), index);
          return makeQuestion(
            `${selected.degrees} degrees is equal to which radian measure?`,
            selected.radians,
            uniqueStrings(unitCircle.map((entry) => entry.radians).filter((value) => value !== selected.radians)).slice(0, 3),
            "Convert degrees to radians by multiplying by pi/180.",
            `${kind}-${index}`
          );
        }
        const selected = pick(unitCircle.slice(1, 5), index);
        return makeQuestion(
          `${selected.radians} radians is equal to how many degrees?`,
          String(selected.degrees),
          uniqueStrings(unitCircle.map((entry) => String(entry.degrees)).filter((value) => value !== String(selected.degrees))).slice(0, 3),
          "Convert radians to degrees by multiplying by 180/pi.",
          `${kind}-${index}`
        );
      });
    case "PC.4C":
      return buildQuestionSet((index) => {
        const angle = pick([120, 135, 150, 210, 225, 240, 300, 315, 330], index);
        const referenceMap = { 120: 60, 135: 45, 150: 30, 210: 30, 225: 45, 240: 60, 300: 60, 315: 45, 330: 30 };
        return makeQuestion(
          `What is the reference angle for ${angle} degrees?`,
          `${referenceMap[angle]} degrees`,
          uniqueStrings(["30 degrees", "45 degrees", "60 degrees", "90 degrees"].filter((value) => value !== `${referenceMap[angle]} degrees`)).slice(0, 3),
          "A reference angle is the acute angle formed with the x-axis in standard position.",
          `${kind}-${index}`
        );
      });
    case "PC.4D":
      return buildQuestionSet((index) => {
        if (index % 2 === 0) {
          const radius = 2 + (index % 4);
          const omega = 3 + (index % 5);
          return makeQuestion(
            `A wheel with radius ${radius} meters turns at ${omega} radians per second. What is its linear speed?`,
            `${radius * omega} meters per second`,
            [`${radius + omega} meters per second`, `${omega} meters per second`, `${radius * omega * 2} meters per second`],
            "Linear speed is found with v = r times omega.",
            `${kind}-${index}`
          );
        }
        const revolutions = 1 + (index % 4);
        return makeQuestion(
          `How many degrees are in ${revolutions} full rotation${revolutions === 1 ? "" : "s"}?`,
          String(360 * revolutions),
          [String(180 * revolutions), String(90 * revolutions), String(720 / revolutions)],
          "Each full rotation is 360 degrees, or 2pi radians.",
          `${kind}-${index}`
        );
      });
    case "PC.4E":
      return buildQuestionSet((index) => {
        const triples = [
          { opposite: 3, adjacent: 4, hypotenuse: 5 },
          { opposite: 5, adjacent: 12, hypotenuse: 13 },
          { opposite: 8, adjacent: 15, hypotenuse: 17 },
          { opposite: 7, adjacent: 24, hypotenuse: 25 }
        ];
        const selected = pick(triples, index);
        const mode = index % 3;
        if (mode === 0) {
          return makeQuestion(
            `In a right triangle, the side opposite angle A is ${selected.opposite} and the hypotenuse is ${selected.hypotenuse}. What is sin(A)?`,
            fractionOrWhole(selected.opposite, selected.hypotenuse),
            [fractionOrWhole(selected.adjacent, selected.hypotenuse), fractionOrWhole(selected.opposite, selected.adjacent), fractionOrWhole(selected.hypotenuse, selected.opposite)],
            "Sine is opposite divided by hypotenuse.",
            `${kind}-${index}`
          );
        }
        if (mode === 1) {
          return makeQuestion(
            `In a right triangle, the side adjacent to angle A is ${selected.adjacent} and the hypotenuse is ${selected.hypotenuse}. What is cos(A)?`,
            fractionOrWhole(selected.adjacent, selected.hypotenuse),
            [fractionOrWhole(selected.opposite, selected.hypotenuse), fractionOrWhole(selected.opposite, selected.adjacent), fractionOrWhole(selected.hypotenuse, selected.adjacent)],
            "Cosine is adjacent divided by hypotenuse.",
            `${kind}-${index}`
          );
        }
        return makeQuestion(
          `In a right triangle, the opposite side is ${selected.opposite} and the adjacent side is ${selected.adjacent}. What is tan(A)?`,
          fractionOrWhole(selected.opposite, selected.adjacent),
          [fractionOrWhole(selected.adjacent, selected.opposite), fractionOrWhole(selected.opposite, selected.hypotenuse), fractionOrWhole(selected.adjacent, selected.hypotenuse)],
          "Tangent is opposite divided by adjacent.",
          `${kind}-${index}`
        );
      });
    case "PC.4F":
      return buildQuestionSet((index) => {
        const distance = 10 + index;
        const angle = pick([20, 30, 40, 45, 60], index);
        return makeQuestion(
          `A plane flies ${distance} miles on a bearing of N ${angle} degrees E. Which expression gives the eastward component of its displacement?`,
          `${distance}sin(${angle} degrees)`,
          [`${distance}cos(${angle} degrees)`, `${distance}tan(${angle} degrees)`, `${distance}/${angle}`],
          "With a bearing measured from north toward east, the eastward component uses sine and the northward component uses cosine.",
          `${kind}-${index}`
        );
      });
    case "PC.4G":
      return buildQuestionSet((index) => {
        const a = 6 + (index % 5);
        const b = 8 + (index % 5);
        const angleA = 30 + 5 * (index % 4);
        return makeQuestion(
          `Which proportion correctly applies the Law of Sines if side a = ${a} is opposite angle A = ${angleA} degrees and side b = ${b} is opposite angle B?`,
          `sin(${angleA})/${a} = sin(B)/${b}`,
          [`${a}/sin(${angleA}) = sin(B)/${b}`, `sin(${angleA})/${b} = sin(B)/${a}`, `cos(${angleA})/${a} = cos(B)/${b}`],
          "The Law of Sines relates each side length to the sine of its opposite angle.",
          `${kind}-${index}`
        );
      });
    case "PC.4H":
      return buildQuestionSet((index) => {
        const a = 5 + (index % 4);
        const b = 7 + (index % 5);
        const angle = 40 + 10 * (index % 4);
        return makeQuestion(
          `Which equation uses the Law of Cosines to find side c when a = ${a}, b = ${b}, and included angle C = ${angle} degrees?`,
          `c^2 = ${a * a} + ${b * b} - ${2 * a * b}cos(${angle})`,
          [`c^2 = ${a * a} + ${b * b} + ${2 * a * b}cos(${angle})`, `c = ${a} + ${b} - cos(${angle})`, `c^2 = ${a * a} - ${b * b} - ${2 * a * b}cos(${angle})`],
          "The Law of Cosines generalizes the Pythagorean Theorem for non-right triangles.",
          `${kind}-${index}`
        );
      });
    case "PC.4I":
      return buildQuestionSet((index) => {
        const x = 3 + (index % 5);
        const y = 4 + (index % 4);
        const magnitude = numberText(Math.sqrt(x * x + y * y));
        return makeQuestion(
          `What is the magnitude of the vector <${x}, ${y}>?`,
          magnitude,
          [String(x + y), String(x * y), String(Math.abs(x - y))],
          "Vector magnitude is found with the distance formula sqrt(x^2 + y^2).",
          `${kind}-${index}`
        );
      });
    case "PC.4J":
      return buildQuestionSet((index) => {
        if (index % 2 === 0) {
          const a = 1 + (index % 4);
          const b = 2 + (index % 4);
          const c = 3 + (index % 3);
          const d = 4 + (index % 3);
          return makeQuestion(
            `What is <${a}, ${b}> + <${c}, ${d}>?`,
            `<${a + c}, ${b + d}>`,
            [`<${a * c}, ${b * d}>`, `<${c - a}, ${d - b}>`, `<${a + d}, ${b + c}>`],
            "Add vectors component-wise.",
            `${kind}-${index}`
          );
        }
        const scalar = 2 + (index % 4);
        const x = 1 + (index % 3);
        const y = -1 - (index % 3);
        return makeQuestion(
          `What is ${scalar}<${x}, ${y}>?`,
          `<${scalar * x}, ${scalar * y}>`,
          [`<${scalar + x}, ${scalar + y}>`, `<${x}, ${scalar * y}>`, `<${scalar * y}, ${scalar * x}>`],
          "Scalar multiplication multiplies each component by the scalar.",
          `${kind}-${index}`
        );
      });
    default:
      return buildQuestionSet((index) => {
        const vx = 2 + (index % 4);
        const vy = 1 + (index % 3);
        const wx = 3 + (index % 4);
        const wy = 2 + (index % 3);
        return makeQuestion(
          `A drone moves by vector <${vx}, ${vy}> and then by vector <${wx}, ${wy}>. What is the resulting displacement vector?`,
          `<${vx + wx}, ${vy + wy}>`,
          [`<${vx * wx}, ${vy * wy}>`, `<${wx - vx}, ${wy - vy}>`, `<${vx + wy}, ${vy + wx}>`],
          "Real-world vector applications use vector addition to combine displacements.",
          `${kind}-${index}`
        );
      });
  }
}

function buildPrecalcAlgebraic(kind) {
  switch (kind) {
    case "PC.5A":
      return buildQuestionSet((index) => {
        if (index % 2 === 0) {
          const n = 4 + (index % 3);
          const sum = (n * (n + 1)) / 2;
          return makeQuestion(
            `What is the value of sigma from k = 1 to ${n} of k?`,
            String(sum),
            [String(sum + n), String(n * n), String(sum - 1)],
            "Evaluate a finite sum by adding the listed terms or by using a known formula.",
            `${kind}-${index}`
          );
        }
        const terms = 4 + (index % 3);
        const sum = 2 * (2 ** terms - 1);
        return makeQuestion(
          `What is the value of sigma from n = 0 to ${terms - 1} of 2(2^n)?`,
          String(sum),
          [String(sum - 2), String(2 ** terms), String(sum + 2)],
          "A finite geometric series can be summed by listing terms or by using the geometric-series formula.",
          `${kind}-${index}`
        );
      });
    case "PC.5B":
      return buildQuestionSet((index) => {
        if (index % 2 === 0) {
          const start = 3 + (index % 4);
          const diff = 2 + (index % 3);
          return makeQuestion(
            `Which recursive rule defines the arithmetic sequence that starts with ${start} and increases by ${diff}?`,
            `a(1) = ${start}, a(n) = a(n - 1) + ${diff}`,
            [`a(1) = ${start}, a(n) = a(n - 1) x ${diff}`, `a(1) = ${start}, a(n) = ${diff}n`, `a(1) = ${start}, a(n) = a(n - 1) - ${diff}`],
            "Arithmetic sequences add a constant difference from one term to the next.",
            `${kind}-${index}`
          );
        }
        const start = 2 + (index % 3);
        const ratio = 2 + (index % 2);
        return makeQuestion(
          `Which recursive rule defines the geometric sequence that starts with ${start} and has common ratio ${ratio}?`,
          `a(1) = ${start}, a(n) = ${ratio}a(n - 1)`,
          [`a(1) = ${start}, a(n) = a(n - 1) + ${ratio}`, `a(1) = ${start}, a(n) = ${ratio} + a(n - 1)`, `a(1) = ${start}, a(n) = a(n - 1) - ${ratio}`],
          "Geometric sequences multiply by a constant ratio from one term to the next.",
          `${kind}-${index}`
        );
      });
    case "PC.5C":
      return buildQuestionSet((index) => {
        const first = 4 + (index % 4);
        const diff = 2 + (index % 3);
        const n = 5 + (index % 4);
        const nth = first + (n - 1) * diff;
        const sum = (n / 2) * (2 * first + (n - 1) * diff);
        return makeQuestion(
          index % 2 === 0
            ? `For the arithmetic sequence with first term ${first} and common difference ${diff}, what is term ${n}?`
            : `What is the sum of the first ${n} terms of the arithmetic sequence with first term ${first} and common difference ${diff}?`,
          index % 2 === 0 ? String(nth) : String(sum),
          index % 2 === 0 ? [String(nth - diff), String(first + n * diff), String(nth + diff)] : [String(sum - nth), String(first * n), String(sum + diff)],
          "Use arithmetic-sequence and arithmetic-series formulas to find terms and partial sums.",
          `${kind}-${index}`
        );
      });
    case "PC.5D":
      return buildQuestionSet((index) => {
        if (index % 2 === 0) {
          const start = 5 + (index % 4);
          const diff = 3;
          return makeQuestion(
            `Which sigma notation represents the arithmetic series ${start} + ${start + diff} + ${start + 2 * diff} + ${start + 3 * diff}?`,
            `sigma from n = 0 to 3 of (${start} + ${diff}n)`,
            [`sigma from n = 1 to 4 of (${start} + ${diff}n)`, `sigma from n = 0 to 3 of (${diff} + ${start}n)`, `sigma from n = 0 to 4 of (${start} + ${diff}n)`],
            "Sigma notation for an arithmetic series uses a linear expression for the term rule.",
            `${kind}-${index}`
          );
        }
        return makeQuestion(
          "Which sigma notation represents the geometric series 3 + 6 + 12 + 24?",
          "sigma from n = 0 to 3 of 3(2^n)",
          ["sigma from n = 1 to 4 of 3(2^n)", "sigma from n = 0 to 3 of 3n", "sigma from n = 0 to 4 of 3(2^n)"],
          "Sigma notation for a geometric series uses an exponential term rule.",
          `${kind}-${index}`
        );
      });
    case "PC.5E":
      return buildQuestionSet((index) => {
        const first = 3 + (index % 4);
        const ratio = pick([1 / 2, 1 / 3, 2, 3], index);
        const n = 4 + (index % 3);
        if (ratio < 1) {
          const infiniteSum = numberText(first / (1 - ratio));
          return makeQuestion(
            `A geometric series has first term ${first} and common ratio ${numberText(ratio)}. What is its infinite sum?`,
            infiniteSum,
            [numberText(first / (1 + ratio)), numberText(first * ratio), numberText(first / ratio)],
            "An infinite geometric series exists when the absolute value of the ratio is less than 1, with sum a/(1 - r).",
            `${kind}-${index}`
          );
        }
        return makeQuestion(
          `A geometric sequence has first term ${first} and ratio ${numberText(ratio)}. What is term ${n}?`,
          numberText(first * ratio ** (n - 1)),
          [numberText(first * ratio * n), numberText(first + ratio * (n - 1)), numberText(first * ratio ** n)],
          "The nth term of a geometric sequence is a(1)r^(n - 1).",
          `${kind}-${index}`
        );
      });
    case "PC.5F":
      return buildQuestionSet((index) => {
        const n = 4 + (index % 3);
        return makeQuestion(
          `What is the coefficient of x in the expansion of (x + 1)^${n}?`,
          String(n),
          [String(n - 1), String(n + 1), String(n * 2)],
          "By the Binomial Theorem, the coefficient of x is the binomial coefficient C(n, 1).",
          `${kind}-${index}`
        );
      });
    case "PC.5G":
      return buildQuestionSet((index) => {
        const a = 2 + (index % 5);
        const b = 3 + (index % 5);
        return makeQuestion(
          `Use logarithm properties to simplify log(${a}) + log(${b}).`,
          `log(${a * b})`,
          [`log(${a + b})`, `log(${a})/${b}`, `log(${a - b})`],
          "The product property of logarithms says log(a) + log(b) = log(ab).",
          `${kind}-${index}`
        );
      });
    case "PC.5H":
      return buildQuestionSet((index) => {
        const base = pick([2, 3, 10], index);
        const exponent = 2 + (index % 4);
        return makeQuestion(
          `Solve log_${base}(x) = ${exponent}.`,
          String(base ** exponent),
          [String(base * exponent), String(base + exponent), String(exponent ** base)],
          "Rewrite the logarithmic equation in exponential form to solve.",
          `${kind}-${index}`
        );
      });
    case "PC.5I":
      return buildQuestionSet((index) => {
        const base = pick([2, 3, 5], index);
        const exponent = 2 + (index % 4);
        return makeQuestion(
          `Solve ${base}^x = ${base ** exponent}.`,
          String(exponent),
          [String(base), String(base ** exponent), String(exponent + 1)],
          "If the bases are equal, the exponents must be equal.",
          `${kind}-${index}`
        );
      });
    case "PC.5J":
      return buildQuestionSet((index) => {
        const r1 = 2 + (index % 4);
        const r2 = 5 + (index % 4);
        const b = -(r1 + r2);
        const c = r1 * r2;
        return makeQuestion(
          `What are the real solutions of x^2 ${signedConstant(b)}x ${signedConstant(c)} = 0?`,
          `${r1} and ${r2}`,
          [`${r1} and ${-r2}`, `${-r1} and ${-r2}`, `${c} only`],
          "Factor the polynomial or use another valid method to find its real zeros.",
          `${kind}-${index}`
        );
      });
    case "PC.5K":
      return buildQuestionSet((index) => {
        const a = 1 + (index % 3);
        return makeQuestion(
          `Solve the inequality x^2 - ${a * a} > 0.`,
          `(-inf, -${a}) U (${a}, inf)`,
          [`(-${a}, ${a})`, `[-${a}, ${a}]`, `(-inf, ${a})`],
          "A quadratic is positive outside its real zeros when it opens upward.",
          `${kind}-${index}`
        );
      });
    case "PC.5L":
      return buildQuestionSet((index) => {
        const a = 1 + (index % 4);
        return makeQuestion(
          `Solve the rational inequality 1/(x - ${a}) > 0.`,
          `(${a}, inf)`,
          [`(-inf, ${a})`, `(-inf, ${a}) U (${a}, inf)`, `(${a}]`],
          "A rational expression is positive where numerator and denominator have the same sign.",
          `${kind}-${index}`
        );
      });
    case "PC.5M":
      return buildQuestionSet((index) => {
        const prompts = [
          ["Simplify sin(theta)/cos(theta).", "tan(theta)", ["cot(theta)", "sec(theta)", "csc(theta)"]],
          ["Simplify 1/sin(theta).", "csc(theta)", ["sec(theta)", "cot(theta)", "tan(theta)"]],
          ["Which identity is always true?", "sin^2(theta) + cos^2(theta) = 1", ["tan^2(theta) + 1 = sin^2(theta)", "sin(theta + theta) = 2sin(theta)", "cos(theta) = 1/sin(theta)"]]
        ];
        const selected = pick(prompts, index);
        return makeQuestion(selected[0], selected[1], selected[2], "Use reciprocal, quotient, Pythagorean, and related identities to rewrite expressions.", `${kind}-${index}`);
      });
    default:
      return buildQuestionSet((index) => {
        const mode = index % 3;
        if (mode === 0) {
          return makeQuestion(
            "What are the solutions to sin(x) = 0 on [0, 2pi)?",
            "0 and pi",
            ["pi/2 and 3pi/2", "pi/4 and 3pi/4", "pi only"],
            "On the unit circle, sine is 0 at angles on the x-axis.",
            `${kind}-${index}`
          );
        }
        if (mode === 1) {
          return makeQuestion(
            "What are the solutions to cos(x) = 0 on [0, 2pi)?",
            "pi/2 and 3pi/2",
            ["0 and pi", "pi/4 and 5pi/4", "pi/3 and 5pi/3"],
            "Cosine is 0 where the unit-circle x-coordinate is 0.",
            `${kind}-${index}`
          );
        }
        return makeQuestion(
          "What are the solutions to tan(x) = 1 on [0, 2pi)?",
          "pi/4 and 5pi/4",
          ["0 and pi", "pi/2 and 3pi/2", "pi/3 and 4pi/3"],
          "Tangent equals 1 where sine and cosine are equal and positive or both negative.",
          `${kind}-${index}`
        );
      });
  }
}

const LEGACY_QUIZ_BUILDERS = [
  ["A2.1A", "Math Algebra II A2.1A", "Apply mathematics to problems arising in everyday life, society, and the workplace.", 0, "Mathematical Process Standards", "Core", () => buildProcessApply("A2.1A")],
  ["A2.1B", "Math Algebra II A2.1B", "Use a problem-solving model that incorporates analyzing information, formulating a plan or strategy, determining a solution, justifying the solution, and evaluating the reasonableness of the solution.", 0, "Mathematical Process Standards", "Core", () => buildProcessModel("A2.1B")],
  ["A2.1C", "Math Algebra II A2.1C", "Select tools, including technology, paper and pencil, mental math, and estimation, as appropriate to solve problems.", 0, "Mathematical Process Standards", "Core", () => buildProcessTools("A2.1C")],
  ["A2.1D", "Math Algebra II A2.1D", "Communicate mathematical ideas, reasoning, and their implications using multiple representations, including symbols, diagrams, graphs, and language.", 0, "Mathematical Process Standards", "Core", () => buildProcessCommunicate("A2.1D")],
  ["A2.1E", "Math Algebra II A2.1E", "Create and use representations to organize, record, and communicate mathematical ideas.", 0, "Mathematical Process Standards", "Core", () => buildProcessRepresent("A2.1E")],
  ["A2.1F", "Math Algebra II A2.1F", "Analyze mathematical relationships to connect and communicate mathematical ideas.", 0, "Mathematical Process Standards", "Core", () => buildProcessRelationships("A2.1F")],
  ["A2.1G", "Math Algebra II A2.1G", "Display, explain, and justify mathematical ideas and arguments using precise mathematical language in written or oral communication.", 0, "Mathematical Process Standards", "Core", () => buildProcessLanguage("A2.1G")],

  ["A2.2A", "Math Algebra II A2.2A", cleanDescription("graph the parent functions square root, reciprocal, cubic, cube root, exponential, absolute value, and logarithmic and describe key attributes"), 1, "Attributes of Functions and Their Inverses", "Course", () => buildAlgebra2Functions("A2.2A")],
  ["A2.2B", "Math Algebra II A2.2B", cleanDescription("graph, identify, and write the inverse of a function using technology and algebraic methods when appropriate"), 1, "Attributes of Functions and Their Inverses", "Course", () => buildAlgebra2Functions("A2.2B")],
  ["A2.2C", "Math Algebra II A2.2C", cleanDescription("describe and analyze the relationship between a function and its inverse, including appropriate domain restrictions"), 1, "Attributes of Functions and Their Inverses", "Course", () => buildAlgebra2Functions("A2.2C")],
  ["A2.2D", "Math Algebra II A2.2D", cleanDescription("use composition to determine whether one function is the inverse of another"), 1, "Attributes of Functions and Their Inverses", "Course", () => buildAlgebra2Functions("A2.2D")],

  ["A2.3A", "Math Algebra II A2.3A", cleanDescription("formulate systems of equations, including systems consisting of three linear equations in three variables and systems consisting of one linear equation and one quadratic equation"), 2, "Systems of Equations and Inequalities", "Course", () => buildAlgebra2Systems("A2.3A")],
  ["A2.3B", "Math Algebra II A2.3B", cleanDescription("solve systems of three linear equations in three variables by substitution, elimination, and technology"), 2, "Systems of Equations and Inequalities", "Course", () => buildAlgebra2Systems("A2.3B")],
  ["A2.3C", "Math Algebra II A2.3C", cleanDescription("solve systems consisting of one linear equation and one quadratic equation using algebraic methods"), 2, "Systems of Equations and Inequalities", "Course", () => buildAlgebra2Systems("A2.3C")],
  ["A2.3D", "Math Algebra II A2.3D", cleanDescription("determine the reasonableness of solutions to a system consisting of one linear equation and one quadratic equation in context"), 2, "Systems of Equations and Inequalities", "Course", () => buildAlgebra2Systems("A2.3D")],
  ["A2.3E", "Math Algebra II A2.3E", cleanDescription("formulate systems of two or more linear inequalities in two variables arising from mathematical and real-world situations"), 2, "Systems of Equations and Inequalities", "Course", () => buildAlgebra2Systems("A2.3E")],
  ["A2.3F", "Math Algebra II A2.3F", cleanDescription("solve systems of two or more linear inequalities in two variables by graphing and by using technology"), 2, "Systems of Equations and Inequalities", "Course", () => buildAlgebra2Systems("A2.3F")],
  ["A2.3G", "Math Algebra II A2.3G", cleanDescription("analyze and determine solutions to systems of linear inequalities in two variables in context"), 2, "Systems of Equations and Inequalities", "Course", () => buildAlgebra2Systems("A2.3G")],

  ["A2.4A", "Math Algebra II A2.4A", cleanDescription("write quadratic functions and equations that provide a reasonable fit to data and use them to solve problems"), 3, "Quadratic and Square Root Functions", "Course", () => buildAlgebra2Quadratic("A2.4A")],
  ["A2.4B", "Math Algebra II A2.4B", cleanDescription("write the equation of a parabola using the vertex and focus or the vertex and directrix"), 3, "Quadratic and Square Root Functions", "Course", () => buildAlgebra2Quadratic("A2.4B")],
  ["A2.4C", "Math Algebra II A2.4C", cleanDescription("determine the effects on the graph of the parent function y = sqrt(x) when transformed"), 3, "Quadratic and Square Root Functions", "Course", () => buildAlgebra2Quadratic("A2.4C")],
  ["A2.4D", "Math Algebra II A2.4D", cleanDescription("transform quadratic functions into equivalent vertex form to identify key attributes"), 3, "Quadratic and Square Root Functions", "Course", () => buildAlgebra2Quadratic("A2.4D")],
  ["A2.4E", "Math Algebra II A2.4E", cleanDescription("formulate quadratic and square root equations using verbal descriptions, tables, graphs, and situations"), 3, "Quadratic and Square Root Functions", "Course", () => buildAlgebra2Quadratic("A2.4E")],
  ["A2.4F", "Math Algebra II A2.4F", cleanDescription("solve quadratic equations and square root equations with real solutions"), 3, "Quadratic and Square Root Functions", "Course", () => buildAlgebra2Quadratic("A2.4F")],
  ["A2.4G", "Math Algebra II A2.4G", cleanDescription("identify extraneous solutions that arise from solving equations involving square roots"), 3, "Quadratic and Square Root Functions", "Course", () => buildAlgebra2Quadratic("A2.4G")],
  ["A2.4H", "Math Algebra II A2.4H", cleanDescription("solve quadratic inequalities"), 3, "Quadratic and Square Root Functions", "Course", () => buildAlgebra2Quadratic("A2.4H")],

  ["A2.5A", "Math Algebra II A2.5A", cleanDescription("determine the effects on exponential and logarithmic parent functions when transformed and identify key attributes"), 4, "Exponential and Logarithmic Functions", "Course", () => buildAlgebra2ExpLog("A2.5A")],
  ["A2.5B", "Math Algebra II A2.5B", cleanDescription("formulate exponential and logarithmic equations using verbal descriptions, tables, graphs, and situations"), 4, "Exponential and Logarithmic Functions", "Course", () => buildAlgebra2ExpLog("A2.5B")],
  ["A2.5C", "Math Algebra II A2.5C", cleanDescription("rewrite exponential equations as logarithmic equations and logarithmic equations as exponential equations"), 4, "Exponential and Logarithmic Functions", "Course", () => buildAlgebra2ExpLog("A2.5C")],
  ["A2.5D", "Math Algebra II A2.5D", cleanDescription("solve exponential and logarithmic equations using algebraic methods and technology"), 4, "Exponential and Logarithmic Functions", "Course", () => buildAlgebra2ExpLog("A2.5D")],
  ["A2.5E", "Math Algebra II A2.5E", cleanDescription("determine the reasonableness of solutions to exponential and logarithmic equations in context"), 4, "Exponential and Logarithmic Functions", "Course", () => buildAlgebra2ExpLog("A2.5E")],

  ["A2.6A", "Math Algebra II A2.6A", cleanDescription("determine the effects on cubic and cube root parent functions when transformed"), 5, "Cubic, Cube Root, Absolute Value, and Rational Functions", "Course", () => buildAlgebra2Advanced("A2.6A")],
  ["A2.6B", "Math Algebra II A2.6B", cleanDescription("solve cube root equations"), 5, "Cubic, Cube Root, Absolute Value, and Rational Functions", "Course", () => buildAlgebra2Advanced("A2.6B")],
  ["A2.6C", "Math Algebra II A2.6C", cleanDescription("determine the effects on absolute value parent functions when transformed"), 5, "Cubic, Cube Root, Absolute Value, and Rational Functions", "Course", () => buildAlgebra2Advanced("A2.6C")],
  ["A2.6D", "Math Algebra II A2.6D", cleanDescription("formulate absolute value linear equations using verbal descriptions, tables, graphs, and situations"), 5, "Cubic, Cube Root, Absolute Value, and Rational Functions", "Course", () => buildAlgebra2Advanced("A2.6D")],
  ["A2.6E", "Math Algebra II A2.6E", cleanDescription("solve absolute value linear equations"), 5, "Cubic, Cube Root, Absolute Value, and Rational Functions", "Course", () => buildAlgebra2Advanced("A2.6E")],
  ["A2.6F", "Math Algebra II A2.6F", cleanDescription("solve absolute value linear inequalities"), 5, "Cubic, Cube Root, Absolute Value, and Rational Functions", "Course", () => buildAlgebra2Advanced("A2.6F")],
  ["A2.6G", "Math Algebra II A2.6G", cleanDescription("determine the effects on the reciprocal parent function when transformed and identify asymptotes"), 5, "Cubic, Cube Root, Absolute Value, and Rational Functions", "Course", () => buildAlgebra2Advanced("A2.6G")],
  ["A2.6H", "Math Algebra II A2.6H", cleanDescription("formulate rational equations that model mathematical and real-world situations"), 5, "Cubic, Cube Root, Absolute Value, and Rational Functions", "Course", () => buildAlgebra2Advanced("A2.6H")],
  ["A2.6I", "Math Algebra II A2.6I", cleanDescription("solve rational equations with real solutions"), 5, "Cubic, Cube Root, Absolute Value, and Rational Functions", "Course", () => buildAlgebra2Advanced("A2.6I")],
  ["A2.6J", "Math Algebra II A2.6J", cleanDescription("determine the reasonableness of solutions to rational equations"), 5, "Cubic, Cube Root, Absolute Value, and Rational Functions", "Course", () => buildAlgebra2Advanced("A2.6J")],
  ["A2.6K", "Math Algebra II A2.6K", cleanDescription("determine asymptotic restrictions, domain, and range of rational functions and express them appropriately"), 5, "Cubic, Cube Root, Absolute Value, and Rational Functions", "Course", () => buildAlgebra2Advanced("A2.6K")],
  ["A2.6L", "Math Algebra II A2.6L", cleanDescription("formulate and solve inverse variation situations"), 5, "Cubic, Cube Root, Absolute Value, and Rational Functions", "Course", () => buildAlgebra2Advanced("A2.6L")],

  ["A2.7A", "Math Algebra II A2.7A", cleanDescription("add, subtract, multiply, and divide complex numbers and use properties of imaginary numbers"), 6, "Number and Algebraic Methods", "Course", () => buildAlgebra2Number("A2.7A")],
  ["A2.7B", "Math Algebra II A2.7B", cleanDescription("add, subtract, and multiply polynomials"), 6, "Number and Algebraic Methods", "Course", () => buildAlgebra2Number("A2.7B")],
  ["A2.7C", "Math Algebra II A2.7C", cleanDescription("determine the quotient of polynomials using algebraic methods and technology"), 6, "Number and Algebraic Methods", "Course", () => buildAlgebra2Number("A2.7C")],
  ["A2.7D", "Math Algebra II A2.7D", cleanDescription("determine linear factors of polynomials using algebraic methods"), 6, "Number and Algebraic Methods", "Course", () => buildAlgebra2Number("A2.7D")],
  ["A2.7E", "Math Algebra II A2.7E", cleanDescription("determine linear and quadratic factors, including sum and difference of cubes and factoring by grouping"), 6, "Number and Algebraic Methods", "Course", () => buildAlgebra2Number("A2.7E")],
  ["A2.7F", "Math Algebra II A2.7F", cleanDescription("determine the sum, difference, product, and quotient of rational expressions with integral exponents"), 6, "Number and Algebraic Methods", "Course", () => buildAlgebra2Number("A2.7F")],
  ["A2.7G", "Math Algebra II A2.7G", cleanDescription("rewrite radical expressions containing variables to equivalent forms"), 6, "Number and Algebraic Methods", "Course", () => buildAlgebra2Number("A2.7G")],
  ["A2.7H", "Math Algebra II A2.7H", cleanDescription("solve equations involving rational exponents"), 6, "Number and Algebraic Methods", "Course", () => buildAlgebra2Number("A2.7H")],
  ["A2.7I", "Math Algebra II A2.7I", cleanDescription("write domain and range of functions using appropriate notation"), 6, "Number and Algebraic Methods", "Course", () => buildAlgebra2Number("A2.7I")],

  ["A2.8A", "Math Algebra II A2.8A", cleanDescription("analyze data and determine the appropriate function family to model a situation"), 7, "Data", "Course", () => buildAlgebra2Data("A2.8A")],
  ["A2.8B", "Math Algebra II A2.8B", cleanDescription("write functions that provide a reasonable fit to data and use them to solve problems"), 7, "Data", "Course", () => buildAlgebra2Data("A2.8B")],
  ["A2.8C", "Math Algebra II A2.8C", cleanDescription("make predictions and critical judgments from mathematical models based on data"), 7, "Data", "Course", () => buildAlgebra2Data("A2.8C")]
];

const PROCESS_TEKS = [
  ["PC.1A", "Apply mathematics to problems arising in everyday life, society, and the workplace.", () => buildProcessApply("PC.1A")],
  ["PC.1B", "Use a problem-solving model that incorporates analyzing information, formulating a plan or strategy, determining a solution, justifying the solution, and evaluating the reasonableness of the solution.", () => buildProcessModel("PC.1B")],
  ["PC.1C", "Select tools, including technology, paper and pencil, mental math, and estimation, as appropriate to solve problems.", () => buildProcessTools("PC.1C")],
  ["PC.1D", "Communicate mathematical ideas, reasoning, and their implications using multiple representations, including symbols, diagrams, graphs, and language.", () => buildProcessCommunicate("PC.1D")],
  ["PC.1E", "Create and use representations to organize, record, and communicate mathematical ideas.", () => buildProcessRepresent("PC.1E")],
  ["PC.1F", "Analyze mathematical relationships to connect and communicate mathematical ideas.", () => buildProcessRelationships("PC.1F")],
  ["PC.1G", "Display, explain, and justify mathematical ideas and arguments using precise mathematical language in written or oral communication.", () => buildProcessLanguage("PC.1G")]
];

const PRECALC_FUNCTION_TEKS = [
  ["PC.2A", cleanDescription("use the composition of two functions to model and solve real-world problems"), () => buildPrecalcFunctions("PC.2A")],
  ["PC.2B", cleanDescription("demonstrate that function composition is not always commutative"), () => buildPrecalcFunctions("PC.2B")],
  ["PC.2C", cleanDescription("represent a given function as a composite function of two or more functions"), () => buildPrecalcFunctions("PC.2C")],
  ["PC.2D", cleanDescription("describe symmetry of graphs of even and odd functions"), () => buildPrecalcFunctions("PC.2D")],
  ["PC.2E", cleanDescription("determine an inverse function, when it exists, for a given function over its domain or a subset of its domain and represent the inverse using multiple representations"), () => buildPrecalcFunctions("PC.2E")],
  ["PC.2F", cleanDescription("graph exponential, logarithmic, rational, polynomial, power, trigonometric, inverse trigonometric, and piecewise defined functions, including step functions"), () => buildPrecalcFunctions("PC.2F")],
  ["PC.2G", cleanDescription("graph functions, including exponential, logarithmic, sine, cosine, rational, polynomial, and power functions and their transformations"), () => buildPrecalcFunctions("PC.2G")],
  ["PC.2H", cleanDescription("graph arcsin x and arccos x and describe the limitations on the domain"), () => buildPrecalcFunctions("PC.2H")],
  ["PC.2I", cleanDescription("determine and analyze key features of many function families"), () => buildPrecalcFunctions("PC.2I")],
  ["PC.2J", cleanDescription("analyze and describe end behavior using infinity notation"), () => buildPrecalcFunctions("PC.2J")],
  ["PC.2K", cleanDescription("analyze rational function asymptotes and nearby behavior"), () => buildPrecalcFunctions("PC.2K")],
  ["PC.2L", cleanDescription("determine various types of discontinuities and graphing calculator limitations"), () => buildPrecalcFunctions("PC.2L")],
  ["PC.2M", cleanDescription("describe left-sided and right-sided behavior around discontinuities"), () => buildPrecalcFunctions("PC.2M")],
  ["PC.2N", cleanDescription("analyze situations modeled by functions to solve real-world problems"), () => buildPrecalcFunctions("PC.2N")],
  ["PC.2O", cleanDescription("develop and use a sinusoidal function to model a situation"), () => buildPrecalcFunctions("PC.2O")],
  ["PC.2P", cleanDescription("determine values of trigonometric functions at special angles and relate them in mathematical and real-world problems"), () => buildPrecalcFunctions("PC.2P")]
];

const PRECALC_RELATIONS_TEKS = [
  ["PC.3A", cleanDescription("graph a set of parametric equations"), () => buildPrecalcRelations("PC.3A")],
  ["PC.3B", cleanDescription("convert parametric equations into rectangular relations and rectangular relations into parametric equations"), () => buildPrecalcRelations("PC.3B")],
  ["PC.3C", cleanDescription("use parametric equations to model and solve mathematical and real-world problems"), () => buildPrecalcRelations("PC.3C")],
  ["PC.3D", cleanDescription("graph points in the polar coordinate system and convert between rectangular coordinates and polar coordinates"), () => buildPrecalcRelations("PC.3D")],
  ["PC.3E", cleanDescription("graph polar equations by plotting points and using technology"), () => buildPrecalcRelations("PC.3E")],
  ["PC.3F", cleanDescription("determine the conic section formed when a plane intersects a double-napped cone"), () => buildPrecalcRelations("PC.3F")],
  ["PC.3G", cleanDescription("make connections between the locus definition of conic sections and their equations in rectangular coordinates"), () => buildPrecalcRelations("PC.3G")],
  ["PC.3H", cleanDescription("use the characteristics of an ellipse and a hyperbola to write equations with center (h, k)"), () => buildPrecalcRelations("PC.3H")]
];

const PRECALC_NUMBER_TEKS = [
  ["PC.4A", cleanDescription("determine the relationship between the unit circle and the definition of a periodic function to evaluate trigonometric functions in mathematical and real-world problems"), () => buildPrecalcNumberMeasure("PC.4A")],
  ["PC.4B", cleanDescription("describe the relationship between degree and radian measure on the unit circle"), () => buildPrecalcNumberMeasure("PC.4B")],
  ["PC.4C", cleanDescription("represent angles in radians or degrees based on rotation and find reference angles and angles in standard position"), () => buildPrecalcNumberMeasure("PC.4C")],
  ["PC.4D", cleanDescription("represent angles in radians or degrees in mathematical and real-world problems, including linear and angular velocity"), () => buildPrecalcNumberMeasure("PC.4D")],
  ["PC.4E", cleanDescription("determine values of trigonometric ratios and solve problems involving them"), () => buildPrecalcNumberMeasure("PC.4E")],
  ["PC.4F", cleanDescription("use trigonometry in mathematical and real-world problems, including directional bearing"), () => buildPrecalcNumberMeasure("PC.4F")],
  ["PC.4G", cleanDescription("use the Law of Sines"), () => buildPrecalcNumberMeasure("PC.4G")],
  ["PC.4H", cleanDescription("use the Law of Cosines"), () => buildPrecalcNumberMeasure("PC.4H")],
  ["PC.4I", cleanDescription("use vectors to model situations involving magnitude and direction"), () => buildPrecalcNumberMeasure("PC.4I")],
  ["PC.4J", cleanDescription("represent vector addition and scalar multiplication geometrically and symbolically"), () => buildPrecalcNumberMeasure("PC.4J")],
  ["PC.4K", cleanDescription("apply vector addition and scalar multiplication in mathematical and real-world problems"), () => buildPrecalcNumberMeasure("PC.4K")]
];

const PRECALC_ALGEBRAIC_TEKS = [
  ["PC.5A", cleanDescription("evaluate finite sums and geometric series, when possible, written in sigma notation"), () => buildPrecalcAlgebraic("PC.5A")],
  ["PC.5B", cleanDescription("represent arithmetic and geometric sequences using recursive formulas"), () => buildPrecalcAlgebraic("PC.5B")],
  ["PC.5C", cleanDescription("calculate the nth term and nth partial sum of an arithmetic series in mathematical and real-world problems"), () => buildPrecalcAlgebraic("PC.5C")],
  ["PC.5D", cleanDescription("represent arithmetic series and geometric series using sigma notation"), () => buildPrecalcAlgebraic("PC.5D")],
  ["PC.5E", cleanDescription("calculate the nth term of a geometric sequence, the nth partial sum, and the sum of an infinite geometric series when it exists"), () => buildPrecalcAlgebraic("PC.5E")],
  ["PC.5F", cleanDescription("apply the Binomial Theorem for (a + b)^n"), () => buildPrecalcAlgebraic("PC.5F")],
  ["PC.5G", cleanDescription("use properties of logarithms to evaluate or transform logarithmic expressions"), () => buildPrecalcAlgebraic("PC.5G")],
  ["PC.5H", cleanDescription("generate and solve logarithmic equations in mathematical and real-world problems"), () => buildPrecalcAlgebraic("PC.5H")],
  ["PC.5I", cleanDescription("generate and solve exponential equations in mathematical and real-world problems"), () => buildPrecalcAlgebraic("PC.5I")],
  ["PC.5J", cleanDescription("solve polynomial equations with real coefficients using a variety of techniques"), () => buildPrecalcAlgebraic("PC.5J")],
  ["PC.5K", cleanDescription("solve polynomial inequalities with real coefficients and write solution sets in interval notation"), () => buildPrecalcAlgebraic("PC.5K")],
  ["PC.5L", cleanDescription("solve rational inequalities with real coefficients and write solution sets in interval notation"), () => buildPrecalcAlgebraic("PC.5L")],
  ["PC.5M", cleanDescription("use trigonometric identities to simplify trigonometric expressions"), () => buildPrecalcAlgebraic("PC.5M")],
  ["PC.5N", cleanDescription("generate and solve trigonometric equations in mathematical and real-world problems"), () => buildPrecalcAlgebraic("PC.5N")]
];

const QUIZ_BUILDERS = [
  ...PROCESS_TEKS.map(([teksCode, summary, builder]) => [teksCode, `Math Precalculus ${teksCode}`, summary, 0, "Mathematical Process Standards", "Core", builder]),
  ...PRECALC_FUNCTION_TEKS.map(([teksCode, summary, builder]) => [teksCode, `Math Precalculus ${teksCode}`, summary, 1, "Functions", "Course", builder]),
  ...PRECALC_RELATIONS_TEKS.map(([teksCode, summary, builder]) => [teksCode, `Math Precalculus ${teksCode}`, summary, 2, "Relations and Geometric Reasoning", "Course", builder]),
  ...PRECALC_NUMBER_TEKS.map(([teksCode, summary, builder]) => [teksCode, `Math Precalculus ${teksCode}`, summary, 3, "Number and Measure", "Course", builder]),
  ...PRECALC_ALGEBRAIC_TEKS.map(([teksCode, summary, builder]) => [teksCode, `Math Precalculus ${teksCode}`, summary, 4, "Algebraic Reasoning", "Course", builder])
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
    title: "Precalculus Math TEKS Implementation",
    source: {
      localPdf: LOCAL_PDF,
      officialAssessedCurriculum: ASSESSED_CURRICULUM_URL,
      officialBlueprint: BLUEPRINT_URL,
      notes: "Precalculus implementation continues after Algebra II. The official TEA Precalculus breakout document and TAC Chapter 111 were used to define the course scope. Code labels use the repo shorthand PC.x for Precalculus sections."
    },
    namingConvention: "Math Precalculus {TEKS}",
    questionTargetPerSet: 50,
    scope: {
      firstTeks: "PC.1A",
      assessedFirstTeks: "PC.2A",
      assessedLastTeks: "PC.5N",
      implementedLastTeks: "PC.5N",
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
  console.log(`Wrote ${generatedQuizzes.length} Texas Precalculus Math TEKS sets and ${totalQuestions} questions to ${CUSTOM_QUIZZES_FILE}`);
  console.log(`Wrote Precalculus implementation file to ${IMPLEMENTATION_FILE}`);
}

main();

// QUIZ_BUILDERS_PLACEHOLDER
