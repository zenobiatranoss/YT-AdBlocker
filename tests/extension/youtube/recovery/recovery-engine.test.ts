import { describe, expect, it, vi } from "vitest"
import {
  createRecoveryEngine
} from "../../../../extension/src/youtube/recovery/recovery-engine"

function createVideo(
  videoId: string,
  currentTime = 10
): HTMLVideoElement {
  const video = document.createElement("video")

  Object.defineProperty(video, "currentTime", {
    configurable: true,
    value: currentTime
  })

  Object.defineProperty(video, "duration", {
    configurable: true,
    value: 120
  })

  Object.defineProperty(video, "paused", {
    configurable: true,
    value: false
  })

  Object.defineProperty(video, "playbackRate", {
    configurable: true,
    value: 1
  })

  return video
}

function setLocation(
  videoId: string
): void {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: new URL(
      `https://www.youtube.com/watch?v=${videoId}`
    )
  })
}

describe("recovery engine", () => {
  it("does not attempt recovery without a saved snapshot", async () => {
    setLocation("video-a")

    const listener = vi.fn()
    const engine = createRecoveryEngine(listener)

    const detection = {
      detected: true,
      confidence: 80,
      source: "player" as const,
      detectedAt: Date.now()
    }

    const result = await engine.recover(detection)

    expect(result.attempted).toBe(false)
    expect(result.recovered).toBe(false)
    expect(listener).toHaveBeenCalledOnce()
  })

  it("remembers meaningful playback state", () => {
    setLocation("video-a")

    const video = createVideo("video-a", 42)
    document.body.appendChild(video)

    const engine = createRecoveryEngine()
    const snapshot = engine.remember()

    expect(snapshot).not.toBeNull()
    expect(snapshot?.videoId).toBe("video-a")
    expect(snapshot?.currentTime).toBe(42)
    expect(snapshot?.duration).toBe(120)
  })

  it("does not recover a different video", async () => {
    setLocation("video-a")

    const firstVideo = createVideo("video-a", 42)
    document.body.appendChild(firstVideo)

    const engine = createRecoveryEngine()

    engine.remember()

    document.body.innerHTML = ""
    setLocation("video-b")

    const secondVideo = createVideo("video-b", 5)
    document.body.appendChild(secondVideo)

    const result = await engine.recover({
      detected: true,
      confidence: 90,
      source: "player",
      detectedAt: Date.now()
    })

    expect(result.attempted).toBe(false)
    expect(result.recovered).toBe(false)
  })

  it("clears the saved playback state", async () => {
    setLocation("video-a")

    const video = createVideo("video-a", 30)
    document.body.appendChild(video)

    const engine = createRecoveryEngine()

    engine.remember()
    engine.clear()

    const result = await engine.recover({
      detected: true,
      confidence: 90,
      source: "player",
      detectedAt: Date.now()
    })

    expect(result.attempted).toBe(false)
    expect(result.recovered).toBe(false)
  })
})
