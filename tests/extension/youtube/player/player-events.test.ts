import { describe, expect, it, vi } from "vitest"
import { listenToPlayer } from "../../../../extension/src/youtube/player/player-events"

describe("player events", () => {
  it("receives player events", () => {
    const video = document.createElement("video")
    const listener = vi.fn()

    const stop = listenToPlayer(video, listener)

    video.dispatchEvent(new Event("play"))
    video.dispatchEvent(new Event("pause"))
    video.dispatchEvent(new Event("timeupdate"))
    video.dispatchEvent(new Event("durationchange"))

    expect(listener).toHaveBeenCalledTimes(4)

    stop()

    video.dispatchEvent(new Event("play"))

    expect(listener).toHaveBeenCalledTimes(4)
  })
})
