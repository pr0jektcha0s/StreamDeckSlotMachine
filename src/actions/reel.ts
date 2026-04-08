/**
 * ReelAction – one cell of the reel grid.
 *
 * Position is derived from each key's physical deck coordinates — no settings,
 * no counters, no race conditions. The top-left key in the placed group becomes
 * game position (col 0, row 0); the rest are computed relative to it.
 *
 * Grid size is auto-detected: place any N×M block of Reel keys (up to 5×4)
 * and the plugin will self-organise columns and rows accordingly. The centre
 * row (Math.floor(rows / 2)) is always the payline.
 *
 *   Deck: any N×M block the user places   →  game grid example (3×3):
 *   (c,r)   (c+1,r)   … (c+N-1,r)           (0,0) (1,0) (2,0)  ← above payline
 *   (c,r+1) (c+1,r+1) … (c+N-1,r+1)         (0,1) (1,1) (2,1)  ← PAYLINE ★
 *   (c,r+2) (c+1,r+2) … (c+N-1,r+2)         (0,2) (1,2) (2,2)  ← below payline
 */

import {
  action,
  type KeyDownEvent,
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent,
} from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/streamdeck";
import type { KeyAction } from "@elgato/streamdeck";
import { slotMachine } from "../game/slotMachine.js";
import { type SlotSymbol } from "../game/symbols.js";
import { makeScrollSvg, makeStaticSvg } from "../utils/svg.js";

interface DeckCoords { column: number; row: number; }

function coordKey(c: DeckCoords): string { return `${c.column},${c.row}`; }

@action({ UUID: "com.stahlee.slotmachine.reel" })
export class ReelAction extends SingletonAction<JsonObject> {
  /** deck coord string → KeyAction */
  private readonly coordToAction = new Map<string, KeyAction<JsonObject>>();
  /** action id → deck coords (needed in onWillDisappear which only has ActionContext) */
  private readonly idToCoords = new Map<string, DeckCoords>();

  /** Top-left corner of the placed block (deck coordinates). */
  private minCol = 0;
  private minRow = 0;

  constructor() {
    super();

    slotMachine.on(
      "key-update",
      (
        gameCol: number,
        gameRow: number,
        curr: SlotSymbol,
        prev: SlotSymbol,
        progress: number
      ) => {
        const act = this.coordToAction.get(
          coordKey({ column: this.minCol + gameCol, row: this.minRow + gameRow })
        );
        if (!act) return;
        const svg =
          progress >= 1 || prev.id === curr.id
            ? makeStaticSvg(curr)
            : makeScrollSvg(prev, curr, progress);
        act.setImage(svg).catch(console.error);
      }
    );

    // Re-render all registered keys when the grid is resized.
    slotMachine.on("resize", () => {
      for (const [key, act] of this.coordToAction) {
        const [colStr, rowStr] = key.split(",");
        const gameCol = parseInt(colStr) - this.minCol;
        const gameRow = parseInt(rowStr) - this.minRow;
        act
          .setImage(makeStaticSvg(slotMachine.getSymbolAt(gameCol, gameRow)))
          .catch(console.error);
      }
    });
  }

  override async onWillAppear(ev: WillAppearEvent<JsonObject>): Promise<void> {
    if (!ev.action.isKey()) return;
    const coords = ev.action.coordinates;
    if (!coords) return;

    this.coordToAction.set(coordKey(coords), ev.action);
    this.idToCoords.set(ev.action.id, coords);
    this.rebuildOrigin();

    const gameCol = coords.column - this.minCol;
    const gameRow = coords.row - this.minRow;
    await ev.action.setImage(makeStaticSvg(slotMachine.getSymbolAt(gameCol, gameRow)));
    await ev.action.setTitle("");
  }

  override onWillDisappear(ev: WillDisappearEvent<JsonObject>): void {
    const coords = this.idToCoords.get(ev.action.id);
    if (coords) {
      this.coordToAction.delete(coordKey(coords));
      this.idToCoords.delete(ev.action.id);
    }
    if (this.idToCoords.size > 0) this.rebuildOrigin();
  }

  /** Tapping a reel key briefly shows which column/row it is. */
  override async onKeyDown(ev: KeyDownEvent<JsonObject>): Promise<void> {
    const coords = this.idToCoords.get(ev.action.id);
    if (!coords) return;
    const gameCol = coords.column - this.minCol;
    const gameRow = coords.row - this.minRow;
    const paylineRow = slotMachine.paylineRow;
    const rowLabel =
      gameRow === paylineRow
        ? "PAY ★"
        : gameRow < paylineRow
          ? `↑ ${paylineRow - gameRow}`
          : `↓ ${gameRow - paylineRow}`;
    await ev.action.setTitle(`C${gameCol + 1}\n${rowLabel}`);
    setTimeout(() => ev.action.setTitle("").catch(console.error), 1200);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Recompute the top-left origin and notify the slot machine of the new grid
   * dimensions whenever the set of registered keys changes.
   */
  private rebuildOrigin(): void {
    const all = [...this.idToCoords.values()];
    if (all.length === 0) return;
    this.minCol = Math.min(...all.map((c) => c.column));
    this.minRow = Math.min(...all.map((c) => c.row));
    const maxCol = Math.max(...all.map((c) => c.column));
    const maxRow = Math.max(...all.map((c) => c.row));
    slotMachine.resize(maxCol - this.minCol + 1, maxRow - this.minRow + 1);
  }
}
