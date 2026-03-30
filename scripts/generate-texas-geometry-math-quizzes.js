const fs = require("fs");
const path = require("path");

const CUSTOM_QUIZZES_FILE = path.join(__dirname, "..", "data", "custom-quizzes.json");
const IMPLEMENTATION_FILE = path.join(__dirname, "..", "data", "geometry-math-staar-implementation.json");
const NOW = new Date().toISOString();
const GENERATED_BY = "Local Curriculum";
const CATEGORY = "Texas Geometry Math";
const LOCAL_PDF = "C:/Users/Casa-Desktop/Downloads/geometry-teks.pdf";
const ASSESSED_CURRICULUM_URL = "https://tea.texas.gov/academics/instructional-materials/review-and-adoption-process/breakout-documents/geometry.pdf";
const BLUEPRINT_URL = "https://tea.texas.gov/about-tea/laws-and-rules/texas-administrative-code/19-tac-chapter-111";
const PROCESS_CODES = ["G.1A", "G.1B", "G.1C", "G.1D", "G.1E", "G.1F", "G.1G"];
const GENERATED_IDS = new Set();
const ITEMS = ["bridges", "parks", "courts", "posters", "screens", "paths", "gardens", "ramps"];

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

function signedConstant(value) {
  return value >= 0 ? `+ ${Math.abs(value)}` : `- ${Math.abs(value)}`;
}

function money(value) {
  return `$${Number(value).toFixed(2)}`;
}

function formatPoint(x, y) {
  return `(${numberText(x)}, ${numberText(y)})`;
}

