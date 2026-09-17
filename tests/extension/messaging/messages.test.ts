import { describe, expect, it } from "vitest"
import {
  failure,
  isExtensionMessage,
  success
} from "../../../extension/src/messaging/messages"

describe("messages", () => {
  it("accepts valid messages", () => {
    expect(
      isExtensionMessage({
        type: "get-settings"
      })
    ).toBe(true)

    expect(
      isExtensionMessage({
        type: "set-protection-state",
        enabled: true
      })
    ).toBe(true)
  })

  it("rejects invalid messages", () => {
    expect(isExtensionMessage(null)).toBe(false)
    expect(isExtensionMessage({ type: "unknown" })).toBe(false)
    expect(
      isExtensionMessage({
        type: "set-protection-state",
        enabled: "yes"
      })
    ).toBe(false)
  })

  it("creates successful responses", () => {
    expect(success({ value: 1 })).toEqual({
      ok: true,
      data: { value: 1 }
    })
  })

  it("creates failed responses", () => {
    expect(failure("Something failed")).toEqual({
      ok: false,
      error: "Something failed"
    })
  })
})
