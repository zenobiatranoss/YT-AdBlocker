import type { PlaybackSnapshot } from "../../shared/types"

function readVideoId(): string | null {
  try {
    const url = new URL(window.location.href)
    const id = url.searchParams.get("v")

    if (id) {
      return id
    }

    const match = url.pathname.match(/^\/shorts\/([^/?]+)/)

    return match?.[1] ?? null
  } catch {
    return null
  }
}

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0
}

export function capturePlaybackSnapshot(
  video: HTMLVideoElement
): PlaybackSnapshot {
  return {
    videoId: readVideoId(),
    currentTime: safeNumber(video.currentTime),
    duration: safeNumber(video.duration),
    paused: video.paused,
    seeking: video.seeking,
    playbackRate: safeNumber(video.playbackRate) || 1,
    capturedAt: Date.now()
  }
}

export function findPlayerVideo(
  root: ParentNode = document
): HTMLVideoElement | null {
  const videos = Array.from(root.querySelectorAll("video"))

  for (const video of videos) {
    if (video.isConnected) {
      return video
    }
  }

  return null
}

export function hasMeaningfulPlayback(
  snapshot: PlaybackSnapshot
): boolean {
  return (
    snapshot.videoId !== null &&
    snapshot.duration > 0 &&
    snapshot.currentTime >= 0
  )
}
