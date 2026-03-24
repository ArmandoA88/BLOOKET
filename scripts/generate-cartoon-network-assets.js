const fs = require("fs");
const path = require("path");

const { CARTOON_NETWORK_BLOOKS } = require("../data/cartoon-network-blooks");

const ASSET_DIR = path.join(__dirname, "..", "public", "assets", "cartoon-network");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function polygon(points, attrs = "") {
  return `<polygon points="${points}" ${attrs}/>`;
}

function pathEl(d, attrs = "") {
  return `<path d="${d}" ${attrs}/>`;
}

function line(x1, y1, x2, y2, attrs = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs}/>`;
}

function decorativeShapes(accent) {
  return [
    circle(62, 84, 20, `fill="${accent}" opacity="0.14"`),
    circle(270, 84, 26, `fill="${accent}" opacity="0.16"`),
    circle(252, 228, 18, `fill="${accent}" opacity="0.12"`),
    circle(80, 228, 14, `fill="${accent}" opacity="0.10"`),
    line(248, 54, 278, 84, `stroke="${accent}" stroke-width="5" stroke-linecap="round" opacity="0.18"`),
    line(44, 230, 84, 250, `stroke="${accent}" stroke-width="5" stroke-linecap="round" opacity="0.16"`)
  ].join("");
}

function cardFrame(blook, content) {
  const art = blook.art || {};
  const bgFrom = art.bgFrom || "#20314a";
  const bgTo = art.bgTo || "#385780";
  const accent = art.accent || "#ffffff";
  const badge = art.badge || blook.show || "Cartoon";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-labelledby="title desc">`,
    `<title id="title">${escapeXml(blook.name)}</title>`,
    `<desc id="desc">${escapeXml(`${blook.name} from ${blook.show}`)}</desc>`,
    `<defs>`,
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0%" stop-color="${bgFrom}"/>`,
    `<stop offset="100%" stop-color="${bgTo}"/>`,
    `</linearGradient>`,
    `<linearGradient id="panel" x1="0" y1="0" x2="0.9" y2="1">`,
    `<stop offset="0%" stop-color="#ffffff" stop-opacity="0.15"/>`,
    `<stop offset="100%" stop-color="#ffffff" stop-opacity="0.04"/>`,
    `</linearGradient>`,
    `<filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">`,
    `<feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#08111f" flood-opacity="0.35"/>`,
    `</filter>`,
    `</defs>`,
    rect(0, 0, 320, 320, `rx="34" fill="url(#bg)"`),
    decorativeShapes(accent),
    rect(24, 22, 272, 276, `rx="28" fill="url(#panel)" stroke="#ffffff" stroke-opacity="0.18"`),
    ellipse(160, 264, 92, 18, `fill="#091221" opacity="0.28"`),
    `<g filter="url(#shadow)">`,
    content,
    `</g>`,
    rect(34, 32, Math.min(208, 12 + badge.length * 10), 30, `rx="15" fill="#0d1828" fill-opacity="0.48" stroke="#ffffff" stroke-opacity="0.15"`),
    `<text x="48" y="52" fill="#ffffff" font-size="14" font-weight="700" font-family="'Trebuchet MS', 'Segoe UI', sans-serif">${escapeXml(badge)}</text>`,
    `</svg>`
  ].join("");
}

