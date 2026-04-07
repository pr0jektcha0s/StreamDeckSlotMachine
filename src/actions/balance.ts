/**
 * BalanceAction – displays current balance and active bet.
 *
 * - Shows: 💰 <balance>  /  BET: <bet>
 * - Press to cycle the bet amount: 1 → 2 → 5 → 10 → 1
 * - Warns when balance is critically low (< 5 coins).
 * - Auto-resets to 100 coins when balance reaches 0.
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
import { getUiImage } from "../utils/renderer.js";

@action({ UUID: "com.stahlee.slotmachine.balance" })
export class BalanceAction extends SingletonAction<JsonObject> {
  private balanceKey: KeyAction<JsonObject> | null = null;

  constructor() {
    super();

    slotMachine.on("balance-change", () => {
      this.updateDisplay().catch(console.error);
    });

    slotMachine.on("bet-change", () => {
      this.updateDisplay().catch(console.error);
    });
  }

  override async onWillAppear(ev: WillAppearEvent<JsonObject>): Promise<void> {
    if (!ev.action.isKey()) return;
    this.balanceKey = ev.action;
    await this.updateDisplay();
  }

  override onWillDisappear(_ev: WillDisappearEvent<JsonObject>): void {
    this.balanceKey = null;
  }

  /** Press cycles the active bet amount. */
  override async onKeyDown(_ev: KeyDownEvent<JsonObject>): Promise<void> {
    slotMachine.cycleBet();
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async updateDisplay(): Promise<void> {
    if (!this.balanceKey) return;

    await this.balanceKey.setImage(getUiImage("balance-bg"));

    if (slotMachine.balance <= 0) {
      await this.balanceKey.setTitle("BROKE!\nResetting…");
      // Auto-reset
      slotMachine.balance = 100;
      slotMachine.emit("balance-change", slotMachine.balance);
      return;
    }

    const low = slotMachine.balance < 5 ? "⚠️ " : "";
    await this.balanceKey.setTitle(
      `${low}💰${slotMachine.balance}\nBET: ${slotMachine.bet}`
    );
  }
}
