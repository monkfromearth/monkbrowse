import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  target: "node20",
  clean: true,
  // Inline the workspace packages — they are private and not published to npm.
  noExternal: [/^@monkbrowse\//],
  // Keep real npm deps external; the published package declares them.
  external: ["ws", "@modelcontextprotocol/sdk", "commander", "zod"],
  banner: { js: "#!/usr/bin/env node" },
});
