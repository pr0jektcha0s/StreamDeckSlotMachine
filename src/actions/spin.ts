/**
 * SpinAction – the main SPIN button.
 *
 * - Press to spin (if not already spinning and balance >= bet).
 * - Shows win/lose result for 3 seconds after each spin.
 * - Shows balance warning when funds are too low.
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
import { slotMachine, type SpinCompleteEvent } from "../game/slotMachine.js";
import { getUiImage } from "../utils/renderer.js";

@action({ UUID: "com.stahlee.slotmachine.spin" })
export class SpinAction extends SingletonAction<JsonObject> {
  private spinKey: KeyAction<JsonObject> | null = null;
  private resultTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();

    slotMachine.on("spin-start", () => {
      this.setSpinning().catch(console.error);
    });

    slotMachine.on("spin-complete", (ev: SpinCompleteEvent) => {
      this.showResult(ev).catch(console.error);
    });

    slotMachine.on("insufficient-funds", () => {
      this.showBroke().catch(console.error);
    });
  }

  override async onWillAppear(ev: WillAppearEvent<JsonObject>): Promise<void> {
    if (!ev.action.isKey()) return;
    this.spinKey = ev.action;
    await this.resetToIdle();
  }

  override onWillDisappear(_ev: WillDisappearEvent<JsonObject>): void {
    this.spinKey = null;
    if (this.resultTimer) {
      clearTimeout(this.resultTimer);
      this.resultTimer = null;
    }
  }

  override async onKeyDown(_ev: KeyDownEvent<JsonObject>): Promise<void> {
    slotMachine.spin();
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async resetToIdle(): Promise<void> {
    if (!this.spinKey) return;
    await this.spinKey.setImage(getUiImage("spin-idle"));
    await this.spinKey.setTitle("SPIN");
  }

  private async setSpinning(): Promise<void> {
    if (!this.spinKey) return;
    await this.spinKey.setImage(getUiImage("spin-active"));
    await this.spinKey.setTitle("...");
  }

  private async showResult(ev: SpinCompleteEvent): Promise<void> {
    if (!this.spinKey) return;
    if (this.resultTimer) clearTimeout(this.resultTimer);

    if (ev.result.winnings > 0) {
      await this.spinKey.setImage(getUiImage("spin-win"));
      await this.spinKey.setTitle(`+${ev.result.winnings}\n${ev.result.label}`);
    } else {
      await this.spinKey.setImage(getUiImage("spin-lose"));
      await this.spinKey.setTitle(ev.result.label);
    }

    // Reset to idle after 3 s
    this.resultTimer = setTimeout(() => {
      this.resetToIdle().catch(console.error);
      this.resultTimer = null;
    }, 3000);
  }

  private async showBroke(): Promise<void> {
    if (!this.spinKey) return;
    if (this.resultTimer) clearTimeout(this.resultTimer);

    await this.spinKey.setImage(getUiImage("spin-lose"));
    await this.spinKey.setTitle("BROKE!\nReset?");

    this.resultTimer = setTimeout(() => {
      this.resetToIdle().catch(console.error);
      this.resultTimer = null;
    }, 2000);
  }
}