function renderPowerpuff({ hairColor, dressColor, accentColor, bow = false }) {
  const bowSvg = bow
    ? [
      polygon("110,82 140,62 148,90 122,108", `fill="#ff2c45"`),
      polygon("210,82 180,62 172,90 198,108", `fill="#ff2c45"`),
      circle(160, 88, 12, `fill="#ff3952"`)
    ].join("")
    : "";

  return [
    bowSvg,
    ellipse(160, 118, 86, 82, `fill="${hairColor}"`),
    circle(160, 126, 74, `fill="#ffe1c6"`),
    rect(126, 180, 68, 48, `rx="22" fill="${dressColor}"`),
    rect(126, 200, 68, 12, `fill="#111827" opacity="0.18"`),
    ellipse(126, 128, 24, 34, `fill="#ffffff"`),
    ellipse(194, 128, 24, 34, `fill="#ffffff"`),
    ellipse(126, 132, 12, 18, `fill="${accentColor}"`),
    ellipse(194, 132, 12, 18, `fill="${accentColor}"`),
    circle(126, 134, 7, `fill="#101828"`),
    circle(194, 134, 7, `fill="#101828"`),
    circle(126, 130, 3, `fill="#ffffff"`),
    circle(194, 130, 3, `fill="#ffffff"`),
    pathEl("M 148 160 Q 160 168 172 160", `fill="none" stroke="#101828" stroke-width="4" stroke-linecap="round"`),
    line(140, 228, 130, 252, `stroke="#101828" stroke-width="6" stroke-linecap="round"`),
    line(180, 228, 190, 252, `stroke="#101828" stroke-width="6" stroke-linecap="round"`),
    line(120, 194, 96, 206, `stroke="#ffe1c6" stroke-width="10" stroke-linecap="round"`),
    line(200, 194, 224, 206, `stroke="#ffe1c6" stroke-width="10" stroke-linecap="round"`)
  ].join("");
}

function renderFinn() {
  return [
    rect(112, 182, 96, 72, `rx="28" fill="#2f99ff"`),
    rect(120, 184, 18, 62, `rx="9" fill="#71c95c"`),
    rect(182, 184, 18, 62, `rx="9" fill="#71c95c"`),
    ellipse(160, 118, 76, 88, `fill="#ffffff"`),
    circle(108, 68, 22, `fill="#ffffff"`),
    circle(212, 68, 22, `fill="#ffffff"`),
    ellipse(160, 132, 52, 64, `fill="#f4c8a5"`),
    circle(140, 134, 5, `fill="#192231"`),
    circle(180, 134, 5, `fill="#192231"`),
    pathEl("M 144 164 Q 160 176 176 164", `fill="none" stroke="#192231" stroke-width="4" stroke-linecap="round"`),
    rect(140, 210, 40, 18, `rx="8" fill="#1f6bd2" opacity="0.8"`)
  ].join("");
}

function renderJake() {
  return [
    ellipse(160, 170, 64, 74, `fill="#f3b342"`),
    circle(160, 118, 60, `fill="#f7bb46"`),
    ellipse(132, 116, 18, 26, `fill="#ffffff"`),
    ellipse(188, 116, 18, 26, `fill="#ffffff"`),
    circle(136, 120, 8, `fill="#1b2436"`),
    circle(184, 120, 8, `fill="#1b2436"`),
    ellipse(160, 144, 22, 18, `fill="#f6d8a4"`),
    circle(160, 138, 7, `fill="#1b2436"`),
    pathEl("M 148 156 Q 160 166 172 156", `fill="none" stroke="#1b2436" stroke-width="4" stroke-linecap="round"`),
    line(116, 176, 90, 204, `stroke="#f3b342" stroke-width="18" stroke-linecap="round"`),
    line(204, 176, 230, 204, `stroke="#f3b342" stroke-width="18" stroke-linecap="round"`),
    line(138, 230, 124, 256, `stroke="#f3b342" stroke-width="18" stroke-linecap="round"`),
    line(182, 230, 196, 256, `stroke="#f3b342" stroke-width="18" stroke-linecap="round"`)
  ].join("");
}

function renderPrincessBubblegum() {
  return [
    ellipse(160, 118, 78, 88, `fill="#ff8ed2"`),
    circle(160, 128, 54, `fill="#ffd2e9"`),
    polygon("130,64 146,38 160,64 174,38 190,64", `fill="#ffd84f"`),
    rect(116, 184, 88, 62, `rx="26" fill="#66d7d1"`),
    rect(140, 180, 40, 18, `rx="8" fill="#ff9dd6"`),
    circle(142, 128, 5, `fill="#24183b"`),
    circle(178, 128, 5, `fill="#24183b"`),
    pathEl("M 144 156 Q 160 166 176 156", `fill="none" stroke="#24183b" stroke-width="4" stroke-linecap="round"`),
    line(112, 196, 86, 220, `stroke="#ffd2e9" stroke-width="10" stroke-linecap="round"`),
    line(208, 196, 234, 220, `stroke="#ffd2e9" stroke-width="10" stroke-linecap="round"`)
  ].join("");
}

