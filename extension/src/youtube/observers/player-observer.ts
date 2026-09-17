import {
  findPlayerVideo
} from "../player/player-state"

export type PlayerObserver = {
  start: () => void
  stop: () => void
}

export function createPlayerObserver(
  callback: (video: HTMLVideoElement | null) => void | Promise<void>
): PlayerObserver {
  let observer: MutationObserver | null = null
  let running = false
  let currentVideo: HTMLVideoElement | null = null

  function refresh(): void {
    const nextVideo = findPlayerVideo()

    if (nextVideo === currentVideo) {
      return
    }

    currentVideo = nextVideo
    void callback(currentVideo)
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

  return {
    start,
    stop
  }
}
