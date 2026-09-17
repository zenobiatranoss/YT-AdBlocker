import type { ParsedRule } from "../rules/rule-parser"
import {
  matchRule,
  type RuleMatchContext
} from "../rules/rule-matcher"

export type ExceptionManager = {
  setRules: (rules: ParsedRule[]) => void
  add: (rule: ParsedRule) => void
  isExcepted: (
    url: string,
    context?: RuleMatchContext
  ) => boolean
  clear: () => void
}

export function createExceptionManager(): ExceptionManager {
  let rules: ParsedRule[] = []

  function setRules(next: ParsedRule[]): void {
    rules = next.filter(
      rule => rule.type === "exception"
    )
  }

  function add(rule: ParsedRule): void {
    if (
      rule.type === "exception" &&
      !rules.some(existing => existing.raw === rule.raw)
    ) {
      rules.push(rule)
    }
  }

  return {
    setRules,
    add,
    isExcepted: (
      url,
      context
    ) =>
      rules.some(rule =>
        !rule.selector &&
        matchRule(rule, url, context)
      ),
    clear: () => {
      rules = []
    }
  }
}
