export interface SlotSymbol {
  id: string;
  name: string;
  label: string;       // emoji or text drawn on the key
  isEmoji: boolean;
  bgColor: string;     // key background color
  textColor: string;   // label color
  weight: number;      // higher = more common on the reels
}

export const SYMBOLS: SlotSymbol[] = [
  {
    id: "cherry",
    name: "Cherry",
    label: "🍒",
    isEmoji: true,
    bgColor: "#7f1d1d",
    textColor: "#ffffff",
    weight: 6,
  },
  {
    id: "lemon",
    name: "Lemon",
    label: "🍋",
    isEmoji: true,
    bgColor: "#78350f",
    textColor: "#ffffff",
    weight: 5,
  },
  {
    id: "orange",
    name: "Orange",
    label: "🍊",
    isEmoji: true,
    bgColor: "#7c2d12",
    textColor: "#ffffff",
    weight: 4,
  },
  {
    id: "bell",
    name: "Bell",
    label: "🔔",
    isEmoji: true,
    bgColor: "#4c1d95",
    textColor: "#ffffff",
    weight: 3,
  },
  {
    id: "bar",
    name: "Bar",
    label: "BAR",
    isEmoji: false,
    bgColor: "#1e3a8a",
    textColor: "#fbbf24",
    weight: 2,
  },
  {
    id: "seven",
    name: "Seven",
    label: "7",
    isEmoji: false,
    bgColor: "#111827",
    textColor: "#fbbf24",
    weight: 1,
  },
];

// ── Symbol probability helpers ────────────────────────────────────────────────

const TOTAL_WEIGHT = SYMBOLS.reduce((s, sym) => s + sym.weight, 0); // = 21

/** Probability of a symbol appearing on any single reel stop. */
function symbolProb(sym: SlotSymbol): number {
  return sym.weight / TOTAL_WEIGHT;
}

/**
 * Probability of getting exactly `n` consecutive matching symbols from the
 * left on a payline of `numCols` columns.
 *
 * - Full match  (n === numCols): p^n
 * - Partial match (n < numCols): p^n × (1−p)
 *   (first n match, position n+1 must be a different symbol to stop the run)
 */
function consecutiveProb(sym: SlotSymbol, n: number, numCols: number): number {
  const p = symbolProb(sym);
  return n === numCols ? Math.pow(p, n) : Math.pow(p, n) * (1 - p);
}

/**
 * Probability of getting 2+ of a symbol anywhere on a payline (for scatter
 * wins), excluding cases where a consecutive run of ≥3 from the left was
 * already awarded.
 */
function scatterProb(sym: SlotSymbol, k: number, numCols: number): number {
  // P(at least k occurrences anywhere) using binomial distribution
  const p = symbolProb(sym);
  let prob = 0;
  for (let i = k; i <= numCols; i++) {
    prob += binomCoeff(numCols, i) * Math.pow(p, i) * Math.pow(1 - p, numCols - i);
  }
  return prob;
}

function binomCoeff(n: number, k: number): number {
  if (k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < k; i++) result = (result * (n - i)) / (i + 1);
  return result;
}

// ── Baseline payouts (3-column full match) ────────────────────────────────────
//
// These anchor the probability-corrected scaling. All other (N, cols)
// combinations derive their payout relative to these via the formula:
//
//   multiplier = baseline × sqrt(P_3col_baseline / P_actual)
//
// The square-root exponent compresses the explosive range of rare symbols
// while still making larger grids pay proportionally more.

const BASELINE_3COL: Record<string, number> = {
  cherry:  3,
  lemon:   5,
  orange: 10,
  bell:   20,
  bar:    40,
  seven: 100,
};

const BASELINE_3COL_SCATTER_7:   number = 10;
const BASELINE_3COL_SCATTER_BAR: number = 5;
const BASELINE_3COL_SCATTER_BELL: number = 3;

/**
 * Probability-corrected multiplier for N consecutive matching symbols from
 * the left on a payline of numCols columns.
 *
 * Scales the 3-col baseline payout by sqrt(P_baseline / P_actual) so that:
 * - A full 5-col seven match pays ~21× the 3-col payout (~2100×)
 * - A partial 3-from-left on a 5-col grid pays just slightly more than 3-col
 */
function consecutiveMultiplier(
  sym: SlotSymbol,
  n: number,
  numCols: number
): number {
  const pBase   = consecutiveProb(sym, 3, 3);   // anchor: 3-col full match
  const pActual = consecutiveProb(sym, n, numCols);
  const baseline = BASELINE_3COL[sym.id] ?? 2;
  return Math.max(1, Math.round(baseline * Math.sqrt(pBase / pActual)));
}

