import { getSettings } from "../storage/settings"
import { recordBlockedRequest } from "../storage/statistics"
import { parseRules, type ParsedRule } from "../rules/rule-parser"
import { youtubeRules } from "../generated/youtube-rules"
import { generalRules } from "../generated/general-rules"
import {
  createRequestFilter,
  type RequestFilter
} from "../filtering/request-filter"

const rules = parseRules(
  [...youtubeRules, ...generalRules].join("\n")
).filter(
  rule =>
    rule.type === "network" ||
    rule.type === "exception"
)

let filter: RequestFilter | null = null
let installed = false

export type CachedDecision = {
  blocked: boolean
  rule: string
  reason: string
  exception: boolean
  expiresAt: number
}

const decisionCache = new Map<string, CachedDecision>()

const DECISION_CACHE_TTL = 3000
const MAX_CACHE_ENTRIES = 1024

const requestUrls = [
  "*://www.youtube.com/*",
  "*://youtube.com/*",
  "*://*.youtube.com/*",
  "*://googlevideo.com/*",
  "*://*.googlevideo.com/*",
  "*://doubleclick.net/*",
  "*://*.doubleclick.net/*",
  "*://googlesyndication.com/*",
  "*://*.googlesyndication.com/*",
  "*://googleadservices.com/*",
  "*://*.googleadservices.com/*",
  "*://adservice.google.com/*",
  "*://*.adservice.google.com/*",
  "*://imasdk.googleapis.com/*",
  "*://*.imasdk.googleapis.com/*",
  "*://googletagservices.com/*",
  "*://*.googletagservices.com/*",
  "*://googletagmanager.com/*",
  "*://*.googletagmanager.com/*",
  "*://2mdn.net/*",
  "*://*.2mdn.net/*"
]

export function getRequestUrls(
  inputRules: ParsedRule[] = rules
): string[] {
  const result = new Set<string>([
    "*://www.youtube.com/*",
    "*://youtube.com/*",
    "*://*.youtube.com/*"
  ])

  for (const rule of inputRules) {
    if (
      rule.type !== "network" ||
      !rule.pattern.startsWith("||")
    ) {
      continue
    }

    const source = rule.pattern.slice(2)
    const end = source.search(/[\/^*|]/)
    const host = source
      .slice(0, end < 0 ? source.length : end)
      .replace(/^\*\./, "")
      .toLowerCase()

    if (!host || host.includes("*")) {
      continue
    }

    result.add(`*://${host}/*`)
    result.add(`*://*.${host}/*`)
  }

  return [...result]
}

function cacheKey(
  details: chrome.webRequest.OnBeforeRequestDetails
): string {
  return [
    details.method,
    details.type,
    details.initiator ?? "",
    details.url
  ].join("|")
}

function getCachedDecision(
  key: string
): CachedDecision | null {
  const cached = decisionCache.get(key)

  if (!cached) {
    return null
  }

  if (cached.expiresAt <= Date.now()) {
    decisionCache.delete(key)
    return null
  }

  decisionCache.delete(key)
  decisionCache.set(key, cached)

  return cached
}

function cacheDecision(
  key: string,
  decision: CachedDecision
): void {
  decisionCache.delete(key)
  decisionCache.set(key, decision)

  while (decisionCache.size > MAX_CACHE_ENTRIES) {
    const first = decisionCache.keys().next().value

    if (first === undefined) {
      break
    }

    decisionCache.delete(first)
  }
}

function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

function isYouTubeUrl(url: string): boolean {
  const hostname = hostnameFromUrl(url)

  if (!hostname) {
    return false
  }

  return (
    hostname === "youtube.com" ||
    hostname === "www.youtube.com" ||
    hostname.endsWith(".youtube.com")
  )
}

function isGoogleVideoUrl(url: string): boolean {
  const hostname = hostnameFromUrl(url)

  if (!hostname) {
    return false
  }

  return (
    hostname === "googlevideo.com" ||
    hostname.endsWith(".googlevideo.com")
  )
}

function isKnownAdHost(url: string): boolean {
  const hostname = hostnameFromUrl(url)

  if (!hostname) {
    return false
  }

  const hosts = [
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "adservice.google.com",
    "imasdk.googleapis.com",
    "googletagservices.com",
    "2mdn.net"
  ]

  return hosts.some(
    host =>
      hostname === host ||
      hostname.endsWith(`.${host}`)
  )
}

function isYouTubeAdEndpoint(url: string): boolean {
  try {
    const parsed = new URL(url)

    if (
      parsed.hostname !== "www.youtube.com" &&
      parsed.hostname !== "youtube.com"
    ) {
      return false
    }

    return (
      parsed.pathname === "/get_midroll_info" ||
      parsed.pathname === "/api/stats/ads" ||
      parsed.pathname === "/ad_data" ||
      parsed.pathname === "/pagead/adview" ||
      parsed.pathname === "/pagead/interaction"
    )
  } catch {
    return false
  }
}

