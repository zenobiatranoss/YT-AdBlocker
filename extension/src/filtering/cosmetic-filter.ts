import type { ParsedRule } from "../rules/rule-parser"
import { matchCosmeticRule } from "../rules/rule-matcher"

export type CosmeticFilterResult = {
  selectors: string[]
  rules: ParsedRule[]
}

export function getCosmeticFilters(
  hostname: string,
  rules: ParsedRule[]
): CosmeticFilterResult {
  const matchedRules = rules.filter(rule =>
    rule.type === "cosmetic" &&
    matchCosmeticRule(rule, hostname)
  )

  return {
    selectors: matchedRules
      .map(rule => rule.selector)
      .filter((selector): selector is string => Boolean(selector)),
    rules: matchedRules
  }
}

export function applyCosmeticFilters(
  root: ParentNode,
  selectors: string[]
): number {
  let removed = 0

  for (const selector of selectors) {
    let elements: Element[]

    try {
      elements = Array.from(root.querySelectorAll(selector))
    } catch {
      continue
    }

    for (const element of elements) {
      element.remove()
      removed++
    }
  }

  return removed
}