function renderMarceline() {
  return [
    pathEl("M 104 78 Q 160 18 216 82 L 224 176 Q 194 210 160 212 Q 126 210 96 176 Z", `fill="#171717"`),
    ellipse(160, 126, 52, 62, `fill="#e9e9ee"`),
    rect(116, 186, 88, 58, `rx="24" fill="#4d5a68"`),
    pathEl("M 152 168 Q 160 176 168 168", `fill="none" stroke="#5a0f1c" stroke-width="4" stroke-linecap="round"`),
    circle(142, 126, 5, `fill="#1a1f29"`),
    circle(178, 126, 5, `fill="#1a1f29"`),
    polygon("102,196 150,166 190,214 144,232", `fill="#9d2037"`),
    rect(176, 202, 54, 12, `rx="6" fill="#3a2020"`),
    line(184, 202, 228, 136, `stroke="#2f1414" stroke-width="4" stroke-linecap="round"`),
    line(116, 194, 92, 224, `stroke="#e9e9ee" stroke-width="10" stroke-linecap="round"`)
  ].join("");
}

function renderGumball() {
  return [
    ellipse(160, 118, 82, 78, `fill="#47bdf0"`),
    polygon("104,82 118,54 136,84", `fill="#47bdf0"`),
    polygon("216,82 202,54 184,84", `fill="#47bdf0"`),
    circle(160, 128, 58, `fill="#6fd2f7"`),
    ellipse(136, 128, 18, 24, `fill="#ffffff"`),
    ellipse(184, 128, 18, 24, `fill="#ffffff"`),
    circle(140, 132, 8, `fill="#1c283b"`),
    circle(180, 132, 8, `fill="#1c283b"`),
    pathEl("M 144 160 Q 160 170 176 160", `fill="none" stroke="#1c283b" stroke-width="4" stroke-linecap="round"`),
    line(112, 144, 92, 140, `stroke="#1c283b" stroke-width="3" stroke-linecap="round"`),
    line(208, 144, 228, 140, `stroke="#1c283b" stroke-width="3" stroke-linecap="round"`),
    rect(116, 186, 88, 58, `rx="24" fill="#e9d7a8"`),
    rect(116, 210, 88, 18, `rx="9" fill="#8c6549"`)
  ].join("");
}

function renderDarwin() {
  return [
    ellipse(160, 128, 74, 70, `fill="#ff8a2d"`),
    ellipse(136, 126, 18, 24, `fill="#ffffff"`),
    ellipse(184, 126, 18, 24, `fill="#ffffff"`),
    circle(140, 130, 8, `fill="#182132"`),
    circle(180, 130, 8, `fill="#182132"`),
    pathEl("M 146 156 Q 160 168 174 156", `fill="none" stroke="#182132" stroke-width="4" stroke-linecap="round"`),
    rect(122, 186, 76, 46, `rx="24" fill="#ff8a2d"`),
    line(138, 230, 132, 258, `stroke="#ff8a2d" stroke-width="10" stroke-linecap="round"`),
    line(182, 230, 188, 258, `stroke="#ff8a2d" stroke-width="10" stroke-linecap="round"`),
    rect(118, 250, 26, 12, `rx="6" fill="#75d35c"`),
    rect(176, 250, 26, 12, `rx="6" fill="#75d35c"`),
    line(118, 196, 96, 212, `stroke="#ff8a2d" stroke-width="10" stroke-linecap="round"`),
    line(202, 196, 224, 212, `stroke="#ff8a2d" stroke-width="10" stroke-linecap="round"`)
  ].join("");
}

