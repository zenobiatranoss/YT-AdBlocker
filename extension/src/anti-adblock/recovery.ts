import type { PlaybackSnapshot } from "../shared/types"
import {
  capturePlaybackSnapshot,
  findPlayerVideo
} from "../youtube/player/player-state"
import {
  restorePlayback
} from "../youtube/player/playback-controller"

export type AntiAdblockRecoveryResult = {
  attempted: boolean
  recovered: boolean
  snapshot: PlaybackSnapshot | null
}

export type AntiAdblockRecovery = {
  recover: () => Promise<AntiAdblockRecoveryResult>
  reset: () => void
}

export function createAntiAdblockRecovery(
  getSnapshot: () => PlaybackSnapshot | null
): AntiAdblockRecovery {
  let attempts = 0
  let lastAttemptAt = 0

  async function recover(): Promise<AntiAdblockRecoveryResult> {
    const now = Date.now()

    if (
      now - lastAttemptAt < 750 ||
      attempts >= 6
    ) {
      return {
        attempted: false,
        recovered: false,
        snapshot: getSnapshot()
      }
    }

    lastAttemptAt = now
    attempts++

    const video = findPlayerVideo()
    const stored = getSnapshot()

    if (!video) {
      return {
        attempted: false,
        recovered: false,
        snapshot: stored
      }
    }

    const snapshot =
      stored ??
      capturePlaybackSnapshot(video)

    if (
      !Number.isFinite(video.duration) ||
      video.duration <= 0
    ) {
      return {
        attempted: false,
        recovered: false,
        snapshot
      }
    }

    const before = video.currentTime

    const recovered = await restorePlayback(
      video,
      snapshot
    )

    if (!recovered) {
      return {
        attempted: true,
        recovered: false,
        snapshot
      }
    }

    await new Promise(resolve => {
      window.setTimeout(resolve, 300)
    })

    const playing =
      !video.paused &&
      !video.ended &&
      video.readyState >= 2

    const progressed =
      Math.abs(video.currentTime - before) > 0.05

    return {
      attempted: true,
      recovered: playing || progressed,
      snapshot
    }
  }

  function reset(): void {
    attempts = 0
    lastAttemptAt = 0
  }

  return {
    recover,
    reset
  }
}
