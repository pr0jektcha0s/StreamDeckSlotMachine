/**
 * generate-assets.mjs
 *
 * Generates all PNG image assets required by the plugin:
 *   - imgs/symbols/{cherry,lemon,orange,bell,bar,seven}.png   (144×144)
 *   - imgs/ui/{spin-idle,spin-active,spin-win,spin-lose,balance-bg}.png
 *   - imgs/plugin/marketplace{,@2x}.png                       (72 and 144)
 *   - imgs/plugin/category{,@2x}.png
 *   - imgs/actions/{reel,spin,balance}/{action,key}{,@2x}.png
 *
 * Run once before building: npm run generate-assets
 * Requires: @napi-rs/canvas (devDependency)
 */

import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN = join(__dirname, "../com.stahlee.slotmachine.sdPlugin");

// ── Helpers ─────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function save(dir, name, buffer) {
  ensureDir(dir);
  writeFileSync(join(dir, name), buffer);
}

/** Draw a rounded rectangle path. */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Symbol key images (144×144) ──────────────────────────────────────────────

const SYMBOLS = [
  { id: "cherry", label: "🍒", isEmoji: true,  bgColor: "#7f1d1d", textColor: "#ffffff" },
  { id: "lemon",  label: "🍋", isEmoji: true,  bgColor: "#78350f", textColor: "#ffffff" },
  { id: "orange", label: "🍊", isEmoji: true,  bgColor: "#7c2d12", textColor: "#ffffff" },
  { id: "bell",   label: "🔔", isEmoji: true,  bgColor: "#4c1d95", textColor: "#ffffff" },
  { id: "bar",    label: "BAR", isEmoji: false, bgColor: "#1e3a8a", textColor: "#fbbf24" },
  { id: "seven",  label: "7",  isEmoji: false, bgColor: "#111827", textColor: "#fbbf24" },
];

function drawSymbol(size, bgColor, textColor, label, isEmoji) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  // Top highlight
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(0, 0, size, size * 0.45);

  // Bottom shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, size * 0.55, size, size * 0.45);

  // Inner border
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = size * 0.025;
  const pad = size * 0.05;
  roundRect(ctx, pad, pad, size - pad * 2, size - pad * 2, size * 0.1);
  ctx.stroke();

  // Symbol text
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (isEmoji) {
    // Emoji: use a large serif/emoji font
    ctx.font = `${Math.round(size * 0.52)}px "Apple Color Emoji", "Segoe UI Emoji", serif`;
    ctx.fillText(label, size / 2, size / 2 + size * 0.03);
  } else if (label === "BAR") {
    // Chunky italic BAR text with a subtle shadow
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = size * 0.06;
    ctx.font = `900 italic ${Math.round(size * 0.38)}px Arial, sans-serif`;
    ctx.fillText(label, size / 2, size / 2);
    ctx.shadowBlur = 0;
  } else {
    // Large numeral "7" with glow
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = size * 0.12;
    ctx.font = `900 ${Math.round(size * 0.62)}px Arial, sans-serif`;
    ctx.fillText(label, size / 2, size / 2 + size * 0.04);
    ctx.shadowBlur = 0;
  }

  return canvas.toBuffer("image/png");
}

// ── UI images (144×144) ──────────────────────────────────────────────────────

function drawButton(size, bgColor, textColor, lines, shadow = null) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  // Top highlight
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(0, 0, size, size * 0.4);

  // Inner border
  ctx.strokeStyle = "rgba(255,255,255,0.20)";
  ctx.lineWidth = size * 0.025;
  const pad = size * 0.05;
  roundRect(ctx, pad, pad, size - pad * 2, size - pad * 2, size * 0.1);
  ctx.stroke();

  // Text lines
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lineH = size * 0.22;
  const startY = size / 2 - ((lines.length - 1) / 2) * lineH;

  lines.forEach((line, i) => {
    const [text, fontSize] = Array.isArray(line) ? line : [line, size * 0.18];
    if (shadow) {
      ctx.shadowColor = shadow;
      ctx.shadowBlur = size * 0.1;
    }
    ctx.font = `700 ${Math.round(fontSize)}px Arial, sans-serif`;
    ctx.fillText(text, size / 2, startY + i * lineH);
    ctx.shadowBlur = 0;
  });

  return canvas.toBuffer("image/png");
}

// ── Plugin / action icon images ───────────────────────────────────────────────

function drawIcon(size, bgColor, text) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(size * 0.28)}px Arial, sans-serif`;
  ctx.fillText(text, size / 2, size / 2);

  return canvas.toBuffer("image/png");
}

// ── Generate everything ───────────────────────────────────────────────────────

console.log("Generating symbol images…");
const symDir = join(PLUGIN, "imgs/symbols");
for (const sym of SYMBOLS) {
  const buf = drawSymbol(144, sym.bgColor, sym.textColor, sym.label, sym.isEmoji);
  save(symDir, `${sym.id}.png`, buf);
  console.log(`  ✓ symbols/${sym.id}.png`);
}

console.log("\nGenerating UI images…");
const uiDir = join(PLUGIN, "imgs/ui");

save(uiDir, "spin-idle.png",   drawButton(144, "#064e3b", "#ffffff", [["🎰", 72], ["SPIN", 26]]));
save(uiDir, "spin-active.png", drawButton(144, "#1e3a8a", "#93c5fd", [["⟳",  70], ["...",  26]]));
save(uiDir, "spin-win.png",    drawButton(144, "#78350f", "#fbbf24", [["WIN!", 30]], "#fbbf24"));
save(uiDir, "spin-lose.png",   drawButton(144, "#1f2937", "#6b7280", [["😢", 60], ["LOSE", 22]]));
save(uiDir, "balance-bg.png",  drawButton(144, "#1e1b4b", "#c7d2fe", [["💰", 64]]));
console.log("  ✓ spin-idle / spin-active / spin-win / spin-lose / balance-bg");

console.log("\nGenerating plugin icons…");
const pluginDir = join(PLUGIN, "imgs/plugin");
save(pluginDir, "marketplace.png",   drawIcon(72,  "#1e3a8a", "🎰"));
save(pluginDir, "marketplace@2x.png",drawIcon(144, "#1e3a8a", "🎰"));
save(pluginDir, "category.png",      drawIcon(72,  "#1e3a8a", "🎮"));
save(pluginDir, "category@2x.png",   drawIcon(144, "#1e3a8a", "🎮"));
console.log("  ✓ marketplace / category (1x + @2x)");

const actionDefs = [
  { name: "reel",    label: "🎰", color: "#4c1d95" },
  { name: "spin",    label: "▶",  color: "#064e3b" },
  { name: "balance", label: "💰", color: "#1e1b4b" },
];

console.log("\nGenerating action icons…");
for (const def of actionDefs) {
  const dir = join(PLUGIN, `imgs/actions/${def.name}`);
  save(dir, "action.png",   drawIcon(72,  def.color, def.label));
  save(dir, "action@2x.png",drawIcon(144, def.color, def.label));
  save(dir, "key.png",      drawIcon(72,  def.color, def.label));
  save(dir, "key@2x.png",   drawIcon(144, def.color, def.label));
  console.log(`  ✓ actions/${def.name}/ (action + key, 1x + @2x)`);
}

console.log("\n✅ All assets generated successfully.");
