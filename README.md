# Stream Deck Slot Machine

A slot machine simulator plugin for the Elgato Stream Deck. Three animated reels spin across a 3×3 grid of keys with scrolling symbol animations, weighted payouts, and a balance/bet system.

## Layout

Place the actions on your deck in this arrangement:

```
[ Reel ] [ Reel ] [ Reel ]   ← symbols above the payline
[ Reel ] [ Reel ] [ Reel ]   ← PAYLINE ★  (wins evaluated here)
[ Reel ] [ Reel ] [ Reel ]   ← symbols below the payline
[ Spin ]                     [ Balance ]
```

Keys are assigned automatically based on their physical position on the deck — no configuration needed. The 3×3 block of Reel keys can be placed anywhere.

## Actions

| Action | Description |
|---|---|
| **Reel** | One cell of the 3×3 reel grid. Place nine in a block. |
| **Spin** | Press to spin. Shows win/loss result for 3 seconds after each spin. |
| **Balance** | Displays your current coin balance and active bet. Press to cycle the bet amount. |

## Gameplay

- Start with **100 coins**
- Press **Spin** to deduct your bet and start the reels
- Reels scroll top-to-bottom and stop one column at a time (left → middle → right)
- Wins are paid based on the **middle row** (payline)
- Press **Balance** to cycle your bet: 1 → 2 → 5 → 10 → 1
- Balance auto-resets to 100 if you go broke

## Paytable

| Match | Payout |
|---|---|
| 7 7 7 | 100× bet |
| BAR BAR BAR | 40× bet |
| 🔔 🔔 🔔 | 20× bet |
| 🍊 🍊 🍊 | 10× bet |
| 🍋 🍋 🍋 | 5× bet |
| 🍒 🍒 🍒 | 3× bet |
| 7 7 (any third) | 10× bet |
| BAR BAR (any third) | 5× bet |
| 🔔 🔔 (any third) | 3× bet |
| Any 🍒 | 0.5× bet |

Symbols are weighted — 7 is the rarest, Cherry is the most common.

## Installation

### From source

**Prerequisites:** Node.js 20+, npm

```bash
git clone https://github.com/pr0jektcha0s/StreamDeckSlotMachine.git
cd StreamDeckSlotMachine
npm install
npm run generate-assets
npm run build
```

Then copy the plugin folder to the Stream Deck plugins directory:

**macOS:**
```bash
cp -r com.stahlee.slotmachine.sdPlugin \
  ~/Library/Application\ Support/com.elgato.StreamDeck/Plugins/
```

**Windows:**
```
%APPDATA%\Elgato\StreamDeck\Plugins\
```

Restart the Stream Deck application. The **Slot Machine** category will appear in the action list.

## Development

```bash
npm run dev       # generate assets + watch mode (rebuilds on save)
npm run build     # single production build
npm run generate-assets  # regenerate all PNGs (symbols, UI, icons)
```

Built with the [Elgato Stream Deck SDK](https://github.com/elgatosf/streamdeck) (TypeScript), Rollup, and `@napi-rs/canvas` for asset generation. Reel animations are rendered as SVG data URLs at runtime — no native dependencies required in the plugin bundle.
