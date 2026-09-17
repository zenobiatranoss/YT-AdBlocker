export type NavigationRecovery = {
  start: () => void
  stop: () => void
}

export function createNavigationRecovery(
  recover: () => void | Promise<void>
): NavigationRecovery {
  let active = false
  let timer: number | null = null

  function scheduleRecovery(): void {
    if (!active) {
      return
    }

    if (timer !== null) {
      window.clearTimeout(timer)
    }

    timer = window.setTimeout(() => {
      timer = null
      void recover()
    }, 100)
  }

  function start(): void {
    if (active) {
      return
    }

    active = true

    window.addEventListener(
      "yt-navigate-finish",
      scheduleRecovery
    )

    window.addEventListener(
      "yt-page-data-updated",
      scheduleRecovery
    )

    window.addEventListener(
      "popstate",
      scheduleRecovery
    )
  }

  function stop(): void {
    active = false

    window.removeEventListener(
      "yt-navigate-finish",
      scheduleRecovery
    )

    window.removeEventListener(
      "yt-page-data-updated",
      scheduleRecovery
    )

    window.removeEventListener(
      "popstate",
      scheduleRecovery
    )

    if (timer !== null) {
      window.clearTimeout(timer)
      timer = null
    }
  }

  return {
    start,
    stop
  }
}
