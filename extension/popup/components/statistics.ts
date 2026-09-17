import type { ProtectionStatistics } from "../../src/shared/types"

export function renderStatistics(
  statistics: ProtectionStatistics,
  elements: {
    detections: HTMLElement
    blocked: HTMLElement
    displayed: HTMLElement
    playerResponses: HTMLElement
    placements: HTMLElement
    prevented: HTMLElement
    recoveries: HTMLElement
  }
): void {
  elements.detections.textContent =
    String(statistics.detections)

  elements.blocked.textContent =
    String(statistics.adRequestsBlocked)

  elements.displayed.textContent =
    String(statistics.adsDisplayed)

  elements.playerResponses.textContent =
    String(statistics.playerResponsesIntercepted)

  elements.placements.textContent =
    String(statistics.adPlacementsRemoved)

  elements.prevented.textContent =
    String(statistics.interruptionsPrevented)

  elements.recoveries.textContent =
    String(statistics.playbackRecoveries)
}

