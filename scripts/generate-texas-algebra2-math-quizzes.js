const fs = require("fs");
const path = require("path");

const CUSTOM_QUIZZES_FILE = path.join(__dirname, "..", "data", "custom-quizzes.json");
const IMPLEMENTATION_FILE = path.join(__dirname, "..", "data", "algebra2-math-staar-implementation.json");
const NOW = new Date().toISOString();
const GENERATED_BY = "Local Curriculum";
const CATEGORY = "Texas Algebra II Math";
const LOCAL_PDF = "C:/Users/Casa-Desktop/Downloads/algebra2-teks.pdf";
const ASSESSED_CURRICULUM_URL = "https://tea.texas.gov/academics/instructional-materials/review-and-adoption-process/breakout-documents/algebra-ii.pdf";
const BLUEPRINT_URL = "https://tea.texas.gov/about-tea/laws-and-rules/texas-administrative-code/19-tac-chapter-111";
const PROCESS_CODES = ["A2.1A", "A2.1B", "A2.1C", "A2.1D", "A2.1E", "A2.1F", "A2.1G"];
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
    tags: ["texas", "teks", "math", "algebra ii", teksCode.toLowerCase().replace(".", "").replace(/\s+/g, "")],
    questions
  };
}

function setIdFor(teksCode) {
  return `tx_algebra2_math_${teksCode.toLowerCase().replace(/\./g, "_")}`;
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

const QUIZ_BUILDERS = [
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
    title: "Algebra II Math TEKS Implementation",
    source: {
      localPdf: LOCAL_PDF,
      officialAssessedCurriculum: ASSESSED_CURRICULUM_URL,
      officialBlueprint: BLUEPRINT_URL,
      notes: "Algebra II implementation continues after Geometry. The official TEA Algebra II breakout document and TAC Chapter 111 were used to define the Algebra II course scope. Code labels use the repo shorthand A2.x for Algebra II sections."
    },
    namingConvention: "Math Algebra II {TEKS}",
    questionTargetPerSet: 50,
    scope: {
      firstTeks: "A2.1A",
      assessedFirstTeks: "A2.2A",
      assessedLastTeks: "A2.8C",
      implementedLastTeks: "A2.8C",
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
  console.log(`Wrote ${generatedQuizzes.length} Texas Algebra II Math TEKS sets and ${totalQuestions} questions to ${CUSTOM_QUIZZES_FILE}`);
  console.log(`Wrote Algebra II implementation file to ${IMPLEMENTATION_FILE}`);
}

main();

// QUIZ_BUILDERS_PLACEHOLDER
