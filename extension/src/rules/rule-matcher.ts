import type { ParsedRule } from "./rule-parser"

export type RuleMatchContext = {
  initiator?: string
  resourceType?: string
  method?: string
  thirdParty?: boolean
}

function escapeRegex(value: string): string {
  return value.replace(
    /[.+?^${}()|[\]\\]/g,
    "\\$&"
  )
}

function domainMatches(
  hostname: string,
  domain: string
): boolean {
  const host = hostname.toLowerCase().replace(/^\.+/, "")
  const target = domain.toLowerCase().replace(/^\.+/, "")

  return host === target || host.endsWith(`.${target}`)
}

function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

function getSite(hostname: string): string {
  const parts = hostname.split(".").filter(Boolean)

  if (parts.length <= 2) {
    return parts.join(".")
  }

  const secondLevelSuffixes = new Set([
    "co.uk",
    "org.uk",
    "ac.uk",
    "gov.uk",
    "com.au",
    "net.au",
    "org.au",
    "co.jp",
    "co.nz",
    "com.br",
    "com.cn",
    "com.mx",
    "co.in"
  ])

  const suffix = parts.slice(-2).join("")

  if (secondLevelSuffixes.has(parts.slice(-2).join("."))) {
    return parts.slice(-3).join(".")
  }

  return suffix
}

function getThirdParty(
  url: string,
  initiator?: string
): boolean | null {
  if (!initiator) {
    return null
  }

  const targetHost = hostnameFromUrl(url)
  const sourceHost = hostnameFromUrl(initiator)

  if (!targetHost || !sourceHost) {
    return null
  }

  return getSite(targetHost) !== getSite(sourceHost)
}

function matchesDomainContext(
  domains: string[],
  context?: RuleMatchContext
): boolean {
  if (domains.length === 0) {
    return true
  }

  const initiator = context?.initiator

  if (!initiator) {
    return false
  }

  const hostname = hostnameFromUrl(initiator)

  if (!hostname) {
    return false
  }

  let included = false
  let hasIncludedDomain = false

  for (const domain of domains) {
    if (!domain) {
      continue
    }

    if (domain.startsWith("~")) {
      if (
        domainMatches(
          hostname,
          domain.slice(1)
        )
      ) {
        return false
      }

      continue
    }

    hasIncludedDomain = true

    if (domainMatches(hostname, domain)) {
      included = true
    }
  }

  return hasIncludedDomain ? included : true
}

function matchesRequestOptions(
  rule: ParsedRule,
  url: string,
  context?: RuleMatchContext
): boolean {
  if (rule.resourceTypes.length > 0) {
    if (
      !context?.resourceType ||
      !rule.resourceTypes.includes(context.resourceType)
    ) {
      return false
    }
  }

  if (
    context?.resourceType &&
    rule.excludedResourceTypes.includes(context.resourceType)
  ) {
    return false
  }

  if (rule.thirdParty !== null) {
    const thirdParty =
      context?.thirdParty ??
      getThirdParty(url, context?.initiator)

    if (
      thirdParty === null ||
      thirdParty !== rule.thirdParty
    ) {
      return false
    }
  }

  return true
}

function matchRegexRule(
  pattern: string,
  target: string
): boolean {
  try {
    return new RegExp(
      pattern.slice(1, -1),
      "i"
    ).test(target)
  } catch {
    return false
  }
}

function matchPattern(
  pattern: string,
  target: string
): boolean {
  let source = pattern

  const startAnchored = source.startsWith("|")
  const endAnchored = source.endsWith("|")

  if (startAnchored) {
    source = source.slice(1)
  }

  if (endAnchored) {
    source = source.slice(0, -1)
  }

  let regexSource = ""

  for (const char of source) {
    if (char === "*") {
      regexSource += ".*"
      continue
    }

    if (char === "^") {
      regexSource += "(?:[^a-zA-Z0-9._%-]|$)"
      continue
    }

    regexSource += escapeRegex(char)
  }

  return new RegExp(
    `${startAnchored ? "^" : ""}${regexSource}${endAnchored ? "$" : ""}`,
    "i"
  ).test(target)
}

function matchDomainAnchor(
  pattern: string,
  target: string
): boolean {
  const source = pattern.slice(2)

  let hostEnd = source.search(/[\/^*|]/)

  if (hostEnd < 0) {
    hostEnd = source.length
  }

  const hostPattern = source
    .slice(0, hostEnd)
    .toLowerCase()

  const hostname = hostnameFromUrl(target)

  if (
    !hostPattern ||
    !hostname ||
    !domainMatches(hostname, hostPattern)
  ) {
    return false
  }

  const remainder = source.slice(hostEnd)

  if (!remainder || remainder === "^") {
    return true
  }

  let targetUrl: URL

  try {
    targetUrl = new URL(target)
  } catch {
    return false
  }

  const targetPath =
    `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`

  if (remainder.startsWith("^")) {
    return matchPattern(
      remainder.slice(1),
      targetPath
    )
  }

  return matchPattern(
    remainder,
    targetPath
  )
}

export function matchRule(
  rule: ParsedRule,
  url: string,
  context?: RuleMatchContext
): boolean {
  if (rule.type === "cosmetic") {
    return false
  }

  if (!matchesDomainContext(rule.domains, context)) {
    return false
  }

  if (!matchesRequestOptions(rule, url, context)) {
    return false
  }

  const target = url.trim().toLowerCase()

  if (rule.isRegex) {
    return matchRegexRule(rule.pattern, target)
  }

  if (rule.pattern.startsWith("||")) {
    return matchDomainAnchor(rule.pattern, target)
  }

  return matchPattern(rule.pattern, target)
}

export function matchCosmeticRule(
  rule: ParsedRule,
  hostname: string
): boolean {
  if (rule.type !== "cosmetic") {
    return false
  }

  if (rule.domains.length === 0) {
    return true
  }

  const normalized = hostname.toLowerCase()

  let included = false
  let hasIncludedDomain = false

  for (const domain of rule.domains) {
    if (domain.startsWith("~")) {
      if (
        domainMatches(
          normalized,
          domain.slice(1)
        )
      ) {
        return false
      }

      continue
    }

    hasIncludedDomain = true

    if (domainMatches(normalized, domain)) {
      included = true
    }
  }

  return hasIncludedDomain ? included : true
}
