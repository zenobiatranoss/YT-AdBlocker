import type { ParsedRule } from "../rules/rule-parser"
import type { RuleDecision } from "../rules/rule-engine"
import type { RuleMatchContext } from "../rules/rule-matcher"
import {
  createFilterEngine,
  type FilterEngine
} from "./filter-engine"

export type RequestFilter = {
  setRules: (
    rules: ParsedRule[]
  ) => void
  addRule: (
    rule: ParsedRule
  ) => void
  shouldBlock: (
    url: string,
    context?: RuleMatchContext
  ) => boolean
  decide: (
    url: string,
    context?: RuleMatchContext
  ) => RuleDecision
  clear: () => void
}

export function createRequestFilter(
  initialRules: ParsedRule[] = []
): RequestFilter {
  const engine:
    FilterEngine =
    createFilterEngine(
      initialRules
    )

  return {
    setRules:
      engine.replaceRules,

    addRule:
      engine.addRule,

    shouldBlock:
      (url, context) =>
        engine
          .decideRequest(
            url,
            context
          )
          .blocked,

    decide:
      engine.decideRequest,

    clear:
      engine.clear
  }
}
