const fs = require("fs");
const path = require("path");

const { SCIENCE_BLOOKS, SPACE_BLOOKS } = require("../data/science-space-blooks");

const ASSET_ROOT = path.join(__dirname, "..", "public", "assets");
const ALL_BLOOKS = [...SCIENCE_BLOOKS, ...SPACE_BLOOKS];

const PALETTES = {
  labRat: { bgFrom: "#14253b", bgTo: "#1d4650", glow: "#84ffd2", primary: "#d8f6ff", secondary: "#68dcb5", accent: "#fff0a8", metal: "#b9c8db", dark: "#0b1a2d" },
  rocketCadet: { bgFrom: "#201f4a", bgTo: "#0e4267", glow: "#ff9f70", primary: "#f2f5ff", secondary: "#ff667c", accent: "#ffc857", metal: "#9ec8ff", dark: "#0c1630" },
  robotTech: { bgFrom: "#1c253a", bgTo: "#174561", glow: "#76e7ff", primary: "#d8e4f0", secondary: "#4fd6ff", accent: "#ffe27a", metal: "#8798b5", dark: "#0f1828" },
  dnaHacker: { bgFrom: "#111f36", bgTo: "#2a315e", glow: "#8d77ff", primary: "#7fffd4", secondary: "#8ab8ff", accent: "#ff7bd5", metal: "#dbe7ff", dark: "#0b1430" },
  circuitMaster: { bgFrom: "#16253e", bgTo: "#17385e", glow: "#77ffd3", primary: "#14243a", secondary: "#39d98a", accent: "#b9ff59", metal: "#d1edf1", dark: "#0c1829" },
  nebulaScout: { bgFrom: "#15183a", bgTo: "#4b1d59", glow: "#7ad9ff", primary: "#9cc7ff", secondary: "#ff8ad8", accent: "#ffd166", metal: "#d9e4ff", dark: "#120f2b" },
  quantumChief: { bgFrom: "#1a1e48", bgTo: "#3f1b65", glow: "#7dffea", primary: "#9be7ff", secondary: "#8b6bff", accent: "#ffd369", metal: "#eef3ff", dark: "#0c1334" },
  timeArchitect: { bgFrom: "#1a2440", bgTo: "#61543c", glow: "#ffe7a6", primary: "#f3e4c7", secondary: "#61d4ff", accent: "#ffb703", metal: "#b9c8d7", dark: "#11192d" },
  moonRover: { bgFrom: "#10192f", bgTo: "#233b5d", glow: "#a8d7ff", primary: "#dce5f5", secondary: "#ffd166", accent: "#7ec8ff", metal: "#96a8c3", dark: "#0b1224" },
  rocketBuddy: { bgFrom: "#1b173f", bgTo: "#193d6d", glow: "#ffb36b", primary: "#f7f9ff", secondary: "#ff6f7d", accent: "#ffd166", metal: "#a6c8ff", dark: "#0d1530" },
  marsExplorer: { bgFrom: "#211735", bgTo: "#5d2c39", glow: "#ff9e7d", primary: "#ebf1ff", secondary: "#f47c52", accent: "#7ad8ff", metal: "#aab6ce", dark: "#131224" },
  cometCruiser: { bgFrom: "#111a35", bgTo: "#224b6c", glow: "#7de1ff", primary: "#ebf2ff", secondary: "#80d0ff", accent: "#fff0a6", metal: "#a5c0df", dark: "#091326" },
  starlightSatellite: { bgFrom: "#16203f", bgTo: "#184a67", glow: "#7ff0ff", primary: "#dfe8ff", secondary: "#4fd7ff", accent: "#ffe27a", metal: "#95a7c2", dark: "#0b142b" },
  solarSailor: { bgFrom: "#241b3e", bgTo: "#6d4626", glow: "#ffd66b", primary: "#f7f3de", secondary: "#ffb347", accent: "#7dd3ff", metal: "#c7b995", dark: "#1a1528" },
  lunarLander: { bgFrom: "#151d38", bgTo: "#395577", glow: "#d9e6ff", primary: "#f3f4f6", secondary: "#9bb5d6", accent: "#ffd166", metal: "#9aa5b5", dark: "#0d1224" },
  meteorSurfer: { bgFrom: "#1f1636", bgTo: "#5d2444", glow: "#ff946e", primary: "#ffd08a", secondary: "#7dd3ff", accent: "#fff4b3", metal: "#c2c8d5", dark: "#120d20" },
  saturnSkipper: { bgFrom: "#17183a", bgTo: "#35508a", glow: "#ffd37a", primary: "#f3c97e", secondary: "#9c7cf6", accent: "#83e6ff", metal: "#e8ebff", dark: "#0e1430" },
  astroMechanic: { bgFrom: "#121e34", bgTo: "#24576f", glow: "#6fffe2", primary: "#d7dfef", secondary: "#41e0c5", accent: "#ffcf5f", metal: "#8a9eb8", dark: "#0c1626" },
  eclipseRanger: { bgFrom: "#111528", bgTo: "#45325a", glow: "#ffdd8c", primary: "#f1f5ff", secondary: "#6f7cff", accent: "#ffd166", metal: "#9ab0d9", dark: "#090d1a" },
  nebulaNomad: { bgFrom: "#17143b", bgTo: "#5d2057", glow: "#7fffd4", primary: "#dbe3ff", secondary: "#ff80d5", accent: "#7ad7ff", metal: "#b5bfd8", dark: "#0d1025" },
  gravityGlider: { bgFrom: "#0f1730", bgTo: "#203562", glow: "#75c8ff", primary: "#dde7ff", secondary: "#97a3ff", accent: "#6cf0ff", metal: "#a1afc7", dark: "#080f22" },
  auroraOrbiter: { bgFrom: "#10203e", bgTo: "#124f56", glow: "#77ffd7", primary: "#e8f2ff", secondary: "#3de0b8", accent: "#7ad4ff", metal: "#b0bfd1", dark: "#091522" },
  starforgePilot: { bgFrom: "#20152e", bgTo: "#5e2d35", glow: "#ffb04f", primary: "#e7efff", secondary: "#ff6b5e", accent: "#ffd166", metal: "#9eacc8", dark: "#100f1c" },
  supernovaSentinel: { bgFrom: "#241630", bgTo: "#6f2f39", glow: "#ffd06b", primary: "#eef4ff", secondary: "#ff7f5a", accent: "#ffe79a", metal: "#b7c6d9", dark: "#100d18" },
  galaxyGuardian: { bgFrom: "#14193a", bgTo: "#2f2f69", glow: "#82c7ff", primary: "#dde6ff", secondary: "#8a7cff", accent: "#9dffdf", metal: "#c7d4ea", dark: "#0c1020" },
  voidVoyager: { bgFrom: "#090d1d", bgTo: "#162e58", glow: "#7dbdff", primary: "#dce6ff", secondary: "#59b7ff", accent: "#e7f0ff", metal: "#8fa5c8", dark: "#050912" },
  celestialObservatory: { bgFrom: "#101a34", bgTo: "#2f4c78", glow: "#8fd5ff", primary: "#f2f5ff", secondary: "#7d9dc4", accent: "#ffd166", metal: "#a4b4c8", dark: "#0a1020" },
  cosmicCrown: { bgFrom: "#1b1436", bgTo: "#4f2770", glow: "#ffd672", primary: "#ffe6a7", secondary: "#7f7dff", accent: "#7fffd4", metal: "#f7f2df", dark: "#100c1b" }
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function circle(cx, cy, r, attrs = "") {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" ${attrs}/>`;
}

function ellipse(cx, cy, rx, ry, attrs = "") {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${attrs}/>`;
}

function rect(x, y, width, height, attrs = "") {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" ${attrs}/>`;
}

function line(x1, y1, x2, y2, attrs = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs}/>`;
}

function polygon(points, attrs = "") {
  return `<polygon points="${points}" ${attrs}/>`;
}

function pathEl(d, attrs = "") {
  return `<path d="${d}" ${attrs}/>`;
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function next() {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function starField(seed, count = 18) {
  const random = mulberry32(hashString(seed));
  const stars = [];
  for (let index = 0; index < count; index += 1) {
    const cx = 26 + random() * 268;
    const cy = 24 + random() * 180;
    const radius = 1.2 + random() * 2.6;
    const opacity = 0.35 + random() * 0.45;
    stars.push(circle(cx.toFixed(2), cy.toFixed(2), radius.toFixed(2), `fill="#ffffff" opacity="${opacity.toFixed(2)}"`));
    if (random() > 0.78) {
      const glow = (radius * 3.2).toFixed(2);
      stars.push(line((cx - Number(glow)).toFixed(2), cy.toFixed(2), (cx + Number(glow)).toFixed(2), cy.toFixed(2), `stroke="#ffffff" stroke-width="1.3" opacity="0.18"`));
      stars.push(line(cx.toFixed(2), (cy - Number(glow)).toFixed(2), cx.toFixed(2), (cy + Number(glow)).toFixed(2), `stroke="#ffffff" stroke-width="1.3" opacity="0.18"`));
    }
  }
  return stars.join("");
}

function gridLines(color, opacity = 0.12) {
  const lines = [];
  for (let x = 42; x <= 278; x += 34) {
    lines.push(line(x, 40, x, 224, `stroke="${color}" stroke-width="1" opacity="${opacity}"`));
  }
  for (let y = 44; y <= 220; y += 30) {
    lines.push(line(36, y, 284, y, `stroke="${color}" stroke-width="1" opacity="${opacity}"`));
  }
  return lines.join("");
}

function orbits(color) {
  return [
    ellipse(164, 122, 112, 40, `fill="none" stroke="${color}" stroke-width="2" opacity="0.16" transform="rotate(-12 164 122)"`),
    ellipse(160, 126, 86, 28, `fill="none" stroke="${color}" stroke-width="2" opacity="0.14" transform="rotate(18 160 126)"`)
  ].join("");
}

function planet(cx, cy, radius, colors, options = {}) {
  const spots = (options.spots || [])
    .map((spot) => circle(cx + spot.dx, cy + spot.dy, spot.r, `fill="${spot.fill || colors.shade}" opacity="${spot.opacity ?? 0.25}"`))
    .join("");
  const ring = options.ring
    ? ellipse(cx, cy, radius * 1.55, radius * 0.52, `fill="none" stroke="${options.ring}" stroke-width="${Math.max(6, radius * 0.18)}" opacity="0.8" transform="rotate(${options.rotate ?? -12} ${cx} ${cy})"`)
    : "";
  const aura = options.aura
    ? circle(cx, cy, radius + 18, `fill="${options.aura}" opacity="0.14"`)
    : "";

  return [
    aura,
    ring,
    circle(cx, cy, radius, `fill="${colors.body}"`),
    ellipse(cx - radius * 0.22, cy + radius * 0.1, radius * 0.68, radius * 0.46, `fill="${colors.shade}" opacity="0.35"`),
    spots
  ].join("");
}

function rocket(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${rect(-24, -42, 48, 76, `rx="24" fill="${palette.primary}"`)}
    ${polygon("0,-68 -24,-30 24,-30", `fill="${palette.accent}"`)}
    ${polygon("-18,18 -42,46 -14,38", `fill="${palette.secondary}"`)}
    ${polygon("18,18 42,46 14,38", `fill="${palette.secondary}"`)}
    ${polygon("0,58 -14,32 14,32", `fill="${palette.accent}" opacity="0.92"`)}
    ${circle(0, -6, 11, `fill="${palette.metal}" stroke="${palette.dark}" stroke-width="4"`)}
    ${rect(-8, 8, 16, 18, `rx="8" fill="${palette.metal}" opacity="0.9"`)}
    ${line(0, -54, 0, -78, `stroke="${palette.accent}" stroke-width="6" stroke-linecap="round" opacity="0.85"`)}
  </g>`;
}

