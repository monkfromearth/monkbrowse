import { zodToJsonSchema } from "zod-to-json-schema";

import type { ToolDef } from "./tools";

/**
 * Server-only. Converts a tool's zod argument schema into JSON Schema for MCP
 * tool registration. Kept in its own module (exported via the "./json-schema"
 * subpath) so the extension bundle never pulls in zod-to-json-schema.
 */
export function toolInputSchema(tool: ToolDef) {
  return zodToJsonSchema(tool.arguments);
}
