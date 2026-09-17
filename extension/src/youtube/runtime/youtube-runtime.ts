import type {
  DetectionResult,
  PlaybackSnapshot
} from "../../shared/types"

import {
  createFilterEngine,
  type FilterEngine
} from "../../filtering/filter-engine"

import {
  parseRules
} from "../../rules/rule-parser"

import {
  youtubeRules
} from "../../generated/youtube-rules"

import {
  createPlayerMonitor
} from "../player/player-monitor"

import {
  listenToPlayer,
  type PlayerEventListener
} from "../player/player-events"

import {
  capturePlaybackSnapshot
} from "../player/player-state"

import {
  createDetectionEngine
} from "../detection/detection-engine"

import {
  createRecoveryEngine,
  type RecoveryResult
} from "../recovery/recovery-engine"

import {
  createNavigationRecovery
} from "../recovery/navigation-recovery"

import {
  createAntiAdblockDetector
} from "../../anti-adblock/detector"

import {
  createAntiAdblockRecovery
} from "../../anti-adblock/recovery"

import {
  handleAntiAdblock
} from "../../anti-adblock/response-handler"

import {
  sendMessage
} from "../../messaging/client"


import {
  createAdSkipper,
  type AdSkipper
} from "../ads/ad-skipper"

const defaultRules = parseRules(
  youtubeRules.join("\n")
)

export type YouTubeRuntime = {
  start: () => void
  stop: () => void
  getSnapshot: () => PlaybackSnapshot | null
  getLastDetection: () => DetectionResult | null
  getLastRecovery: () => RecoveryResult | null
  getRemovedElements: () => number
}

export function createYouTubeRuntime(): YouTubeRuntime {
  let running = false
  let video: HTMLVideoElement | null = null
  let lastSnapshot: PlaybackSnapshot | null = null
  let lastDetection: DetectionResult | null = null
  let lastRecovery: RecoveryResult | null = null
  let removedElements = 0
  let stopPlayerEvents: (() => void) | null = null
  let recoveryRunning = false
  let antiAdblockRunning = false
  let interruptionActive = false

  const adSkipper: AdSkipper = createAdSkipper()

  const filters: FilterEngine = createFilterEngine(defaultRules)

  function applyCosmetics(): void {
    if (!running) {
      return
    }

    removedElements += filters.applyCosmetics(
      document,
      window.location.hostname
    )
  }

  const antiAdblockRecovery = createAntiAdblockRecovery(
    () => lastSnapshot
  )

  const antiAdblock = createAntiAdblockDetector(async analysis => {
    if (antiAdblockRunning) {
      return
    }

    antiAdblockRunning = true

    try {
      const result = await handleAntiAdblock(
        analysis,
        () => antiAdblockRecovery.recover()
      )

      if (result.recovery?.recovered) {
        void sendMessage({
          type: "playback-recovery"
        }).catch(() => {})
      }
    } finally {
      antiAdblockRunning = false
    }
  })

  const recovery = createRecoveryEngine(result => {
    lastRecovery = result

    if (result.recovered) {
      void sendMessage({
        type: "playback-recovery"
      }).catch(() => {})
    }
  })

  const detection = createDetectionEngine(async result => {
    lastDetection = result

    void sendMessage({
      type: "detection",
      result
    }).catch(() => {})

    if (!result.detected || recoveryRunning) {
      return
    }

    const adShowing =
      Boolean(document.querySelector(".ad-showing")) ||
      Boolean(document.querySelector(".video-ads.ytp-ad-module"))

    if (adShowing) {
      return
    }

    recoveryRunning = true

    try {
      await recovery.recover(result)
    } finally {
      recoveryRunning = false
    }
  })

  const monitor = createPlayerMonitor(nextVideo => {
    stopPlayerEvents?.()
    stopPlayerEvents = null

    video = nextVideo
    interruptionActive = false

    if (!video) {
      lastSnapshot = null
      recovery.clear()
      return
    }

    const listener: PlayerEventListener = () => {
      if (!video || !running) {
        return
      }

      const interruption =
        Boolean(document.querySelector(".ad-showing")) ||
        Boolean(document.querySelector(".video-ads.ytp-ad-module"))

      const snapshot = capturePlaybackSnapshot(video)

      detection.updatePlayback(snapshot)

      if (!interruption && snapshot.duration > 0) {
        lastSnapshot = snapshot
        recovery.remember()
      }

      if (interruption && !interruptionActive) {
        interruptionActive = true

        void sendMessage({
          type: "interruption-prevented"
        }).catch(() => {})
      }

      if (!interruption) {
        interruptionActive = false
      }
    }

    stopPlayerEvents = listenToPlayer(video, listener)

    const snapshot = capturePlaybackSnapshot(video)

    if (snapshot.duration > 0) {
      lastSnapshot = snapshot
      recovery.remember()
    }
  })

  const navigation = createNavigationRecovery(async () => {
    if (!running) {
      return
    }

    monitor.stop()
    monitor.start()

    await new Promise(resolve => {
      window.setTimeout(resolve, 150)
    })

    applyCosmetics()
    detection.scan()
    antiAdblock.scan()
  })

  function start(): void {
    if (running) {
      return
    }

    running = true
    monitor.start()
    detection.start()
    antiAdblock.start()
    navigation.start()
    adSkipper.start()
    applyCosmetics()
  }

  function stop(): void {
    if (!running) {
      return
    }

    running = false
    navigation.stop()
    adSkipper.stop()
    antiAdblock.stop()
    detection.stop()
    monitor.stop()
    antiAdblockRecovery.reset()
    interruptionActive = false

    stopPlayerEvents?.()
    stopPlayerEvents = null

    video = null
  }

  function getSnapshot(): PlaybackSnapshot | null {
    return lastSnapshot
      ? { ...lastSnapshot }
      : null
  }

  function getLastDetection(): DetectionResult | null {
    return lastDetection
      ? { ...lastDetection }
      : null
  }

  function getLastRecovery(): RecoveryResult | null {
    return lastRecovery
      ? { ...lastRecovery }
      : null
  }

  function getRemovedElements(): number {
    return removedElements
  }

  return {
    start,
    stop,
    getSnapshot,
    getLastDetection,
    getLastRecovery,
    getRemovedElements
  }
}
