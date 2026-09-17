import { describe, expect, it, vi } from "vitest"

const startLifecycle = vi.fn()
const startMessageServer = vi.fn()

vi.mock(
  "../../../extension/src/background/lifecycle",
  () => ({
    startLifecycle
  })
)

vi.mock(
  "../../../extension/src/messaging/server",
  () => ({
    startMessageServer
  })
)

vi.mock(
  "../../../extension/src/background/message-router",
  () => ({
    handleMessage: vi.fn()
  })
)

describe("background", () => {
  it("starts the extension lifecycle", async () => {
    await import("../../../extension/src/background/background")

    expect(startLifecycle).toHaveBeenCalledTimes(1)
  })

  it("starts the message server", () => {
    expect(startMessageServer).toHaveBeenCalledTimes(1)
  })
})
