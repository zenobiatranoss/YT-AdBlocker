import { beforeEach, describe, expect, it } from "vitest"
import {
  prepareExtension,
  startLifecycle
} from "../../../extension/src/background/lifecycle"

type StoredData = Record<string, unknown>

let data: StoredData
let installedListener:
  | ((details: { reason: string }) => void | Promise<void>)
  | null

beforeEach(() => {
  data = {}
  installedListener = null

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
        }
      }
    },
    runtime: {
      onInstalled: {
        addListener: (listener: (details: { reason: string }) => void | Promise<void>) => {
          installedListener = listener
        }
      }
    }
  } as typeof chrome
})

describe("extension lifecycle", () => {
  it("creates the initial extension state", async () => {
    await prepareExtension()

    expect(data.settings).toEqual({
      enabled: true,
      hidePageAds: true,
      protectPlayback: true,
      collectStatistics: true
    })

    expect(data.statistics).toEqual({
      detections: 0,
      interruptionsPrevented: 0,
      playbackRecoveries: 0,
      adRequestsBlocked: 0,
      playerResponsesIntercepted: 0,
      adPlacementsRemoved: 0,
      adsDisplayed: 0,
      lastDetectionAt: null,
      lastEvent: null,
      recentEvents: [],
      recentBlockedRequests: []
    })
  })

  it("keeps existing settings", async () => {
    data.settings = {
      enabled: false,
      hidePageAds: false,
      protectPlayback: true,
      collectStatistics: false
    }

    await prepareExtension()

    expect(data.settings).toEqual({
      enabled: false,
      hidePageAds: false,
      protectPlayback: true,
      collectStatistics: false
    })
  })

  it("keeps existing statistics", async () => {
    data.statistics = {
      detections: 10,
      interruptionsPrevented: 5,
      playbackRecoveries: 4,
      lastDetectionAt: 12345
    }

    await prepareExtension()

    expect(data.statistics).toEqual({
      detections: 10,
      interruptionsPrevented: 5,
      playbackRecoveries: 4,
      lastDetectionAt: 12345
    })
  })

  it("registers the installation listener", () => {
    startLifecycle()

    expect(installedListener).not.toBeNull()
  })

  it("prepares the extension after installation", async () => {
    startLifecycle()

    await installedListener?.({
      reason: "install"
    })

    expect(data.settings).toBeDefined()
    expect(data.statistics).toBeDefined()
  })
})
