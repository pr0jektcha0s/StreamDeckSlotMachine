/**
 * Renderer – loads pre-generated symbol PNG images from the plugin's imgs/
 * directory at startup and exposes them as base64 data URLs for setImage().
 *
 * Images are created by running: npm run generate-assets
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// When bundled, import.meta.url points to bin/plugin.js.
// PLUGIN_DIR is one level up from bin/.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const PLUGIN_DIR = join(__dirname, "..");

const SYMBOL_IDS = ["cherry", "lemon", "orange", "bell", "bar", "seven"] as const;
export type SymbolId = (typeof SYMBOL_IDS)[number];

const symbolImages: Partial<Record<string, string>> = {};
const uiImages: Partial<Record<string, string>> = {};

function loadPng(relativePath: string): string {
  const buf = readFileSync(join(PLUGIN_DIR, relativePath));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export function loadImages(): void {
  for (const id of SYMBOL_IDS) {
    symbolImages[id] = loadPng(`imgs/symbols/${id}.png`);
  }

  uiImages["spin-idle"]   = loadPng("imgs/ui/spin-idle.png");
  uiImages["spin-active"] = loadPng("imgs/ui/spin-active.png");
  uiImages["spin-win"]    = loadPng("imgs/ui/spin-win.png");
  uiImages["spin-lose"]   = loadPng("imgs/ui/spin-lose.png");
  uiImages["balance-bg"]  = loadPng("imgs/ui/balance-bg.png");
}

export function getSymbolImage(symbolId: string): string {
  return symbolImages[symbolId] ?? symbolImages["cherry"]!;
}

export function getUiImage(key: string): string {
  return uiImages[key] ?? uiImages["spin-idle"]!;
}
