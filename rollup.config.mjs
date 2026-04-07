import { defineConfig } from "rollup";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";

export default defineConfig({
  input: "src/plugin.ts",
  output: {
    file: "com.stahlee.slotmachine.sdPlugin/bin/plugin.js",
    format: "esm",
    sourcemap: true,
  },
  plugins: [
    typescript(),
    nodeResolve({
      exportConditions: ["node"],
      preferBuiltins: true,
    }),
    commonjs(),
  ],
  external: [
    "fs",
    "path",
    "url",
    "events",
    "stream",
    "buffer",
    "crypto",
    "os",
    "http",
    "https",
    "net",
    "tls",
    "zlib",
    "util",
    "assert",
    "child_process",
  ],
});
