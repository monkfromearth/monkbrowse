/**
 * The content-script's work, factored out of the WXT entrypoint so it can be
 * driven directly in tests (against a headless DOM) without a real browser.
 */
import {
  buildSnapshot,
  clickRef,
  dragRefs,
  evaluate,
  getText,
  hoverRef,
  pressKey,
  scrollPage,
  selectOptionRef,
  typeRef,
  uploadToRef,
} from "./dom";

export interface LogEntry {
  level: string;
  ts: number;
  text: string;
}

export interface LogBuffer {
  logs: LogEntry[];
  push: (level: string, text: string) => void;
}

export function createLogBuffer(max = 500): LogBuffer {
  const logs: LogEntry[] = [];
  return {
    logs,
    push(level, text) {
      logs.push({ level, ts: Date.now(), text });
      if (logs.length > max) logs.shift();
    },
  };
}

export function patchConsole(push: LogBuffer["push"]): void {
  const levels = ["log", "info", "warn", "error", "debug"] as const;
  for (const level of levels) {
    const orig = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      push(level, args.map(safeString).join(" "));
      orig(...args);
    };
  }
}

/** Keep native alert/confirm/prompt from blocking automation; record them. */
export function installDialogGuards(push: LogBuffer["push"]): void {
  try {
    window.alert = (m?: unknown) => push("dialog", `alert: ${String(m ?? "")}`);
    window.confirm = (m?: unknown) => {
      push("dialog", `confirm: ${String(m ?? "")}`);
      return true;
    };
    window.prompt = (m?: unknown, d?: string) => {
      push("dialog", `prompt: ${String(m ?? "")}`);
      return d ?? "";
    };
  } catch {
    // some pages freeze these; ignore
  }
}

/** Dispatch one content-script op (messages tagged `cs: true`). */
export async function handleContentOp(
  msg: { kind: string; [k: string]: unknown },
  logs: LogEntry[],
): Promise<unknown> {
  switch (msg.kind) {
    case "ping":
      return "pong";
    case "snapshot":
      return buildSnapshot();
    case "click":
      clickRef(msg.ref as string);
      return {};
    case "hover":
      hoverRef(msg.ref as string);
      return {};
    case "type":
      typeRef(msg.ref as string, msg.text as string, msg.submit as boolean);
      return {};
    case "select_option":
      selectOptionRef(msg.ref as string, msg.values as string[]);
      return {};
    case "press_key":
      pressKey(msg.key as string);
      return {};
    case "scroll":
      scrollPage(
        msg.direction as "up" | "down" | "left" | "right" | undefined,
        msg.amount as number | undefined,
        msg.ref as string | undefined,
      );
      return {};
    case "get_text":
      return { text: getText(msg.ref as string | undefined) };
    case "evaluate":
      return { result: await evaluate(msg.expression as string) };
    case "drag":
      dragRefs(msg.startRef as string, msg.endRef as string);
      return {};
    case "upload":
      uploadToRef(msg.ref as string, msg.name as string, msg.data as string);
      return {};
    case "console":
      return logs.slice();
    default:
      throw new Error(`Unknown content op "${msg.kind}"`);
  }
}

export function safeString(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
