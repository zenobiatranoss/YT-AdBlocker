import { describe, expect, it } from "vitest"
import {
  createPlaybackStateStore
} from "../../../../extension/src/youtube/recovery/state-recovery"

describe("playback state store", () => {
  it("stores a playback snapshot", () => {
    const store = createPlaybackStateStore()

    store.save({
      videoId: "abc",
      currentTime: 20,
      duration: 100,
      paused: false,
      seeking: false,
      playbackRate: 1,
      capturedAt: 1
    })

    expect(store.get()).toMatchObject({
      videoId: "abc",
      currentTime: 20
    })
  })

  it("clears stored state", () => {
    const store = createPlaybackStateStore()

    store.save({
      videoId: "abc",
      currentTime: 20,
      duration: 100,
      paused: false,
      seeking: false,
      playbackRate: 1,
      capturedAt: 1
    })

    store.clear()

    expect(store.get()).toBeNull()
  })

  it("does not expose the internal object", () => {
    const store = createPlaybackStateStore()

    store.save({
      videoId: "abc",
      currentTime: 20,
      duration: 100,
      paused: false,
      seeking: false,
      playbackRate: 1,
      capturedAt: 1
    })

    const snapshot = store.get()

    if (snapshot) {
      snapshot.currentTime = 99
    }

    expect(store.get()?.currentTime).toBe(20)
  })
})
