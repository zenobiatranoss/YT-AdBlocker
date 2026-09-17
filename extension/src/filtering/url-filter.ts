import type { ParsedRule } from "../rules/rule-parser"
import {
  matchRule,
  type RuleMatchContext
} from "../rules/rule-matcher"

export type UrlFilterResult = {
  matched: boolean
  rule: ParsedRule | null
}

export function filterUrl(
  url: string,
  rules: ParsedRule[],
  context?: RuleMatchContext
): UrlFilterResult {
  for (const rule of rules) {
    if (
      rule.type === "network" &&
      matchRule(rule, url, context)
    ) {
      return {
        matched: true,
        rule
      }
    }
  }

  return {
    matched: false,
    rule: null
  }
}