function formatVertices(points) {
  return points.map(([name, x, y]) => `${name}${formatPoint(x, y)}`).join(", ");
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

function coordinateTerm(variable, value) {
  if (value === 0) {
    return variable;
  }
  return `${variable} ${value > 0 ? "-" : "+"} ${Math.abs(value)}`;
}

function formatCircleEquation(h, k, r) {
  const xPart = `(${coordinateTerm("x", h)})^2`;
  const yPart = `(${coordinateTerm("y", k)})^2`;
  return `${xPart} + ${yPart} = ${r * r}`;
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

function radicalText(multiplier, radicand) {
  if (multiplier === 1) {
    return `sqrt(${radicand})`;
  }
  return `${multiplier}sqrt(${radicand})`;
}

function permutation(n, r) {
  let result = 1;
  for (let value = 0; value < r; value += 1) {
    result *= n - value;
  }
  return result;
}

function combination(n, r) {
  if (r < 0 || r > n) {
    return 0;
  }
  const use = Math.min(r, n - r);
  let numerator = 1;
  let denominator = 1;
  for (let step = 1; step <= use; step += 1) {
    numerator *= n - use + step;
    denominator *= step;
  }
  return numerator / denominator;
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

function translatePoint(point, dx, dy) {
  return [point[0] + dx, point[1] + dy];
}

function reflectX(point) {
  return [point[0], -point[1]];
}

function reflectY(point) {
  return [-point[0], point[1]];
}

function rotate180(point) {
  return [-point[0], -point[1]];
}

function rotate90(point) {
  return [-point[1], point[0]];
}

function rotate270(point) {
  return [point[1], -point[0]];
}

function dilate(point, scale) {
  return [point[0] * scale, point[1] * scale];
}

function midpoint(ax, ay, bx, by) {
  return [(ax + bx) / 2, (ay + by) / 2];
}

function applySequence(points, steps) {
  return points.map((point) => {
    let next = point.slice();
    for (const step of steps) {
      if (step.type === "translate") {
        next = translatePoint(next, step.dx, step.dy);
      } else if (step.type === "reflectX") {
        next = reflectX(next);
      } else if (step.type === "reflectY") {
        next = reflectY(next);
      } else if (step.type === "rotate180") {
        next = rotate180(next);
      } else if (step.type === "rotate90") {
        next = rotate90(next);
      } else if (step.type === "rotate270") {
        next = rotate270(next);
      } else if (step.type === "dilate") {
        next = dilate(next, step.scale);
      }
    }
    return next;
  });
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
    tags: ["texas", "teks", "staar", "geometry", "math", teksCode.toLowerCase().replace(".", "").replace(/\s+/g, "")],
    questions
  };
}

function setIdFor(teksCode) {
  return `tx_geometry_math_${teksCode.toLowerCase().replace(".", "_")}`;
}

function buildProcessApply(code) {
  return buildQuestionSet((index) => {
    const item = pick(ITEMS, index);
    return makeQuestion(
      `Which action best shows applying geometry to solve a problem about ${item}?`,
      `Use measurements and geometric relationships to choose the best design for the ${item}`,
      [
        `Choose the ${item} design only because it looks nicest`,
        `Ignore the measurements and guess`,
        `Wait for someone else to solve the ${item} problem`
      ],
      "Applying mathematics means using measurements, relationships, and reasoning to solve real problems.",
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
      `A student has finished this step in the problem-solving model: ${current}. What should happen next?`,
      next,
      uniqueStrings(steps.filter((step) => step !== next).slice(0, 3)),
      "The process standards expect students to analyze, plan, solve, justify, and then evaluate the result.",
      `${code}-${index}`
    );
  });
}

function buildProcessTools(code) {
  const tools = ["compass and straightedge", "dynamic geometry software", "graph paper", "a ruler", "a protractor"];
  return buildQuestionSet((index) => {
    return makeQuestion(
      "Which tool is most appropriate if a student needs to construct a perpendicular bisector?",
      "compass and straightedge",
      uniqueStrings(tools.filter((value) => value !== "compass and straightedge").slice(0, 3)),
      "A compass and straightedge are appropriate construction tools for a perpendicular bisector.",
      `${code}-${index}`
    );
  });
}

function buildProcessCommunicate(code) {
  return buildQuestionSet((index) => {
    return makeQuestion(
      "Which response best communicates a geometric argument clearly?",
      "A labeled diagram, matching equations, and words that explain why each step is valid",
      [
        "Only the final answer with no reasoning",
        "A diagram with no labels or explanation",
        "A guess written without mathematical vocabulary"
      ],
      "Clear communication in geometry uses diagrams, symbols, and precise language together.",
      `${code}-${index}`
    );
  });
}

function buildProcessRepresent(code) {
  return buildQuestionSet((index) => {
    return makeQuestion(
      "Which is an example of a useful mathematical representation in geometry?",
      "A coordinate graph or diagram that organizes the information in the problem",
      [
        "A random sketch with no labels",
        "A paragraph with no measurements or symbols",
        "An answer choice copied without work"
      ],
      "Representations such as graphs, diagrams, tables, and equations help organize mathematical ideas.",
      `${code}-${index}`
    );
  });
}

function buildProcessRelationships(code) {
  return buildQuestionSet((index) => {
    return makeQuestion(
      "Which statement best shows analyzing a mathematical relationship?",
      "Recognizing that similar figures have proportional corresponding sides",
      [
        "Choosing an answer without comparing the figures",
        "Ignoring how the sides and angles are connected",
        "Using color instead of measurements"
      ],
      "Analyzing relationships means noticing how quantities or geometric properties are connected.",
      `${code}-${index}`
    );
  });
}

function buildProcessLanguage(code) {
  return buildQuestionSet((index) => {
    return makeQuestion(
      "Which phrase uses precise mathematical language?",
      "The triangles are congruent by SAS because two sides and the included angle are congruent",
      [
        "The triangles look the same",
        "The triangles are kind of equal",
        "The triangles probably match somehow"
      ],
      "The process standards expect students to justify ideas with precise mathematical language.",
      `${code}-${index}`
    );
  });
}

function buildGeometryCoordinate(kind) {
  if (kind === "G.2A") {
    return buildQuestionSet((index) => {
      const ax = (index % 5) - 2;
      const ay = (index % 4) - 1;
      const dx = 4 * ((index % 3) + 1);
      const dy = 4 * (((index + 1) % 3) + 1);
      const bx = ax + dx;
      const by = ay + dy;
      const fractions = [
        { numerator: 1, denominator: 2, label: "the midpoint of" },
        { numerator: 1, denominator: 4, label: "1/4 of the way from A to" },
        { numerator: 3, denominator: 4, label: "3/4 of the way from A to" }
      ];
      const selected = fractions[index % fractions.length];
      const px = ax + (dx * selected.numerator) / selected.denominator;
      const py = ay + (dy * selected.numerator) / selected.denominator;
      const quarter = formatPoint(ax + dx / 4, ay + dy / 4);
      const midpointPoint = formatPoint(ax + dx / 2, ay + dy / 2);
      const threeQuarter = formatPoint(ax + (3 * dx) / 4, ay + (3 * dy) / 4);
      return makeQuestion(
        `Point A is ${formatPoint(ax, ay)} and point B is ${formatPoint(bx, by)}. Which point is ${selected.label} segment AB?`,
        formatPoint(px, py),
        uniqueStrings([quarter, midpointPoint, threeQuarter, formatPoint(bx, by)]).filter((value) => value !== formatPoint(px, py)).slice(0, 3),
        "A fractional distance from A to B can be found by multiplying the change in x and y by the fraction and adding that result to point A.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.2B") {
    return buildQuestionSet((index) => {
      const mode = index % 3;
      if (mode === 0) {
        const ax = index % 4;
        const ay = (index % 3) - 1;
        const dx = (index % 4) + 1;
        const dy = (index % 5) + 2;
        const bx = ax + dx;
        const by = ay + dy;
        const slope = fractionOrWhole(dy, dx);
        return makeQuestion(
          `What is the slope of the line through ${formatPoint(ax, ay)} and ${formatPoint(bx, by)}?`,
          slope,
          [fractionOrWhole(dx, dy), fractionOrWhole(-dy, dx), fractionOrWhole(dy + dx, dx)],
          "Slope is change in y divided by change in x.",
          `${kind}-${index}`
        );
      }
      if (mode === 1) {
        const ax = (index % 5) - 2;
        const ay = index % 4;
        const bx = ax + 2 * ((index % 3) + 1);
        const by = ay + 2 * (((index + 2) % 3) + 1);
        const mid = midpoint(ax, ay, bx, by);
        return makeQuestion(
          `What is the midpoint of the segment with endpoints ${formatPoint(ax, ay)} and ${formatPoint(bx, by)}?`,
          formatPoint(mid[0], mid[1]),
          [formatPoint(ax, ay), formatPoint(bx, by), formatPoint((ax + bx) / 2, ay)],
          "The midpoint formula averages the x-coordinates and averages the y-coordinates.",
          `${kind}-${index}`
        );
      }
      const scale = (index % 4) + 1;
      const ax = 0;
      const ay = 0;
      const bx = 3 * scale;
      const by = 4 * scale;
      return makeQuestion(
        `What is the distance between ${formatPoint(ax, ay)} and ${formatPoint(bx, by)}?`,
        String(5 * scale),
        [String(7 * scale), String(4 * scale), String(3 * scale)],
        "Use the distance formula. A 3-4-5 right triangle has hypotenuse 5, so scaling by the same factor keeps the 3-4-5 relationship.",
        `${kind}-${index}`
      );
    });
  }

  return buildQuestionSet((index) => {
    const baseSlope = pick([1, -1, 2, -2], index);
    const baseIntercept = (index % 5) - 2;
    const x1 = (index % 5) - 2;
    const y1 = (index % 7) - 3;
    const relation = index % 2 === 0 ? "parallel" : "perpendicular";
    const newSlope = relation === "parallel" ? baseSlope : -1 / baseSlope;
    const newIntercept = y1 - newSlope * x1;
    const correct = formatLinearEquation(newSlope, newIntercept);
    const sameIntercept = formatLinearEquation(newSlope, newIntercept + 2);
    const baseSlopeLine = formatLinearEquation(baseSlope, newIntercept);
    const wrongPerp = formatLinearEquation(baseSlope === 0 ? 1 : 1 / baseSlope, newIntercept);
    return makeQuestion(
      `Line L has equation ${formatLinearEquation(baseSlope, baseIntercept)}. Which equation is ${relation} to line L and passes through ${formatPoint(x1, y1)}?`,
      correct,
      uniqueStrings([sameIntercept, baseSlopeLine, wrongPerp]).filter((value) => value !== correct).slice(0, 3),
      "Parallel lines have the same slope. Perpendicular lines have slopes that are negative reciprocals.",
      `${kind}-${index}`
    );
  });
}

function buildGeometryTransformations(kind) {
  if (kind === "G.3A") {
    return buildQuestionSet((index) => {
      const point = [(index % 5) - 2, (index % 7) - 3];
      const mode = index % 5;
      let prompt = "";
      let answer = point;
      let wrongs = [];
      if (mode === 0) {
        const dx = (index % 3) + 1;
        const dy = ((index + 1) % 3) + 1;
        answer = translatePoint(point, dx, -dy);
        prompt = `Under the rule (x, y) -> (x + ${dx}, y - ${dy}), what is the image of ${formatPoint(point[0], point[1])}?`;
        wrongs = [translatePoint(point, dx, dy), translatePoint(point, -dx, -dy), reflectX(answer)];
      } else if (mode === 1) {
        answer = reflectX(point);
        prompt = `What is the image of ${formatPoint(point[0], point[1])} after a reflection across the x-axis?`;
        wrongs = [reflectY(point), rotate180(point), point];
      } else if (mode === 2) {
        answer = reflectY(point);
        prompt = `What is the image of ${formatPoint(point[0], point[1])} after a reflection across the y-axis?`;
        wrongs = [reflectX(point), rotate180(point), point];
      } else if (mode === 3) {
        answer = rotate90(point);
        prompt = `What is the image of ${formatPoint(point[0], point[1])} after a 90-degree counterclockwise rotation about the origin?`;
        wrongs = [rotate270(point), rotate180(point), point];
      } else {
        answer = rotate180(point);
        prompt = `What is the image of ${formatPoint(point[0], point[1])} after a 180-degree rotation about the origin?`;
        wrongs = [reflectX(point), reflectY(point), point];
      }
      return makeQuestion(
        prompt,
        formatPoint(answer[0], answer[1]),
        wrongs.map((choice) => formatPoint(choice[0], choice[1])),
        "Coordinate notation and basic transformation rules describe how every point moves in the plane.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.3B") {
    return buildQuestionSet((index) => {
      const point = [(index % 4) + 1, (index % 3) + 1];
      const mode = index % 3;
      let answer = point;
      let prompt = "";
      if (mode === 0) {
        answer = dilate(translatePoint(point, 1, 2), 2);
        prompt = `Start with P${formatPoint(point[0], point[1])}. Translate right 1 and up 2, then dilate by a scale factor of 2 about the origin. Where is the final image?`;
      } else if (mode === 1) {
        answer = dilate(reflectX(point), 3);
        prompt = `Start with P${formatPoint(point[0], point[1])}. Reflect the point across the x-axis, then dilate by a scale factor of 3 about the origin. Where is the final image?`;
      } else {
        answer = translatePoint(dilate(point, 2), -1, 3);
        prompt = `Start with P${formatPoint(point[0], point[1])}. Dilate the point by a scale factor of 2 about the origin, then translate left 1 and up 3. Where is the final image?`;
      }
      const wrong1 = dilate(point, 2);
      const wrong2 = translatePoint(point, 1, 2);
      const wrong3 = reflectY(answer);
      return makeQuestion(
        prompt,
        formatPoint(answer[0], answer[1]),
        [formatPoint(wrong1[0], wrong1[1]), formatPoint(wrong2[0], wrong2[1]), formatPoint(wrong3[0], wrong3[1])],
        "Compositions of transformations are applied in order, and dilations multiply each coordinate by the scale factor when centered at the origin.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.3C") {
    const sequences = [
      {
        steps: [{ type: "translate", dx: 3, dy: 0 }, { type: "reflectX" }],
        label: "translate right 3 units, then reflect across the x-axis"
      },
      {
        steps: [{ type: "reflectY" }, { type: "translate", dx: 0, dy: 2 }],
        label: "reflect across the y-axis, then translate up 2 units"
      },
      {
        steps: [{ type: "rotate180" }, { type: "translate", dx: -1, dy: 1 }],
        label: "rotate 180 degrees about the origin, then translate left 1 and up 1"
      },
      {
        steps: [{ type: "translate", dx: -2, dy: 3 }],
        label: "translate left 2 units and up 3 units"
      }
    ];
    return buildQuestionSet((index) => {
      const base = [
        ["A", 1, 1],
        ["B", 3, 1],
        ["C", 1, 3]
      ];
      const chosen = sequences[index % sequences.length];
      const image = applySequence(base.map((point) => [point[1], point[2]]), chosen.steps);
      const imageNamed = base.map(([name], pointIndex) => [name, image[pointIndex][0], image[pointIndex][1]]);
      const wrongs = sequences.filter((_, position) => position !== index % sequences.length).map((sequence) => sequence.label).slice(0, 3);
      return makeQuestion(
        `Triangle ABC has vertices ${formatVertices(base)}. Its image has vertices ${formatVertices(imageNamed)}. Which sequence of transformations maps triangle ABC to its image?`,
        chosen.label,
        wrongs,
        "A sequence of transformations can be identified by tracking how every vertex changes from the preimage to the image.",
        `${kind}-${index}`
      );
    });
  }

  return buildQuestionSet((index) => {
    const figures = [
      { name: "a non-square rectangle", answer: "both reflectional and rotational symmetry" },
      { name: "a non-rectangle parallelogram", answer: "rotational symmetry only" },
      { name: "an isosceles triangle that is not equilateral", answer: "reflectional symmetry only" },
      { name: "a scalene triangle", answer: "neither reflectional nor rotational symmetry" },
      { name: "a square", answer: "both reflectional and rotational symmetry" }
    ];
    const selected = pick(figures, index);
    return makeQuestion(
      `Which statement best describes the symmetry of ${selected.name}?`,
      selected.answer,
      uniqueStrings([
        "reflectional symmetry only",
        "rotational symmetry only",
        "both reflectional and rotational symmetry",
        "neither reflectional nor rotational symmetry"
      ]).filter((value) => value !== selected.answer).slice(0, 3),
      "Reflectional symmetry uses a line of symmetry, while rotational symmetry maps a figure onto itself by turning it less than 360 degrees.",
      `${kind}-${index}`
    );
  });
}

function buildGeometryLogic(kind) {
  if (kind === "G.4A") {
    const cases = [
      {
        prompt: "Which term is an undefined term in Euclidean geometry?",
        correct: "point",
        wrongs: ["angle", "midpoint", "segment"]
      },
      {
        prompt: "A statement accepted without proof is called a",
        correct: "postulate",
        wrongs: ["conjecture", "definition", "counterexample"]
      },
      {
        prompt: "A proven statement in geometry is called a",
        correct: "theorem",
        wrongs: ["diagram", "converse", "construction"]
      },
      {
        prompt: "A statement that explains the meaning of a term is a",
        correct: "definition",
        wrongs: ["postulate", "theorem", "counterexample"]
      },
      {
        prompt: "A statement based on observed patterns but not yet proven is a",
        correct: "conjecture",
        wrongs: ["theorem", "postulate", "proof"]
      }
    ];
    return buildQuestionSet((index) => {
      const selected = pick(cases, index);
      return makeQuestion(selected.prompt, selected.correct, selected.wrongs, "Geometry uses specific vocabulary for undefined terms, definitions, postulates, conjectures, and theorems.", `${kind}-${index}`);
    });
  }

  if (kind === "G.4B") {
    const relationships = [
      {
        conditional: "If a quadrilateral is a square, then it is a rectangle.",
        converse: "If a quadrilateral is a rectangle, then it is a square.",
        inverse: "If a quadrilateral is not a square, then it is not a rectangle.",
        contrapositive: "If a quadrilateral is not a rectangle, then it is not a square.",
        biconditional: "A quadrilateral is a square if and only if it is a rectangle."
      },
      {
        conditional: "If two lines are perpendicular, then they intersect to form right angles.",
        converse: "If two lines intersect to form right angles, then they are perpendicular.",
        inverse: "If two lines are not perpendicular, then they do not intersect to form right angles.",
        contrapositive: "If two lines do not intersect to form right angles, then they are not perpendicular.",
        biconditional: "Two lines are perpendicular if and only if they intersect to form right angles."
      }
    ];
    const askTypes = ["converse", "inverse", "contrapositive", "biconditional"];
    return buildQuestionSet((index) => {
      const relation = pick(relationships, index);
      const askType = pick(askTypes, index);
      return makeQuestion(
        `Given the conditional statement "${relation.conditional}" which statement is the ${askType}?`,
        relation[askType],
        askTypes.filter((type) => type !== askType).slice(0, 3).map((type) => relation[type]),
        "The converse swaps hypothesis and conclusion, the inverse negates both parts, the contrapositive swaps and negates, and a biconditional combines both directions.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.4C") {
    const cases = [
      {
        prompt: "Which figure is a counterexample to the false conjecture 'All parallelograms are rectangles'?",
        correct: "a rhombus that does not have right angles",
        wrongs: ["a square", "a rectangle", "a right triangle"]
      },
      {
        prompt: "Which figure is a counterexample to the false conjecture 'All quadrilaterals with four equal sides are squares'?",
        correct: "a rhombus with no right angles",
        wrongs: ["a square", "a rectangle", "an isosceles trapezoid"]
      },
      {
        prompt: "Which figure is a counterexample to the false conjecture 'All triangles are right triangles'?",
        correct: "an equilateral triangle",
        wrongs: ["a right triangle", "an isosceles right triangle", "a rectangle"]
      }
    ];
    return buildQuestionSet((index) => {
      const selected = pick(cases, index);
      return makeQuestion(selected.prompt, selected.correct, selected.wrongs, "A counterexample is one example that shows a conjecture is false.", `${kind}-${index}`);
    });
  }

  return buildQuestionSet((index) => {
    const cases = [
      {
        prompt: "Which statement is true in spherical geometry but not in Euclidean plane geometry?",
        correct: "The sum of the angles of a triangle can be greater than 180 degrees",
        wrongs: ["Parallel lines remain the same distance apart forever", "A line segment is the shortest distance between any two points on a plane", "Rectangles always have four right angles"]
      },
      {
        prompt: "Which statement is true in Euclidean plane geometry?",
        correct: "Parallel lines in a plane do not intersect",
        wrongs: ["All triangles have angle sums greater than 180 degrees", "There are no parallel lines", "Every line on a sphere is a straight line in a plane"]
      }
    ];
    const selected = pick(cases, index);
    return makeQuestion(selected.prompt, selected.correct, selected.wrongs, "Euclidean geometry describes flat planes, while spherical geometry describes figures on a sphere.", `${kind}-${index}`);
  });
}

function buildGeometryConstructions(kind) {
  if (kind === "G.5A") {
    const cases = [
      {
        prompt: "A student draws several isosceles triangles and notices that each pair of base angles has the same measure. Which conjecture is reasonable?",
        correct: "If two sides of a triangle are congruent, then the base angles are congruent",
        wrongs: [
          "If a triangle has two equal angles, then all three sides are unequal",
          "All triangles are isosceles",
          "Base angles in a triangle are always right angles"
        ]
      },
      {
        prompt: "A student measures several parallelograms and notices that opposite sides always match in length. Which conjecture is reasonable?",
        correct: "Opposite sides of a parallelogram are congruent",
        wrongs: [
          "Every parallelogram is a square",
          "Parallelograms have no parallel sides",
          "All sides of a parallelogram are congruent"
        ]
      }
    ];
    return buildQuestionSet((index) => {
      const selected = pick(cases, index);
      return makeQuestion(selected.prompt, selected.correct, selected.wrongs, "Patterns can be used to make conjectures, but a proof is needed to confirm the conjecture in general.", `${kind}-${index}`);
    });
  }

  if (kind === "G.5B") {
    const cases = [
      {
        prompt: "Which construction creates the perpendicular bisector of a segment?",
        correct: "Draw equal-radius arcs from each endpoint so the arcs intersect above and below the segment, then connect the arc intersections",
        wrongs: [
          "Draw one ray from an endpoint and estimate a right angle",
          "Connect the midpoint of the segment to only one endpoint",
          "Measure the segment and double its length"
        ]
      },
      {
        prompt: "Which construction copies an angle?",
        correct: "Use a compass to copy an arc from the original angle and reproduce the same arc and chord length on a new ray",
        wrongs: [
          "Draw any two rays and label them the same",
          "Bisect the angle and call each half a copy",
          "Translate the vertex without using a compass"
        ]
      },
      {
        prompt: "Which construction bisects an angle?",
        correct: "Draw an arc that intersects both sides of the angle, then use equal-radius arcs from those intersection points and connect the vertex to the new intersection",
        wrongs: [
          "Measure the angle and guess halfway",
          "Draw a line through only one side of the angle",
          "Reflect the angle across the x-axis"
        ]
      }
    ];
    return buildQuestionSet((index) => {
      const selected = pick(cases, index);
      return makeQuestion(selected.prompt, selected.correct, selected.wrongs, "Compass-and-straightedge constructions rely on equal distances and intersecting arcs to create exact geometric relationships.", `${kind}-${index}`);
    });
  }

  if (kind === "G.5C") {
    const cases = [
      {
        prompt: "After constructing the perpendicular bisector of segment AB, what conjecture can be made about any point on that bisector?",
        correct: "It is equidistant from A and B",
        wrongs: ["It must lie on segment AB", "It is always closer to A", "It forms a right angle with every line in the plane"]
      },
      {
        prompt: "After constructing the bisector of an angle, what conjecture can be made about points on the angle bisector?",
        correct: "They are equidistant from the two sides of the angle",
        wrongs: ["They are always midpoints of segments", "They are always on the x-axis", "They create two supplementary angles"]
      },
      {
        prompt: "If a segment-copy construction is performed correctly, what should be true about the original segment and the copy?",
        correct: "The two segments are congruent",
        wrongs: ["The copied segment must be longer", "The copied segment must be parallel to the original", "The two segments form a right angle"]
      }
    ];
    return buildQuestionSet((index) => {
      const selected = pick(cases, index);
      return makeQuestion(selected.prompt, selected.correct, selected.wrongs, "Geometric constructions help reveal properties that can be stated as conjectures.", `${kind}-${index}`);
    });
  }

  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const a = (index % 5) + 3;
      const b = a + 2;
      const c = index % 4 === 0 ? a + b - 1 : a + b + 1;
      const canForm = c < a + b;
      return makeQuestion(
        `Can side lengths ${a}, ${b}, and ${c} form a triangle?`,
        canForm ? "Yes" : "No",
        canForm ? ["No", "Only if all three angles are right angles", "Only if two sides are equal"] : ["Yes", "Only if all three angles are equal", "Only if one side has length 0"],
        "The Triangle Inequality Theorem says the sum of any two side lengths must be greater than the third side length.",
        `${kind}-${index}`
      );
    }
    const a = 5 + (index % 4);
    const b = 7 + (index % 4);
    const min = Math.abs(a - b) + 1;
    const correct = min + 2;
    return makeQuestion(
      `Which value could be the third side length x of a triangle with side lengths ${a}, ${b}, and x?`,
      String(correct),
      [String(Math.abs(a - b)), String(a + b), String(a + b + 1)],
      "For a triangle, the third side must be greater than the difference and less than the sum of the other two side lengths.",
      `${kind}-${index}`
    );
  });
}

function buildGeometryProof(kind) {
  if (kind === "G.6A") {
    return buildQuestionSet((index) => {
      const mode = index % 5;
      if (mode === 0) {
        const angle = 35 + (index % 30);
        return makeQuestion(
          `Two angles are vertical angles. If one angle measures ${angle} degrees, what is the measure of the other angle?`,
          String(angle),
          [String(180 - angle), String(angle + 10), String(Math.abs(angle - 10))],
          "Vertical angles are congruent.",
          `${kind}-${index}`
        );
      }
      if (mode === 1) {
        const angle = 20 + (index % 30);
        return makeQuestion(
          `Two angles are complementary. If one angle measures ${angle} degrees, what is the measure of the other angle?`,
          String(90 - angle),
          [String(180 - angle), String(angle), String(90 + angle)],
          "Complementary angles have a sum of 90 degrees.",
          `${kind}-${index}`
        );
      }
      if (mode === 2) {
        const angle = 70 + (index % 20);
        return makeQuestion(
          `Two angles are supplementary. If one angle measures ${angle} degrees, what is the measure of the other angle?`,
          String(180 - angle),
          [String(angle), String(100 - (index % 10)), String(180 + angle)],
          "Supplementary angles have a sum of 180 degrees.",
          `${kind}-${index}`
        );
      }
      if (mode === 3) {
        const angle = 40 + (index % 35);
        return makeQuestion(
          `Parallel lines are cut by a transversal. If one alternate interior angle measures ${angle} degrees, what is the measure of the alternate interior angle on the other line?`,
          String(angle),
          [String(180 - angle), String(angle + 15), String(Math.abs(angle - 15))],
          "Alternate interior angles are congruent when the lines are parallel.",
          `${kind}-${index}`
        );
      }
      const length = 4 + (index % 6);
      return makeQuestion(
        `Point P lies on the perpendicular bisector of segment AB. If PA = ${length}, what is PB?`,
        String(length),
        [String(length + 2), String(length - 1), String(length * 2)],
        "Any point on the perpendicular bisector of a segment is equidistant from the segment's endpoints.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.6B") {
    const cases = [
      { description: "three pairs of corresponding sides", answer: "SSS" },
      { description: "two pairs of corresponding sides and the included angle", answer: "SAS" },
      { description: "two pairs of corresponding angles and the included side", answer: "ASA" },
      { description: "two pairs of corresponding angles and a non-included side", answer: "AAS" },
      { description: "the hypotenuse and one leg of two right triangles", answer: "HL" }
    ];
    return buildQuestionSet((index) => {
      const selected = pick(cases, index);
      return makeQuestion(
        `Which congruence theorem or postulate matches this information: ${selected.description} are congruent?`,
        selected.answer,
        uniqueStrings(["SSS", "SAS", "ASA", "AAS", "HL"]).filter((value) => value !== selected.answer).slice(0, 3),
        "Triangle congruence depends on which corresponding sides and angles are known to be congruent.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.6C") {
    const transforms = [
      {
        label: "a translation right 3 units and up 2 units",
        image: (point) => translatePoint(point, 3, 2)
      },
      {
        label: "a reflection across the y-axis",
        image: (point) => reflectY(point)
      },
      {
        label: "a 180-degree rotation about the origin",
        image: (point) => rotate180(point)
      }
    ];
    return buildQuestionSet((index) => {
      const base = [
        ["A", 1, 1],
        ["B", 4, 1],
        ["C", 2, 3]
      ];
      const selected = pick(transforms, index);
      const image = base.map(([name, x, y]) => [name, ...selected.image([x, y])]);
      return makeQuestion(
        `Triangle ABC has vertices ${formatVertices(base)}. Triangle A'B'C' has vertices ${formatVertices(image)}. Which rigid transformation maps triangle ABC to triangle A'B'C'?`,
        selected.label,
        transforms.filter((entry) => entry.label !== selected.label).slice(0, 3).map((entry) => entry.label),
        "Rigid transformations preserve side lengths and angle measures, so they can be used to show congruence.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.6D") {
    return buildQuestionSet((index) => {
      const mode = index % 5;
      if (mode === 0) {
        const scale = (index % 4) + 1;
        return makeQuestion(
          `A right triangle has legs ${3 * scale} and ${4 * scale}. What is the hypotenuse?`,
          String(5 * scale),
          [String(6 * scale), String(7 * scale), String(4 * scale)],
          "The Pythagorean theorem gives the relationship between the legs and the hypotenuse of a right triangle.",
          `${kind}-${index}`
        );
      }
      if (mode === 1) {
        const angleA = 40 + (index % 20);
        const angleB = 60;
        return makeQuestion(
          `Two angles of a triangle measure ${angleA} degrees and ${angleB} degrees. What is the third angle?`,
          String(180 - angleA - angleB),
          [String(angleA + angleB), String(90 - (angleA % 10)), String(180 - angleA)],
          "The interior angles of a triangle have a sum of 180 degrees.",
          `${kind}-${index}`
        );
      }
      if (mode === 2) {
        const vertexAngle = 40 + (index % 30);
        const baseAngle = (180 - vertexAngle) / 2;
        return makeQuestion(
          `An isosceles triangle has a vertex angle of ${vertexAngle} degrees. What is the measure of each base angle?`,
          numberText(baseAngle),
          [String(180 - vertexAngle), numberText(vertexAngle / 2), numberText(baseAngle + 10)],
          "The base angles of an isosceles triangle are congruent, and all three angles total 180 degrees.",
          `${kind}-${index}`
        );
      }
      if (mode === 3) {
        const thirdSide = 10 + 2 * (index % 5);
        return makeQuestion(
          `In a triangle, a midsegment is parallel to the third side, which has length ${thirdSide}. What is the length of the midsegment?`,
          numberText(thirdSide / 2),
          [String(thirdSide), numberText(thirdSide / 3), numberText(thirdSide / 2 + 2)],
          "A triangle midsegment is parallel to the third side and has half its length.",
          `${kind}-${index}`
        );
      }
      const part = 3 + (index % 4);
      return makeQuestion(
        `In triangle ABC, point D is the midpoint of BC and AD is a median. If BD = ${part}, what is DC?`,
        String(part),
        [String(part + 1), String(part * 2), String(Math.max(1, part - 1))],
        "A median connects a vertex to the midpoint of the opposite side, so the midpoint divides the side into two congruent segments.",
        `${kind}-${index}`
      );
    });
  }

  return buildQuestionSet((index) => {
    const cases = [
      {
        prompt: "A quadrilateral has both pairs of opposite sides parallel. What type of quadrilateral must it be?",
        correct: "parallelogram",
        wrongs: ["kite", "triangle", "circle"]
      },
      {
        prompt: "A parallelogram has one right angle. What type of quadrilateral must it be?",
        correct: "rectangle",
        wrongs: ["kite", "trapezoid", "scalene triangle"]
      },
      {
        prompt: "A parallelogram has four congruent sides. What type of quadrilateral must it be?",
        correct: "rhombus",
        wrongs: ["trapezoid", "triangle", "circle"]
      },
      {
        prompt: "A quadrilateral has four congruent sides and four right angles. What type of quadrilateral is it?",
        correct: "square",
        wrongs: ["kite", "scalene trapezoid", "pentagon"]
      },
      {
        prompt: "If the diagonals of a quadrilateral bisect each other, what is a justified conclusion?",
        correct: "The quadrilateral is a parallelogram",
        wrongs: ["The quadrilateral must be a kite", "The quadrilateral must be a triangle", "The quadrilateral has no parallel sides"]
      }
    ];
    const selected = pick(cases, index);
    return makeQuestion(selected.prompt, selected.correct, selected.wrongs, "Special quadrilaterals can be identified by their defining properties and proven relationships.", `${kind}-${index}`);
  });
}

function buildGeometrySimilarity(kind) {
  if (kind === "G.7A") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        const factor = (index % 4) + 2;
        const base = [3, 4, 5];
        const image = base.map((value) => value * factor);
        return makeQuestion(
          `Triangle PQR has side lengths 3, 4, and 5. Triangle STU has side lengths ${image.join(", ")}. What is the scale factor from triangle PQR to triangle STU?`,
          String(factor),
          [fractionOrWhole(1, factor), String(factor + 1), String(base[2])],
          "Similar figures have proportional corresponding sides, and the scale factor is the multiplier from one figure to the other.",
          `${kind}-${index}`
        );
      }
      const point = [2 + (index % 3), 1 + (index % 4)];
      const factor = 2 + (index % 3);
      const image = dilate(point, factor);
      return makeQuestion(
        `Point A${formatPoint(point[0], point[1])} is dilated from the origin by a scale factor of ${factor}. What is the image of A?`,
        formatPoint(image[0], image[1]),
        [formatPoint(point[0] + factor, point[1] + factor), formatPoint(point[0] * factor, point[1]), formatPoint(point[0], point[1] * factor)],
        "A dilation centered at the origin multiplies each coordinate by the scale factor.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.7B") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        return makeQuestion(
          "If two angles of one triangle are congruent to two angles of another triangle, which statement is justified?",
          "The triangles are similar by AA",
          ["The triangles are congruent by SSS", "The triangles must be right triangles", "The triangles are not related"],
          "AA similarity says two congruent pairs of corresponding angles are enough to prove triangles similar.",
          `${kind}-${index}`
        );
      }
      const shortA = 3 + (index % 4);
      const shortB = shortA * 2;
      const missing = 5 + (index % 4);
      const imageMissing = missing * 2;
      return makeQuestion(
        `Two similar triangles have corresponding side lengths ${shortA} and ${shortB}. If another side on the smaller triangle is ${missing}, what is the corresponding side on the larger triangle?`,
        String(imageMissing),
        [String(missing), String(imageMissing + 2), String(shortA + shortB)],
        "Corresponding sides in similar triangles are proportional by the same scale factor.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.8A") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        const ad = 3 + (index % 4);
        const db = 6 + (index % 4);
        const ae = 2 + (index % 3);
        const x = (db * ae) / ad;
        return makeQuestion(
          `In triangle ABC, points D and E lie on AB and AC, and DE is parallel to BC. If AD = ${ad}, DB = ${db}, and AE = ${ae}, what is EC?`,
          numberText(x),
          [numberText(ae + db), numberText((ad + db) / ae), numberText(db - ae)],
          "When a line is parallel to one side of a triangle, it divides the other two sides proportionally.",
          `${kind}-${index}`
        );
      }
      return makeQuestion(
        "In triangle ABC, if DE is parallel to BC with D on AB and E on AC, which proportion must be true?",
        "AD/DB = AE/EC",
        ["AD/AE = DB/EC", "AB/BC = AC/DE", "AD/EC = DB/AE"],
        "The Triangle Proportionality Theorem says a line parallel to one side of a triangle divides the other two sides proportionally.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.8B") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        const p = 4 + (index % 5);
        const q = 9 + (index % 4);
        const altitude = Math.sqrt(p * q);
        return makeQuestion(
          `A right triangle has an altitude to the hypotenuse that divides the hypotenuse into segments of lengths ${p} and ${q}. What is the altitude?`,
          numberText(altitude),
          [numberText(p + q), numberText(Math.abs(q - p)), numberText((p + q) / 2)],
          "The altitude to the hypotenuse is the geometric mean of the two hypotenuse segments, so h^2 = pq.",
          `${kind}-${index}`
        );
      }
      const hypotenuse = 25;
      const adjacentSegment = 9 + 4 * (index % 3);
      const leg = Math.sqrt(hypotenuse * adjacentSegment);
      return makeQuestion(
        `A right triangle has hypotenuse ${hypotenuse}. One leg projects to a segment of length ${adjacentSegment} on the hypotenuse. What is the length of that leg?`,
        numberText(leg),
        [numberText(adjacentSegment), numberText(Math.sqrt(adjacentSegment)), numberText((hypotenuse + adjacentSegment) / 2)],
        "Each leg of a right triangle is the geometric mean of the hypotenuse and the adjacent hypotenuse segment.",
        `${kind}-${index}`
      );
    });
  }

  return buildQuestionSet((index) => {
    if (kind === "G.9A") {
      const triangles = [
        { opposite: 3, adjacent: 4, hypotenuse: 5 },
        { opposite: 5, adjacent: 12, hypotenuse: 13 },
        { opposite: 8, adjacent: 15, hypotenuse: 17 }
      ];
      const triangle = pick(triangles, index);
      const ratio = index % 3;
      if (ratio === 0) {
        return makeQuestion(
          `In a right triangle, angle theta has opposite side ${triangle.opposite}, adjacent side ${triangle.adjacent}, and hypotenuse ${triangle.hypotenuse}. What is sin(theta)?`,
          fractionOrWhole(triangle.opposite, triangle.hypotenuse),
          [fractionOrWhole(triangle.adjacent, triangle.hypotenuse), fractionOrWhole(triangle.opposite, triangle.adjacent), fractionOrWhole(triangle.hypotenuse, triangle.opposite)],
          "Sine is opposite divided by hypotenuse.",
          `${kind}-${index}`
        );
      }
      if (ratio === 1) {
        return makeQuestion(
          `In a right triangle, angle theta has opposite side ${triangle.opposite}, adjacent side ${triangle.adjacent}, and hypotenuse ${triangle.hypotenuse}. What is cos(theta)?`,
          fractionOrWhole(triangle.adjacent, triangle.hypotenuse),
          [fractionOrWhole(triangle.opposite, triangle.hypotenuse), fractionOrWhole(triangle.opposite, triangle.adjacent), fractionOrWhole(triangle.hypotenuse, triangle.adjacent)],
          "Cosine is adjacent divided by hypotenuse.",
          `${kind}-${index}`
        );
      }
      return makeQuestion(
        `In a right triangle, angle theta has opposite side ${triangle.opposite}, adjacent side ${triangle.adjacent}, and hypotenuse ${triangle.hypotenuse}. What is tan(theta)?`,
        fractionOrWhole(triangle.opposite, triangle.adjacent),
        [fractionOrWhole(triangle.adjacent, triangle.hypotenuse), fractionOrWhole(triangle.opposite, triangle.hypotenuse), fractionOrWhole(triangle.hypotenuse, triangle.adjacent)],
        "Tangent is opposite divided by adjacent.",
        `${kind}-${index}`
      );
    }

    const mode = index % 3;
    if (mode === 0) {
      const leg = 2 + (index % 5);
      return makeQuestion(
        `A 45-45-90 triangle has legs of length ${leg}. What is the hypotenuse?`,
        radicalText(leg, 2),
        [String(2 * leg), String(leg), radicalText(leg + 1, 2)],
        "In a 45-45-90 triangle, the hypotenuse is leg times sqrt(2).",
        `${kind}-${index}`
      );
    }
    if (mode === 1) {
      const shortLeg = 2 + (index % 5);
      return makeQuestion(
        `A 30-60-90 triangle has a short leg of length ${shortLeg}. What is the hypotenuse?`,
        String(2 * shortLeg),
        [radicalText(shortLeg, 3), String(shortLeg), radicalText(2 * shortLeg, 3)],
        "In a 30-60-90 triangle, the hypotenuse is twice the short leg.",
        `${kind}-${index}`
      );
    }
    return makeQuestion(
      "Which set of side lengths is a Pythagorean triple?",
      "8, 15, 17",
      ["8, 15, 16", "6, 7, 8", "9, 10, 12"],
      "A Pythagorean triple satisfies a^2 + b^2 = c^2.",
      `${kind}-${index}`
    );
  });
}

function buildGeometryRightTriangles(kind) {
  return buildGeometrySimilarity(kind);
}

function buildGeometryMeasurement(kind) {
  if (kind === "G.10A") {
    const cases = [
      {
        prompt: "What solid is formed when a rectangle is rotated around one of its sides?",
        correct: "cylinder",
        wrongs: ["cone", "sphere", "triangular prism"]
      },
      {
        prompt: "What solid is formed when a right triangle is rotated around one of its legs?",
        correct: "cone",
        wrongs: ["cylinder", "rectangular prism", "sphere"]
      },
      {
        prompt: "What solid is formed when a semicircle is rotated around its diameter?",
        correct: "sphere",
        wrongs: ["cone", "cube", "pyramid"]
      },
      {
        prompt: "What is the shape of a cross-section made by slicing a cylinder parallel to its base?",
        correct: "circle",
        wrongs: ["triangle", "trapezoid", "pentagon"]
      },
      {
        prompt: "What is the shape of a cross-section made by slicing a rectangular prism parallel to its base?",
        correct: "rectangle",
        wrongs: ["circle", "triangle", "hexagon"]
      }
    ];
    return buildQuestionSet((index) => {
      const selected = pick(cases, index);
      return makeQuestion(selected.prompt, selected.correct, selected.wrongs, "Rotations of two-dimensional figures create solids, and cross-sections depend on how a plane intersects the solid.", `${kind}-${index}`);
    });
  }

  if (kind === "G.10B") {
    return buildQuestionSet((index) => {
      const mode = index % 3;
      const scale = 2 + (index % 3);
      if (mode === 0) {
        const perimeter = 10 + 2 * (index % 5);
        return makeQuestion(
          `A figure with perimeter ${perimeter} is dilated by a scale factor of ${scale}. What is the new perimeter?`,
          String(perimeter * scale),
          [String(perimeter * scale * scale), String(perimeter + scale), String(perimeter)],
          "Perimeter changes by the linear scale factor.",
          `${kind}-${index}`
        );
      }
      if (mode === 1) {
        const area = 12 + 3 * (index % 5);
        return makeQuestion(
          `A figure with area ${area} square units is dilated by a scale factor of ${scale}. What is the new area?`,
          String(area * scale * scale),
          [String(area * scale), String(area * scale * scale * scale), String(area + scale)],
          "Area changes by the square of the linear scale factor.",
          `${kind}-${index}`
        );
      }
      const volume = 5 + (index % 6);
      return makeQuestion(
        `A solid with volume ${volume} cubic units is dilated by a scale factor of ${scale}. What is the new volume?`,
        String(volume * scale * scale * scale),
        [String(volume * scale * scale), String(volume * scale), String(volume + scale)],
        "Volume changes by the cube of the linear scale factor.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.11A") {
    return buildQuestionSet((index) => {
      const perimeter = 24 + 6 * (index % 5);
      const apothem = 4 + (index % 4);
      const area = (perimeter * apothem) / 2;
      return makeQuestion(
        `A regular polygon has perimeter ${perimeter} units and apothem ${apothem} units. What is its area?`,
        String(area),
        [String(perimeter * apothem), String(perimeter + apothem), String(area + apothem)],
        "The area of a regular polygon is 1/2 times apothem times perimeter.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.11B") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        const length = 8 + (index % 4);
        const width = 4 + (index % 3);
        const triBase = width;
        const triHeight = 4 + (index % 3);
        const area = length * width + (triBase * triHeight) / 2;
        return makeQuestion(
          `A composite figure is made of a rectangle with dimensions ${length} by ${width} and a triangle attached to one side with base ${triBase} and height ${triHeight}. What is the total area?`,
          String(area),
          [String(length * width), String((triBase * triHeight) / 2), String(area + width)],
          "Find the area of each part and add them to get the composite area.",
          `${kind}-${index}`
        );
      }
      const outerLength = 10 + (index % 4);
      const outerWidth = 8 + (index % 3);
      const cutLength = 4 + (index % 3);
      const cutWidth = 2 + (index % 2);
      const area = outerLength * outerWidth - cutLength * cutWidth;
      return makeQuestion(
        `An L-shaped figure is formed by removing a ${cutLength} by ${cutWidth} rectangle from a ${outerLength} by ${outerWidth} rectangle. What is the area of the L-shape?`,
        String(area),
        [String(outerLength * outerWidth), String(cutLength * cutWidth), String(area + cutWidth)],
        "Find the area of the larger rectangle and subtract the missing rectangle.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.11C") {
    return buildQuestionSet((index) => {
      const length = 6 + (index % 4);
      const width = 4 + (index % 3);
      const height = 5 + (index % 3);
      if (index % 2 === 0) {
        const lateral = 2 * height * (length + width);
        return makeQuestion(
          `What is the lateral surface area of a rectangular prism with length ${length}, width ${width}, and height ${height}?`,
          String(lateral),
          [String(2 * length * width + lateral), String(length * width * height), String(lateral + length)],
          "Lateral surface area of a rectangular prism includes only the side faces: 2h(l + w).",
          `${kind}-${index}`
        );
      }
      const total = 2 * (length * width + length * height + width * height);
      return makeQuestion(
        `What is the total surface area of a rectangular prism with length ${length}, width ${width}, and height ${height}?`,
        String(total),
        [String(2 * height * (length + width)), String(length * width * height), String(total + width)],
        "Total surface area of a rectangular prism is 2lw + 2lh + 2wh.",
        `${kind}-${index}`
      );
    });
  }

  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const length = 4 + (index % 5);
      const width = 3 + (index % 4);
      const height = 5 + (index % 3);
      return makeQuestion(
        `What is the volume of a rectangular prism with dimensions ${length}, ${width}, and ${height}?`,
        String(length * width * height),
        [String(2 * (length * width + length * height + width * height)), String(length * width), String(length + width + height)],
        "Volume of a prism is the area of the base times the height.",
        `${kind}-${index}`
      );
    }
    const radius = 3 + (index % 4);
    const height = 5 + (index % 3);
    return makeQuestion(
      `What is the volume of a cylinder with radius ${radius} and height ${height}?`,
      piText(radius * radius * height),
      [piText(2 * radius * height), piText(radius * height), String(radius * radius * height)],
      "The volume of a cylinder is pi times radius squared times height.",
      `${kind}-${index}`
    );
  });
}

function buildGeometryCircles(kind) {
  if (kind === "G.12A") {
    const cases = [
      {
        prompt: "In a circle, a central angle intercepts an arc of 80 degrees. What is the measure of the central angle?",
        correct: "80",
        wrongs: ["40", "160", "100"]
      },
      {
        prompt: "An inscribed angle intercepts an arc of 100 degrees. What is the measure of the inscribed angle?",
        correct: "50",
        wrongs: ["100", "200", "25"]
      },
      {
        prompt: "A radius is drawn to the point where a tangent touches a circle. What is the angle between the radius and the tangent?",
        correct: "90",
        wrongs: ["45", "180", "60"]
      },
      {
        prompt: "If two chords in the same circle are congruent, what must also be true?",
        correct: "They intercept congruent arcs",
        wrongs: ["They must be diameters", "They must be perpendicular", "They must intersect at the center"]
      },
      {
        prompt: "If two chords are the same distance from the center of a circle, what is true?",
        correct: "The chords are congruent",
        wrongs: ["The chords are tangents", "The chords are diameters", "The chords have different lengths"]
      }
    ];
    return buildQuestionSet((index) => {
      const selected = pick(cases, index);
      return makeQuestion(selected.prompt, selected.correct, selected.wrongs, "Circle theorems connect central angles, inscribed angles, radii, tangents, chords, and arcs.", `${kind}-${index}`);
    });
  }

  if (kind === "G.12B") {
    return buildQuestionSet((index) => {
      const angle = pick([90, 120, 180], index);
      const radius = angle === 120 ? 3 * ((index % 3) + 1) : 2 + (index % 4);
      const coefficient = (angle / 180) * radius;
      return makeQuestion(
        `A circle has radius ${radius}. What is the length of an arc with central angle ${angle} degrees?`,
        piText(coefficient),
        [piText(coefficient * 2), piText(radius), String(angle * radius)],
        "Arc length equals the fraction of the full circle times the circumference: angle/360 times 2pi r.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.12C") {
    return buildQuestionSet((index) => {
      const angle = pick([90, 120, 180], index);
      const radius = angle === 120 ? 3 * ((index % 3) + 1) : 2 + (index % 4);
      const coefficient = (angle / 360) * radius * radius;
      return makeQuestion(
        `A circle has radius ${radius}. What is the area of a sector with central angle ${angle} degrees?`,
        piText(coefficient),
        [piText(coefficient * 2), piText(radius * radius), String(radius * radius)],
        "Sector area equals the fraction of the full circle times the area of the whole circle: angle/360 times pi r^2.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.12D") {
    const conversions = [
      { degrees: 30, radians: "pi/6" },
      { degrees: 45, radians: "pi/4" },
      { degrees: 60, radians: "pi/3" },
      { degrees: 90, radians: "pi/2" },
      { degrees: 120, radians: "2pi/3" },
      { degrees: 135, radians: "3pi/4" },
      { degrees: 150, radians: "5pi/6" },
      { degrees: 180, radians: "pi" }
    ];
    return buildQuestionSet((index) => {
      const selected = pick(conversions, index);
      if (index % 2 === 0) {
        return makeQuestion(
          `What is ${selected.degrees} degrees in radians?`,
          selected.radians,
          conversions.filter((entry) => entry.radians !== selected.radians).slice(0, 3).map((entry) => entry.radians),
          "Convert degrees to radians by multiplying by pi/180.",
          `${kind}-${index}`
        );
      }
      return makeQuestion(
        `What angle measure in degrees is equal to ${selected.radians} radians?`,
        String(selected.degrees),
        conversions.filter((entry) => entry.degrees !== selected.degrees).slice(0, 3).map((entry) => String(entry.degrees)),
        "Convert radians to degrees by multiplying by 180/pi.",
        `${kind}-${index}`
      );
    });
  }

  return buildQuestionSet((index) => {
    if (index % 2 === 0) {
      const h = (index % 5) - 2;
      const k = (index % 7) - 3;
      const r = 2 + (index % 4);
      return makeQuestion(
        `Which equation represents the circle with center ${formatPoint(h, k)} and radius ${r}?`,
        formatCircleEquation(h, k, r),
        [formatCircleEquation(h + 1, k, r), formatCircleEquation(h, k + 1, r), formatCircleEquation(h, k, r + 1)],
        "A circle with center (h, k) and radius r has equation (x - h)^2 + (y - k)^2 = r^2.",
        `${kind}-${index}`
      );
    }
    const h = (index % 5) - 2;
    const k = (index % 7) - 3;
    const r = 2 + (index % 4);
    const equation = formatCircleEquation(h, k, r);
    return makeQuestion(
      `The equation of a circle is ${equation}. What is its center?`,
      formatPoint(h, k),
      [formatPoint(h + 1, k), formatPoint(h, k + 1), formatPoint(-h, -k)],
      "The center of a circle comes from the values in standard form (x - h)^2 + (y - k)^2 = r^2.",
      `${kind}-${index}`
    );
  });
}

function buildGeometryProbability(kind) {
  if (kind === "G.13A") {
    return buildQuestionSet((index) => {
      if (index % 2 === 0) {
        const n = 5 + (index % 4);
        const r = 3;
        return makeQuestion(
          `How many ways can ${r} medals be awarded to ${n} runners if order matters?`,
          String(permutation(n, r)),
          [String(combination(n, r)), String(n * r), String(n + r)],
          "Permutations are used when order matters.",
          `${kind}-${index}`
        );
      }
      const n = 6 + (index % 5);
      const r = 2 + (index % 2);
      return makeQuestion(
        `How many committees of ${r} students can be chosen from ${n} students if order does not matter?`,
        String(combination(n, r)),
        [String(permutation(n, r)), String(n * r), String(n + r)],
        "Combinations are used when order does not matter.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.13B") {
    return buildQuestionSet((index) => {
      const totalLength = 10 + (index % 4);
      const totalWidth = 8 + (index % 3);
      const shadedLength = 2 + (index % 4);
      const shadedWidth = 3 + (index % 2);
      const totalArea = totalLength * totalWidth;
      const shadedArea = shadedLength * shadedWidth;
      return makeQuestion(
        `A point is chosen at random from a ${totalLength} by ${totalWidth} rectangle. A ${shadedLength} by ${shadedWidth} rectangle inside it is shaded. What is the probability that the point lands in the shaded region?`,
        fractionOrWhole(shadedArea, totalArea),
        [fractionOrWhole(totalArea - shadedArea, totalArea), fractionOrWhole(shadedLength + shadedWidth, totalArea), fractionOrWhole(shadedArea, shadedArea + totalArea)],
        "Geometric probability for uniform regions is favorable area divided by total area.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.13C") {
    return buildQuestionSet((index) => {
      const red = 3 + (index % 3);
      const blue = 2 + (index % 3);
      const total = red + blue;
      if (index % 3 === 0) {
        return makeQuestion(
          `A bag has ${red} red marbles and ${blue} blue marbles. If a marble is drawn, replaced, and then another is drawn, what is the probability of drawing two red marbles?`,
          fractionOrWhole(red * red, total * total),
          [fractionOrWhole(red * (red - 1), total * (total - 1)), fractionOrWhole(red, total), fractionOrWhole(blue * blue, total * total)],
          "With replacement, the draws are independent, so multiply the same single-draw probability twice.",
          `${kind}-${index}`
        );
      }
      if (index % 3 === 1) {
        return makeQuestion(
          `A bag has ${red} red marbles and ${blue} blue marbles. If two marbles are drawn without replacement, what is the probability of drawing two red marbles?`,
          fractionOrWhole(red * (red - 1), total * (total - 1)),
          [fractionOrWhole(red * red, total * total), fractionOrWhole(red, total), fractionOrWhole(blue * (blue - 1), total * (total - 1))],
          "Without replacement, the probabilities change after the first draw, so the events are not independent.",
          `${kind}-${index}`
        );
      }
      return makeQuestion(
        "Which situation describes independent events?",
        "Selecting a card, replacing it, and then selecting another card",
        [
          "Selecting a card and not replacing it before choosing another",
          "Taking marbles from a bag without replacement",
          "Choosing two students from a class without replacement"
        ],
        "Events are independent when the outcome of one does not change the probability of the other.",
        `${kind}-${index}`
      );
    });
  }

  if (kind === "G.13D") {
    return buildQuestionSet((index) => {
      const girls = 8 + (index % 4);
      const boys = 10 + (index % 4);
      const bandGirls = 4 + (index % 3);
      const bandBoys = 5 + (index % 3);
      const totalBand = bandGirls + bandBoys;
      if (index % 2 === 0) {
        return makeQuestion(
          `In a group, ${girls} students are girls and ${boys} are boys. Of the girls, ${bandGirls} are in band. What is P(band | girl)?`,
          fractionOrWhole(bandGirls, girls),
          [fractionOrWhole(bandGirls, girls + boys), fractionOrWhole(girls, bandGirls), fractionOrWhole(totalBand, girls + boys)],
          "Conditional probability uses the restricted group as the new total.",
          `${kind}-${index}`
        );
      }
      return makeQuestion(
        `In a group, ${girls} students are girls and ${boys} are boys. There are ${bandGirls} girls in band and ${bandBoys} boys in band. What is P(girl | band)?`,
        fractionOrWhole(bandGirls, totalBand),
        [fractionOrWhole(bandGirls, girls + boys), fractionOrWhole(girls, totalBand), fractionOrWhole(totalBand, girls + boys)],
        "For P(girl | band), only students in band are counted in the denominator.",
        `${kind}-${index}`
      );
    });
  }

  return buildQuestionSet((index) => {
    if (index % 3 === 0) {
      return makeQuestion(
        "Event A has probability 1/2, event B has probability 1/3, and P(A and B) = 1/6. Are the events independent?",
        "Yes, because P(A and B) = P(A)P(B)",
        [
          "No, because the probabilities are different",
          "No, because one event has probability 1/2",
          "Yes, because independent events always have equal probabilities"
        ],
        "Events are independent when the probability of both occurring equals the product of their individual probabilities.",
        `${kind}-${index}`
      );
    }
    if (index % 3 === 1) {
      return makeQuestion(
        "Which pair of events is independent?",
        "Flipping a coin and rolling a number cube",
        [
          "Drawing two cards from a deck without replacement",
          "Choosing two students from a class without replacement",
          "Drawing two marbles from a bag without replacement"
        ],
        "Separate random processes such as a coin flip and a die roll do not affect each other.",
        `${kind}-${index}`
      );
    }
    return makeQuestion(
      "Which statement best describes events that are not independent?",
      "The outcome of the first event changes the probability of the second event",
      [
        "The first and second events always have the same probability",
        "Both events must happen at the same time",
        "Each event must have probability 1/2"
      ],
      "Dependent events are not independent because one result changes the probability of the next result.",
      `${kind}-${index}`
    );
  });
}

const QUIZ_BUILDERS = [
  ["G.1A", "Math Geometry G.1A", "Apply mathematics to problems arising in everyday life, society, and the workplace.", 0, "Mathematical Process Standards", "Core", () => buildProcessApply("G.1A")],
  ["G.1B", "Math Geometry G.1B", "Use a problem-solving model that incorporates analyzing information, formulating a plan or strategy, determining a solution, justifying the solution, and evaluating the reasonableness of the solution.", 0, "Mathematical Process Standards", "Core", () => buildProcessModel("G.1B")],
  ["G.1C", "Math Geometry G.1C", "Select tools, including manipulatives, paper and pencil, and technology as appropriate, and techniques, including mental math, estimation, and number sense as appropriate, to solve problems.", 0, "Mathematical Process Standards", "Core", () => buildProcessTools("G.1C")],
  ["G.1D", "Math Geometry G.1D", "Communicate mathematical ideas, reasoning, and their implications using multiple representations, including symbols, diagrams, graphs, and language.", 0, "Mathematical Process Standards", "Core", () => buildProcessCommunicate("G.1D")],
  ["G.1E", "Math Geometry G.1E", "Create and use representations to organize, record, and communicate mathematical ideas.", 0, "Mathematical Process Standards", "Core", () => buildProcessRepresent("G.1E")],
  ["G.1F", "Math Geometry G.1F", "Analyze mathematical relationships to connect and communicate mathematical ideas.", 0, "Mathematical Process Standards", "Core", () => buildProcessRelationships("G.1F")],
  ["G.1G", "Math Geometry G.1G", "Display, explain, and justify mathematical ideas and arguments using precise mathematical language in written or oral communication.", 0, "Mathematical Process Standards", "Core", () => buildProcessLanguage("G.1G")],

  ["G.2A", "Math Geometry G.2A", cleanDescription("determine coordinates of a point that divides a segment in a given ratio and apply proportionality in related situations"), 1, "Coordinate and Transformational Geometry", "Assessed", () => buildGeometryCoordinate("G.2A")],
  ["G.2B", "Math Geometry G.2B", cleanDescription("derive and use the formulas for slope, midpoint, and distance between two points in the coordinate plane to solve problems"), 1, "Coordinate and Transformational Geometry", "Assessed", () => buildGeometryCoordinate("G.2B")],
  ["G.2C", "Math Geometry G.2C", cleanDescription("determine an equation of a line parallel or perpendicular to a given line that passes through a given point"), 1, "Coordinate and Transformational Geometry", "Assessed", () => buildGeometryCoordinate("G.2C")],
  ["G.3A", "Math Geometry G.3A", cleanDescription("describe and perform transformations of figures in a coordinate plane using coordinate notation"), 1, "Coordinate and Transformational Geometry", "Assessed", () => buildGeometryTransformations("G.3A")],
  ["G.3B", "Math Geometry G.3B", cleanDescription("determine the image or preimage of a figure under a composition of transformations, including dilations, in the coordinate plane"), 1, "Coordinate and Transformational Geometry", "Assessed", () => buildGeometryTransformations("G.3B")],
  ["G.3C", "Math Geometry G.3C", cleanDescription("identify a sequence of transformations that will carry a given figure onto another figure"), 1, "Coordinate and Transformational Geometry", "Assessed", () => buildGeometryTransformations("G.3C")],
  ["G.3D", "Math Geometry G.3D", cleanDescription("identify reflectional and rotational symmetry in two-dimensional figures"), 1, "Coordinate and Transformational Geometry", "Assessed", () => buildGeometryTransformations("G.3D")],

  ["G.4A", "Math Geometry G.4A", cleanDescription("distinguish between undefined terms, defined terms, postulates, conjectures, and theorems"), 2, "Logical Argument and Constructions", "Assessed", () => buildGeometryLogic("G.4A")],
  ["G.4B", "Math Geometry G.4B", cleanDescription("identify and determine the validity of the converse, inverse, contrapositive, and biconditional of conditional statements"), 2, "Logical Argument and Constructions", "Assessed", () => buildGeometryLogic("G.4B")],
  ["G.4C", "Math Geometry G.4C", cleanDescription("use counterexamples to disprove statements and conjectures"), 2, "Logical Argument and Constructions", "Assessed", () => buildGeometryLogic("G.4C")],
  ["G.4D", "Math Geometry G.4D", cleanDescription("compare and contrast the characteristics of Euclidean and spherical geometries"), 2, "Logical Argument and Constructions", "Assessed", () => buildGeometryLogic("G.4D")],
  ["G.5A", "Math Geometry G.5A", cleanDescription("investigate patterns to make conjectures and determine the reasonableness of geometric relationships"), 2, "Logical Argument and Constructions", "Assessed", () => buildGeometryConstructions("G.5A")],
  ["G.5B", "Math Geometry G.5B", cleanDescription("perform constructions using a straightedge and compass or technology"), 2, "Logical Argument and Constructions", "Assessed", () => buildGeometryConstructions("G.5B")],
  ["G.5C", "Math Geometry G.5C", cleanDescription("use constructions to make conjectures about geometric relationships"), 2, "Logical Argument and Constructions", "Assessed", () => buildGeometryConstructions("G.5C")],
  ["G.5D", "Math Geometry G.5D", cleanDescription("verify the Triangle Inequality Theorem and use relationships among sides of triangles"), 2, "Logical Argument and Constructions", "Assessed", () => buildGeometryConstructions("G.5D")],

  ["G.6A", "Math Geometry G.6A", cleanDescription("verify and apply geometric theorems about angles, lines, and points equidistant from the endpoints of a segment"), 3, "Congruence, Similarity, and Right Triangle Relationships", "Assessed", () => buildGeometryProof("G.6A")],
  ["G.6B", "Math Geometry G.6B", cleanDescription("prove triangles congruent by SSS, SAS, ASA, AAS, or HL"), 3, "Congruence, Similarity, and Right Triangle Relationships", "Assessed", () => buildGeometryProof("G.6B")],
  ["G.6C", "Math Geometry G.6C", cleanDescription("use rigid transformations to show triangles are congruent"), 3, "Congruence, Similarity, and Right Triangle Relationships", "Assessed", () => buildGeometryProof("G.6C")],
  ["G.6D", "Math Geometry G.6D", cleanDescription("prove and apply relationships in triangles, including the Pythagorean theorem, angle sum, isosceles triangle relationships, midsegments, and medians"), 3, "Congruence, Similarity, and Right Triangle Relationships", "Assessed", () => buildGeometryProof("G.6D")],
  ["G.6E", "Math Geometry G.6E", cleanDescription("prove properties of parallelograms, rectangles, rhombuses, squares, and related quadrilaterals"), 3, "Congruence, Similarity, and Right Triangle Relationships", "Assessed", () => buildGeometryProof("G.6E")],
  ["G.7A", "Math Geometry G.7A", cleanDescription("use the definition of similarity, scale factors, and dilations to determine similar figures"), 3, "Congruence, Similarity, and Right Triangle Relationships", "Assessed", () => buildGeometrySimilarity("G.7A")],
  ["G.7B", "Math Geometry G.7B", cleanDescription("apply similarity criteria, including AA, and use proportionality of corresponding sides"), 3, "Congruence, Similarity, and Right Triangle Relationships", "Assessed", () => buildGeometrySimilarity("G.7B")],
  ["G.8A", "Math Geometry G.8A", cleanDescription("prove theorems about similar triangles, including the Triangle Proportionality Theorem"), 3, "Congruence, Similarity, and Right Triangle Relationships", "Assessed", () => buildGeometrySimilarity("G.8A")],
  ["G.8B", "Math Geometry G.8B", cleanDescription("use the relationships in right triangles with an altitude to the hypotenuse and the geometric mean"), 3, "Congruence, Similarity, and Right Triangle Relationships", "Assessed", () => buildGeometrySimilarity("G.8B")],
  ["G.9A", "Math Geometry G.9A", cleanDescription("use trigonometric ratios to find side lengths and solve right triangle problems"), 3, "Congruence, Similarity, and Right Triangle Relationships", "Assessed", () => buildGeometryRightTriangles("G.9A")],
  ["G.9B", "Math Geometry G.9B", cleanDescription("solve problems involving special right triangles and the Pythagorean theorem, including Pythagorean triples"), 3, "Congruence, Similarity, and Right Triangle Relationships", "Assessed", () => buildGeometryRightTriangles("G.9B")],

  ["G.10A", "Math Geometry G.10A", cleanDescription("identify the shapes of two-dimensional cross-sections of solids and the three-dimensional objects generated by rotations of two-dimensional figures"), 4, "Figures, Measurement, and Circles", "Assessed", () => buildGeometryMeasurement("G.10A")],
  ["G.10B", "Math Geometry G.10B", cleanDescription("explain and determine the effects on perimeter, area, surface area, and volume when the linear dimensions of a shape are changed proportionally"), 4, "Figures, Measurement, and Circles", "Assessed", () => buildGeometryMeasurement("G.10B")],
  ["G.11A", "Math Geometry G.11A", cleanDescription("calculate the area of regular polygons"), 4, "Figures, Measurement, and Circles", "Assessed", () => buildGeometryMeasurement("G.11A")],
  ["G.11B", "Math Geometry G.11B", cleanDescription("determine the area of composite two-dimensional figures"), 4, "Figures, Measurement, and Circles", "Assessed", () => buildGeometryMeasurement("G.11B")],
  ["G.11C", "Math Geometry G.11C", cleanDescription("determine total and lateral surface area of three-dimensional figures"), 4, "Figures, Measurement, and Circles", "Assessed", () => buildGeometryMeasurement("G.11C")],
  ["G.11D", "Math Geometry G.11D", cleanDescription("determine the volume of prisms, cylinders, and related solids"), 4, "Figures, Measurement, and Circles", "Assessed", () => buildGeometryMeasurement("G.11D")],
  ["G.12A", "Math Geometry G.12A", cleanDescription("apply theorems about circles to solve problems involving angles, radii, chords, tangents, and secants"), 4, "Figures, Measurement, and Circles", "Assessed", () => buildGeometryCircles("G.12A")],
  ["G.12B", "Math Geometry G.12B", cleanDescription("calculate arc length of a circle using central angle measures"), 4, "Figures, Measurement, and Circles", "Assessed", () => buildGeometryCircles("G.12B")],
  ["G.12C", "Math Geometry G.12C", cleanDescription("calculate the area of a sector of a circle using central angle measures"), 4, "Figures, Measurement, and Circles", "Assessed", () => buildGeometryCircles("G.12C")],
  ["G.12D", "Math Geometry G.12D", cleanDescription("convert between degrees and radians"), 4, "Figures, Measurement, and Circles", "Assessed", () => buildGeometryCircles("G.12D")],
  ["G.12E", "Math Geometry G.12E", cleanDescription("write the equation of a circle and identify its center and radius"), 4, "Figures, Measurement, and Circles", "Assessed", () => buildGeometryCircles("G.12E")],

  ["G.13A", "Math Geometry G.13A", cleanDescription("calculate permutations and combinations to solve problems"), 5, "Probability", "Assessed", () => buildGeometryProbability("G.13A")],
  ["G.13B", "Math Geometry G.13B", cleanDescription("calculate geometric probabilities using area"), 5, "Probability", "Assessed", () => buildGeometryProbability("G.13B")],
  ["G.13C", "Math Geometry G.13C", cleanDescription("determine probabilities for events with and without replacement and recognize when events are independent"), 5, "Probability", "Assessed", () => buildGeometryProbability("G.13C")],
  ["G.13D", "Math Geometry G.13D", cleanDescription("determine conditional probabilities from contextual data"), 5, "Probability", "Assessed", () => buildGeometryProbability("G.13D")],
  ["G.13E", "Math Geometry G.13E", cleanDescription("determine whether events are independent and justify the conclusion"), 5, "Probability", "Assessed", () => buildGeometryProbability("G.13E")]
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
    title: "Geometry Math TEKS Implementation",
    source: {
      localPdf: LOCAL_PDF,
      officialAssessedCurriculum: ASSESSED_CURRICULUM_URL,
      officialBlueprint: BLUEPRINT_URL,
      notes: "Geometry Math implementation continues after Algebra I. The official TEA Geometry breakout document and TAC Chapter 111 were used to define the Geometry TEKS scope."
    },
    namingConvention: "Math Geometry {TEKS}",
    questionTargetPerSet: 50,
    scope: {
      firstTeks: "G.1A",
      assessedFirstTeks: "G.2A",
      assessedLastTeks: "G.13E",
      implementedLastTeks: "G.13E",
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
  console.log(`Wrote ${generatedQuizzes.length} Texas Geometry Math TEKS sets and ${totalQuestions} questions to ${CUSTOM_QUIZZES_FILE}`);
  console.log(`Wrote Geometry implementation file to ${IMPLEMENTATION_FILE}`);
}

main();

// QUIZ_BUILDERS_PLACEHOLDER