function renderMordecai() {
  return [
    pathEl("M 116 82 Q 160 34 204 82 L 188 196 Q 160 214 132 196 Z", `fill="#4d76ff"`),
    ellipse(160, 126, 52, 66, `fill="#dce9ff"`),
    polygon("160,128 210,142 160,158", `fill="#f0c14c"`),
    ellipse(146, 120, 12, 18, `fill="#111827"`),
    circle(148, 118, 4, `fill="#ffffff"`),
    rect(118, 190, 84, 56, `rx="24" fill="#4d76ff"`),
    rect(118, 210, 84, 16, `rx="8" fill="#dce9ff"`),
    line(122, 194, 92, 216, `stroke="#dce9ff" stroke-width="10" stroke-linecap="round"`),
    line(198, 194, 226, 216, `stroke="#4d76ff" stroke-width="10" stroke-linecap="round"`)
  ].join("");
}

function renderRigby() {
  return [
    ellipse(160, 128, 68, 74, `fill="#a36a3f"`),
    polygon("112,92 128,58 146,98", `fill="#7a4c30"`),
    polygon("208,92 192,58 174,98", `fill="#7a4c30"`),
    ellipse(160, 140, 54, 44, `fill="#e8c99c"`),
    ellipse(138, 128, 16, 22, `fill="#ffffff"`),
    ellipse(182, 128, 16, 22, `fill="#ffffff"`),
    circle(142, 132, 8, `fill="#1b2436"`),
    circle(178, 132, 8, `fill="#1b2436"`),
    ellipse(160, 148, 14, 12, `fill="#1b2436"`),
    pathEl("M 146 164 Q 160 174 174 164", `fill="none" stroke="#1b2436" stroke-width="4" stroke-linecap="round"`),
    rect(120, 192, 80, 54, `rx="24" fill="#9a6238"`),
    pathEl("M 214 178 Q 260 202 236 254", `fill="none" stroke="#7a4c30" stroke-width="18" stroke-linecap="round"`),
    line(214, 194, 242, 208, `stroke="#e8c99c" stroke-width="4" opacity="0.6"`),
    line(210, 214, 238, 228, `stroke="#e8c99c" stroke-width="4" opacity="0.6"`)
  ].join("");
}

function renderBenson() {
  return [
    rect(116, 154, 88, 92, `rx="24" fill="#d64c5a"`),
    rect(138, 242, 44, 16, `rx="8" fill="#6c7889"`),
    rect(132, 134, 56, 20, `rx="8" fill="#6c7889"`),
    circle(160, 112, 56, `fill="#d8f3ff" fill-opacity="0.72" stroke="#ffffff" stroke-opacity="0.54" stroke-width="6"`),
    circle(126, 96, 8, `fill="#ff5d79"`),
    circle(146, 78, 8, `fill="#ffd54f"`),
    circle(170, 92, 8, `fill="#8de36b"`),
    circle(188, 112, 8, `fill="#67d1ff"`),
    circle(156, 108, 7, `fill="#1b2436"`),
    circle(176, 108, 7, `fill="#1b2436"`),
    pathEl("M 144 132 Q 160 144 176 132", `fill="none" stroke="#1b2436" stroke-width="4" stroke-linecap="round"`),
    rect(138, 182, 44, 22, `rx="6" fill="#ffffff"`),
    line(116, 188, 92, 210, `stroke="#d8f3ff" stroke-width="8" stroke-linecap="round"`),
    line(204, 188, 228, 210, `stroke="#d8f3ff" stroke-width="8" stroke-linecap="round"`)
  ].join("");
}

