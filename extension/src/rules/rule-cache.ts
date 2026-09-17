import type { ParsedRule } from "./rule-parser"

export type RuleCache = {
  get: (key: string) => ParsedRule[] | null
  set: (key: string, rules: ParsedRule[]) => void
  delete: (key: string) => void
  clear: () => void
  size: () => number
}

export function createRuleCache(
  maximumSize = 100
): RuleCache {
  const cache = new Map<string, ParsedRule[]>()

  function get(key: string): ParsedRule[] | null {
    const value = cache.get(key)

    if (!value) {
      return null
    }

    cache.delete(key)
    cache.set(key, value)

    return [...value]
  }

  function set(key: string, rules: ParsedRule[]): void {
    cache.delete(key)
    cache.set(key, [...rules])

    while (cache.size > maximumSize) {
      const oldest = cache.keys().next().value

      if (oldest === undefined) {
        break
      }

      cache.delete(oldest)
    }
  }

  return {
    get,
    set,
    delete: key => cache.delete(key),
    clear: () => cache.clear(),
    size: () => cache.size
  }
}
