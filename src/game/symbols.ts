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

// Weighted pool for random reel stops
const symbolPool: SlotSymbol[] = SYMBOLS.flatMap((s) =>
  Array.from({ length: s.weight }, () => s)
);

export function randomSymbol(): SlotSymbol {
  return symbolPool[Math.floor(Math.random() * symbolPool.length)];
}

/**
 * Generates a weighted reel strip of the given length.
 * The strip is used as a circular tape: as the reel spins the position advances,
 * and the three visible rows show consecutive entries on the strip.
 */
export function generateReelStrip(length = 21): SlotSymbol[] {
  return Array.from({ length }, () => randomSymbol());
}

export interface PayoutResult {
  winnings: number;
  multiplier: number;
  label: string;
}

export function calculatePayout(
  reels: [SlotSymbol, SlotSymbol, SlotSymbol],
  bet: number
): PayoutResult {
  const [r0, r1, r2] = reels;

  // --- 3-of-a-kind ---
  if (r0.id === r1.id && r1.id === r2.id) {
    const payouts: Record<string, number> = {
      seven: 100,
      bar: 40,
      bell: 20,
      orange: 10,
      lemon: 5,
      cherry: 3,
    };
    const multiplier = payouts[r0.id] ?? 2;
    const labels: Record<string, string> = {
      seven: "JACKPOT!  7  7  7",
      bar: "BAR  BAR  BAR",
      bell: "BELL  BELL  BELL",
      orange: "ORANGE  x3",
      lemon: "LEMON  x3",
      cherry: "CHERRY  x3",
    };
    return {
      multiplier,
      winnings: bet * multiplier,
      label: labels[r0.id] ?? "TRIPLE!",
    };
  }

  // --- 2 sevens ---
  const sevens = reels.filter((s) => s.id === "seven").length;
  if (sevens === 2) {
    return { multiplier: 10, winnings: bet * 10, label: "LUCKY  7  7!" };
  }

  // --- 2 bars ---
  const bars = reels.filter((s) => s.id === "bar").length;
  if (bars === 2) {
    return { multiplier: 5, winnings: bet * 5, label: "BAR  BAR" };
  }

  // --- 2 bells ---
  const bells = reels.filter((s) => s.id === "bell").length;
  if (bells === 2) {
    return { multiplier: 3, winnings: bet * 3, label: "BELL  BELL" };
  }

  // --- any cherry returns half bet ---
  if (reels.some((s) => s.id === "cherry")) {
    const winnings = Math.max(1, Math.ceil(bet * 0.5));
    return { multiplier: 0.5, winnings, label: "CHERRY LUCK" };
  }

  return { multiplier: 0, winnings: 0, label: "NO WIN" };
}
