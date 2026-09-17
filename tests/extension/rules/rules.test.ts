import { describe, expect, it } from "vitest"
import { parseRule, parseRules } from "../../../extension/src/rules/rule-parser"
import { validateRule } from "../../../extension/src/rules/rule-validator"
import { matchRule } from "../../../extension/src/rules/rule-matcher"
import { createRuleEngine } from "../../../extension/src/rules/rule-engine"
import { createRuleCache } from "../../../extension/src/rules/rule-cache"

describe("rules", () => {

  it("matches YouTube ad service endpoints", () => {
  const rule = parseRule("||youtube.com/pagead/")
  expect(rule).not.toBeNull()

  if (rule) {
    expect(
      matchRule(
        rule,
        "https://www.youtube.com/pagead/viewthroughconversion"
      )
    ).toBe(true)

    expect(
      matchRule(
        rule,
        "https://www.youtube.com/watch?v=test"
      )
    ).toBe(false)
  }
})

it("matches YouTube ad statistics endpoints", () => {
  const rule = parseRule("||youtube.com/api/stats/ads")
  expect(rule).not.toBeNull()

  if (rule) {
    expect(
      matchRule(
        rule,
        "https://www.youtube.com/api/stats/ads?event=playback"
      )
    ).toBe(true)

    expect(
      matchRule(
        rule,
        "https://www.youtube.com/api/stats/qoe"
      )
    ).toBe(false)
  }
})

it("matches YouTube player URL patterns", () => {
  const rule = parseRule("||youtube.com/youtubei/v1/player?*")
  expect(rule).not.toBeNull()

  if (rule) {
    expect(
      matchRule(
        rule,
        "https://www.youtube.com/youtubei/v1/player?key=test"
      )
    ).toBe(true)

    expect(
      matchRule(
        rule,
        "https://www.youtube.com/youtubei/v1/browse?key=test"
      )
    ).toBe(false)
  }
})

it("matches a domain anchor and subdomains", () => {
    const rule = parseRule("||ads.example.com^")

    expect(rule).not.toBeNull()

    if (rule) {
      expect(
        matchRule(
          rule,
          "https://ads.example.com/script.js"
        )
      ).toBe(true)

      expect(
        matchRule(
          rule,
          "https://cdn.ads.example.com/script.js"
        )
      ).toBe(true)

      expect(
        matchRule(
          rule,
          "https://ads.example.net/script.js"
        )
      ).toBe(false)
    }
  })

  it("matches a domain anchor with a path", () => {
    const rule = parseRule(
      "||ads.example.com/track/"
    )

    expect(rule).not.toBeNull()

    if (rule) {
      expect(
        matchRule(
          rule,
          "https://ads.example.com/track/script.js"
        )
      ).toBe(true)

      expect(
        matchRule(
          rule,
          "https://ads.example.com/content/script.js"
        )
      ).toBe(false)
    }
  })

  it("matches start anchored patterns", () => {
    const rule = parseRule(
      "|https://example.com/ad.js"
    )

    expect(rule).not.toBeNull()

    if (rule) {
      expect(
        matchRule(
          rule,
          "https://example.com/ad.js"
        )
      ).toBe(true)

      expect(
        matchRule(
          rule,
          "https://other.com/https://example.com/ad.js"
        )
      ).toBe(false)
    }
  })

  it("matches end anchored patterns", () => {
    const rule = parseRule(
      "https://example.com/ad.js|"
    )

    expect(rule).not.toBeNull()

    if (rule) {
      expect(
        matchRule(
          rule,
          "https://example.com/ad.js"
        )
      ).toBe(true)

      expect(
        matchRule(
          rule,
          "https://example.com/ad.js?x=1"
        )
      ).toBe(false)
    }
  })

  it("supports wildcard patterns", () => {
    const rule = parseRule(
      "||ads.example.com/*/banner*.js"
    )

    expect(rule).not.toBeNull()

    if (rule) {
      expect(
        matchRule(
          rule,
          "https://ads.example.com/a/banner-main.js"
        )
      ).toBe(true)

      expect(
        matchRule(
          rule,
          "https://ads.example.com/x/y/banner-test.js"
        )
      ).toBe(true)

      expect(
        matchRule(
          rule,
          "https://ads.example.com/a/image.png"
        )
      ).toBe(false)
    }
  })

  it("supports separator anchors", () => {
    const rule = parseRule(
      "||ads.example.com^"
    )

    expect(rule).not.toBeNull()

    if (rule) {
      expect(
        matchRule(
          rule,
          "https://ads.example.com/path"
        )
      ).toBe(true)

      expect(
        matchRule(
          rule,
          "https://ads.example.com:443/path"
        )
      ).toBe(true)
    }
  })

  it("supports regex rules", () => {
    const rule = parseRule(
      "/ads-[0-9]+\\.js/"
    )

    expect(rule).not.toBeNull()

    if (rule) {
      expect(
        matchRule(
          rule,
          "https://example.com/ads-123.js"
        )
      ).toBe(true)

      expect(
        matchRule(
          rule,
          "https://example.com/script.js"
        )
      ).toBe(false)
    }
  })

  it("does not treat cosmetic rules as network rules", () => {
    const rule = parseRule(
      "example.com##.video-ads"
    )

    expect(rule).not.toBeNull()

    if (rule) {
      expect(
        matchRule(
          rule,
          "https://example.com/video-ads"
        )
      ).toBe(false)
    }
  })

  it("parses network rules", () => {
    const rule = parseRule("||ads.example.com^")

    expect(rule).toMatchObject({
      type: "network",
      pattern: "||ads.example.com^"
    })
  })

  it("parses exceptions", () => {
    const rule = parseRule("@@||example.com^")

    expect(rule?.type).toBe("exception")
  })

  it("parses cosmetic rules", () => {
    const rule = parseRule("example.com##.ad")

    expect(rule).toMatchObject({
      type: "cosmetic",
      selector: ".ad",
      domains: ["example.com"]
    })
  })

  it("ignores comments and empty lines", () => {
    expect(parseRules("! comment\n\n||ads.example.com^")).toHaveLength(1)
  })

  it("validates regular expressions", () => {
    const rule = parseRule("/[invalid/")

    expect(rule).not.toBeNull()

    if (rule) {
      expect(validateRule(rule).valid).toBe(false)
    }
  })

  it("matches domain rules", () => {
    const rule = parseRule("||ads.example.com^")

    expect(rule).not.toBeNull()

    if (rule) {
      expect(
        matchRule(rule, "https://ads.example.com/script.js")
      ).toBe(true)

      expect(
        matchRule(rule, "https://example.com/video")
      ).toBe(false)
    }
  })

  it("matches wildcard rules", () => {
    const rule = parseRule("*://ads.example.com/*")

    expect(rule).not.toBeNull()

    if (rule) {
      expect(
        matchRule(rule, "https://ads.example.com/a.js")
      ).toBe(true)
    }
  })

  it("respects domain options", () => {
    const rule = parseRule("||ads.example.com^$domain=example.com")

    expect(rule).not.toBeNull()

    if (rule) {
      expect(
        matchRule(
          rule,
          "https://ads.example.com/a",
          { initiator: "https://example.com/page" }
        )
      ).toBe(true)

      expect(
        matchRule(
          rule,
          "https://ads.example.com/a",
          { initiator: "https://other.com/page" }
        )
      ).toBe(false)
    }
  })

  it("supports excluded domains", () => {
    const rule = parseRule(
      "||ads.example.com^$domain=example.com|~sub.example.com"
    )

    expect(rule).not.toBeNull()

    if (rule) {
      expect(
        matchRule(
          rule,
          "https://ads.example.com/a",
          { initiator: "https://example.com/page" }
        )
      ).toBe(true)

      expect(
        matchRule(
          rule,
          "https://ads.example.com/a",
          { initiator: "https://sub.example.com/page" }
        )
      ).toBe(false)
    }
  })

  it("matches subdomains correctly", () => {
    const rule = parseRule("||example.com^")

    expect(rule).not.toBeNull()

    if (rule) {
      expect(
        matchRule(rule, "https://example.com/script.js")
      ).toBe(true)

      expect(
        matchRule(rule, "https://ads.example.com/script.js")
      ).toBe(true)

      expect(
        matchRule(rule, "https://notexample.com/script.js")
      ).toBe(false)
    }
  })

  it("supports start and end anchors", () => {
    const rule = parseRule("|https://example.com/ads/*|")

    expect(rule).not.toBeNull()

    if (rule) {
      expect(
        matchRule(rule, "https://example.com/ads/banner")
      ).toBe(true)

      expect(
        matchRule(rule, "https://other.example.com/ads/banner")
      ).toBe(false)
    }
  })

  it("supports regular expression rules", () => {
    const rule = parseRule("/ads[0-9]+/")

    expect(rule).not.toBeNull()

    if (rule) {
      expect(
        matchRule(rule, "https://example.com/ads123.js")
      ).toBe(true)

      expect(
        matchRule(rule, "https://example.com/content.js")
      ).toBe(false)
    }
  })

  it("allows a matching exception to override a network rule", () => {
    const block = parseRule(
      "||ads.example.com^"
    )

    const exception = parseRule(
      "@@||ads.example.com/allowed/"
    )

    expect(block).not.toBeNull()
    expect(exception).not.toBeNull()

    if (block && exception) {
      const engine = createRuleEngine([
        block,
        exception
      ])

      expect(
        engine.decide(
          "https://ads.example.com/file.js"
        ).blocked
      ).toBe(true)

      expect(
        engine.decide(
          "https://ads.example.com/allowed/file.js"
        ).blocked
      ).toBe(false)
    }
  })

  it("blocks and allows through the rule engine", () => {
    const engine = createRuleEngine(parseRules(`
      ||ads.example.com^
      @@||ads.example.com/allowed^
    `))

    expect(
      engine.decide("https://ads.example.com/script.js").blocked
    ).toBe(true)

    expect(
      engine.decide("https://ads.example.com/allowed/file.js").blocked
    ).toBe(false)
  })

  it("supports cosmetic rules", () => {
    const engine = createRuleEngine(parseRules(
      "example.com##.advertisement"
    ))

    expect(
      engine.getCosmeticRules("www.example.com")
    ).toHaveLength(1)

    expect(
      engine.getCosmeticRules("youtube.com")
    ).toHaveLength(0)
  })

  it("keeps cache bounded", () => {
    const cache = createRuleCache(2)
    const rules = parseRules("||example.com^")

    cache.set("a", rules)
    cache.set("b", rules)
    cache.set("c", rules)

    expect(cache.size()).toBe(2)
    expect(cache.get("a")).toBeNull()
    expect(cache.get("b")).not.toBeNull()
  })
})
