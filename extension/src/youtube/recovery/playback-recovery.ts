import type { PlaybackSnapshot } from "../../shared/types"
import {
  restorePlayback,
  restorePlaybackPosition,
  restorePlaybackRate
} from "../player/playback-controller"

export type PlaybackRecoveryResult = {
  restored: boolean
  resumed: boolean
}

export async function recoverPlayback(
  video: HTMLVideoElement,
  snapshot: PlaybackSnapshot
): Promise<PlaybackRecoveryResult> {
  const positionRestored = restorePlaybackPosition(video, snapshot)
  const rateRestored = restorePlaybackRate(video, snapshot)

  if (!positionRestored || !rateRestored) {
    return {
      restored: false,
      resumed: false
    }
  }

  const resumed = await restorePlayback(video, snapshot)

  return {
    restored: true,
    resumed
  }
}
