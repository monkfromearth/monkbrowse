import { describe, expect, test } from "bun:test";

import { appConfig } from "../src/app.config";
import { isPortInRange, listPorts, mcpConfig } from "../src/mcp.config";

describe("config", () => {
  test("server name is monkbrowse", () => {
    expect(appConfig.name).toBe("monkbrowse");
  });

  test("default port range starts at basePort and has portCount entries", () => {
    const ports = listPorts();
    expect(ports.length).toBe(mcpConfig.portCount);
    expect(ports[0]).toBe(mcpConfig.basePort);
    expect(ports[ports.length - 1]).toBe(
      mcpConfig.basePort + mcpConfig.portCount - 1,
    );
  });

  test("listPorts honors a custom range", () => {
    expect(listPorts({ basePort: 100, portCount: 3 })).toEqual([100, 101, 102]);
  });

  test("isPortInRange", () => {
    expect(isPortInRange(mcpConfig.basePort)).toBe(true);
    expect(isPortInRange(mcpConfig.basePort + mcpConfig.portCount - 1)).toBe(
      true,
    );
    expect(isPortInRange(mcpConfig.basePort - 1)).toBe(false);
    expect(isPortInRange(mcpConfig.basePort + mcpConfig.portCount)).toBe(false);
    expect(isPortInRange(50, { basePort: 40, portCount: 5 })).toBe(false);
    expect(isPortInRange(42, { basePort: 40, portCount: 5 })).toBe(true);
  });
});
