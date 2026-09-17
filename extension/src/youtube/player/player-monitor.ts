import {
  capturePlaybackSnapshot,
  findPlayerVideo
} from "./player-state"
import type { PlaybackSnapshot } from "../../shared/types"

export type PlayerChangeListener = (
  video: HTMLVideoElement | null
) => void

export type PlayerMonitor = {
  start: () => void
  stop: () => void
  getVideo: () => HTMLVideoElement | null
  getSnapshot: () => PlaybackSnapshot | null
}

export function createPlayerMonitor(
  onChange?: PlayerChangeListener
): PlayerMonitor {
  let currentVideo: HTMLVideoElement | null = null
  let observer: MutationObserver | null = null
  let running = false

  function refresh(): void {
    const nextVideo = findPlayerVideo()

    if (nextVideo === currentVideo) {
      return
    }

    currentVideo = nextVideo
    onChange?.(currentVideo)
  }

  function start(): void {
    if (running) {
      return
    }

    running = true
    refresh()

    observer = new MutationObserver(() => {
      refresh()
    })

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    })
  }

  function stop(): void {
    running = false
    observer?.disconnect()
    observer = null
    currentVideo = null
  }

  function getVideo(): HTMLVideoElement | null {
    return currentVideo
  }

  function getSnapshot(): PlaybackSnapshot | null {
    if (!currentVideo) {
      return null
    }

    return capturePlaybackSnapshot(currentVideo)
  }

  return {
    start,
    stop,
    getVideo,
    getSnapshot
  }
}
