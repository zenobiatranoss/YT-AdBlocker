import type { PlaybackSnapshot } from "../../shared/types"

export function pausePlayback(video: HTMLVideoElement): void {
  video.pause()
}

export async function resumePlayback(
  video: HTMLVideoElement
): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await video.play()
      return true
    } catch {
      await new Promise(resolve => {
        window.setTimeout(resolve, 250)
      })
    }
  }

  return false
}

export function restorePlaybackPosition(
  video: HTMLVideoElement,
  snapshot: PlaybackSnapshot
): boolean {
  if (
    !Number.isFinite(snapshot.currentTime) ||
    snapshot.currentTime < 0
  ) {
    return false
  }

  const duration = Number.isFinite(video.duration)
    ? video.duration
    : snapshot.duration

  if (duration > 0) {
    video.currentTime = Math.min(
      snapshot.currentTime,
      duration
    )
  } else {
    video.currentTime = snapshot.currentTime
  }

  return true
}

export function restorePlaybackRate(
  video: HTMLVideoElement,
  snapshot: PlaybackSnapshot
): boolean {
  if (
    !Number.isFinite(snapshot.playbackRate) ||
    snapshot.playbackRate <= 0
  ) {
    return false
  }

  video.playbackRate = snapshot.playbackRate
  return true
}

export async function restorePlayback(
  video: HTMLVideoElement,
  snapshot: PlaybackSnapshot
): Promise<boolean> {
  restorePlaybackPosition(video, snapshot)
  restorePlaybackRate(video, snapshot)

  if (!snapshot.paused) {
    return resumePlayback(video)
  }

  return true
}
