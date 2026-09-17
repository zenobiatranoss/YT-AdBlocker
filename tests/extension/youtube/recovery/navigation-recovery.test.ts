import { describe, expect, it, vi } from "vitest"
import {
  createNavigationRecovery
} from "../../../../extension/src/youtube/recovery/navigation-recovery"

describe("navigation recovery", () => {
  it("runs recovery after YouTube navigation", async () => {
    vi.useFakeTimers()

    const recover = vi.fn()

    const navigation = createNavigationRecovery(recover)

    navigation.start()

    window.dispatchEvent(
      new Event("yt-navigate-finish")
    )

    await vi.advanceTimersByTimeAsync(100)

    expect(recover).toHaveBeenCalledTimes(1)

    navigation.stop()
    vi.useRealTimers()
  })

  it("does nothing after stopping", async () => {
    vi.useFakeTimers()

    const recover = vi.fn()

    const navigation = createNavigationRecovery(recover)

    navigation.start()
    navigation.stop()

    window.dispatchEvent(
      new Event("yt-navigate-finish")
    )

    await vi.advanceTimersByTimeAsync(100)

    expect(recover).not.toHaveBeenCalled()

    vi.useRealTimers()
  })
})
