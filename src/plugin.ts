import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { loadImages } from "./utils/renderer.js";
import { ReelAction } from "./actions/reel.js";
import { SpinAction } from "./actions/spin.js";
import { BalanceAction } from "./actions/balance.js";

// Load all symbol and UI images from disk before handing control to the SDK
loadImages();

streamDeck.logger.setLevel(LogLevel.INFO);

streamDeck.actions.registerAction(new ReelAction());
streamDeck.actions.registerAction(new SpinAction());
streamDeck.actions.registerAction(new BalanceAction());

streamDeck.connect();