function rover(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${ellipse(0, 54, 54, 10, `fill="#0b1020" opacity="0.3"`)}
    ${rect(-36, -2, 72, 28, `rx="10" fill="${palette.primary}"`)}
    ${rect(-12, -24, 30, 24, `rx="8" fill="${palette.metal}"`)}
    ${circle(-34, 34, 14, `fill="${palette.dark}"`)}
    ${circle(34, 34, 14, `fill="${palette.dark}"`)}
    ${circle(-34, 34, 6, `fill="${palette.secondary}"`)}
    ${circle(34, 34, 6, `fill="${palette.secondary}"`)}
    ${line(-18, 10, -28, 22, `stroke="${palette.metal}" stroke-width="6"`)}
    ${line(18, 10, 28, 22, `stroke="${palette.metal}" stroke-width="6"`)}
    ${line(6, -24, 18, -46, `stroke="${palette.metal}" stroke-width="5"`)}
    ${circle(22, -52, 10, `fill="${palette.accent}" opacity="0.9"`)}
  </g>`;
}

function satellite(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${rect(-20, -20, 40, 40, `rx="10" fill="${palette.primary}"`)}
    ${rect(-86, -24, 52, 48, `rx="6" fill="${palette.secondary}"`)}
    ${rect(34, -24, 52, 48, `rx="6" fill="${palette.secondary}"`)}
    ${line(-34, 0, -20, 0, `stroke="${palette.metal}" stroke-width="6"`)}
    ${line(20, 0, 34, 0, `stroke="${palette.metal}" stroke-width="6"`)}
    ${circle(0, 0, 8, `fill="${palette.accent}"`)}
    ${line(0, -18, 22, -42, `stroke="${palette.metal}" stroke-width="5"`)}
    ${circle(28, -50, 12, `fill="none" stroke="${palette.accent}" stroke-width="5"`)}
  </g>`;
}

