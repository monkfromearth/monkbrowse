import { defineContentScript } from "#imports";

import {
  createLogBuffer,
  handleContentOp,
  installDialogGuards,
  patchConsole,
} from "../lib/content-ops";

/**
 * Runs in every page. Buffers console output, keeps native dialogs from
 * blocking, and executes DOM operations requested by the service worker
 * (messages tagged `cs: true`). The actual work lives in ../lib/content-ops
 * so it can be tested against a headless DOM. See that file.
 */
export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  allFrames: false,
  main() {
    const buffer = createLogBuffer();
    patchConsole(buffer.push);
    installDialogGuards(buffer.push);

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!msg || msg.cs !== true) {
        return undefined; // not for the content script
      }
      handleContentOp(msg, buffer.logs)
        .then((result) => sendResponse({ ok: true, result }))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true; // async response
    });
  },
});