function renderPops() {
  return [
    circle(160, 112, 58, `fill="#ffe4ee"`),
    rect(122, 164, 76, 74, `rx="26" fill="#f3a3cf"`),
    rect(148, 154, 24, 22, `rx="10" fill="#f7d6e4"`),
    polygon("144,176 160,194 176,176 190,188 160,216 130,188", `fill="#2b2c55"`),
    circle(144, 112, 5, `fill="#2b2c55"`),
    circle(176, 112, 5, `fill="#2b2c55"`),
    pathEl("M 144 138 Q 160 148 176 138", `fill="none" stroke="#2b2c55" stroke-width="4" stroke-linecap="round"`),
    rect(148, 42, 24, 22, `rx="4" fill="#2b2c55"`),
    rect(142, 34, 36, 10, `rx="4" fill="#2b2c55"`),
    line(122, 186, 96, 210, `stroke="#ffe4ee" stroke-width="8" stroke-linecap="round"`),
    line(198, 186, 224, 210, `stroke="#ffe4ee" stroke-width="8" stroke-linecap="round"`)
  ].join("");
}

function renderDexter() {
  return [
    pathEl("M 118 80 Q 140 48 160 54 Q 188 44 208 82 L 206 106 Q 188 94 160 96 Q 132 94 114 106 Z", `fill="#ff7d2c"`),
    ellipse(160, 128, 56, 66, `fill="#ffd3ba"`),
    rect(114, 106, 44, 32, `rx="10" fill="#ffffff" stroke="#182132" stroke-width="5"`),
    rect(162, 106, 44, 32, `rx="10" fill="#ffffff" stroke="#182132" stroke-width="5"`),
    rect(154, 116, 12, 8, `rx="4" fill="#182132"`),
    circle(136, 124, 7, `fill="#182132"`),
    circle(184, 124, 7, `fill="#182132"`),
    pathEl("M 146 156 Q 160 166 174 156", `fill="none" stroke="#182132" stroke-width="4" stroke-linecap="round"`),
    rect(118, 186, 84, 66, `rx="22" fill="#f7fbff"`),
    rect(146, 186, 28, 66, `rx="10" fill="#9fe0ff"`),
    line(118, 194, 90, 218, `stroke="#ffd3ba" stroke-width="9" stroke-linecap="round"`),
    line(202, 194, 230, 218, `stroke="#ffd3ba" stroke-width="9" stroke-linecap="round"`)
  ].join("");
}

function renderDeeDee() {
  return [
    circle(126, 78, 24, `fill="#ffe45d"`),
    circle(194, 78, 24, `fill="#ffe45d"`),
    line(144, 80, 112, 112, `stroke="#ffe45d" stroke-width="12" stroke-linecap="round"`),
    line(176, 80, 208, 112, `stroke="#ffe45d" stroke-width="12" stroke-linecap="round"`),
    ellipse(160, 126, 58, 68, `fill="#ffe1c5"`),
    circle(140, 126, 6, `fill="#1b2336"`),
    circle(180, 126, 6, `fill="#1b2336"`),
    pathEl("M 144 158 Q 160 170 176 158", `fill="none" stroke="#1b2336" stroke-width="4" stroke-linecap="round"`),
    rect(120, 188, 80, 64, `rx="26" fill="#ff99c5"`),
    line(120, 196, 92, 222, `stroke="#ffe1c5" stroke-width="10" stroke-linecap="round"`),
    line(200, 196, 228, 222, `stroke="#ffe1c5" stroke-width="10" stroke-linecap="round"`),
    line(142, 248, 132, 266, `stroke="#ffe1c5" stroke-width="8" stroke-linecap="round"`),
    line(178, 248, 188, 266, `stroke="#ffe1c5" stroke-width="8" stroke-linecap="round"`)
  ].join("");
}

