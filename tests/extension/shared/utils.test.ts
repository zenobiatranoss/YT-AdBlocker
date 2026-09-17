import { describe, expect, it } from "vitest"
import {
  clamp,
  createId,
  isRecord
} from "../../../extension/src/shared/utils"

describe("utils", () => {
  it("clamps values below the minimum", () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it("clamps values above the maximum", () => {
    expect(clamp(20, 0, 10)).toBe(10)
  })

  it("keeps values inside the range", () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it("recognizes plain records", () => {
    expect(isRecord({ enabled: true })).toBe(true)
    expect(isRecord(null)).toBe(false)
    expect(isRecord([])).toBe(false)
    expect(isRecord("test")).toBe(false)
  })

  it("creates ids with the requested prefix", () => {
    const id = createId("test")
    expect(id.startsWith("test-")).toBe(true)
  })
})