function robot(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${rect(-44, -40, 88, 74, `rx="18" fill="${palette.primary}"`)}
    ${rect(-30, -16, 60, 22, `rx="11" fill="${palette.dark}"`)}
    ${circle(-14, -5, 8, `fill="${palette.secondary}"`)}
    ${circle(14, -5, 8, `fill="${palette.secondary}"`)}
    ${rect(-20, 16, 40, 10, `rx="5" fill="${palette.metal}" opacity="0.9"`)}
    ${line(0, -40, 0, -64, `stroke="${palette.metal}" stroke-width="6" stroke-linecap="round"`)}
    ${circle(0, -70, 10, `fill="${palette.accent}"`)}
    ${line(-44, 0, -66, 18, `stroke="${palette.metal}" stroke-width="8" stroke-linecap="round"`)}
    ${line(44, 0, 66, 18, `stroke="${palette.metal}" stroke-width="8" stroke-linecap="round"`)}
  </g>`;
}

function dnaHelix(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${rect(-52, -56, 104, 112, `rx="18" fill="${palette.dark}" opacity="0.55" stroke="${palette.metal}" stroke-width="4"`)}
    ${pathEl("M-18 -42 C24 -24 24 -4 -18 16 C-48 30 -48 54 -8 68", `fill="none" stroke="${palette.primary}" stroke-width="10" stroke-linecap="round"`)}
    ${pathEl("M18 -42 C-24 -24 -24 -4 18 16 C48 30 48 54 8 68", `fill="none" stroke="${palette.secondary}" stroke-width="10" stroke-linecap="round"`)}
    ${line(-10, -28, 10, -28, `stroke="${palette.accent}" stroke-width="5"`)}
    ${line(-18, -2, 18, -2, `stroke="${palette.accent}" stroke-width="5"`)}
    ${line(-10, 24, 10, 24, `stroke="${palette.accent}" stroke-width="5"`)}
    ${line(-4, 50, 4, 50, `stroke="${palette.accent}" stroke-width="5"`)}
  </g>`;
}

function chip(x, y, scale, palette) {
  const pins = [];
  for (let step = -30; step <= 30; step += 20) {
    pins.push(rect(-60, step - 4, 18, 8, `rx="4" fill="${palette.metal}"`));
    pins.push(rect(42, step - 4, 18, 8, `rx="4" fill="${palette.metal}"`));
    pins.push(rect(step - 4, -60, 8, 18, `rx="4" fill="${palette.metal}"`));
    pins.push(rect(step - 4, 42, 8, 18, `rx="4" fill="${palette.metal}"`));
  }
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${pins.join("")}
    ${rect(-42, -42, 84, 84, `rx="18" fill="${palette.primary}"`)}
    ${pathEl("M-18 0 L-2 0 L12 -18 L28 -18", `fill="none" stroke="${palette.secondary}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"`)}
    ${pathEl("M-30 22 L-8 22 L6 8 L30 8", `fill="none" stroke="${palette.accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"`)}
    ${circle(-20, 0, 8, `fill="${palette.accent}"`)}
    ${circle(12, -18, 8, `fill="${palette.secondary}"`)}
    ${circle(-8, 22, 8, `fill="${palette.secondary}"`)}
    ${circle(30, 8, 8, `fill="${palette.accent}"`)}
  </g>`;
}

function telescope(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${pathEl("M-26 -22 L24 -44 L44 -8 L-8 12 Z", `fill="${palette.primary}"`)}
    ${circle(34, -26, 10, `fill="${palette.accent}" opacity="0.95"`)}
    ${line(-2, 12, -18, 58, `stroke="${palette.metal}" stroke-width="7" stroke-linecap="round"`)}
    ${line(8, 8, 24, 58, `stroke="${palette.metal}" stroke-width="7" stroke-linecap="round"`)}
    ${line(-16, 18, -2, 52, `stroke="${palette.metal}" stroke-width="6" stroke-linecap="round"`)}
    ${circle(-18, -6, 8, `fill="${palette.secondary}"`)}
  </g>`;
}

function hourglass(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${rect(-40, -64, 80, 10, `rx="5" fill="${palette.metal}"`)}
    ${rect(-40, 54, 80, 10, `rx="5" fill="${palette.metal}"`)}
    ${line(-30, -54, -18, 44, `stroke="${palette.metal}" stroke-width="6"`)}
    ${line(30, -54, 18, 44, `stroke="${palette.metal}" stroke-width="6"`)}
    ${pathEl("M-18 -40 H18 L8 -18 L-8 -18 Z", `fill="${palette.primary}"`)}
    ${pathEl("M-8 18 H8 L18 40 H-18 Z", `fill="${palette.primary}"`)}
    ${pathEl("M-14 -34 H14 L7 -20 H-7 Z", `fill="${palette.accent}" opacity="0.9"`)}
    ${pathEl("M-6 20 H6 L14 34 H-14 Z", `fill="${palette.accent}" opacity="0.9"`)}
    ${line(0, -18, 0, 14, `stroke="${palette.accent}" stroke-width="4" stroke-linecap="round"`)}
    ${circle(0, 4, 5, `fill="${palette.accent}"`)}
  </g>`;
}

function crown(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${pathEl("M-54 18 L-34 -24 L0 0 L34 -24 L54 18 L40 44 H-40 Z", `fill="${palette.primary}" stroke="${palette.metal}" stroke-width="4" stroke-linejoin="round"`)}
    ${circle(-34, -20, 7, `fill="${palette.accent}"`)}
    ${circle(0, -2, 8, `fill="${palette.secondary}"`)}
    ${circle(34, -20, 7, `fill="${palette.accent}"`)}
  </g>`;
}

