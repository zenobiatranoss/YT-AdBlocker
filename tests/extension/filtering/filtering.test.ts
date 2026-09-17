import { describe, expect, it } from "vitest"
import { parseRules } from "../../../extension/src/rules/rule-parser"
import { createFilterEngine } from "../../../extension/src/filtering/filter-engine"
import { createRequestFilter } from "../../../extension/src/filtering/request-filter"
import {
  applyCosmeticFilters,
  getCosmeticFilters
} from "../../../extension/src/filtering/cosmetic-filter"
import {
  domainMatches,
  getHostname
} from "../../../extension/src/filtering/domain-filter"

describe("filtering", () => {
  const rules = parseRules(`
    ||ads.example.com^
    @@||ads.example.com/allowed^
    example.com##.ad
  `)

  it("filters requests", () => {
    const filter = createRequestFilter(rules)

    expect(
      filter.shouldBlock("https://ads.example.com/a.js")
    ).toBe(true)

    expect(
      filter.shouldBlock("https://example.com/video")
    ).toBe(false)
  })

  it("allows exception requests", () => {
    const filter = createRequestFilter(rules)

    expect(
      filter.shouldBlock("https://ads.example.com/allowed/file.js")
    ).toBe(false)
  })

  it("returns hostname", () => {
    expect(
      getHostname("https://www.example.com/a")
    ).toBe("www.example.com")
  })

  it("matches domains", () => {
    expect(
      domainMatches("www.example.com", "example.com")
    ).toBe(true)

    expect(
      domainMatches("example.org", "example.com")
    ).toBe(false)
  })

  it("returns cosmetic selectors", () => {
    const result = getCosmeticFilters(
      "www.example.com",
      rules
    )

    expect(result.selectors).toEqual([".ad"])
  })

  it("removes cosmetic elements", () => {
    document.body.innerHTML = `
      <div class="ad">remove</div>
      <div class="content">keep</div>
    `

    const removed = applyCosmeticFilters(
      document,
      [".ad"]
    )

    expect(removed).toBe(1)
    expect(document.querySelector(".ad")).toBeNull()
    expect(document.querySelector(".content")).not.toBeNull()
  })

  it("applies cosmetics through the filter engine", () => {
    document.body.innerHTML = `
      <div class="ad">remove</div>
      <div class="content">keep</div>
    `

    const engine = createFilterEngine(rules)

    const removed = engine.applyCosmetics(
      document,
      "www.example.com"
    )

    expect(removed).toBe(1)
    expect(document.querySelector(".ad")).toBeNull()
  })
})
