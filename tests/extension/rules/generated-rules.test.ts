import { describe, expect, it } from "vitest"
import { parseRules } from "../../../extension/src/rules/rule-parser"
import { createRuleEngine } from "../../../extension/src/rules/rule-engine"
import { youtubeRules } from "../../../extension/src/generated/youtube-rules"

describe("generated YouTube rules", () => {
  const engine = createRuleEngine(
    parseRules(youtubeRules.join("\n"))
  )

  it("blocks known advertising requests", () => {
    expect(
      engine.decide(
        "https://googleads.g.doubleclick.net/pagead/id"
      ).blocked
    ).toBe(true)

    expect(
      engine.decide(
        "https://pagead2.googlesyndication.com/pagead/ads"
      ).blocked
    ).toBe(true)

    expect(
      engine.decide(
        "https://adservice.google.com/ads"
      ).blocked
    ).toBe(true)
  })

  it("does not block normal YouTube requests", () => {
    expect(
      engine.decide(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      ).blocked
    ).toBe(false)

    expect(
      engine.decide(
        "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
      ).blocked
    ).toBe(false)
  })

  it("loads the generated cosmetic rules", () => {
    const rules = engine.getCosmeticRules("www.youtube.com")

    expect(
      rules.some(
        rule => rule.selector === ".ytp-ad-player-overlay"
      )
    ).toBe(true)
  })
})
