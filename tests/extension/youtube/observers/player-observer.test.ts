import { describe, expect, it, vi } from "vitest"
import {
  createPlayerObserver
} from "../../../../extension/src/youtube/observers/player-observer"

describe("player observer", () => {
  it("finds a player when started", async () => {
    document.body.innerHTML = ""

    const video = document.createElement("video")
    document.body.append(video)

    const callback = vi.fn()

    const observer = createPlayerObserver(callback)

    observer.start()

    await Promise.resolve()

    expect(callback).toHaveBeenCalledWith(video)

    observer.stop()
    video.remove()
  })
})
