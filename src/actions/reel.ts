/**
 * ReelAction – one of nine reel display keys arranged in a 3×3 grid.
 *
 * Position is derived from each key's physical deck coordinates — no settings,
 * no counters, no race conditions. The top-left key in the placed group becomes
 * game position (col 0, row 0); the rest are computed relative to it.
 *
 *   deck: any 3×3 block the user places    →  game grid:
 *   (c,r)  (c+1,r)  (c+2,r)                  (0,0) (1,0) (2,0)  ← above payline
 *   (c,r+1)(c+1,r+1)(c+2,r+1)                (0,1) (1,1) (2,1)  ← PAYLINE ★
 *   (c,r+2)(c+1,r+2)(c+2,r+2)                (0,2) (1,2) (2,2)  ← below payline
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
import {
  slotMachine,
  type ColumnIndex,
  type RowIndex,
} from "../game/slotMachine.js";
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

  /** Top-left corner of the placed 3×3 block. */
  private minCol = 0;
  private minRow = 0;

  constructor() {
    super();

    slotMachine.on(
      "key-update",
      (
        gameCol: ColumnIndex,
        gameRow: RowIndex,
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
  }

  override async onWillAppear(ev: WillAppearEvent<JsonObject>): Promise<void> {
    if (!ev.action.isKey()) return;
    const coords = ev.action.coordinates;
    if (!coords) return;

    this.coordToAction.set(coordKey(coords), ev.action);
    this.idToCoords.set(ev.action.id, coords);
    this.rebuildOrigin();

    const { gameCol, gameRow } = this.toGame(coords);
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
    const { gameCol, gameRow } = this.toGame(coords);
    const rowLabels = ["TOP", "MID ★", "BOT"] as const;
    await ev.action.setTitle(`C${gameCol + 1}\n${rowLabels[gameRow]}`);
    setTimeout(() => ev.action.setTitle("").catch(console.error), 1200);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /** Recompute the top-left origin whenever the set of registered keys changes. */
  private rebuildOrigin(): void {
    const all = [...this.idToCoords.values()];
    this.minCol = Math.min(...all.map((c) => c.column));
    this.minRow = Math.min(...all.map((c) => c.row));
  }

  private toGame(coords: DeckCoords): { gameCol: ColumnIndex; gameRow: RowIndex } {
    return {
      gameCol: ((coords.column - this.minCol) % 3) as ColumnIndex,
      gameRow: ((coords.row - this.minRow) % 3) as RowIndex,
    };
  }
}
