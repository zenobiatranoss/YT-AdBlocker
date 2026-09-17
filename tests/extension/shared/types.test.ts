import { describe, expect, it } from "vitest"
import type {
  DetectionResult,
  ExtensionMessage,
  PlaybackSnapshot,
  ProtectionSettings,
  ProtectionStatistics
} from "../../../extension/src/shared/types"

describe("shared types", () => {
  it("accepts a valid detection result", () => {
    const result: DetectionResult = {
      detected: true,
      confidence: 92,
      source: "player",
      detectedAt: Date.now()
    }

    expect(result.detected).toBe(true)
    expect(result.confidence).toBe(92)
    expect(result.source).toBe("player")
  })

  it("accepts a playback snapshot", () => {
    const snapshot: PlaybackSnapshot = {
      videoId: "abc123",
      currentTime: 42.5,
      duration: 600,
      paused: false,
      seeking: false,
      playbackRate: 1,
      capturedAt: Date.now()
    }

    expect(snapshot.videoId).toBe("abc123")
    expect(snapshot.currentTime).toBe(42.5)
    expect(snapshot.paused).toBe(false)
  })

  it("accepts protection settings", () => {
    const settings: ProtectionSettings = {
      enabled: true,
      hidePageAds: true,
      protectPlayback: true,
      collectStatistics: false
    }

    expect(settings.enabled).toBe(true)
    expect(settings.collectStatistics).toBe(false)
  })

  it("accepts protection statistics", () => {
    const statistics: ProtectionStatistics = {
      detections: 5,
      interruptionsPrevented: 3,
      playbackRecoveries: 2,
      adRequestsBlocked: 4,
      playerResponsesIntercepted: 2,
      adPlacementsRemoved: 3,
      adsDisplayed: 1,
      lastDetectionAt: null,
      lastEvent: null,
      recentEvents: [],
      recentBlockedRequests: []
    }

    expect(statistics.detections).toBe(5)
    expect(statistics.lastDetectionAt).toBeNull()
  })

  it("accepts extension messages", () => {
    const messages: ExtensionMessage[] = [
      {
        type: "get-protection-state"
      },
      {
        type: "set-protection-state",
        enabled: true
      },
      {
        type: "get-settings"
      },
      {
        type: "update-settings",
        settings: {
          protectPlayback: true
        }
      },
      {
        type: "get-statistics"
      }
    ]

    expect(messages).toHaveLength(5)
    expect(messages[1].type).toBe("set-protection-state")
  })
})
