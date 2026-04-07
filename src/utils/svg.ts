/**
 * SVG-based scroll animation renderer.
 *
 * Builds SVG strings and encodes them as base64 data URLs — the format
 * Stream Deck reliably accepts for dynamic images.
 *
 * Uses only basic SVG (rect + text + clipPath) and avoids CSS features that
 * may not be supported by the Stream Deck app's SVG renderer (no rgba(),
 * no dominant-baseline, no CSS shorthand).
 */

import { Buffer } from "node:buffer";
import type { SlotSymbol } from "../game/symbols.js";

const S   = 144; // key size in px
const MID = S / 2;

/** Encodes an SVG string as a base64 data URL that setImage() accepts. */
function toDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

/**
 * Inner SVG markup for one symbol rendered at vertical offset `offsetY`.
 * Uses only SVG presentation attributes (no CSS rgba, no dominant-baseline).
 */
function symbolGroup(sym: SlotSymbol, offsetY: number): string {
  // ── background ────────────────────────────────────────────────────────
  const bg =
    `<rect width="${S}" height="${S}" fill="${sym.bgColor}"/>` +
    // top highlight — use fill-opacity, not rgba()
    `<rect width="${S}" height="${Math.round(S * 0.45)}" fill="#ffffff" fill-opacity="0.12"/>` +
    // bottom shadow
    `<rect y="${Math.round(S * 0.55)}" width="${S}" height="${Math.round(S * 0.45)}" ` +
    `fill="#000000" fill-opacity="0.25"/>`;

  // ── label ─────────────────────────────────────────────────────────────
  let label: string;
  if (sym.isEmoji) {
    // Emoji: large serif font; nudge y slightly below centre for visual balance.
    label =
      `<text x="${MID}" y="${Math.round(S * 0.62)}" ` +
      `text-anchor="middle" ` +
      `font-size="${Math.round(S * 0.50)}" ` +
      `font-family="Segoe UI Emoji,Apple Color Emoji,Noto Color Emoji,serif">` +
      `${sym.label}</text>`;
  } else {
    const fs     = sym.label === "BAR" ? Math.round(S * 0.33) : Math.round(S * 0.58);
    const italic = sym.label === "BAR" ? ` font-style="italic"` : "";
    label =
      `<text x="${MID}" y="${Math.round(S * 0.63)}" ` +
      `text-anchor="middle" ` +
      `font-size="${fs}" font-weight="900"${italic} ` +
      `font-family="Arial,sans-serif" fill="${sym.textColor}">` +
      `${sym.label}</text>`;
  }

  return `<g transform="translate(0,${offsetY})">${bg}${label}</g>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Data URL for a single symbol shown statically (no scroll).
 */
export function makeStaticSvg(sym: SlotSymbol): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">` +
    symbolGroup(sym, 0) +
    `</svg>`;
  return toDataUrl(svg);
}

/**
 * Data URL showing `prev` scrolling downward (out the bottom) while `curr`
 * enters from the top — top-to-bottom reel scroll illusion.
 *
 * @param progress  0 → prev fully visible; 1 → curr fully visible.
 */
export function makeScrollSvg(
  prev: SlotSymbol,
  curr: SlotSymbol,
  progress: number
): string {
  const outY = Math.round(progress * S);        // prev exits bottom  (0 → 144)
  const inY  = Math.round((progress - 1) * S);  // curr enters top   (-144 → 0)

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">` +
    `<defs><clipPath id="c"><rect width="${S}" height="${S}"/></clipPath></defs>` +
    `<g clip-path="url(#c)">` +
    symbolGroup(prev, outY) +
    symbolGroup(curr, inY) +
    `</g></svg>`;

  return toDataUrl(svg);
}