function atom(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${ellipse(0, 0, 52, 20, `fill="none" stroke="${palette.primary}" stroke-width="6"`)}
    ${ellipse(0, 0, 52, 20, `fill="none" stroke="${palette.secondary}" stroke-width="6" transform="rotate(60 0 0)"`)}
    ${ellipse(0, 0, 52, 20, `fill="none" stroke="${palette.accent}" stroke-width="6" transform="rotate(-60 0 0)"`)}
    ${circle(0, 0, 12, `fill="${palette.metal}"`)}
  </g>`;
}

function astronaut(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${circle(0, -32, 30, `fill="${palette.primary}"`)}
    ${ellipse(0, -32, 20, 16, `fill="${palette.secondary}" opacity="0.85"`)}
    ${rect(-26, 0, 52, 58, `rx="18" fill="${palette.primary}"`)}
    ${rect(-14, 12, 28, 22, `rx="8" fill="${palette.metal}"`)}
    ${line(-18, 10, -34, 34, `stroke="${palette.primary}" stroke-width="10" stroke-linecap="round"`)}
    ${line(18, 10, 34, 34, `stroke="${palette.primary}" stroke-width="10" stroke-linecap="round"`)}
    ${line(-10, 58, -20, 84, `stroke="${palette.primary}" stroke-width="10" stroke-linecap="round"`)}
    ${line(10, 58, 20, 84, `stroke="${palette.primary}" stroke-width="10" stroke-linecap="round"`)}
    ${circle(0, 22, 7, `fill="${palette.accent}"`)}
  </g>`;
}

function lander(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${polygon("0,-48 30,-10 18,26 -18,26 -30,-10", `fill="${palette.primary}"`)}
    ${rect(-16, -10, 32, 22, `rx="6" fill="${palette.metal}"`)}
    ${line(-18, 24, -42, 56, `stroke="${palette.metal}" stroke-width="5" stroke-linecap="round"`)}
    ${line(18, 24, 42, 56, `stroke="${palette.metal}" stroke-width="5" stroke-linecap="round"`)}
    ${line(-42, 56, -26, 56, `stroke="${palette.accent}" stroke-width="5" stroke-linecap="round"`)}
    ${line(42, 56, 26, 56, `stroke="${palette.accent}" stroke-width="5" stroke-linecap="round"`)}
    ${line(0, 26, 0, 54, `stroke="${palette.metal}" stroke-width="5" stroke-linecap="round"`)}
  </g>`;
}

function ship(x, y, scale, palette, variant = "default") {
  const wingColor = variant === "sleek" ? palette.accent : palette.secondary;
  const hullPath = variant === "glider"
    ? "M-58 10 L-16 -12 L26 -4 L56 12 L18 20 Z"
    : variant === "sleek"
      ? "M-62 8 L-18 -18 L28 -10 L66 8 L10 22 Z"
      : "M-54 12 L-16 -16 L34 -8 L56 12 L10 24 Z";
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${pathEl(hullPath, `fill="${palette.primary}"`)}
    ${polygon("-22,2 -54,12 -30,24", `fill="${wingColor}"`)}
    ${polygon("22,0 56,12 22,22", `fill="${wingColor}"`)}
    ${ellipse(8, 2, 14, 10, `fill="${palette.secondary}" opacity="0.9"`)}
    ${line(-8, -6, 24, -16, `stroke="${palette.accent}" stroke-width="5" stroke-linecap="round"`)}
  </g>`;
}

function shield(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${pathEl("M0 -60 L54 -34 L44 30 L0 64 L-44 30 L-54 -34 Z", `fill="${palette.primary}" stroke="${palette.metal}" stroke-width="5" stroke-linejoin="round"`)}
    ${polygon("0,-28 10,-2 38,-2 16,14 24,42 0,24 -24,42 -16,14 -38,-2 -10,-2", `fill="${palette.accent}"`)}
  </g>`;
}

function observatory(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${ellipse(0, 68, 70, 12, `fill="#0a1020" opacity="0.25"`)}
    ${rect(-54, 18, 108, 44, `rx="18" fill="${palette.primary}"`)}
    ${pathEl("M-46 20 C-44 -22 44 -22 46 20 Z", `fill="${palette.secondary}"`)}
    ${pathEl("M0 -24 L28 -8 L2 24 L-14 18 Z", `fill="${palette.metal}"`)}
    ${circle(18, -14, 12, `fill="${palette.accent}" opacity="0.9"`)}
    ${line(2, 24, 40, 52, `stroke="${palette.metal}" stroke-width="6" stroke-linecap="round"`)}
  </g>`;
}

function station(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${ellipse(0, 0, 62, 40, `fill="none" stroke="${palette.secondary}" stroke-width="12" opacity="0.95"`)}
    ${circle(0, 0, 28, `fill="${palette.primary}"`)}
    ${rect(-12, -74, 24, 28, `rx="8" fill="${palette.metal}"`)}
    ${rect(-12, 46, 24, 28, `rx="8" fill="${palette.metal}"`)}
    ${rect(-92, -12, 28, 24, `rx="8" fill="${palette.metal}"`)}
    ${rect(64, -12, 28, 24, `rx="8" fill="${palette.metal}"`)}
    ${circle(0, 0, 10, `fill="${palette.accent}"`)}
  </g>`;
}

function blackHole(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${circle(0, 0, 28, `fill="${palette.dark}"`)}
    ${ellipse(0, 0, 70, 20, `fill="none" stroke="${palette.secondary}" stroke-width="12" opacity="0.9"`)}
    ${ellipse(0, 0, 90, 28, `fill="none" stroke="${palette.accent}" stroke-width="6" opacity="0.55"`)}
  </g>`;
}

function nebula(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${circle(-28, -10, 28, `fill="${palette.secondary}" opacity="0.55"`)}
    ${circle(14, -18, 34, `fill="${palette.primary}" opacity="0.48"`)}
    ${circle(40, 16, 24, `fill="${palette.accent}" opacity="0.44"`)}
    ${circle(-4, 20, 30, `fill="${palette.secondary}" opacity="0.35"`)}
  </g>`;
}

function starBurst(x, y, scale, color, opacity = 0.95) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${polygon("0,-46 12,-12 46,0 12,12 0,46 -12,12 -46,0 -12,-12", `fill="${color}" opacity="${opacity}"`)}
  </g>`;
}

