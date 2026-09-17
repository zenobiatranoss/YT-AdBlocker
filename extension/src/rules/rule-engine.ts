import type { ParsedRule } from "./rule-parser"
import {
  matchCosmeticRule,
  matchRule,
  type RuleMatchContext
} from "./rule-matcher"

export type RuleDecision = {
  blocked: boolean
  exception: boolean
  matchedRule: ParsedRule | null
  reason: string
}

export type RuleEngine = {
  replace: (rules: ParsedRule[]) => void
  add: (rule: ParsedRule) => void
  remove: (raw: string) => boolean
  decide: (
    url: string,
    context?: RuleMatchContext
  ) => RuleDecision
  getCosmeticRules: (
    hostname: string
  ) => ParsedRule[]
  size: () => number
  clear: () => void
}

function ruleHost(rule: ParsedRule): string | null {
  if (!rule.pattern.startsWith("||")) {
    return null
  }

  const source = rule.pattern.slice(2)
  const end = source.search(/[\/^*|]/)

  const host = source
    .slice(0, end < 0 ? source.length : end)
    .replace(/^\*\./, "")
    .toLowerCase()

  return host || null
}

function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

function hostCandidates(hostname: string): string[] {
  const parts = hostname.split(".")
  const result: string[] = []

  for (let index = 0; index < parts.length - 1; index += 1) {
    result.push(parts.slice(index).join("."))
  }

  return result
}

export function createRuleEngine(
  initialRules: ParsedRule[] = []
): RuleEngine {
  let rules: ParsedRule[] = []
  let genericRules: ParsedRule[] = []
  let indexedRules = new Map<string, ParsedRule[]>()

  function rebuildIndex(): void {
    genericRules = []
    indexedRules = new Map<string, ParsedRule[]>()

    for (const rule of rules) {
      if (rule.type === "cosmetic") {
        continue
      }

      const host = ruleHost(rule)

      if (!host) {
        genericRules.push(rule)
        continue
      }

      const list = indexedRules.get(host) ?? []
      list.push(rule)
      indexedRules.set(host, list)
    }
  }

  function replace(next: ParsedRule[]): void {
    rules = [...next]
    rebuildIndex()
  }

  function add(rule: ParsedRule): void {
    if (rules.some(existing => existing.raw === rule.raw)) {
      return
    }

    rules.push(rule)
    rebuildIndex()
  }

  function remove(raw: string): boolean {
    const before = rules.length

    rules = rules.filter(rule => rule.raw !== raw)

    if (rules.length !== before) {
      rebuildIndex()
    }

    return rules.length !== before
  }

  function decide(
    url: string,
    context?: RuleMatchContext
  ): RuleDecision {
    const candidates = [...genericRules]
    const hostname = hostnameFromUrl(url)

    if (hostname) {
      const seen = new Set<ParsedRule>(candidates)

      for (const host of hostCandidates(hostname)) {
        for (const rule of indexedRules.get(host) ?? []) {
          if (!seen.has(rule)) {
            seen.add(rule)
            candidates.push(rule)
          }
        }
      }
    }

    const matches: ParsedRule[] = []
    const exceptions: ParsedRule[] = []

    for (const rule of candidates) {
      if (
        rule.type === "network" &&
        matchRule(rule, url, context)
      ) {
        matches.push(rule)
      }

      if (
        rule.type === "exception" &&
        !rule.selector &&
        matchRule(rule, url, context)
      ) {
        exceptions.push(rule)
      }
    }

    const importantMatch =
      matches.find(rule => rule.important) ?? null

    const normalMatch =
      matches.find(rule => !rule.important) ?? null

    const importantException =
      exceptions.find(rule => rule.important) ?? null

    const normalException =
      exceptions.find(rule => !rule.important) ?? null

    if (importantMatch) {
      return {
        blocked: true,
        exception: false,
        matchedRule: importantMatch,
        reason: "matched-important-network-rule"
      }
    }

    if (importantException) {
      return {
        blocked: false,
        exception: true,
        matchedRule: importantException,
        reason: "matched-important-exception"
      }
    }

    if (normalException) {
      return {
        blocked: false,
        exception: true,
        matchedRule: normalException,
        reason: "matched-exception"
      }
    }

    if (normalMatch) {
      return {
        blocked: true,
        exception: false,
        matchedRule: normalMatch,
        reason: "matched-network-rule"
      }
    }

    return {
      blocked: false,
      exception: false,
      matchedRule: null,
      reason: "no-match"
    }
  }

  function getCosmeticRules(hostname: string): ParsedRule[] {
    return rules.filter(
      rule =>
        rule.type === "cosmetic" &&
        matchCosmeticRule(rule, hostname)
    )
  }

  replace(initialRules)

  return {
    replace,
    add,
    remove,
    decide,
    getCosmeticRules,
    size: () => rules.length,
    clear: () => {
      rules = []
      rebuildIndex()
    }
  }
}
