import type { ProtectionSettings } from "../shared/types"

const defaults: ProtectionSettings = {
  enabled: true,
  hidePageAds: true,
  protectPlayback: true,
  collectStatistics: true
}

type StorageArea = {
  get: (keys?: string | string[] | null) => Promise<Record<string, unknown>>
  set: (items: Record<string, unknown>) => Promise<void>
  remove: (keys: string | string[]) => Promise<void>
}

function getStorage(): StorageArea {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    throw new Error("Browser storage is not available")
  }

  return chrome.storage.local
}

function mergeWithDefaults(value: unknown): ProtectionSettings {
  if (!value || typeof value !== "object") {
    return { ...defaults }
  }

  const saved = value as Partial<ProtectionSettings>

  return {
    enabled: typeof saved.enabled === "boolean" ? saved.enabled : defaults.enabled,
    hidePageAds:
      typeof saved.hidePageAds === "boolean"
        ? saved.hidePageAds
        : defaults.hidePageAds,
    protectPlayback:
      typeof saved.protectPlayback === "boolean"
        ? saved.protectPlayback
        : defaults.protectPlayback,
    collectStatistics:
      typeof saved.collectStatistics === "boolean"
        ? saved.collectStatistics
        : defaults.collectStatistics
  }
}

export function getDefaultSettings(): ProtectionSettings {
  return { ...defaults }
}

export async function getSettings(): Promise<ProtectionSettings> {
  const storage = getStorage()
  const result = await storage.get("settings")

  return mergeWithDefaults(result.settings)
}

export async function saveSettings(
  settings: ProtectionSettings
): Promise<ProtectionSettings> {
  const storage = getStorage()
  const next = mergeWithDefaults(settings)

  await storage.set({
    settings: next
  })

  return next
}

export async function updateSettings(
  changes: Partial<ProtectionSettings>
): Promise<ProtectionSettings> {
  const current = await getSettings()

  const next = {
    ...current,
    ...changes
  }

  return saveSettings(next)
}

export async function resetSettings(): Promise<ProtectionSettings> {
  const storage = getStorage()
  const next = getDefaultSettings()

  await storage.set({
    settings: next
  })

  return next
}
