import {
  analyzeAntiAdblock,
  type AntiAdblockAnalysis
} from "./analyzer"

export type AntiAdblockDetector = {
  start: () => void
  stop: () => void
  scan: () => AntiAdblockAnalysis
  getLastResult: () => AntiAdblockAnalysis | null
}

export function createAntiAdblockDetector(
  callback?: (result: AntiAdblockAnalysis) => void | Promise<void>
): AntiAdblockDetector {
  let observer: MutationObserver | null = null
  let running = false
  let lastDetected = false
  let lastResult: AntiAdblockAnalysis | null = null
  let scheduled = false

  function scan(): AntiAdblockAnalysis {
    const result = analyzeAntiAdblock()

    lastResult = result

    if (result.detected && !lastDetected) {
      lastDetected = true
      void callback?.(result)
    }

    if (!result.detected) {
      lastDetected = false
    }

    return result
  }

  function schedule(): void {
    if (!running || scheduled) {
      return
    }

    scheduled = true

    queueMicrotask(() => {
      scheduled = false

      if (running) {
        scan()
      }
    })
  }

  function start(): void {
    if (running) {
      return
    }

    running = true
    scan()

    observer = new MutationObserver(() => {
      schedule()
    })

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "class",
        "style",
        "hidden",
        "aria-hidden"
      ]
    })
  }

  function stop(): void {
    running = false
    scheduled = false
    lastDetected = false

    observer?.disconnect()
    observer = null
  }

  function getLastResult(): AntiAdblockAnalysis | null {
    return lastResult
  }

  return {
    start,
    stop,
    scan,
    getLastResult
  }
}
