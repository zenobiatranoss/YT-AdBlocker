import type { ParsedRule } from "../rules/rule-parser"
import {
  createRuleEngine,
  type RuleDecision,
  type RuleEngine
} from "../rules/rule-engine"
import type { RuleMatchContext } from "../rules/rule-matcher"
import {
  applyCosmeticFilters,
  getCosmeticFilters
} from "./cosmetic-filter"

export type FilterEngine = {
  replaceRules: (rules: ParsedRule[]) => void
  addRule: (rule: ParsedRule) => void
  decideRequest: (
    url: string,
    context?: RuleMatchContext
  ) => RuleDecision
  applyCosmetics: (
    root?: ParentNode,
    hostname?: string
  ) => number
  getRuleCount: () => number
  clear: () => void
}

export function createFilterEngine(
  initialRules: ParsedRule[] = []
): FilterEngine {
  const engine: RuleEngine = createRuleEngine(initialRules)

  function applyCosmetics(
    root: ParentNode = document,
    hostname = window.location.hostname
  ): number {
    const rules = engine.getCosmeticRules(hostname)
    const result = getCosmeticFilters(hostname, rules)

    return applyCosmeticFilters(
      root,
      result.selectors
    )
  }

  return {
    replaceRules: engine.replace,
    addRule: engine.add,
    decideRequest: engine.decide,
    applyCosmetics,
    getRuleCount: engine.size,
    clear: engine.clear
  }
}