function renderSamuraiJack() {
  return [
    pathEl("M 114 86 Q 160 28 206 86 L 196 170 Q 178 200 160 202 Q 142 200 124 170 Z", `fill="#111418"`),
    rect(116, 172, 88, 82, `rx="18" fill="#f7f7f4"`),
    pathEl("M 160 82 Q 192 96 196 140 Q 184 180 160 184 Q 136 180 124 140 Q 128 96 160 82 Z", `fill="#f0d4bf"`),
    circle(144, 126, 5, `fill="#111418"`),
    circle(176, 126, 5, `fill="#111418"`),
    line(138, 112, 150, 110, `stroke="#111418" stroke-width="4" stroke-linecap="round"`),
    line(170, 110, 182, 112, `stroke="#111418" stroke-width="4" stroke-linecap="round"`),
    pathEl("M 146 156 Q 160 164 174 156", `fill="none" stroke="#111418" stroke-width="4" stroke-linecap="round"`),
    rect(150, 36, 20, 34, `rx="8" fill="#111418"`),
    rect(146, 28, 28, 14, `rx="6" fill="#111418"`),
    line(204, 192, 248, 146, `stroke="#cfd8e3" stroke-width="8" stroke-linecap="round"`),
    rect(238, 136, 16, 42, `rx="8" fill="#cfd8e3"`),
    rect(204, 188, 18, 16, `rx="8" fill="#8e583a"`)
  ].join("");
}

function renderCourage() {
  return [
    ellipse(160, 166, 62, 70, `fill="#f79bd0"`),
    ellipse(160, 116, 66, 58, `fill="#f7a6d7"`),
    ellipse(112, 96, 22, 42, `fill="#f79bd0"`),
    ellipse(208, 96, 22, 42, `fill="#f79bd0"`),
    ellipse(138, 116, 18, 24, `fill="#ffffff"`),
    ellipse(182, 116, 18, 24, `fill="#ffffff"`),
    circle(142, 120, 8, `fill="#1d2535"`),
    circle(178, 120, 8, `fill="#1d2535"`),
    ellipse(160, 144, 18, 14, `fill="#8d3f70"`),
    pathEl("M 148 156 Q 160 178 172 156", `fill="none" stroke="#8d3f70" stroke-width="4" stroke-linecap="round"`),
    line(120, 168, 90, 196, `stroke="#f79bd0" stroke-width="14" stroke-linecap="round"`),
    line(200, 168, 230, 196, `stroke="#f79bd0" stroke-width="14" stroke-linecap="round"`),
    line(142, 228, 130, 258, `stroke="#f79bd0" stroke-width="14" stroke-linecap="round"`),
    line(178, 228, 190, 258, `stroke="#f79bd0" stroke-width="14" stroke-linecap="round"`)
  ].join("");
}

function renderBlossom() {
  return renderPowerpuff({ hairColor: "#ff7d4d", dressColor: "#ff5f88", accentColor: "#ff7c96", bow: true });
}

function renderBubbles() {
  return [
    circle(116, 84, 26, `fill="#ffe36b"`),
    circle(204, 84, 26, `fill="#ffe36b"`),
    ...renderPowerpuff({ hairColor: "#ffe36b", dressColor: "#55b8ff", accentColor: "#56c4ff" }).split(/(?=<)/).filter(Boolean)
  ].join("");
}

function renderButtercup() {
  return [
    rect(98, 66, 124, 52, `rx="26" fill="#0f1015"`),
    ellipse(160, 118, 82, 74, `fill="#0f1015"`),
    ...renderPowerpuff({ hairColor: "#0f1015", dressColor: "#4bbc62", accentColor: "#4bbc62" }).split(/(?=<)/).filter(Boolean)
  ].join("");
}

function renderBen10() {
  return [
    pathEl("M 118 90 Q 138 54 160 60 Q 184 54 202 90 L 196 112 Q 182 98 160 100 Q 138 98 124 112 Z", `fill="#4a2c1e"`),
    ellipse(160, 128, 54, 64, `fill="#f1c7a5"`),
    circle(142, 126, 5, `fill="#1d2535"`),
    circle(178, 126, 5, `fill="#1d2535"`),
    pathEl("M 144 158 Q 160 168 176 158", `fill="none" stroke="#1d2535" stroke-width="4" stroke-linecap="round"`),
    rect(118, 184, 84, 66, `rx="22" fill="#ffffff"`),
    rect(118, 184, 84, 24, `rx="12" fill="#56b447"`),
    rect(170, 210, 30, 18, `rx="8" fill="#56b447"`),
    circle(118, 214, 16, `fill="#111827"`),
    circle(118, 214, 9, `fill="#dfff79"`),
    rect(112, 208, 12, 12, `rx="4" fill="#dfff79"`),
    rect(118, 214, 84, 12, `rx="6" fill="#1d2535" opacity="0.18"`),
    line(118, 194, 92, 218, `stroke="#f1c7a5" stroke-width="9" stroke-linecap="round"`)
  ].join("");
}

