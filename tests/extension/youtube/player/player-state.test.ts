import { describe, expect, it } from "vitest"
import {
  capturePlaybackSnapshot,
  findPlayerVideo,
  hasMeaningfulPlayback
} from "../../../../extension/src/youtube/player/player-state"

describe("player state", () => {
  it("finds a video element", () => {
    const video = document.createElement("video")
    document.body.append(video)

    expect(findPlayerVideo()).toBe(video)

    video.remove()
  })

  it("captures playback values", () => {
    const video = document.createElement("video")

    Object.defineProperty(video, "currentTime", {
      value: 25,
      configurable: true
    })

    Object.defineProperty(video, "duration", {
      value: 120,
      configurable: true
    })

    Object.defineProperty(video, "paused", {
      value: false,
      configurable: true
    })

    Object.defineProperty(video, "playbackRate", {
      value: 1.5,
      configurable: true
    })

    const snapshot = capturePlaybackSnapshot(video)

    expect(snapshot.currentTime).toBe(25)
    expect(snapshot.duration).toBe(120)
    expect(snapshot.paused).toBe(false)
    expect(snapshot.playbackRate).toBe(1.5)
  })

  it("recognizes meaningful playback", () => {
    expect(
      hasMeaningfulPlayback({
        videoId: "abc",
        currentTime: 10,
        duration: 100,
        paused: false,
        seeking: false,
        playbackRate: 1,
        capturedAt: 1
      })
    ).toBe(true)
  })

  it("rejects snapshots without a video id", () => {
    expect(
      hasMeaningfulPlayback({
        videoId: null,
        currentTime: 10,
        duration: 100,
        paused: false,
        seeking: false,
        playbackRate: 1,
        capturedAt: 1
      })
    ).toBe(false)
  })
})
