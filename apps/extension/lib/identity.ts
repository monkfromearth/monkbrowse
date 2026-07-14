import { mcpConfig } from "@monkbrowse/config/mcp.config";

import { STORAGE } from "./constants";

export interface Identity {
  profileId: string;
  port: number;
  label: string;
}

/** Read this profile's identity, generating a stable profileId on first run. */
export async function getIdentity(): Promise<Identity> {
  const s = await chrome.storage.local.get([
    STORAGE.profileId,
    STORAGE.port,
    STORAGE.label,
  ]);

  let profileId = s[STORAGE.profileId] as string | undefined;
  if (!profileId) {
    profileId = crypto.randomUUID();
    await chrome.storage.local.set({ [STORAGE.profileId]: profileId });
  }

  const port =
    typeof s[STORAGE.port] === "number"
      ? (s[STORAGE.port] as number)
      : mcpConfig.basePort;
  const label = (s[STORAGE.label] as string | undefined) ?? "";

  return { profileId, port, label };
}

/** Persist the user's chosen port + label from the options UI. */
export async function saveSettings(port: number, label: string): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE.port]: port,
    [STORAGE.label]: label.trim(),
  });
}