function renderJohnnyBravo() {
  return [
    polygon("104,96 126,46 212,52 190,104", `fill="#ffd94b"`),
    ellipse(160, 132, 54, 64, `fill="#f4c8a5"`),
    rect(126, 116, 68, 14, `rx="7" fill="#131619"`),
    line(160, 130, 160, 170, `stroke="#131619" stroke-width="4" stroke-linecap="round"`),
    pathEl("M 144 168 Q 160 178 176 168", `fill="none" stroke="#131619" stroke-width="4" stroke-linecap="round"`),
    rect(118, 190, 84, 62, `rx="22" fill="#131619"`),
    line(118, 196, 84, 224, `stroke="#f4c8a5" stroke-width="12" stroke-linecap="round"`),
    line(202, 196, 236, 224, `stroke="#f4c8a5" stroke-width="12" stroke-linecap="round"`),
    line(84, 224, 74, 244, `stroke="#f4c8a5" stroke-width="10" stroke-linecap="round"`),
    line(236, 224, 246, 244, `stroke="#f4c8a5" stroke-width="10" stroke-linecap="round"`)
  ].join("");
}

function renderChowder() {
  return [
    ellipse(160, 120, 78, 78, `fill="#9d75e6"`),
    polygon("106,82 160,46 214,82 186,104 134,104", `fill="#5f3f9e"`),
    rect(118, 184, 84, 64, `rx="24" fill="#8a4e7b"`),
    ellipse(160, 138, 52, 42, `fill="#bb91ef"`),
    circle(138, 126, 6, `fill="#1b2337"`),
    circle(182, 126, 6, `fill="#1b2337"`),
    ellipse(160, 146, 16, 12, `fill="#ffb86b"`),
    pathEl("M 140 158 Q 160 176 180 158", `fill="none" stroke="#1b2337" stroke-width="4" stroke-linecap="round"`),
    rect(124, 208, 72, 18, `rx="9" fill="#d6b8ff"`),
    line(118, 194, 90, 220, `stroke="#bb91ef" stroke-width="10" stroke-linecap="round"`),
    line(202, 194, 230, 220, `stroke="#bb91ef" stroke-width="10" stroke-linecap="round"`)
  ].join("");
}

const RENDERERS = {
  finn: renderFinn,
  jake: renderJake,
  "princess-bubblegum": renderPrincessBubblegum,
  marceline: renderMarceline,
  gumball: renderGumball,
  darwin: renderDarwin,
  mordecai: renderMordecai,
  rigby: renderRigby,
  benson: renderBenson,
  pops: renderPops,
  dexter: renderDexter,
  "dee-dee": renderDeeDee,
  "samurai-jack": renderSamuraiJack,
  courage: renderCourage,
  blossom: renderBlossom,
  bubbles: renderBubbles,
  buttercup: renderButtercup,
  "ben-10": renderBen10,
  "johnny-bravo": renderJohnnyBravo,
  chowder: renderChowder
};

function createSvg(blook) {
  const art = blook.art || {};
  const renderer = RENDERERS[art.renderKey];
  if (!renderer) {
    throw new Error(`Missing renderer for ${blook.id}`);
  }
  return cardFrame(blook, renderer());
}

function main() {
  ensureDir(ASSET_DIR);
  let count = 0;
  for (const blook of CARTOON_NETWORK_BLOOKS) {
    const fileName = path.basename(blook.image);
    const filePath = path.join(ASSET_DIR, fileName);
    fs.writeFileSync(filePath, createSvg(blook), "utf8");
    count += 1;
  }
  console.log(`Generated ${count} Cartoon Network blook assets in ${ASSET_DIR}`);
}

main();
