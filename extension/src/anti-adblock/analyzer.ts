export type AntiAdblockAnalysis = {
  detected: boolean
  confidence: number
  reasons: string[]
  elements: Element[]
}

const selectors = [
  "ytd-enforcement-message-view-model",
  ".yt-playability-error-supported-renderers",
  ".ytd-player-error-message-renderer",
  "#player-error-message-container"
]

const textPatterns = [
  /ad blocker/i,
  /adblock/i,
  /disable your ad blocker/i,
  /turn off your ad blocker/i,
  /ads? are blocked/i,
  /allow ads/i,
  /support youtube/i,
  /playback.*blocked/i,
  /video.*blocked/i
]

function collectElements(root: ParentNode): Element[] {
  const result: Element[] = []

  for (const selector of selectors) {
    try {
      result.push(...Array.from(root.querySelectorAll(selector)))
    } catch {
      continue
    }
  }

  return [...new Set(result)]
}

function hasBlockingText(element: Element): boolean {
  const text = element.textContent ?? ""
  return textPatterns.some(pattern => pattern.test(text))
}

export function analyzeAntiAdblock(
  root: ParentNode = document
): AntiAdblockAnalysis {
  const elements = collectElements(root)
  const reasons: string[] = []
  let confidence = 0
  let messageDetected = false

  for (const element of elements) {
    if (hasBlockingText(element)) {
      messageDetected = true
      break
    }
  }

  if (messageDetected) {
    confidence += 80
    reasons.push("anti-adblock-message")
  }

  const player = root.querySelector("#movie_player")

  if (
    player?.classList.contains("ad-showing") &&
    player?.classList.contains("ytp-ad-overlay-open")
  ) {
    confidence += 10
    reasons.push("blocked-player-state")
  }

  const error = root.querySelector(
    ".yt-playability-error-supported-renderers, .ytd-player-error-message-renderer, #player-error-message-container"
  )

  if (error && hasBlockingText(error)) {
    confidence += 20
    reasons.push("playability-error")
  }

  return {
    detected: confidence >= 70,
    confidence: Math.min(confidence, 100),
    reasons,
    elements
  }
}
