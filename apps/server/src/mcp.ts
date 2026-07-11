import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { ALL_TOOLS } from "@monkbrowse/protocol";
import { toolInputSchema } from "@monkbrowse/protocol/json-schema";

import type { TargetQueueManager } from "./queue";
import type { ConnectionRegistry } from "./registry";
import { type ToolContext, toolHandlers } from "./tools";

export function createMcpServer(options: {
  name: string;
  version: string;
  registry: ConnectionRegistry;
  queue: TargetQueueManager;
}): Server {
  const { name, version, registry, queue } = options;
  const ctx: ToolContext = { registry, queue };

  const server = new Server(
    { name, version },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: toolInputSchema(tool),
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = ALL_TOOLS.find((t) => t.name === request.params.name);
    const handler = toolHandlers[request.params.name];
    if (!tool || !handler) {
      return {
        content: [
          { type: "text", text: `Tool "${request.params.name}" not found` },
        ],
        isError: true,
      };
    }
    try {
      const args = tool.arguments.parse(request.params.arguments ?? {});
      return await handler(ctx, args);
    } catch (error) {
      return {
        content: [
          { type: "text", text: error instanceof Error ? error.message : String(error) },
        ],
        isError: true,
      };
    }
  });

  return server;
}
