import { EventEmitter } from "node:events";
import {
  type SlotSymbol,
  generateReelStrip,
  randomSymbol,
  calculatePayout,
  type PayoutResult,
} from "./symbols.js";

export type ColumnIndex = 0 | 1 | 2;
export type RowIndex = 0 | 1 | 2;

export interface ReelStrip {
  symbols: SlotSymbol[];
  position: number; // symbols[position] is the MIDDLE (payline) row
}

export interface SpinCompleteEvent {
  payline: [SlotSymbol, SlotSymbol, SlotSymbol];
  result: PayoutResult;
  newBalance: number;
}

export const BET_STEPS = [1, 2, 5, 10] as const;

// ── Animation constants ───────────────────────────────────────────────────────

/** Number of render frames between each one-position strip advance. */
const SUBFRAMES = 2;
/** Milliseconds per render frame → 20 fps, 100 ms per symbol change. */
const SUBFRAME_MS = 50;

interface ColAnim {
  /** Symbol visible in each row at the START of the current transition. */
  prev: [SlotSymbol, SlotSymbol, SlotSymbol];
  /** Symbol arriving in each row during the current transition. */
  curr: [SlotSymbol, SlotSymbol, SlotSymbol];
  /** Current sub-frame index within this transition (0 … SUBFRAMES-1). */
  subframe: number;
}

// ── SlotMachine ───────────────────────────────────────────────────────────────

class SlotMachine extends EventEmitter {
  balance = 100;
  bet: (typeof BET_STEPS)[number] = 1;
  spinning = false;

  strips: [ReelStrip, ReelStrip, ReelStrip] = [
    { symbols: generateReelStrip(21), position: 0 },
    { symbols: generateReelStrip(21), position: 0 },
    { symbols: generateReelStrip(21), position: 0 },
  ];

  /** Per-column animation state, used to drive the scroll SVG frames. */
  colAnims: [ColAnim, ColAnim, ColAnim];

  private frameIntervals: [
    ReturnType<typeof setInterval> | null,
    ReturnType<typeof setInterval> | null,
    ReturnType<typeof setInterval> | null,
  ] = [null, null, null];

  constructor() {
    super();
    // Initialise animation state so prev === curr (no transition at rest).
    this.colAnims = ([0, 1, 2] as const).map((col) => {
      const syms = ([0, 1, 2] as const).map(
        (row) => this.getSymbolAt(col, row)
      ) as [SlotSymbol, SlotSymbol, SlotSymbol];
      return {
        prev: [...syms] as [SlotSymbol, SlotSymbol, SlotSymbol],
        curr: syms,
        subframe: 0,
      };
    }) as [ColAnim, ColAnim, ColAnim];
  }

  // ── Public helpers ──────────────────────────────────────────────────────────

  /**
   * Symbol visible at a given column / row.
   * row 0 = one above payline, row 1 = payline, row 2 = one below.
   */
  getSymbolAt(col: ColumnIndex, row: RowIndex): SlotSymbol {
    const strip = this.strips[col];
    const len = strip.symbols.length;
    const offset = row - 1; // -1, 0, +1 relative to centre
    return strip.symbols[((strip.position + offset) % len + len) % len];
  }

  getPayline(): [SlotSymbol, SlotSymbol, SlotSymbol] {
    return [
      this.getSymbolAt(0, 1),
      this.getSymbolAt(1, 1),
      this.getSymbolAt(2, 1),
    ];
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  spin(): void {
    if (this.spinning) return;
    if (this.balance < this.bet) {
      this.emit("insufficient-funds");
      return;
    }

    this.balance -= this.bet;
    this.spinning = true;
    this.emit("balance-change", this.balance);
    this.emit("spin-start");

    for (let col = 0; col < 3; col++) {
      const anim  = this.colAnims[col];
      const strip = this.strips[col];

      // Reset sub-frame counter for a clean start.
      anim.subframe = 0;

      this.frameIntervals[col] = setInterval(() => {
        anim.subframe++;

        if (anim.subframe >= SUBFRAMES) {
          // Advance the strip one position (decrement = top-to-bottom scroll).
          anim.subframe = 0;
          strip.position =
            ((strip.position - 1) % strip.symbols.length + strip.symbols.length) %
            strip.symbols.length;

          // Roll prev ← curr, then update curr from the new strip position.
          anim.prev = [...anim.curr] as [SlotSymbol, SlotSymbol, SlotSymbol];
          for (let row = 0; row < 3; row++) {
            anim.curr[row as RowIndex] = this.getSymbolAt(
              col as ColumnIndex,
              row as RowIndex
            );
          }
        }

        const progress = anim.subframe / SUBFRAMES;

        for (let row = 0; row < 3; row++) {
          this.emit(
            "key-update",
            col as ColumnIndex,
            row as RowIndex,
            anim.curr[row as RowIndex],
            anim.prev[row as RowIndex],
            progress
          );
        }
      }, SUBFRAME_MS);
    }

    // Stagger stops: col 0 → 1.4 s, col 1 → 2.2 s, col 2 → 3.0 s
    ([1400, 2200, 3000] as const).forEach((delay, col) => {
      setTimeout(() => this.stopColumn(col as ColumnIndex), delay);
    });
  }

  cycleBet(): void {
    if (this.spinning) return;
    const idx = BET_STEPS.indexOf(this.bet);
    this.bet = BET_STEPS[(idx + 1) % BET_STEPS.length];
    this.emit("bet-change", this.bet);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private stopColumn(col: ColumnIndex): void {
    clearInterval(this.frameIntervals[col]!);
    this.frameIntervals[col] = null;

    const anim  = this.colAnims[col];
    const strip = this.strips[col];
    const len   = strip.symbols.length;
    const pos   = strip.position;

    // Inject fresh random symbols at the three visible positions.
    strip.symbols[((pos - 1) % len + len) % len] = randomSymbol(); // top
    strip.symbols[pos % len]                      = randomSymbol(); // payline
    strip.symbols[(pos + 1) % len]                = randomSymbol(); // bottom

    // Snap animation state: prev = current display, curr = final symbols.
    anim.prev = [...anim.curr] as [SlotSymbol, SlotSymbol, SlotSymbol];
    for (let row = 0; row < 3; row++) {
      anim.curr[row as RowIndex] = this.getSymbolAt(col, row as RowIndex);
    }

    // Emit at progress=1 so each key immediately snaps to its final symbol.
    for (let row = 0; row < 3; row++) {
      this.emit(
        "key-update",
        col,
        row as RowIndex,
        anim.curr[row as RowIndex],
        anim.prev[row as RowIndex],
        1.0
      );
    }

    this.emit("column-stop", col);
    if (col === 2) this.finalizeSpin();
  }

  private finalizeSpin(): void {
    const payline = this.getPayline();
    const result  = calculatePayout(payline, this.bet);
    this.balance += result.winnings;
    this.spinning = false;

    this.emit("spin-complete", { payline, result, newBalance: this.balance } as SpinCompleteEvent);
    this.emit("balance-change", this.balance);
  }
}

export const slotMachine = new SlotMachine();
