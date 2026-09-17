import type { ParsedRule } from "./rule-parser"

export type RuleValidation = {
  valid: boolean
  errors: string[]
}

function validDomain(value: string): boolean {
  if (!value) {
    return false
  }

  const domain = value.startsWith("~") ? value.slice(1) : value

  if (!domain) {
    return false
  }

  return /^[a-z0-9*.-]+$/i.test(domain)
}

export function validateRule(rule: ParsedRule): RuleValidation {
  const errors: string[] = []

  if (!rule.raw.trim()) {
    errors.push("Rule is empty")
  }

  if (!rule.pattern && rule.type !== "cosmetic" && rule.type !== "exception") {
    errors.push("Rule pattern is empty")
  }

  if (rule.type === "cosmetic" && !rule.selector) {
    errors.push("Cosmetic selector is empty")
  }

  if (rule.isRegex) {
    try {
      new RegExp(rule.pattern.slice(1, -1))
    } catch {
      errors.push("Invalid regular expression")
    }
  }

  for (const domain of rule.domains) {
    if (!validDomain(domain)) {
      errors.push(`Invalid domain: ${domain}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function validateRules(rules: ParsedRule[]): RuleValidation {
  const errors: string[] = []

  for (const rule of rules) {
    const result = validateRule(rule)

    if (!result.valid) {
      errors.push(...result.errors)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
