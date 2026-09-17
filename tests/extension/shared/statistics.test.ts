import { beforeEach, describe, expect, it } from "vitest"
import {
  getDefaultStatistics,
  getStatistics,
  recordDetection,
  recordInterruptionPrevented,
  recordPlaybackRecovery,
  resetStatistics
} from "../../../extension/src/storage/statistics"

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
        }
      }
    }
  } as typeof chrome
})

describe("statistics", () => {
  it("returns the expected defaults", () => {
    expect(getDefaultStatistics()).toEqual({
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

  it("uses defaults when nothing has been stored", async () => {
    expect(await getStatistics()).toEqual(getDefaultStatistics())
  })

  it("repairs incomplete stored statistics", async () => {
    data.statistics = {
      detections: 4,
      playbackRecoveries: 2
    }

    expect(await getStatistics()).toEqual({
      detections: 4,
      interruptionsPrevented: 0,
      playbackRecoveries: 2,
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

  it("ignores invalid stored values", async () => {
    data.statistics = {
      detections: -5,
      interruptionsPrevented: "wrong",
      playbackRecoveries: Infinity,
      lastDetectionAt: -10
    }

    expect(await getStatistics()).toEqual(getDefaultStatistics())
  })

  it("records detections and stores the timestamp", async () => {
    const statistics = await recordDetection(123456)

    expect(statistics).toEqual({
      detections: 1,
      interruptionsPrevented: 0,
      playbackRecoveries: 0,
      adRequestsBlocked: 0,
      playerResponsesIntercepted: 0,
      adPlacementsRemoved: 0,
      adsDisplayed: 0,
      lastDetectionAt: 123456,
      lastEvent: {
        type: "ad-detected",
        timestamp: 123456
      },
      recentEvents: [
        {
          type: "ad-detected",
          timestamp: 123456
        }
      ],
      recentBlockedRequests: []
    })

    await recordDetection(654321)

    expect(await getStatistics()).toEqual({
      detections: 2,
      interruptionsPrevented: 0,
      playbackRecoveries: 0,
      adRequestsBlocked: 0,
      playerResponsesIntercepted: 0,
      adPlacementsRemoved: 0,
      adsDisplayed: 0,
      lastDetectionAt: 654321,
      lastEvent: {
        type: "ad-detected",
        timestamp: 654321
      },
      recentEvents: [
        {
          type: "ad-detected",
          timestamp: 123456
        },
        {
          type: "ad-detected",
          timestamp: 654321
        }
      ],
      recentBlockedRequests: []
    })
  })

  it("records prevented interruptions", async () => {
    await recordInterruptionPrevented()
    await recordInterruptionPrevented()

    expect((await getStatistics()).interruptionsPrevented).toBe(2)
  })

  it("records playback recoveries", async () => {
    await recordPlaybackRecovery()
    await recordPlaybackRecovery()
    await recordPlaybackRecovery()

    expect((await getStatistics()).playbackRecoveries).toBe(3)
  })

  it("keeps counters independent", async () => {
    await recordDetection(100)
    await recordInterruptionPrevented()
    await recordPlaybackRecovery()

    expect(await getStatistics()).toEqual({
      detections: 1,
      interruptionsPrevented: 1,
      playbackRecoveries: 1,
      adRequestsBlocked: 0,
      playerResponsesIntercepted: 0,
      adPlacementsRemoved: 0,
      adsDisplayed: 0,
      lastDetectionAt: 100,
      lastEvent: {
        type: "playback-recovery",
        timestamp: expect.any(Number)
      },
      recentEvents: [
        {
          type: "ad-detected",
          timestamp: 100
        },
        {
          type: "interruption-prevented",
          timestamp: expect.any(Number)
        },
        {
          type: "playback-recovery",
          timestamp: expect.any(Number)
        }
      ],
      recentBlockedRequests: []
    })
  })

  it("resets all statistics", async () => {
    await recordDetection(100)
    await recordInterruptionPrevented()
    await recordPlaybackRecovery()

    await resetStatistics()

    expect(await getStatistics()).toEqual(getDefaultStatistics())
  })
})
