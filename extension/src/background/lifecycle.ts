import { getSettings, saveSettings } from "../storage/settings"
import {
  getDefaultStatistics,
  getStatistics
} from "../storage/statistics"

type InstallReason =
  | "install"
  | "update"
  | "browser_update"
  | "shared_module_update"

type InstallDetails = {
  reason: InstallReason
  previousVersion?: string
}

type InstalledEvent = {
  addListener: (listener: (details: InstallDetails) => void | Promise<void>) => void
}

function hasInstalledEvent(): boolean {
  return (
    typeof chrome !== "undefined" &&
    Boolean(chrome.runtime?.onInstalled)
  )
}

export async function prepareExtension(): Promise<void> {
  const settings = await getSettings()
  await saveSettings(settings)

  await getStatistics()

  const storage = chrome.storage.local
  const result = await storage.get("statistics")

  if (!result.statistics) {
    await storage.set({
      statistics: getDefaultStatistics()
    })
  }
}

export function startLifecycle(): void {
  if (!hasInstalledEvent()) {
    throw new Error("Browser lifecycle API is not available")
  }

  const event = chrome.runtime.onInstalled as unknown as InstalledEvent

  event.addListener(async () => {
    await prepareExtension()
  })
}
