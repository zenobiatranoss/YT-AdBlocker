import type {
  DetectionResult,
  PlaybackSnapshot
} from "../../shared/types"

import {
  findPlayerVideo,
  capturePlaybackSnapshot
} from "../player/player-state"

import {
  recoverPlayback
} from "./playback-recovery"

import {
  createPlaybackStateStore
} from "./state-recovery"

export type RecoveryListener = (
  result: RecoveryResult
) => void | Promise<void>

export type RecoveryResult = {
  attempted: boolean
  recovered: boolean
  snapshot: PlaybackSnapshot | null
  detection: DetectionResult
}

export type RecoveryEngine = {
  remember: () => PlaybackSnapshot | null
  recover: (detection: DetectionResult) => Promise<RecoveryResult>
  clear: () => void
}

export function createRecoveryEngine(
  listener?: RecoveryListener
): RecoveryEngine {
  const state = createPlaybackStateStore()

  function remember(): PlaybackSnapshot | null {
    const video = findPlayerVideo()

    if (!video) {
      return null
    }

    const snapshot = capturePlaybackSnapshot(video)

    if (
      snapshot.duration > 0 &&
      snapshot.videoId !== null
    ) {
      state.save(snapshot)
    }

    return snapshot
  }

  async function recover(
    detection: DetectionResult
  ): Promise<RecoveryResult> {
    const snapshot = state.get()
    const video = findPlayerVideo()

    const currentSnapshot = video
      ? capturePlaybackSnapshot(video)
      : null

    const sameVideo =
      Boolean(
        snapshot &&
        currentSnapshot &&
        snapshot.videoId &&
        currentSnapshot.videoId &&
        snapshot.videoId === currentSnapshot.videoId
      )

    const result: RecoveryResult = {
      attempted: Boolean(snapshot && video && sameVideo),
      recovered: false,
      snapshot,
      detection
    }

    if (
      !snapshot ||
      !video ||
      !sameVideo
    ) {
      await listener?.(result)
      return result
    }

    const recovery = await recoverPlayback(
      video,
      snapshot
    )

    result.recovered = recovery.restored

    await listener?.(result)

    return result
  }

  function clear(): void {
    state.clear()
  }

  return {
    remember,
    recover,
    clear
  }
}
