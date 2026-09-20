import type { AntiAdblockAnalysis } from "./analyzer"
import type { AntiAdblockRecoveryResult } from "./recovery"

export type AntiAdblockResponse = {
  handled: boolean
  recovery: AntiAdblockRecoveryResult | null
}

const lockClassPatterns = [
  /no-?scroll/i,
  /modal-?open/i,
  /overlay-?open/i,
  /dialog-?open/i,
  /popup-?open/i
]

function clearInteractionLock(): void {
  const targets = [document.documentElement, document.body]

  for (const target of targets) {
    if (!target) {
      continue
    }

    if (target.style.overflow === "hidden") {
      target.style.overflow = ""
    }

    if (target.style.position === "fixed") {
      target.style.position = ""
    }

    for (const className of Array.from(target.classList)) {
      if (lockClassPatterns.some(pattern => pattern.test(className))) {
        target.classList.remove(className)
      }
    }
  }
}

function removeBlockingElements(
  elements: Element[]
): void {
  const backdropSelector = [
    "tp-yt-iron-overlay-backdrop",
    "ytd-popup-container",
    ".ytd-popup-container"
  ].join(", ")

  for (const element of elements) {
    let backdrop: Element | null = null

    try {
      backdrop = element.closest(backdropSelector)
    } catch {
      backdrop = null
    }

    element.remove()

    if (backdrop && backdrop !== element) {
      backdrop.remove()
    }
  }

  try {
    document
      .querySelectorAll("tp-yt-iron-overlay-backdrop")
      .forEach(node => node.remove())
  } catch {
    return
  }
}

export async function handleAntiAdblock(
  analysis: AntiAdblockAnalysis,
  recover: () => Promise<AntiAdblockRecoveryResult>
): Promise<AntiAdblockResponse> {
  if (!analysis.detected) {
    return {
      handled: false,
      recovery: null
    }
  }

  removeBlockingElements(analysis.elements)
  clearInteractionLock()

  const recovery = await recover()

  return {
    handled: true,
    recovery
  }
}