function flaskMouse(palette) {
  return [
    ellipse(160, 244, 84, 16, `fill="#09101e" opacity="0.22"`),
    rect(140, 72, 40, 24, `rx="10" fill="${palette.metal}"`),
    pathEl("M126 92 H194 V118 C194 130 198 144 208 160 L226 192 C238 212 224 236 200 236 H120 C96 236 82 212 94 192 L112 160 C122 144 126 130 126 118 Z", `fill="${palette.primary}" opacity="0.92" stroke="${palette.metal}" stroke-width="5"`),
    pathEl("M118 150 H202 L216 186 C222 200 214 214 198 214 H122 C106 214 98 200 104 186 Z", `fill="${palette.secondary}" opacity="0.95"`),
    circle(136, 114, 18, `fill="#f5d8d6"`),
    circle(184, 114, 18, `fill="#f5d8d6"`),
    circle(160, 124, 26, `fill="#f7e7e3"`),
    circle(152, 124, 4, `fill="${palette.dark}"`),
    circle(168, 124, 4, `fill="${palette.dark}"`),
    circle(160, 134, 5, `fill="#ff94ad"`),
    line(138, 132, 152, 132, `stroke="${palette.dark}" stroke-width="2.5"`),
    line(168, 132, 182, 132, `stroke="${palette.dark}" stroke-width="2.5"`),
    circle(124, 164, 5, `fill="${palette.accent}" opacity="0.9"`),
    circle(202, 154, 6, `fill="${palette.accent}" opacity="0.85"`),
    circle(193, 176, 4, `fill="${palette.accent}" opacity="0.75"`)
  ].join("");
}

function panel(x, y, width, height, palette, options = {}) {
  const radius = options.radius ?? 26;
  const fill = options.fill ?? palette.dark;
  const opacity = options.opacity ?? 0.22;
  const innerInset = options.innerInset ?? 8;
  const innerRadius = Math.max(8, radius - innerInset);
  return [
    rect(x, y, width, height, `rx="${radius}" fill="${fill}" opacity="${opacity}"`),
    rect(
      x + innerInset,
      y + innerInset,
      width - innerInset * 2,
      height - innerInset * 2,
      `rx="${innerRadius}" fill="none" stroke="${options.stroke || palette.metal}" stroke-width="2" opacity="${options.strokeOpacity ?? 0.18}"`
    )
  ].join("");
}

function bench(y, palette) {
  return [
    ellipse(160, y + 46, 126, 16, `fill="#09101e" opacity="0.28"`),
    rect(34, y + 4, 252, 18, `rx="9" fill="${palette.dark}" opacity="0.42"`),
    rect(22, y + 20, 276, 40, `rx="18" fill="${palette.metal}" opacity="0.18"`),
    rect(34, y + 18, 252, 22, `rx="11" fill="${palette.primary}" opacity="0.2"`)
  ].join("");
}

function cloud(x, y, scale, color, opacity = 0.7) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${ellipse(0, 12, 38, 18, `fill="${color}" opacity="${opacity}"`)}
    ${circle(-24, 10, 18, `fill="${color}" opacity="${opacity}"`)}
    ${circle(4, 0, 22, `fill="${color}" opacity="${opacity}"`)}
    ${circle(28, 12, 16, `fill="${color}" opacity="${opacity}"`)}
  </g>`;
}

function gear(cx, cy, radius, palette, options = {}) {
  const teeth = options.teeth ?? 8;
  const toothLength = options.toothLength ?? 10;
  const parts = [];
  for (let index = 0; index < teeth; index += 1) {
    const angle = (Math.PI * 2 * index) / teeth;
    const x1 = cx + Math.cos(angle) * (radius - 4);
    const y1 = cy + Math.sin(angle) * (radius - 4);
    const x2 = cx + Math.cos(angle) * (radius + toothLength);
    const y2 = cy + Math.sin(angle) * (radius + toothLength);
    parts.push(line(x1.toFixed(2), y1.toFixed(2), x2.toFixed(2), y2.toFixed(2), `stroke="${palette.metal}" stroke-width="6" stroke-linecap="round" opacity="${options.opacity ?? 0.55}"`));
  }
  parts.push(circle(cx, cy, radius, `fill="none" stroke="${palette.metal}" stroke-width="8" opacity="${options.opacity ?? 0.55}"`));
  parts.push(circle(cx, cy, Math.max(7, radius * 0.35), `fill="${palette.accent}" opacity="0.9"`));
  return parts.join("");
}

function labMouse(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${ellipse(0, 56, 34, 10, `fill="#07111f" opacity="0.26"`)}
    ${circle(-18, -8, 14, `fill="#f4d4d2"`)}
    ${circle(18, -8, 14, `fill="#f4d4d2"`)}
    ${circle(0, 8, 24, `fill="#f7ebe8"`)}
    ${ellipse(0, 44, 28, 26, `fill="#f7ebe8"`)}
    ${rect(-18, 4, 36, 10, `rx="5" fill="${palette.dark}" opacity="0.85"`)}
    ${circle(-8, 9, 6, `fill="${palette.secondary}" opacity="0.92"`)}
    ${circle(8, 9, 6, `fill="${palette.secondary}" opacity="0.92"`)}
    ${circle(-8, 9, 2.5, `fill="#ffffff" opacity="0.9"`)}
    ${circle(8, 9, 2.5, `fill="#ffffff" opacity="0.9"`)}
    ${circle(0, 20, 4, `fill="#ff98b2"`)}
    ${line(-24, 18, -10, 18, `stroke="${palette.dark}" stroke-width="2.2" stroke-linecap="round"`)}
    ${line(10, 18, 24, 18, `stroke="${palette.dark}" stroke-width="2.2" stroke-linecap="round"`)}
    ${pathEl("M20 40 C52 44 60 62 64 84", `fill="none" stroke="#f4b8ba" stroke-width="5" stroke-linecap="round"`)}
  </g>`;
}