function isAdRelatedUrl(url: string): boolean {
  return (
    isKnownAdHost(url) ||
    isYouTubeAdEndpoint(url)
  )
}

function shouldCheckRules(
  details: chrome.webRequest.OnBeforeRequestDetails
): boolean {
  if (
    isYouTubeUrl(details.url) ||
    isGoogleVideoUrl(details.url) ||
    isAdRelatedUrl(details.url)
  ) {
    return true
  }

  const initiator = details.initiator ?? ""

  return (
    isYouTubeUrl(initiator) ||
    isGoogleVideoUrl(initiator)
  )
}

function createMatchContext(
  details: chrome.webRequest.OnBeforeRequestDetails
) {
  return {
    initiator: details.initiator,
    resourceType: details.type,
    method: details.method
  }
}

function recordBlocked(
  details: chrome.webRequest.OnBeforeRequestDetails,
  rule: string,
  reason: string
): void {
  const event = {
    timestamp: Date.now(),
    url: details.url,
    resourceType: details.type,
    method: details.method,
    initiator: details.initiator ?? "",
    rule,
    reason
  }

  console.log("[YT-AdBlocker][BLOCKED]", event)

  void recordBlockedRequest(event).catch(() => {})
}

function localDecision(
  details: chrome.webRequest.OnBeforeRequestDetails
): CachedDecision {
  if (!filter) {
    return {
      blocked: false,
      rule: "",
      reason: "filter-unavailable",
      exception: false,
      expiresAt: Date.now() + DECISION_CACHE_TTL
    }
  }

  const decision = filter.decide(
    details.url,
    createMatchContext(details)
  )

  const rule = decision.matchedRule?.raw ?? ""

  const result: CachedDecision = {
    blocked: decision.blocked,
    rule,
    reason: decision.reason,
    exception: decision.exception,
    expiresAt: Date.now() + DECISION_CACHE_TTL
  }

  if (
    isAdRelatedUrl(details.url) ||
    decision.blocked
  ) {
    console.log(
      "[YT-AdBlocker][request]",
      {
        url: details.url,
        type: details.type,
        method: details.method,
        initiator: details.initiator ?? "",
        blocked: decision.blocked,
        exception: decision.exception,
        rule,
        reason: decision.reason
      }
    )
  }

  return result
}

const baitScriptRedirects: Array<{
  match: (url: string) => boolean
  redirectUrl: string
}> = [
  {
    match: url =>
      url.includes("static.doubleclick.net/instream/ad_status.js"),
    redirectUrl: "data:application/javascript,"
  },
  {
    match: url =>
      url.includes("googleads.g.doubleclick.net/pagead/id"),
    redirectUrl: "data:application/javascript,"
  }
]

function getBaitScriptRedirect(url: string): string | null {
  for (const entry of baitScriptRedirects) {
    if (entry.match(url)) {
      return entry.redirectUrl
    }
  }

  return null
}

function handleRequest(
  details: chrome.webRequest.OnBeforeRequestDetails
): chrome.webRequest.BlockingResponse {
  const baitRedirect = getBaitScriptRedirect(details.url)

  if (baitRedirect) {
    return {
      redirectUrl: baitRedirect
    }
  }

  if (!filter || !shouldCheckRules(details)) {
    return {}
  }

  const key = cacheKey(details)
  const cached = getCachedDecision(key)

  if (cached) {
    if (!cached.blocked) {
      return {}
    }

    recordBlocked(
      details,
      cached.rule || "cached-rule-match",
      cached.reason || "cached-network-rule"
    )

    return {
      cancel: true
    }
  }

  const decision = localDecision(details)

  cacheDecision(key, decision)

  if (!decision.blocked) {
    return {}
  }

  recordBlocked(
    details,
    decision.rule || "matched-rule",
    decision.reason
  )

  return {
    cancel: true
  }
}

export async function startRequestFiltering(): Promise<void> {
  if (installed) {
    return
  }

  if (
    typeof chrome === "undefined" ||
    !chrome.webRequest?.onBeforeRequest
  ) {
    return
  }

  const settings = await getSettings()

  if (!settings.enabled) {
    return
  }

  filter = createRequestFilter(rules)

  chrome.webRequest.onBeforeRequest.addListener(
    handleRequest,
    {
      urls: requestUrls
    },
    ["blocking"]
  )

  installed = true

  console.log(
    "[YT-AdBlocker] request filtering installed",
    {
      rules: rules.length,
      urls: requestUrls.length
    }
  )
}

export function stopRequestFiltering(): void {
  if (!installed) {
    return
  }

  if (
    typeof chrome !== "undefined" &&
    chrome.webRequest?.onBeforeRequest
  ) {
    chrome.webRequest.onBeforeRequest.removeListener(
      handleRequest
    )
  }

  filter?.clear()
  filter = null
  decisionCache.clear()
  installed = false
}
