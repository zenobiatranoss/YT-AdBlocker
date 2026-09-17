import {
  createYouTubeRuntime,
  type YouTubeRuntime
} from "../youtube/runtime/youtube-runtime"

export type YouTubeSession = {
  start: () => void
  stop: () => void
  getRuntime: () => YouTubeRuntime
}

export function createYouTubeSession(): YouTubeSession {
  const runtime = createYouTubeRuntime()
  let started = false

  function start(): void {
    if (started) {
      return
    }

    started = true
    runtime.start()
  }

  function stop(): void {
    if (!started) {
      return
    }

    started = false
    runtime.stop()
  }

  return {
    start,
    stop,
    getRuntime: () => runtime
  }
}
