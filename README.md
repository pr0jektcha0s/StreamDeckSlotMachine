# Stream Deck Slot Machine

A slot machine simulator plugin for the Elgato Stream Deck. Animated reels spin across a configurable grid of keys — from a compact 3×3 up to a wide 5×4 — with scrolling symbol animations, probability-corrected payouts, and a balance/bet system.

## Layout

Place the actions on your deck in any rectangular block:

```
[ Reel ] [ Reel ] [ Reel ] [ Reel ] [ Reel ]   ← above payline
[ Reel ] [ Reel ] [ Reel ] [ Reel ] [ Reel ]   ← PAYLINE ★  (wins evaluated here)
[ Reel ] [ Reel ] [ Reel ] [ Reel ] [ Reel ]   ← below payline
[ Reel ] [ Reel ] [ Reel ] [ Reel ] [ Reel ]   ← below payline (4-row grid)
[ Spin ]                             [ Balance ]
```

No configuration required. The plugin reads each key's physical position on the deck and automatically figures out which column and row it occupies. Place Reel keys in any rectangular block from **3×3 up to 5×4** and they will self-organise automatically — the centre row is always the payline, columns map left-to-right.

**Supported grid sizes:** 3×3, 4×3, 5×3, 3×4, 4×4, 5×4, and any smaller combination. Just drop more Reel keys adjacent to the existing block and the plugin adapts instantly — no restart needed.

## Actions

| Action | Description |
|---|---|
| **Reel** | One cell of the reel grid. Place in any rectangular block (3×3 up to 5×4). |
| **Spin** | Press to spin. Shows win/loss result for 3 seconds after each spin. |
| **Balance** | Displays your current coin balance and active bet. Press to cycle the bet amount. |

## Gameplay

- Start with **100 coins**
- Press **Spin** to deduct your bet and start the reels
- Reels scroll top-to-bottom and stop one column at a time (left → right)
- Wins are paid based on the **centre row** (payline)
- Press **Balance** to cycle your bet: 1 → 2 → 5 → 10 → 1
- Balance auto-resets to 100 if you go broke

## Paytable

Payouts are **probability-corrected** — every multiplier is derived from the true statistical odds of hitting that combination on your grid size. Wider grids make full matches rarer, so the payouts increase proportionally. The same formula runs at runtime regardless of grid size, so every configuration is balanced.

### Consecutive match from left — full grid match

| Symbol | 3-col | 4-col | 5-col |
|---|---|---|---|
| 7 | 100× | 458× | 2100× |
| BAR | 40× | 130× | 420× |
| 🔔 Bell | 20× | 53× | 140× |
| 🍊 Orange | 10× | 23× | 53× |
| 🍋 Lemon | 5× | 10× | 21× |
| 🍒 Cherry | 3× | 6× | 11× |

**Partial runs** also pay out. For example, 3 sevens from the left on a 5-column grid pays ~102× — slightly more than the 3-col baseline because the 4th reel must actively show a different symbol. 4 sevens from the left on a 5-column grid pays ~470×.

### Scatter pays (any position on payline)

Scatter payouts also scale with grid width — more columns means these combinations are easier to hit by chance, so the multiplier adjusts accordingly.

| Match | 3-col | 4-col | 5-col |
|---|---|---|---|
| 2+ sevens anywhere | 10× | 7× | 6× |
| 3+ sevens anywhere | 78× | 40× | 26× |
| 2+ BAR | 5× | 4× | 3× |
| 3+ BAR | 27× | 14× | 9× |
| 2+ 🔔 | 3× | 2× | 2× |
| 3+ 🔔 | 13× | 7× | 5× |
| Any 🍒 | 0.5× bet (all grid sizes) | | |

Symbols are weighted — 7 is the rarest, Cherry is the most common.

## Installation

### Prerequisites

- [Node.js 20+](https://nodejs.org)
- [Git](https://git-scm.com)
- Elgato Stream Deck software

### Build the installable plugin file

```bash
git clone https://github.com/pr0jektcha0s/StreamDeckSlotMachine.git
cd StreamDeckSlotMachine
npm install
npm run generate-assets
npm run package
```

This produces **`com.stahlee.slotmachine.streamDeckPlugin`** in the project root. Double-click it and Stream Deck will install the plugin automatically on both macOS and Windows.

### Manual installation (alternative)

If you prefer to copy the files yourself instead of double-clicking:

**macOS:**
```bash
cp -r com.stahlee.slotmachine.sdPlugin \
  ~/Library/Application\ Support/com.elgato.StreamDeck/Plugins/
```

**Windows** — copy the `com.stahlee.slotmachine.sdPlugin` folder to:
```
C:\Users\<your username>\AppData\Roaming\Elgato\StreamDeck\Plugins\
```

Restart the Stream Deck application after either method. The **Slot Machine** category will appear in the action list.

## Development

```bash
npm run dev              # generate assets + watch mode (rebuilds on save)
npm run build            # single production build
npm run generate-assets  # regenerate all PNGs (symbols, UI, icons)
npm run package          # build + create .streamDeckPlugin installer
```

Built with the [Elgato Stream Deck SDK](https://github.com/elgatosf/streamdeck) (TypeScript), Rollup, and `@napi-rs/canvas` for asset generation. Reel animations are rendered as SVG data URLs at runtime — no native dependencies required in the plugin bundle.
