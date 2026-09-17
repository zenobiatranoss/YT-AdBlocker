import { describe, expect, it, vi } from "vitest"
import {
  createYouTubeRuntime
} from "../../../../extension/src/youtube/runtime/youtube-runtime"

describe("youtube runtime", () => {
  it("starts and stops safely", () => {
    const runtime = createYouTubeRuntime()

    runtime.start()
    runtime.start()
    runtime.stop()
    runtime.stop()

    expect(runtime.getSnapshot()).toBeNull()
  })

  it("tracks a video when one exists", () => {
    const video = document.createElement("video")

    Object.defineProperty(video, "duration", {
      value: 120,
      configurable: true
    })

    Object.defineProperty(video, "currentTime", {
      value: 20,
      configurable: true
    })

    Object.defineProperty(video, "paused", {
      value: false,
      configurable: true
    })

    document.body.append(video)

    const runtime = createYouTubeRuntime()

    runtime.start()

    expect(runtime.getSnapshot()).toMatchObject({
      currentTime: 20,
      duration: 120
    })

    runtime.stop()
    video.remove()
  })

  it("captures player events", () => {
    const video = document.createElement("video")

    Object.defineProperty(video, "duration", {
      value: 120,
      configurable: true
    })

    Object.defineProperty(video, "currentTime", {
      value: 20,
      configurable: true
    })

    document.body.append(video)

    const runtime = createYouTubeRuntime()

    runtime.start()

    Object.defineProperty(video, "currentTime", {
      value: 35,
      configurable: true
    })

    video.dispatchEvent(new Event("timeupdate"))

    video.dispatchEvent(new Event("play"))

    expect(runtime.getSnapshot()?.currentTime).toBe(35)

    runtime.stop()
    video.remove()
  })

  it("exposes the latest detection", async () => {
    document.body.innerHTML = `
      <div id="movie_player" class="ad-showing"></div>
    `

    const runtime = createYouTubeRuntime()

    runtime.start()

    await Promise.resolve()

    expect(runtime.getLastDetection()?.detected).toBe(true)

    runtime.stop()
  })

  it("does not crash when playback cannot resume", async () => {
    const video = document.createElement("video")

    Object.defineProperty(video, "duration", {
      value: 100,
      configurable: true
    })

    video.play = vi.fn().mockRejectedValue(
      new Error("blocked")
    )

    document.body.append(video)

    const runtime = createYouTubeRuntime()

    runtime.start()

    await Promise.resolve()

    expect(runtime.getSnapshot()).not.toBeNull()

    runtime.stop()
    video.remove()
  })
})
