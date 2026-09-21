export type AdSkipper = {
  start: () => void
  stop: () => void
}

const skipSelectors = [
  ".ytp-ad-skip-button",
  ".ytp-ad-skip-button-modern",
  ".ytp-ad-skip-button-slot",
  ".ytp-skip-ad-button",
  "button.ytp-ad-skip-button",
  "button.ytp-ad-skip-button-modern",
  "button.ytp-ad-skip-button-slot",
  "button.ytp-skip-ad-button",
  "[aria-label*='Skip ad' i]",
  "[aria-label*='Skip Ads' i]"
]

const closeSelectors = [
  ".ytp-ad-overlay-close-button",
  ".ytp-ad-overlay-close-container",
  "[aria-label='Close ad']",
  "[aria-label='Close ad overlay']"
]

function getPlayerContainer(): HTMLElement | null {
  return document.querySelector(".html5-video-player")
}

function isAdShowing(): boolean {
  const player = getPlayerContainer()

  if (player) {
    if (
      player.classList.contains("ad-showing") ||
      player.classList.contains("ad-interrupting")
    ) {
      return true
    }
  }

  try {
    return Boolean(
      document.querySelector(".video-ads.ytp-ad-module")?.childElementCount
    )
  } catch {
    return false
  }
}

function findButton(
  selectors: string[]
): HTMLElement | null {
  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector)

      for (const element of elements) {
        if (!(element instanceof HTMLElement)) {
          continue
        }

        if (
          element.hasAttribute("disabled") ||
          element.getAttribute("aria-disabled") === "true"
        ) {
          continue
        }

        const style = window.getComputedStyle(element)

        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.pointerEvents === "none"
        ) {
          continue
        }

        return element
      }
    } catch {
      continue
    }
  }

  return null
}

function clickButton(
  selectors: string[]
): boolean {
  const button = findButton(selectors)

  if (!button) {
    return false
  }

  button.click()
  return true
}

function trySkip(): boolean {
  if (!isAdShowing()) {
    return false
  }

  if (clickButton(skipSelectors)) {
    return true
  }

  return clickButton(closeSelectors)
}

type PlaybackOverride = {
  video: HTMLVideoElement
  originalMuted: boolean
  originalRate: number
  appliedAt: number
  cooldownUntil: number
  onWaiting: () => void
}

let override: PlaybackOverride | null = null

const MAX_OVERRIDE_MS = 20000
const TARGET_RATE = 10
const RECOVERY_RATE = 2
const COOLDOWN_MS = 3000

function getVideo(): HTMLVideoElement | null {
  return document.querySelector("video")
}

function applyFastForward(): void {
  const video = getVideo()

  if (!video) {
    return
  }

  if (!override || override.video !== video) {
    if (override) {
      override.video.removeEventListener(
        "waiting",
        override.onWaiting
      )
      override.video.removeEventListener(
        "stalled",
        override.onWaiting
      )
    }

    const onWaiting = (): void => {
      if (override) {
        override.cooldownUntil = Date.now() + COOLDOWN_MS
      }
    }

    override = {
      video,
      originalMuted: video.muted,
      originalRate: video.playbackRate,
      appliedAt: Date.now(),
      cooldownUntil: 0,
      onWaiting
    }

    video.addEventListener("waiting", onWaiting)
    video.addEventListener("stalled", onWaiting)
  }

  video.muted = true

  const now = Date.now()
  const rate =
    now < override.cooldownUntil ? RECOVERY_RATE : TARGET_RATE

  try {
    if (video.playbackRate !== rate) {
      video.playbackRate = rate
    }
  } catch {
    return
  }
}

function restorePlayback(): void {
  if (!override) {
    return
  }

  const video = override.video

  video.removeEventListener("waiting", override.onWaiting)
  video.removeEventListener("stalled", override.onWaiting)

  video.muted = override.originalMuted

  try {
    video.playbackRate = override.originalRate
  } catch {
    video.playbackRate = 1
  }

  override = null
}

export function createAdSkipper(): AdSkipper {
  let observer: MutationObserver | null = null
  let interval: number | null = null
  let running = false
  let lastActionAt = 0
  let adWasShowing = false
  let showingSince = 0

  function inspect(): void {
    if (!running) {
      return
    }

    const showing = isAdShowing()
    const now = Date.now()

    if (
      override &&
      now - override.appliedAt > MAX_OVERRIDE_MS
    ) {
      restorePlayback()
      adWasShowing = false
      showingSince = 0
    }

    if (showing) {
      if (showingSince === 0) {
        showingSince = now
      }
    } else {
      showingSince = 0
    }

    if (showing && !adWasShowing) {
      adWasShowing = true

      window.dispatchEvent(
        new CustomEvent(
          "yt-adblocker-ad-displayed",
          {
            detail: {
              source: "dom"
            }
          }
        )
      )
    }

    if (!showing) {
      if (adWasShowing) {
        adWasShowing = false
        restorePlayback()
      }

      return
    }

    if (now - showingSince < 250) {
      return
    }

    if (now - lastActionAt < 500) {
      applyFastForward()
      return
    }

    if (trySkip()) {
      lastActionAt = now
      return
    }

    applyFastForward()
  }

  function start(): void {
    if (running) {
      return
    }

    running = true
    lastActionAt = 0
    inspect()

    observer = new MutationObserver(() => {
      inspect()
    })

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "class",
        "disabled",
        "aria-disabled",
        "style"
      ]
    })

    interval = window.setInterval(
      inspect,
      200
    )
  }

  function stop(): void {
    running = false

    observer?.disconnect()
    observer = null

    if (interval !== null) {
      window.clearInterval(interval)
      interval = null
    }

    lastActionAt = 0
    adWasShowing = false
    showingSince = 0
    restorePlayback()
  }

  return {
    start,
    stop
  }
}
