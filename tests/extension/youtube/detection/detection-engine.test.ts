import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from "vitest"

import {
  createDetectionEngine
} from "../../../../extension/src/youtube/detection/detection-engine"

describe("detection engine behavior", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("detects unexpected backward playback", () => {
    const listener = vi.fn()
    const engine = createDetectionEngine(listener)

    const result = engine.analyzeBehavior(
      {
        currentTime: 30,
        paused: false,
        seeking: false,
        playbackRate: 1
      },
      {
        currentTime: 5,
        paused: false,
        seeking: false,
        playbackRate: 1
      }
    )

    expect(result.detected).toBe(true)
    expect(result.source).toBe("behavior")
    expect(result.confidence).toBe(35)
    expect(listener).toHaveBeenCalledOnce()
  })

  it("detects an unexpected pause", () => {
    const engine = createDetectionEngine()

    const result = engine.analyzeBehavior(
      {
        currentTime: 30,
        paused: false,
        seeking: false,
        playbackRate: 1
      },
      {
        currentTime: 30,
        paused: true,
        seeking: false,
        playbackRate: 1
      }
    )

    expect(result.detected).toBe(false)
    expect(result.confidence).toBe(20)
    expect(result.source).toBe("behavior")
  })

  it("does not report normal playback as suspicious", () => {
    const listener = vi.fn()
    const engine = createDetectionEngine(listener)

    const result = engine.analyzeBehavior(
      {
        currentTime: 30,
        paused: false,
        seeking: false,
        playbackRate: 1
      },
      {
        currentTime: 31,
        paused: false,
        seeking: false,
        playbackRate: 1
      }
    )

    expect(result.detected).toBe(false)
    expect(result.confidence).toBe(0)
    expect(listener).not.toHaveBeenCalled()
  })

  it("uses consecutive playback snapshots", () => {
    const listener = vi.fn()
    const engine = createDetectionEngine(listener)

    const first = engine.updatePlayback({
      videoId: "video-a",
      currentTime: 30,
      duration: 120,
      paused: false,
      seeking: false,
      playbackRate: 1,
      capturedAt: Date.now()
    })

    expect(first).toBeNull()

    const second = engine.updatePlayback({
      videoId: "video-a",
      currentTime: 5,
      duration: 120,
      paused: false,
      seeking: false,
      playbackRate: 1,
      capturedAt: Date.now()
    })

    expect(second?.detected).toBe(true)
    expect(second?.source).toBe("behavior")
    expect(listener).toHaveBeenCalledOnce()
  })

  it("does not emit repeated behavior detections until state clears", () => {
    const listener = vi.fn()
    const engine = createDetectionEngine(listener)

    engine.analyzeBehavior(
      {
        currentTime: 30,
        paused: false,
        seeking: false,
        playbackRate: 1
      },
      {
        currentTime: 5,
        paused: false,
        seeking: false,
        playbackRate: 1
      }
    )

    engine.analyzeBehavior(
      {
        currentTime: 5,
        paused: false,
        seeking: false,
        playbackRate: 1
      },
      {
        currentTime: 2,
        paused: false,
        seeking: false,
        playbackRate: 1
      }
    )

    expect(listener).toHaveBeenCalledOnce()
  })

  it("allows a normal playback state to clear detection", () => {
    const listener = vi.fn()
    const engine = createDetectionEngine(listener)

    engine.analyzeBehavior(
      {
        currentTime: 30,
        paused: false,
        seeking: false,
        playbackRate: 1
      },
      {
        currentTime: 5,
        paused: false,
        seeking: false,
        playbackRate: 1
      }
    )

    engine.analyzeBehavior(
      {
        currentTime: 5,
        paused: false,
        seeking: false,
        playbackRate: 1
      },
      {
        currentTime: 6,
        paused: false,
        seeking: false,
        playbackRate: 1
      }
    )

    engine.analyzeBehavior(
      {
        currentTime: 20,
        paused: false,
        seeking: false,
        playbackRate: 1
      },
      {
        currentTime: 1,
        paused: false,
        seeking: false,
        playbackRate: 1
      }
    )

    expect(listener).toHaveBeenCalledTimes(2)
  })
})
