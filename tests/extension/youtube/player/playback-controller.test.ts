import { describe, expect, it, vi } from "vitest"
import {
  restorePlaybackPosition,
  restorePlaybackRate,
  resumePlayback
} from "../../../../extension/src/youtube/player/playback-controller"

describe("playback controller", () => {
  it("restores playback position", () => {
    const video = document.createElement("video")

    Object.defineProperty(video, "duration", {
      value: 100,
      configurable: true
    })

    restorePlaybackPosition(video, {
      videoId: "abc",
      currentTime: 40,
      duration: 100,
      paused: false,
      seeking: false,
      playbackRate: 1,
      capturedAt: 1
    })

    expect(video.currentTime).toBe(40)
  })

  it("does not restore an invalid position", () => {
    const video = document.createElement("video")

    expect(
      restorePlaybackPosition(video, {
        videoId: "abc",
        currentTime: -1,
        duration: 100,
        paused: false,
        seeking: false,
        playbackRate: 1,
        capturedAt: 1
      })
    ).toBe(false)
  })

  it("restores playback rate", () => {
    const video = document.createElement("video")

    expect(
      restorePlaybackRate(video, {
        videoId: "abc",
        currentTime: 0,
        duration: 100,
        paused: false,
        seeking: false,
        playbackRate: 1.5,
        capturedAt: 1
      })
    ).toBe(true)

    expect(video.playbackRate).toBe(1.5)
  })

  it("handles playback failures", async () => {
    const video = document.createElement("video")

    video.play = vi.fn().mockRejectedValue(new Error("blocked"))

    expect(await resumePlayback(video)).toBe(false)
  })
})
