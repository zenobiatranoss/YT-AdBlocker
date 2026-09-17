export type PageObserver = {
  start: () => void
  stop: () => void
}

export function createPageObserver(
  callback: (url: string) => void | Promise<void>
): PageObserver {
  let active = false
  let previousUrl = window.location.href

  function check(): void {
    if (!active) {
      return
    }

    const nextUrl = window.location.href

    if (nextUrl === previousUrl) {
      return
    }

    previousUrl = nextUrl
    void callback(nextUrl)
  }

  function start(): void {
    if (active) {
      return
    }

    active = true

    window.addEventListener("popstate", check)
    window.addEventListener("yt-navigate-finish", check)
    window.addEventListener("yt-page-data-updated", check)
  }

  function stop(): void {
    active = false

    window.removeEventListener("popstate", check)
    window.removeEventListener("yt-navigate-finish", check)
    window.removeEventListener("yt-page-data-updated", check)
  }

  return {
    start,
    stop
  }
}