function labFlask(x, y, scale, palette) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${ellipse(0, 122, 72, 12, `fill="#09101e" opacity="0.22"`)}
    ${rect(-20, -102, 40, 30, `rx="10" fill="${palette.metal}"`)}
    ${pathEl("M-40 -74 H40 V-40 C40 -24 46 -2 58 20 L74 54 C88 86 64 122 26 122 H-26 C-64 122 -88 86 -74 54 L-58 20 C-46 -2 -40 -24 -40 -40 Z", `fill="${palette.primary}" opacity="0.92" stroke="${palette.metal}" stroke-width="6"`)}
    ${pathEl("M-62 30 H62 L70 60 C76 82 56 102 24 102 H-24 C-56 102 -76 82 -70 60 Z", `fill="${palette.secondary}" opacity="0.9"`)}
    ${pathEl("M-16 -88 H16", `fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.45"`)}
    ${circle(-34, 44, 8, `fill="${palette.accent}" opacity="0.7"`)}
    ${circle(30, 26, 6, `fill="${palette.accent}" opacity="0.82"`)}
    ${circle(42, 54, 4, `fill="${palette.accent}" opacity="0.62"`)}
  </g>`;
}

function renderScienceAsset(asset) {
  const palette = PALETTES[asset.assetKey];
  switch (asset.assetKey) {
    case "labRat":
      return scene(
        asset,
        palette,
        [
          bench(210, palette),
          labFlask(126, 110, 0.9, palette),
          labMouse(226, 170, 0.88, palette),
          rect(50, 64, 60, 18, `rx="9" fill="${palette.metal}" opacity="0.2"`),
          rect(56, 82, 10, 76, `rx="5" fill="${palette.metal}" opacity="0.28"`),
          rect(72, 94, 10, 64, `rx="5" fill="${palette.metal}" opacity="0.24"`),
          rect(88, 72, 10, 86, `rx="5" fill="${palette.metal}" opacity="0.3"`),
          circle(248, 82, 10, `fill="${palette.accent}" opacity="0.72"`),
          circle(224, 66, 6, `fill="${palette.secondary}" opacity="0.64"`)
        ].join(""),
        {
          starCount: 0,
          backdrop: [
            panel(24, 34, 272, 164, palette, { opacity: 0.18 }),
            line(44, 116, 276, 116, `stroke="${palette.metal}" stroke-width="2" opacity="0.08"`),
            line(44, 148, 276, 148, `stroke="${palette.metal}" stroke-width="2" opacity="0.08"`),
            line(44, 180, 276, 180, `stroke="${palette.metal}" stroke-width="2" opacity="0.08"`)
          ].join("")
        }
      );
    case "rocketCadet":
      return scene(
        asset,
        palette,
        [
          rect(40, 226, 240, 24, `rx="12" fill="${palette.dark}" opacity="0.42"`),
          rect(114, 212, 92, 18, `rx="9" fill="${palette.metal}" opacity="0.34"`),
          rect(96, 86, 18, 126, `rx="9" fill="${palette.metal}" opacity="0.5"`),
          rect(106, 118, 46, 10, `rx="5" fill="${palette.metal}" opacity="0.46"`),
          rect(106, 152, 40, 10, `rx="5" fill="${palette.metal}" opacity="0.42"`),
          cloud(126, 238, 1.0, "#f4f7ff", 0.58),
          cloud(178, 246, 0.84, "#f4f7ff", 0.44),
          cloud(210, 234, 0.74, "#f4f7ff", 0.4),
          rocket(164, 150, 1.42, palette),
          pathEl("M164 248 C156 232 150 224 148 208", `fill="none" stroke="${palette.accent}" stroke-width="12" stroke-linecap="round" opacity="0.52"`),
          starBurst(240, 76, 0.3, palette.accent, 0.7)
        ].join(""),
        {
          starCount: 8,
          backdrop: [
            circle(160, 90, 96, `fill="${palette.glow}" opacity="0.14"`),
            line(0, 214, 320, 214, `stroke="#ffffff" stroke-width="2" opacity="0.06"`)
          ].join("")
        }
      );
    case "robotTech":
      return scene(
        asset,
        palette,
        [
          bench(214, palette),
          robot(160, 154, 1.18, palette),
          rect(56, 74, 60, 42, `rx="12" fill="${palette.dark}" opacity="0.28"`),
          line(70, 94, 102, 94, `stroke="${palette.secondary}" stroke-width="6" stroke-linecap="round" opacity="0.7"`),
          line(70, 108, 92, 108, `stroke="${palette.accent}" stroke-width="6" stroke-linecap="round" opacity="0.7"`),
          line(214, 208, 236, 186, `stroke="${palette.metal}" stroke-width="8" stroke-linecap="round"`),
          line(236, 186, 250, 194, `stroke="${palette.accent}" stroke-width="8" stroke-linecap="round"`),
          circle(238, 184, 8, `fill="${palette.secondary}" opacity="0.9"`)
        ].join(""),
        {
          starCount: 0,
          backdrop: [
            panel(28, 40, 264, 148, palette, { opacity: 0.18 }),
            gear(252, 88, 18, palette, { opacity: 0.34 }),
            gear(220, 126, 10, palette, { opacity: 0.26 })
          ].join("")
        }
      );
    case "dnaHacker":
      return scene(
        asset,
        palette,
        [
          rect(60, 70, 200, 128, `rx="24" fill="${palette.dark}" opacity="0.52"`),
          rect(74, 84, 172, 100, `rx="18" fill="${palette.primary}" opacity="0.08"`),
          dnaHelix(160, 146, 1.02, palette),
          rect(86, 204, 148, 14, `rx="7" fill="${palette.metal}" opacity="0.18"`),
          rect(108, 216, 104, 12, `rx="6" fill="${palette.dark}" opacity="0.38"`),
          rect(88, 102, 32, 6, `rx="3" fill="${palette.accent}" opacity="0.72"`),
          rect(88, 116, 52, 6, `rx="3" fill="${palette.secondary}" opacity="0.64"`),
          rect(200, 100, 24, 6, `rx="3" fill="${palette.secondary}" opacity="0.66"`),
          rect(190, 114, 34, 6, `rx="3" fill="${palette.accent}" opacity="0.72"`)
        ].join(""),
        {
          starCount: 0,
          backdrop: [
            panel(34, 48, 252, 168, palette, { opacity: 0.16 }),
            gridLines("#ffffff", 0.05)
          ].join("")
        }
      );
    case "circuitMaster":
      return scene(
        asset,
        palette,
        [
          chip(160, 160, 1.16, palette),
          pathEl("M68 92 H112 V122 H144", `fill="none" stroke="${palette.secondary}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.68"`),
          pathEl("M214 98 H248 V138 H208", `fill="none" stroke="${palette.accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.74"`),
          pathEl("M80 202 H130 V174 H148", `fill="none" stroke="${palette.accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.62"`),
          pathEl("M240 212 H194 V188 H176", `fill="none" stroke="${palette.secondary}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.68"`),
          circle(112, 122, 8, `fill="${palette.accent}" opacity="0.9"`),
          circle(208, 138, 8, `fill="${palette.secondary}" opacity="0.9"`),
          circle(130, 174, 8, `fill="${palette.secondary}" opacity="0.9"`),
          circle(194, 188, 8, `fill="${palette.accent}" opacity="0.9"`)
        ].join(""),
        {
          starCount: 0,
          backdrop: [
            panel(26, 36, 268, 182, palette, { opacity: 0.2 }),
            gridLines("#7effd6", 0.05)
          ].join("")
        }
      );
    case "nebulaScout":
      return scene(
        asset,
        palette,
        [
          ellipse(160, 244, 108, 18, `fill="#09101e" opacity="0.24"`),
          pathEl("M26 228 C92 206 152 202 206 214 C246 222 274 220 294 210 V256 H26 Z", `fill="${palette.dark}" opacity="0.42"`),
          telescope(144, 182, 1.28, palette),
          nebula(208, 92, 1.18, palette),
          planet(90, 84, 18, { body: palette.primary, shade: palette.metal }, { aura: palette.glow }),
          circle(248, 74, 7, `fill="${palette.accent}" opacity="0.92"`)
        ].join(""),
        {
          starCount: 18,
          backdrop: [
            circle(226, 92, 88, `fill="${palette.glow}" opacity="0.18"`),
            pathEl("M30 222 C98 198 158 194 212 206 C248 214 274 212 292 202", `fill="none" stroke="#ffffff" stroke-width="2" opacity="0.08"`)
          ].join("")
        }
      );
    case "quantumChief":
      return scene(
        asset,
        palette,
        [
          rect(132, 196, 56, 40, `rx="14" fill="${palette.primary}" opacity="0.32"`),
          rect(120, 230, 80, 10, `rx="5" fill="${palette.metal}" opacity="0.34"`),
          atom(160, 144, 1.3, palette),
          circle(160, 144, 58, `fill="${palette.glow}" opacity="0.14"`),
          circle(104, 116, 8, `fill="${palette.accent}" opacity="0.7"`),
          circle(224, 166, 7, `fill="${palette.secondary}" opacity="0.72"`),
          rect(82, 206, 26, 8, `rx="4" fill="${palette.secondary}" opacity="0.66"`),
          rect(212, 206, 26, 8, `rx="4" fill="${palette.accent}" opacity="0.66"`)
        ].join(""),
        {
          starCount: 0,
          backdrop: [
            panel(34, 42, 252, 156, palette, { opacity: 0.17 }),
            line(60, 196, 260, 196, `stroke="${palette.metal}" stroke-width="2" opacity="0.08"`),
            line(78, 210, 110, 210, `stroke="${palette.secondary}" stroke-width="3" stroke-linecap="round" opacity="0.28"`),
            line(210, 210, 242, 210, `stroke="${palette.accent}" stroke-width="3" stroke-linecap="round" opacity="0.28"`)
          ].join("")
        }
      );
    case "timeArchitect":
      return scene(
        asset,
        palette,
        [
          bench(214, palette),
          hourglass(160, 154, 1.08, palette),
          gear(94, 96, 16, palette, { opacity: 0.36 }),
          circle(232, 94, 26, `fill="none" stroke="${palette.secondary}" stroke-width="6" opacity="0.44"`),
          line(232, 94, 232, 78, `stroke="${palette.secondary}" stroke-width="4" stroke-linecap="round" opacity="0.58"`),
          line(232, 94, 246, 104, `stroke="${palette.secondary}" stroke-width="4" stroke-linecap="round" opacity="0.58"`),
          rect(64, 204, 42, 8, `rx="4" fill="${palette.accent}" opacity="0.58"`),
          rect(214, 204, 34, 8, `rx="4" fill="${palette.secondary}" opacity="0.54"`)
        ].join(""),
        {
          starCount: 0,
          backdrop: [
            panel(32, 40, 256, 160, palette, { opacity: 0.16 }),
            gridLines("#ffffff", 0.04)
          ].join("")
        }
      );
    default:
      return scene(asset, palette, rocket(160, 160, 1.0, palette));
  }
}

function renderSpaceAsset(asset) {
  const palette = PALETTES[asset.assetKey];
  switch (asset.assetKey) {
    case "moonRover":
      return scene(asset, palette, [ellipse(160, 236, 106, 28, `fill="#d4dae8" opacity="0.38"`), circle(108, 220, 16, `fill="#eef2ff" opacity="0.28"`), circle(206, 228, 10, `fill="#eef2ff" opacity="0.24"`), rover(160, 152, 1.05, palette)].join(""), { starCount: 15 });
    case "rocketBuddy":
      return scene(asset, palette, [starBurst(232, 98, 0.38, palette.accent, 0.85), rocket(160, 166, 1.22, palette)].join(""), { starCount: 18 });
    case "marsExplorer":
      return scene(asset, palette, [planet(228, 100, 42, { body: palette.secondary, shade: "#b9503b" }, { aura: palette.glow, spots: [{ dx: -8, dy: -2, r: 6 }, { dx: 12, dy: 10, r: 5 }] }), astronaut(146, 170, 0.98, palette)].join(""), { starCount: 13 });
    case "cometCruiser":
      return scene(asset, palette, [pathEl("M56 200 C108 154 138 124 178 96", `fill="none" stroke="${palette.accent}" stroke-width="18" stroke-linecap="round" opacity="0.72"`), pathEl("M60 208 C110 164 144 138 184 112", `fill="none" stroke="${palette.secondary}" stroke-width="10" stroke-linecap="round" opacity="0.66"`), ship(196, 112, 1.0, palette)].join(""), { starCount: 16 });
    case "starlightSatellite":
      return scene(asset, palette, satellite(160, 158, 1.05, palette), { starCount: 18, rings: true });
    case "solarSailor":
      return scene(asset, palette, [circle(96, 92, 26, `fill="${palette.accent}" opacity="0.95"`), polygon("120,110 194,148 122,188", `fill="${palette.primary}" opacity="0.95"`), ship(184, 166, 0.92, palette)].join(""), { starCount: 16 });
    case "lunarLander":
      return scene(asset, palette, [ellipse(160, 236, 106, 24, `fill="#eef2fb" opacity="0.28"`), lander(160, 154, 1.0, palette)].join(""), { starCount: 14 });
    case "meteorSurfer":
      return scene(asset, palette, [pathEl("M74 198 C108 176 154 138 220 104", `fill="none" stroke="${palette.primary}" stroke-width="26" stroke-linecap="round" opacity="0.85"`), pathEl("M96 190 C132 170 168 150 228 118", `fill="none" stroke="${palette.accent}" stroke-width="8" stroke-linecap="round" opacity="0.7"`), ship(172, 146, 0.8, palette, "glider")].join(""), { starCount: 15 });
    case "saturnSkipper":
      return scene(asset, palette, [planet(130, 138, 52, { body: palette.primary, shade: "#a77029" }, { ring: palette.secondary, rotate: -8, spots: [{ dx: -10, dy: -6, r: 6, fill: "#d89d49" }, { dx: 14, dy: 10, r: 5, fill: "#d89d49" }] }), ship(222, 136, 0.72, palette)].join(""), { starCount: 18 });
    case "astroMechanic":
      return scene(asset, palette, [robot(138, 156, 0.9, palette), line(204, 118, 236, 86, `stroke="${palette.accent}" stroke-width="10" stroke-linecap="round"`), line(214, 108, 240, 134, `stroke="${palette.secondary}" stroke-width="10" stroke-linecap="round"`), circle(206, 116, 8, `fill="${palette.metal}"`)].join(""), { starCount: 12 });
    case "eclipseRanger":
      return scene(asset, palette, [circle(160, 122, 46, `fill="${palette.accent}" opacity="0.25"`), circle(160, 122, 34, `fill="${palette.dark}"`), ship(188, 186, 0.92, palette)].join(""), { starCount: 18, rings: true });
    case "nebulaNomad":
      return scene(asset, palette, [nebula(144, 118, 1.2, palette), ship(178, 180, 1.0, palette)].join(""), { starCount: 19 });
    case "gravityGlider":
      return scene(asset, palette, [blackHole(112, 112, 1.0, palette), ship(204, 174, 0.98, palette, "glider")].join(""), { starCount: 17 });
    case "auroraOrbiter":
      return scene(asset, palette, [pathEl("M64 178 C100 142 132 140 164 170 C196 200 226 198 256 158", `fill="none" stroke="${palette.secondary}" stroke-width="18" stroke-linecap="round" opacity="0.36"`), pathEl("M64 202 C100 166 132 164 164 194 C196 224 226 222 256 182", `fill="none" stroke="${palette.accent}" stroke-width="10" stroke-linecap="round" opacity="0.32"`), station(160, 126, 1.0, palette)].join(""), { starCount: 16 });
    case "starforgePilot":
      return scene(asset, palette, [starBurst(108, 96, 0.72, palette.accent, 0.85), ship(186, 176, 1.02, palette)].join(""), { starCount: 17 });
    case "supernovaSentinel":
      return scene(asset, palette, [starBurst(160, 122, 1.0, palette.secondary, 0.5), shield(160, 156, 0.9, palette)].join(""), { starCount: 18 });
    case "galaxyGuardian":
      return scene(asset, palette, [ellipse(160, 98, 78, 24, `fill="none" stroke="${palette.accent}" stroke-width="8" opacity="0.55"`), robot(160, 164, 1.02, palette)].join(""), { starCount: 16 });
    case "voidVoyager":
      return scene(asset, palette, [circle(96, 112, 24, `fill="${palette.secondary}" opacity="0.2"`), ship(170, 158, 1.15, palette, "sleek"), line(72, 190, 126, 164, `stroke="${palette.secondary}" stroke-width="6" stroke-linecap="round" opacity="0.45"`)].join(""), { starCount: 20 });
    case "celestialObservatory":
      return scene(asset, palette, [ellipse(160, 236, 112, 24, `fill="#eef5ff" opacity="0.2"`), observatory(160, 148, 1.0, palette)].join(""), { starCount: 17 });
    case "cosmicCrown":
      return scene(asset, palette, [planet(160, 170, 52, { body: palette.secondary, shade: "#5248c4" }, { ring: palette.accent, rotate: -10, aura: palette.glow, spots: [{ dx: -12, dy: 8, r: 7, fill: "#9d94ff" }, { dx: 18, dy: -4, r: 5, fill: "#9d94ff" }] }), crown(160, 92, 0.76, palette)].join(""), { starCount: 17 });
    default:
      return scene(asset, palette, ship(160, 160, 1.0, palette), { starCount: 16 });
  }
}

function scene(asset, palette, inner, options = {}) {
  const id = asset.id.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const overlay = [options.grid ? gridLines("#ffffff", 0.07) : "", options.rings ? orbits("#ffffff") : ""].join("");
  const starCount = options.starCount ?? 16;
  const stars = starCount > 0 ? starField(id, starCount) : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" fill="none">
    <defs>
      <linearGradient id="bg-${id}" x1="30" y1="18" x2="286" y2="320" gradientUnits="userSpaceOnUse">
        <stop stop-color="${palette.bgFrom}"/>
        <stop offset="1" stop-color="${palette.bgTo}"/>
      </linearGradient>
      <radialGradient id="glow-${id}" cx="0" cy="0" r="1" gradientTransform="translate(160 124) rotate(90) scale(118)" gradientUnits="userSpaceOnUse">
        <stop stop-color="${palette.glow}" stop-opacity="0.56"/>
        <stop offset="1" stop-color="${palette.glow}" stop-opacity="0"/>
      </radialGradient>
      <filter id="shadow-${id}" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="14" stdDeviation="12" flood-color="#04101d" flood-opacity="0.34"/>
      </filter>
    </defs>
    <rect width="320" height="320" rx="44" fill="url(#bg-${id})"/>
    <circle cx="160" cy="124" r="110" fill="url(#glow-${id})"/>
    ${options.backdrop || ""}
    ${stars}
    ${overlay}
    <g filter="url(#shadow-${id})">
      ${inner}
    </g>
    <rect x="10" y="10" width="300" height="300" rx="34" stroke="rgba(255,255,255,0.18)"/>
  </svg>`;
}

function renderAsset(asset) {
  if (String(asset.id).startsWith("science-")) {
    return renderScienceAsset(asset);
  }
  return renderSpaceAsset(asset);
}

function assetFilePath(asset) {
  const relative = String(asset.image || "").replace(/^\/assets\//, "");
  return path.join(ASSET_ROOT, relative);
}

function main() {
  let written = 0;
  for (const asset of ALL_BLOOKS) {
    const filePath = assetFilePath(asset);
    ensureDir(path.dirname(filePath));
    const svg = renderAsset(asset);
    fs.writeFileSync(filePath, svg, "utf8");
    written += 1;
  }
  console.log(`Generated ${written} science and space asset files.`);
}

main();
