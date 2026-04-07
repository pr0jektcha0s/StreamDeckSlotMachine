/**
 * package-plugin.mjs
 *
 * Packages the built plugin into a .streamDeckPlugin file — a ZIP archive
 * that Stream Deck opens and installs automatically when double-clicked.
 *
 * Run via: npm run package
 * Output:  com.stahlee.slotmachine.streamDeckPlugin
 */

import archiver from "archiver";
import { createWriteStream, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, "..");
const PLUGIN_DIR = join(ROOT, "com.stahlee.slotmachine.sdPlugin");
const OUTPUT     = join(ROOT, "com.stahlee.slotmachine.streamDeckPlugin");

// Ensure the plugin has been built first
if (!existsSync(join(PLUGIN_DIR, "bin", "plugin.js"))) {
  console.error("❌ bin/plugin.js not found — run `npm run build` first.");
  process.exit(1);
}

const output  = createWriteStream(OUTPUT);
const archive = archiver("zip", { zlib: { level: 9 } });

archive.on("error", (err) => { throw err; });

output.on("close", () => {
  const kb = (archive.pointer() / 1024).toFixed(0);
  console.log(`✅  com.stahlee.slotmachine.streamDeckPlugin  (${kb} KB)`);
  console.log("    Double-click the file to install it in Stream Deck.");
});

archive.pipe(output);

// Add the entire .sdPlugin folder as the top-level entry in the ZIP
archive.directory(PLUGIN_DIR, "com.stahlee.slotmachine.sdPlugin");

await archive.finalize();
