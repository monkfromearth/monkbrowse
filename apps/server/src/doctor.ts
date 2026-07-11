/**
 * Connectivity check. Runs the real server networking (same code the MCP server
 * uses) but instead of speaking MCP, it just prints when Chrome profiles connect
 * so you can confirm the extension half works before wiring an MCP client.
 *
 *   bun run --cwd apps/server doctor
 */
import { listPorts, mcpConfig } from "@monkbrowse/config/mcp.config";

import { ConnectionRegistry } from "./registry";
import { startListeners } from "./ws-server";

const ports = listPorts();
const registry = new ConnectionRegistry(ports, "doctor");
await startListeners(registry, ports, mcpConfig.host);

const line = "─".repeat(48);
console.log(`\n${line}`);
console.log("  monkbrowse doctor");
console.log(
  `  Listening on ${mcpConfig.host} ports ${ports[0]}–${ports[ports.length - 1]}`,
);
console.log("  1. Load the extension in Chrome (chrome://extensions).");
console.log("  2. Open its popup, set a Port in range, click Connect.");
console.log("  3. Watch below. Ctrl-C to stop.");
console.log(`${line}\n`);

let signature = "";
setInterval(() => {
  const conns = registry.listConnected();
  const next = conns.map((c) => `${c.port}:${c.label}:${c.tabs.size}`).join("|");
  if (next === signature) return;
  signature = next;
  const now = new Date().toLocaleTimeString();
  if (conns.length === 0) {
    console.log(`  [${now}] waiting for a Chrome profile to connect…`);
    return;
  }
  console.log(`  [${now}] connected profiles:`);
  for (const c of conns) {
    console.log(`      ✓ ${c.label}  ·  port ${c.port}  ·  ${c.tabs.size} tabs`);
  }
}, 500);
