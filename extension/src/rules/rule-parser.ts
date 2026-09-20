export type RuleType = "network" | "cosmetic" | "exception"

export type ParsedRule = {
  raw: string
  type: RuleType
  pattern: string
  selector?: string
  domains: string[]
  isRegex: boolean
  important: boolean
  resourceTypes: string[]
  excludedResourceTypes: string[]
  thirdParty: boolean | null
}

const resourceAliases: Record<string, string> = {
  script: "script",
  image: "image",
  stylesheet: "stylesheet",
  css: "stylesheet",
  object: "object",
  object_subrequest: "object",
  subdocument: "sub_frame",
  sub_frame: "sub_frame",
  document: "main_frame",
  main_frame: "main_frame",
  xmlhttprequest: "xmlhttprequest",
  xhr: "xmlhttprequest",
  fetch: "xmlhttprequest",
  media: "media",
  font: "font",
  websocket: "websocket",
  ping: "ping",
  beacon: "ping",
  webtransport: "webtransport",
  other: "other",
  popup: "sub_frame",
  frame: "sub_frame"
}

function parseOptions(value: string) {
  const domains: string[] = []
  const resourceTypes: string[] = []
  const excludedResourceTypes: string[] = []

  let important = false
  let thirdParty: boolean | null = null

  for (const option of value.split(",")) {
    const normalized = option.trim().toLowerCase()

    if (!normalized) {
      continue
    }

    if (normalized === "important") {
      important = true
      continue
    }

    if (
      normalized === "third-party" ||
      normalized === "3p"
    ) {
      thirdParty = true
      continue
    }

    if (
      normalized === "~third-party" ||
      normalized === "1p"
    ) {
      thirdParty = false
      continue
    }

    if (normalized.startsWith("domain=")) {
      for (const domain of normalized.slice(7).split("|")) {
        const trimmed = domain.trim()

        if (trimmed) {
          domains.push(trimmed)
        }
      }

      continue
    }

    const excludedType = normalized.startsWith("~")
      ? resourceAliases[normalized.slice(1)]
      : undefined

    if (excludedType) {
      excludedResourceTypes.push(excludedType)
      continue
    }

    const type = resourceAliases[normalized]

    if (type) {
      resourceTypes.push(type)
    }
  }

  return {
    domains: [...new Set(domains)],
    important,
    resourceTypes: [...new Set(resourceTypes)],
    excludedResourceTypes: [...new Set(excludedResourceTypes)],
    thirdParty
  }
}

function parseNetworkRule(
  line: string,
  exception: boolean
): ParsedRule | null {
  const source = exception ? line.slice(2) : line
  const separator = source.indexOf("$")

  const pattern =
    separator >= 0
      ? source.slice(0, separator).trim()
      : source.trim()

  const options =
    separator >= 0
      ? source.slice(separator + 1)
      : ""

  if (!pattern) {
    return null
  }

  const parsed = parseOptions(options)

  return {
    raw: line,
    type: exception ? "exception" : "network",
    pattern,
    domains: parsed.domains,
    isRegex:
      pattern.startsWith("/") &&
      pattern.endsWith("/") &&
      pattern.length > 2,
    important: parsed.important,
    resourceTypes: parsed.resourceTypes,
    excludedResourceTypes: parsed.excludedResourceTypes,
    thirdParty: parsed.thirdParty
  }
}

export function parseRule(raw: string): ParsedRule | null {
  const line = raw.trim()

  if (!line || line.startsWith("!")) {
    return null
  }

  const cosmeticException = line.indexOf("#@#")

  if (cosmeticException >= 0) {
    const domain = line.slice(0, cosmeticException).trim()
    const selector = line.slice(cosmeticException + 3).trim()

    if (!selector) {
      return null
    }
    

    return {
      raw: line,
      type: "exception",
      pattern: domain,
      selector,
      domains: domain
        ? domain
            .split(",")
            .map(value => value.trim().toLowerCase())
            .filter(Boolean)
        : [],
      isRegex: false,
      important: false,
      resourceTypes: [],
      excludedResourceTypes: [],
      thirdParty: null
    }
  }

  const cosmetic = line.indexOf("##")

  if (cosmetic >= 0) {
    const domain = line.slice(0, cosmetic).trim()
    const selector = line.slice(cosmetic + 2).trim()

    if (!selector) {
      return null
    }

    return {
      raw: line,
      type: "cosmetic",
      pattern: domain,
      selector,
      domains: domain
        ? domain
            .split(",")
            .map(value => value.trim().toLowerCase())
            .filter(Boolean)
        : [],
      isRegex: false,
      important: false,
      resourceTypes: [],
      excludedResourceTypes: [],
      thirdParty: null
    }
  }

  if (line.startsWith("@@")) {
    return parseNetworkRule(line, true)
  }

  return parseNetworkRule(line, false)
}

export function parseRules(input: string): ParsedRule[] {
  return input
    .split(/\r?\n/)
    .map(parseRule)
    .filter(
      (rule): rule is ParsedRule =>
        rule !== null
    )
}