/**
 * Probability-corrected scatter multiplier for k+ of a symbol anywhere on
 * the payline.
 */
function scatterMultiplier(
  sym: SlotSymbol,
  k: number,
  numCols: number,
  baseline: number
): number {
  // Anchor: 2-of-symbol scatter on a 3-col grid
  const pBase   = scatterProb(sym, 2, 3);
  const pActual = scatterProb(sym, k, numCols);
  return Math.max(1, Math.round(baseline * Math.sqrt(pBase / pActual)));
}

// ── Public API ────────────────────────────────────────────────────────────────

// Weighted pool for random reel stops
const symbolPool: SlotSymbol[] = SYMBOLS.flatMap((s) =>
  Array.from({ length: s.weight }, () => s)
);

export function randomSymbol(): SlotSymbol {
  return symbolPool[Math.floor(Math.random() * symbolPool.length)];
}

/**
 * Generates a weighted reel strip of the given length.
 */
export function generateReelStrip(length = 21): SlotSymbol[] {
  return Array.from({ length }, () => randomSymbol());
}

export interface PayoutResult {
  winnings: number;
  multiplier: number;
  label: string;
}

/**
 * Evaluates a payline of 3–5 symbols and returns a probability-corrected payout.
 *
 * Payouts are derived from the true probability of each combination given the
 * grid width, anchored to the 3-column baseline and scaled by the square root
 * of the probability ratio. Rarer combinations on wider grids pay more.
 *
 * Priority order:
 * 1. Consecutive match from left (all N, or partial down to 3-in-a-row)
 * 2. Scatter sevens (2+ anywhere)
 * 3. Scatter bars (2+ anywhere)
 * 4. Scatter bells (2+ anywhere)
 * 5. Any cherry (consolation)
 */
export function calculatePayout(
  reels: SlotSymbol[],
  bet: number
): PayoutResult {
  const N = reels.length;

  // ── 1. Consecutive left match ────────────────────────────────────────────
  let consecutive = 1;
  for (let i = 1; i < N; i++) {
    if (reels[i].id === reels[0].id) consecutive++;
    else break;
  }

  if (consecutive >= 3) {
    const sym = reels[0];
    const multiplier = consecutiveMultiplier(sym, consecutive, N);
    const isJackpot = sym.id === "seven" && consecutive === N;
    const symLabel = sym.isEmoji ? sym.label : sym.name.toUpperCase();
    const label = isJackpot
      ? (N === 3 ? "JACKPOT!  7  7  7" : `JACKPOT!  ${"7  ".repeat(N).trim()}`)
      : `${symLabel} ×${consecutive}${consecutive < N ? ` (${consecutive}/${N})` : ""}`;
    return {
      multiplier,
      winnings: Math.round(bet * multiplier),
      label,
    };
  }

  // ── 2. Scatter sevens ────────────────────────────────────────────────────
  const sevenSym = SYMBOLS.find((s) => s.id === "seven")!;
  const sevens = reels.filter((s) => s.id === "seven").length;
  if (sevens >= 2) {
    const multiplier = scatterMultiplier(sevenSym, sevens, N, BASELINE_3COL_SCATTER_7);
    return {
      multiplier,
      winnings: bet * multiplier,
      label: `LUCKY  ${"7  ".repeat(sevens).trim()}!`,
    };
  }

  // ── 3. Scatter bars ──────────────────────────────────────────────────────
  const barSym = SYMBOLS.find((s) => s.id === "bar")!;
  const bars = reels.filter((s) => s.id === "bar").length;
  if (bars >= 2) {
    const multiplier = scatterMultiplier(barSym, bars, N, BASELINE_3COL_SCATTER_BAR);
    return { multiplier, winnings: bet * multiplier, label: `BAR  ×${bars}` };
  }

  // ── 4. Scatter bells ─────────────────────────────────────────────────────
  const bellSym = SYMBOLS.find((s) => s.id === "bell")!;
  const bells = reels.filter((s) => s.id === "bell").length;
  if (bells >= 2) {
    const multiplier = scatterMultiplier(bellSym, bells, N, BASELINE_3COL_SCATTER_BELL);
    return {
      multiplier,
      winnings: bet * multiplier,
      label: `${"🔔  ".repeat(bells).trim()}`,
    };
  }

  // ── 5. Any cherry ────────────────────────────────────────────────────────
  if (reels.some((s) => s.id === "cherry")) {
    const winnings = Math.max(1, Math.ceil(bet * 0.5));
    return { multiplier: 0.5, winnings, label: "CHERRY LUCK" };
  }

  return { multiplier: 0, winnings: 0, label: "NO WIN" };
}
