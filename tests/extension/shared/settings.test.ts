import { beforeEach, describe, expect, it } from "vitest"
import {
  getDefaultSettings,
  getSettings,
  resetSettings,
  saveSettings,
  updateSettings
} from "../../../extension/src/storage/settings"

type StoredData = Record<string, unknown>

let data: StoredData

beforeEach(() => {
  data = {}

  globalThis.chrome = {
    storage: {
      local: {
        get: async (keys?: string | string[] | null) => {
          if (typeof keys === "string") {
            return {
              [keys]: data[keys]
            }
          }

          return { ...data }
        },
        set: async (items: Record<string, unknown>) => {
          Object.assign(data, items)
        },
        remove: async (keys: string | string[]) => {
          const list = Array.isArray(keys) ? keys : [keys]

          for (const key of list) {
            delete data[key]
          }
        }
      }
    }
  } as typeof chrome
})

describe("settings", () => {
  it("returns the expected default settings", () => {
    expect(getDefaultSettings()).toEqual({
      enabled: true,
      hidePageAds: true,
      protectPlayback: true,
      collectStatistics: true
    })
  })

  it("uses defaults when nothing has been saved", async () => {
    const settings = await getSettings()

    expect(settings).toEqual(getDefaultSettings())
  })

  it("fills missing saved values with defaults", async () => {
    data.settings = {
      enabled: false
    }

    const settings = await getSettings()

    expect(settings).toEqual({
      enabled: false,
      hidePageAds: true,
      protectPlayback: true,
      collectStatistics: true
    })
  })

  it("saves complete settings", async () => {
    const settings = await saveSettings({
      enabled: false,
      hidePageAds: false,
      protectPlayback: true,
      collectStatistics: false
    })

    expect(settings).toEqual(data.settings)
  })

  it("updates one setting without losing the others", async () => {
    await updateSettings({
      enabled: false
    })

    expect(await getSettings()).toEqual({
      enabled: false,
      hidePageAds: true,
      protectPlayback: true,
      collectStatistics: true
    })
  })

  it("updates multiple settings", async () => {
    await updateSettings({
      enabled: false,
      hidePageAds: false,
      collectStatistics: false
    })

    expect(await getSettings()).toEqual({
      enabled: false,
      hidePageAds: false,
      protectPlayback: true,
      collectStatistics: false
    })
  })

  it("resets settings back to defaults", async () => {
    await updateSettings({
      enabled: false,
      protectPlayback: false
    })

    const settings = await resetSettings()

    expect(settings).toEqual(getDefaultSettings())
    expect(data.settings).toEqual(getDefaultSettings())
  })
})
