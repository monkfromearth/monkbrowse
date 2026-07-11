import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { program } from "commander";

import { appConfig } from "@monkbrowse/config/app.config";
import { listPorts, mcpConfig } from "@monkbrowse/config/mcp.config";

import { debugLog } from "./log";
import { createMcpServer } from "./mcp";
import { TargetQueueManager } from "./queue";
import { ConnectionRegistry } from "./registry";
import { startListeners } from "./ws-server";
import pkg from "../package.json";

function setupExitWatchdog(cleanup: () => Promise<void>): void {
  process.stdin.on("close", async () => {
    setTimeout(() => process.exit(0), 15_000);
    await cleanup();
    process.exit(0);
  });
}

program
  .name(appConfig.name)
  .version(pkg.version)
  .option(
    "--base-port <port>",
    "First WebSocket port (one per Chrome profile)",
    String(mcpConfig.basePort),
  )
  .option(
    "--ports <count>",
    "Number of consecutive profile ports to bind",
    String(mcpConfig.portCount),
  )
  .action(async (opts: { basePort: string; ports: string }) => {
    const basePort = Number(opts.basePort);
    const portCount = Number(opts.ports);
    const ports = listPorts({ basePort, portCount });

    const registry = new ConnectionRegistry(ports, pkg.version);
    const queue = new TargetQueueManager();
    const servers = await startListeners(registry, ports, mcpConfig.host);

    const server = createMcpServer({
      name: appConfig.name,
      version: pkg.version,
      registry,
      queue,
    });

    setupExitWatchdog(async () => {
      registry.closeAll();
      for (const wss of servers) {
        wss.close();
      }
      await server.close();
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
    debugLog(
      `[monkbrowse] ready — ${ports.length} profile ports from :${basePort}`,
    );
  });

program.parse(process.argv);
