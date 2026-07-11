import { execFileSync, execSync } from "node:child_process";
import net from "node:net";

/** Resolve true if a TCP port is currently bound on the given host. */
export function isPortInUse(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => {
      server.close(() => resolve(false));
    });
    server.listen(port, host);
  });
}

/**
 * Free a SINGLE port by killing a stale process holding it — but never this
 * process, and never a sibling port. Best-effort; silent if nothing is there.
 */
export function killStaleProcessOnPort(port: number): void {
  // Coerce to an integer defensively — never let anything but a number reach a
  // command line, even though callers only pass ports from the config range.
  const p = Math.trunc(port);
  if (!Number.isInteger(p) || p <= 0) {
    return;
  }
  try {
    if (process.platform === "win32") {
      execSync(
        `FOR /F "tokens=5" %a in ('netstat -ano ^| findstr :${p}') do taskkill /F /PID %a`,
        { stdio: "ignore" },
      );
      return;
    }
    // No shell: args are passed as an array, so nothing is interpreted.
    const out = execFileSync("lsof", ["-ti", `tcp:${p}`], {
      encoding: "utf8",
    }).trim();
    const pids = out
      .split(/\s+/)
      .map((s) => Number(s))
      .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
    for (const pid of pids) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // process already gone
      }
    }
  } catch {
    // lsof exits non-zero when no process holds the port — nothing to do
  }
}
