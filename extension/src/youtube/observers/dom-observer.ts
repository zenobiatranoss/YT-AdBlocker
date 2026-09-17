export type DomObserver = {
  start: () => void
  stop: () => void
}

export function createDomObserver(
  callback: () => void | Promise<void>
): DomObserver {
  let observer: MutationObserver | null = null
  let running = false
  let scheduled = false

  function trigger(): void {
    if (!running || scheduled) {
      return
    }

    scheduled = true

    queueMicrotask(() => {
      scheduled = false

      if (running) {
        void callback()
      }
    })
  }

  function start(): void {
    if (running) {
      return
    }

    running = true

    observer = new MutationObserver(() => {
      trigger()
    })

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true
    })

    trigger()
  }

  function stop(): void {
    running = false
    scheduled = false

    observer?.disconnect()
    observer = null
  }

  return {
    start,
    stop
  }
}
