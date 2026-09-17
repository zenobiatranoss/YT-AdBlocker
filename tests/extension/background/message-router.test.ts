import { beforeEach, describe, expect, it } from "vitest"
import { handleMessage } from "../../../extension/src/background/message-router"

let data: Record<string, unknown>

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
        }
      }
    }
  } as typeof chrome
})

describe("message router", () => {
  it("returns the current protection state", async () => {
    const response = await handleMessage({
      type: "get-protection-state"
    })

    expect(response).toEqual({
      ok: true,
      data: {
        enabled: true
      }
    })
  })

  it("changes the protection state", async () => {
    const response = await handleMessage({
      type: "set-protection-state",
      enabled: false
    })

    expect(response.ok).toBe(true)

    const state = await handleMessage({
      type: "get-protection-state"
    })

    expect(state).toEqual({
      ok: true,
      data: {
        enabled: false
      }
    })
  })

  it("returns all settings", async () => {
    const response = await handleMessage({
      type: "get-settings"
    })

    expect(response.ok).toBe(true)

    if (response.ok) {
      expect(response.data).toMatchObject({
        enabled: true,
        hidePageAds: true,
        protectPlayback: true
      })
    }
  })

  it("updates selected settings", async () => {
    const response = await handleMessage({
      type: "update-settings",
      settings: {
        hidePageAds: false,
        protectPlayback: false
      }
    })

    expect(response.ok).toBe(true)

    if (response.ok) {
      expect(response.data).toMatchObject({
        hidePageAds: false,
        protectPlayback: false,
        enabled: true
      })
    }
  })

  it("returns statistics", async () => {
    const response = await handleMessage({
      type: "get-statistics"
    })

    expect(response.ok).toBe(true)

    if (response.ok) {
      expect(response.data).toMatchObject({
        detections: 0,
        interruptionsPrevented: 0,
        playbackRecoveries: 0
      })
    }
  })

  it("records detections", async () => {
    await handleMessage({
      type: "detection",
      result: {
        detected: true,
        confidence: 90,
        source: "dom",
        detectedAt: 12345
      }
    })

    const response = await handleMessage({
      type: "get-statistics"
    })

    expect(response.ok).toBe(true)

    if (response.ok) {
      expect(response.data).toMatchObject({
        detections: 1,
        lastDetectionAt: 12345
      })
    }
  })
})
