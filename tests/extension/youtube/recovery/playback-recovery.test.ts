import { describe, expect, it, vi } from "vitest"
import {
  recoverPlayback
} from "../../../../extension/src/youtube/recovery/playback-recovery"

describe("playback recovery", () => {
  it("restores playback state", async () => {
    const video = document.createElement("video")

    Object.defineProperty(video, "duration", {
      value: 100,
      configurable: true
    })

    video.play = vi.fn().mockResolvedValue(undefined)

    const result = await recoverPlayback(video, {
      videoId: "abc",
      currentTime: 30,
      duration: 100,
      paused: false,
      seeking: false,
      playbackRate: 1.5,
      capturedAt: 1
    })

    expect(result.restored).toBe(true)
    expect(video.currentTime).toBe(30)
    expect(video.playbackRate).toBe(1.5)
  })

  it("does not resume paused snapshots", async () => {
    const video = document.createElement("video")

    Object.defineProperty(video, "duration", {
      value: 100,
      configurable: true
    })

    video.play = vi.fn()

    const result = await recoverPlayback(video, {
      videoId: "abc",
      currentTime: 30,
      duration: 100,
      paused: true,
      seeking: false,
      playbackRate: 1,
      capturedAt: 1
    })

    expect(result.restored).toBe(true)
    expect(video.play).not.toHaveBeenCalled()
  })
})
