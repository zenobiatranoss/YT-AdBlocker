import type { DetectionResult } from "../../shared/types"
import { detectAdElements } from "./dom-detector"
import { detectPlayerAdState } from "./player-detector"

export type AdDetectionDetails = {
  result: DetectionResult
  domMatches: string[]
  playerReasons: string[]
}

export function detectAd(
  root: ParentNode = document
): AdDetectionDetails {
  const dom = detectAdElements(root)
  const player = detectPlayerAdState(root)

  let confidence = 0

  if (dom.detected) {
    confidence += Math.min(dom.matches.length * 25, 50)
  }

  if (player.detected) {
    confidence += Math.min(player.reasons.length * 35, 50)
  }

  const detected = confidence >= 35

  let source: DetectionResult["source"] = "dom"

  if (player.detected && dom.detected) {
    source = "player"
  } else if (player.detected) {
    source = "player"
  }

  return {
    result: {
      detected,
      confidence: Math.min(confidence, 100),
      source,
      detectedAt: Date.now()
    },
    domMatches: dom.matches,
    playerReasons: player.reasons
  }
}
