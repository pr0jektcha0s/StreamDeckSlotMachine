import { EventEmitter } from "node:events";
import {
  type SlotSymbol,
  generateReelStrip,
  randomSymbol,
  calculatePayout,
  type PayoutResult,
} from "./symbols.js";

export interface ReelStrip {
  symbols: SlotSymbol[];
  position: number; // symbols[position] is the payline row
}

export interface SpinCompleteEvent {
  payline: SlotSymbol[];
  result: PayoutResult;
  newBalance: number;
}

export const BET_STEPS = [1, 2, 5, 10] as const;

// ── Animation constants ───────────────────────────────────────────────────────

/** Number of render frames between each one-position strip advance. */
const SUBFRAMES = 2;
/** Milliseconds per render frame → 20 fps, 100 ms per symbol change. */
const SUBFRAME_MS = 50;
/** Base stop delay for the first column (ms). */
const STOP_BASE_MS = 1400;
/** Additional stop delay per column (ms). */
const STOP_STEP_MS = 800;

interface ColAnim {
  /** Symbol visible in each row at the START of the current transition. */
  prev: SlotSymbol[];
  /** Symbol arriving in each row during the current transition. */
  curr: SlotSymbol[];
  /** Current sub-frame index within this transition (0 … SUBFRAMES-1). */
  subframe: number;
}

// ── SlotMachine ───────────────────────────────────────────────────────────────

class SlotMachine extends EventEmitter {
  balance = 100;
  bet: (typeof BET_STEPS)[number] = 1;
  spinning = false;

  /** Current grid dimensions (auto-derived from placed reel keys). */
  numCols = 3;
  numRows = 3;

  strips: ReelStrip[] = Array.from({ length: 3 }, () => ({
    symbols: generateReelStrip(21),
    position: 0,
  }));

  colAnims: ColAnim[] = [];

  private frameIntervals: (ReturnType<typeof setInterval> | null)[] = [
    null,
    null,
    null,
  ];

  constructor() {
    super();
    this.colAnims = this.buildColAnims();
  }

  // ── Grid resize ─────────────────────────────────────────────────────────────

  /**
   * Called by ReelAction whenever the set of placed reel keys changes.
   * Grows or shrinks strips/colAnims to match the new grid dimensions.
   * No-ops if dimensions are unchanged or a spin is in progress.
   */
  resize(cols: number, rows: number): void {
    if (cols === this.numCols && rows === this.numRows) return;
    if (this.spinning) return;

    this.numCols = cols;
    this.numRows = rows;

    // Grow strip array if needed (preserve existing strips).
    while (this.strips.length < cols) {
      this.strips.push({ symbols: generateReelStrip(21), position: 0 });
    }
    this.strips.length = cols;

    // Rebuild animation state for all columns.
    this.colAnims = this.buildColAnims();

    // Resize interval array.
    for (let i = cols; i < this.frameIntervals.length; i++) {
      const iv = this.frameIntervals[i];
      if (iv != null) clearInterval(iv);
    }
    this.frameIntervals.length = cols;
    for (let i = 0; i < cols; i++) {
      if (this.frameIntervals[i] === undefined) this.frameIntervals[i] = null;
    }

    this.emit("resize", cols, rows);
  }

  // ── Public helpers ──────────────────────────────────────────────────────────

  /** Index of the row that is the payline (centre of the visible grid). */
  get paylineRow(): number {
    return Math.floor(this.numRows / 2);
  }

  /**
   * Symbol visible at a given column / row.
   * Rows are 0-indexed; paylineRow is the payline centre.
   */
  getSymbolAt(col: number, row: number): SlotSymbol {
    const strip = this.strips[col];
    const len = strip.symbols.length;
    const offset = row - this.paylineRow;
    return strip.symbols[((strip.position + offset) % len + len) % len];
  }

  getPayline(): SlotSymbol[] {
    return Array.from({ length: this.numCols }, (_, col) =>
      this.getSymbolAt(col, this.paylineRow)
    );
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

    for (let col = 0; col < this.numCols; col++) {
      const anim  = this.colAnims[col];
      const strip = this.strips[col];

      anim.subframe = 0;

      this.frameIntervals[col] = setInterval(() => {
        anim.subframe++;

        if (anim.subframe >= SUBFRAMES) {
          // Advance the strip one position (decrement = top-to-bottom scroll).
          anim.subframe = 0;
          strip.position =
            ((strip.position - 1) % strip.symbols.length +
              strip.symbols.length) %
            strip.symbols.length;

          anim.prev = [...anim.curr];
          for (let row = 0; row < this.numRows; row++) {
            anim.curr[row] = this.getSymbolAt(col, row);
          }
        }

        const progress = anim.subframe / SUBFRAMES;

        for (let row = 0; row < this.numRows; row++) {
          this.emit(
            "key-update",
            col,
            row,
            anim.curr[row],
            anim.prev[row],
            progress
          );
        }
      }, SUBFRAME_MS);
    }

    // Stagger stops: col 0 at STOP_BASE_MS, each subsequent col STOP_STEP_MS later.
    for (let col = 0; col < this.numCols; col++) {
      const delay = STOP_BASE_MS + col * STOP_STEP_MS;
      const c = col;
      setTimeout(() => this.stopColumn(c), delay);
    }
  }

  cycleBet(): void {
    if (this.spinning) return;
    const idx = BET_STEPS.indexOf(this.bet);
    this.bet = BET_STEPS[(idx + 1) % BET_STEPS.length];
    this.emit("bet-change", this.bet);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private buildColAnims(): ColAnim[] {
    return Array.from({ length: this.numCols }, (_, col) => {
      const syms = Array.from({ length: this.numRows }, (_, row) =>
        this.getSymbolAt(col, row)
      );
      return { prev: [...syms], curr: syms, subframe: 0 };
    });
  }

  private stopColumn(col: number): void {
    const iv = this.frameIntervals[col];
    if (iv != null) clearInterval(iv);
    this.frameIntervals[col] = null;

    const anim  = this.colAnims[col];
    const strip = this.strips[col];
    const len   = strip.symbols.length;
    const pos   = strip.position;

    // Inject fresh random symbols at all visible positions.
    for (let row = 0; row < this.numRows; row++) {
      const offset = row - this.paylineRow;
      strip.symbols[((pos + offset) % len + len) % len] = randomSymbol();
    }

    anim.prev = [...anim.curr];
    for (let row = 0; row < this.numRows; row++) {
      anim.curr[row] = this.getSymbolAt(col, row);
    }

    // Emit at progress=1 so each key immediately snaps to its final symbol.
    for (let row = 0; row < this.numRows; row++) {
      this.emit("key-update", col, row, anim.curr[row], anim.prev[row], 1.0);
    }

    this.emit("column-stop", col);
    if (col === this.numCols - 1) this.finalizeSpin();
  }

  private finalizeSpin(): void {
    const payline = this.getPayline();
    const result  = calculatePayout(payline, this.bet);
    this.balance += result.winnings;
    this.spinning = false;

    this.emit("spin-complete", {
      payline,
      result,
      newBalance: this.balance,
    } as SpinCompleteEvent);
    this.emit("balance-change", this.balance);
  }
}

export const slotMachine = new SlotMachine();
