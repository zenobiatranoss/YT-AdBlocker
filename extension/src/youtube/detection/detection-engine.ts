import type {
  DetectionResult,
  PlaybackSnapshot
} from "../../shared/types"

import {
  detectAd
} from "./ad-detector"

import {
  analyzePlaybackBehavior,
  type BehaviorSnapshot
} from "./behavior-detector"

export type DetectionListener = (
  result: DetectionResult
) => void | Promise<void>

export type DetectionEngine = {
  start: () => void
  stop: () => void
  scan: () => DetectionResult
  analyzeBehavior: (
    before: BehaviorSnapshot,
    after: BehaviorSnapshot
  ) => DetectionResult
  updatePlayback: (
    snapshot: PlaybackSnapshot
  ) => DetectionResult | null
}

export function createDetectionEngine(
  listener?: DetectionListener
): DetectionEngine {
  let observer: MutationObserver | null = null
  let running = false
  let lastDetected = false
  let previousPlayback: (BehaviorSnapshot & {
    videoId?: string | null
  }) | null = null

  function emit(
    detection: DetectionResult
  ): void {
    if (detection.detected && !lastDetected) {
      lastDetected = true
      void listener?.(detection)
    }

    if (!detection.detected) {
      lastDetected = false
    }
  }

  function scan(): DetectionResult {
    const detection = detectAd().result

    emit(detection)

    return detection
  }

  function analyzeBehavior(
    before: BehaviorSnapshot,
    after: BehaviorSnapshot
  ): DetectionResult {
    const behavior = analyzePlaybackBehavior(
      before,
      after
    )

    const detection: DetectionResult = {
      detected: behavior.suspicious,
      confidence: Math.min(behavior.score, 100),
      source: "behavior",
      detectedAt: Date.now()
    }

    emit(detection)

    return detection
  }

  function updatePlayback(
    snapshot: PlaybackSnapshot
  ): DetectionResult | null {
    const current: BehaviorSnapshot & {
      videoId?: string | null
    } = {
      currentTime: snapshot.currentTime,
      paused: snapshot.paused,
      seeking: snapshot.seeking,
      playbackRate: snapshot.playbackRate,
      videoId: snapshot.videoId
    }

    const previous = previousPlayback

    if (
      previous &&
      snapshot.videoId !== null &&
      snapshot.videoId !== undefined &&
      previous.videoId !== undefined &&
      previous.videoId !== snapshot.videoId
    ) {
      previousPlayback = current
      return null
    }

    previousPlayback = current

    if (!previous) {
      return null
    }

    return analyzeBehavior(
      previous,
      current
    )
  }

  function start(): void {
    if (running) {
      return
    }

    running = true
    previousPlayback = null
    scan()

    observer = new MutationObserver(() => {
      scan()
    })

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "class",
        "data-ad-showing"
      ]
    })
  }

  function stop(): void {
    running = false
    observer?.disconnect()
    observer = null
    lastDetected = false
    previousPlayback = null
  }

  return {
    start,
    stop,
    scan,
    analyzeBehavior,
    updatePlayback
  }
}
