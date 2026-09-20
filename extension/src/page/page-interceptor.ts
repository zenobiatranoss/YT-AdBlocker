const playerPath = "/youtubei/v1/player"

const adKeys = new Set([
  "adPlacements",
  "adSlots",
  "playerAds"
])

type YouTubeWindow = Window & {
  __ytAdBlockerFetchInstalled?: boolean
  __ytAdBlockerXHRInstalled?: boolean
  __ytAdBlockerPlayerStateInstalled?: boolean
  __ytAdBlockerRecoveryInstalled?: boolean
  ytInitialPlayerResponse?: unknown
}

export function isYouTubePlayerRequest(
  input: RequestInfo | URL
): boolean {
  try {
    const url =
      input instanceof Request
        ? input.url
        : String(input)

    const parsed = new URL(url)

    return (
      (
        parsed.hostname === "www.youtube.com" ||
        parsed.hostname === "youtube.com"
      ) &&
      parsed.pathname === playerPath
    )
  } catch {
    return false
  }
}

function isYouTubePlayerUrl(
  url: string
): boolean {
  return isYouTubePlayerRequest(url)
}

function normalizePlayabilityStatus(
  value: unknown
): unknown {
  if (!value || typeof value !== "object") {
    return value
  }

  const record = value as Record<string, unknown>

  if (record.status === "OK") {
    return record
  }

  return {
    status: "OK",
    playableInEmbed: true
  }
}

function sanitizeValue(
  value: unknown
): unknown {
  if (Array.isArray(value)) {
    return value
      .filter(item => {
        if (!item || typeof item !== "object") {
          return true
        }

        const record = item as Record<string, unknown>

        return !(
          "adPlacements" in record ||
          "adSlots" in record ||
          "playerAds" in record
        )
      })
      .map(sanitizeValue)
  }

  if (!value || typeof value !== "object") {
    return value
  }

  const record = value as Record<string, unknown>
  const result: Record<string, unknown> = {}

  for (const [key, child] of Object.entries(record)) {
    if (adKeys.has(key)) {
      result[key] = Array.isArray(child) ? [] : null
      continue
    }

    if (key === "playabilityStatus") {
      result[key] = normalizePlayabilityStatus(child)
      continue
    }

    result[key] = sanitizeValue(child)
  }

  return result
}

export function sanitizePlayerResponse(
  text: string
): {
  text: string
  modified: boolean
} {
  try {
    const parsed = JSON.parse(text)
    const sanitized = sanitizeValue(parsed)
    const serialized = JSON.stringify(sanitized)

    return {
      text: serialized,
      modified: serialized !== text
    }
  } catch {
    return {
      text,
      modified: false
    }
  }
}

function sanitizeInitialPlayerResponse(
  response: unknown
): boolean {
  if (!response || typeof response !== "object") {
    return false
  }

  const record = response as Record<string, unknown>
  let modified = false

  for (const key of adKeys) {
    if (!(key in record)) {
      continue
    }

    const value = record[key]

    if (Array.isArray(value)) {
      if (value.length > 0) {
        record[key] = []
        modified = true
      }

      continue
    }

    if (value !== null) {
      record[key] = null
      modified = true
    }
  }

  const status = record.playabilityStatus

  if (
    status &&
    typeof status === "object" &&
    (status as Record<string, unknown>).status !== "OK"
  ) {
    record.playabilityStatus = {
      status: "OK",
      playableInEmbed: true
    }

    modified = true
  }

  return modified
}

function sanitizeObjectInPlace(
  value: unknown
): boolean {
  if (!value || typeof value !== "object") {
    return false
  }

  if (Array.isArray(value)) {
    let modified = false

    for (let index = value.length - 1; index >= 0; index--) {
      const item = value[index]

      if (
        item &&
        typeof item === "object" &&
        (
          "adPlacements" in item ||
          "adSlots" in item ||
          "playerAds" in item
        )
      ) {
        value.splice(index, 1)
        modified = true
        continue
      }

      if (sanitizeObjectInPlace(item)) {
        modified = true
      }
    }

    return modified
  }

  const record = value as Record<string, unknown>
  let modified = false

  for (const key of Object.keys(record)) {
    if (adKeys.has(key)) {
      const child = record[key]

      if (Array.isArray(child)) {
        if (child.length > 0) {
          record[key] = []
          modified = true
        }
      } else if (child !== null) {
        record[key] = null
        modified = true
      }

      continue
    }

    if (sanitizeObjectInPlace(record[key])) {
      modified = true
    }
  }

  return modified
}

function sanitizePlayerObject(
  response: unknown
): {
  value: unknown
  modified: boolean
  removed: number
} {
  if (!response || typeof response !== "object") {
    return {
      value: response,
      modified: false,
      removed: 0
    }
  }

  const sanitized = sanitizeValue(response)
  const changed = sanitizeObjectInPlace(sanitized)

  return {
    value: sanitized,
    modified: changed,
    removed: changed ? 1 : 0
  }
}

function dispatchPlayerEvent(
  source: string,
  removed: number
): void {
  window.dispatchEvent(
    new CustomEvent(
      "yt-adblocker-player-response",
      {
        detail: {
          modified: true,
          source,
          removed
        }
      }
    )
  )
}

function installInitialPlayerResponseProtection(): void {
  const page = window as YouTubeWindow

  if (page.__ytAdBlockerPlayerStateInstalled) {
    return
  }

  page.__ytAdBlockerPlayerStateInstalled = true

  let lastResponse: unknown = null

  const inspect = () => {
    const response = page.ytInitialPlayerResponse

    if (!response) {
      return
    }

    if (response !== lastResponse) {
      lastResponse = response

      const modifiedResponse = sanitizeInitialPlayerResponse(response)

      if (modifiedResponse) {
        dispatchPlayerEvent(
          "ytInitialPlayerResponse",
          1
        )
      }

      return
    }

    sanitizeCurrentInitialPlayerResponse()
  }

  inspect()

  const interval = window.setInterval(
    inspect,
    100
  )

  window.addEventListener(
    "beforeunload",
    () => {
      window.clearInterval(interval)
    },
    { once: true }
  )
}

function sanitizeCurrentInitialPlayerResponse(): boolean {
  const page = window as YouTubeWindow
  const response = page.ytInitialPlayerResponse

  if (!response) {
    return false
  }

  return sanitizeInitialPlayerResponse(response)
}

function createResponse(
  original: Response,
  body: string
): Response {
  const headers = new Headers(original.headers)

  headers.delete("content-length")
  headers.delete("content-encoding")
  headers.delete("transfer-encoding")

  return new Response(body, {
    status: original.status,
    statusText: original.statusText,
    headers
  })
}

function installFetchInterceptor(): void {
  const state = window as YouTubeWindow

  if (state.__ytAdBlockerFetchInstalled) {
    return
  }

  state.__ytAdBlockerFetchInstalled = true

  const originalFetch = window.fetch

  window.fetch = async function(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const response = await originalFetch.call(
      window,
      input,
      init
    )

    if (!isYouTubePlayerRequest(input)) {
      return response
    }

    const contentType =
      response.headers.get("content-type") ?? ""

    if (
      !contentType.includes("json") &&
      !contentType.includes("javascript") &&
      !contentType.includes("text")
    ) {
      return response
    }

    const text = await response.text()
    const result = sanitizePlayerResponse(text)

    if (!result.modified) {
      return new Response(text, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      })
    }

    dispatchPlayerEvent("fetch", 1)

    return createResponse(
      response,
      result.text
    )
  }
}

function installXHRInterceptor(): void {
  const state = window as YouTubeWindow

  if (state.__ytAdBlockerXHRInstalled) {
    return
  }

  state.__ytAdBlockerXHRInstalled = true

  const originalOpen =
    XMLHttpRequest.prototype.open

  const originalSend =
    XMLHttpRequest.prototype.send

  const originalResponseTextDescriptor =
    Object.getOwnPropertyDescriptor(
      XMLHttpRequest.prototype,
      "responseText"
    )

  const originalResponseDescriptor =
    Object.getOwnPropertyDescriptor(
      XMLHttpRequest.prototype,
      "response"
    )

  const metadata = new WeakMap<
    XMLHttpRequest,
    {
      url: string
      playerRequest: boolean
      modifiedText: string | null
      modifiedResponse: unknown
      modified: boolean
    }
  >()

  XMLHttpRequest.prototype.open =
    function(
      method: string,
      url: string | URL,
      ...rest: any[]
    ) {
      const normalizedUrl = String(url)

      metadata.set(this, {
        url: normalizedUrl,
        playerRequest: isYouTubePlayerUrl(normalizedUrl),
        modifiedText: null,
        modifiedResponse: null,
        modified: false
      })

      return (originalOpen as any).call(
        this,
        method,
        url,
        ...rest
      )
    }

  XMLHttpRequest.prototype.send =
    function(
      body?: Document | XMLHttpRequestBodyInit | null
    ) {
      const xhr = this
      const state = metadata.get(xhr)

      if (!state?.playerRequest) {
        return (originalSend as any).call(
          xhr,
          body
        )
      }

      const processResponse = () => {
        const contentType =
          xhr.getResponseHeader(
            "content-type"
          ) ?? ""

        if (
          !contentType.includes("json") &&
          !contentType.includes("javascript") &&
          !contentType.includes("text")
        ) {
          return
        }

        let text = ""

        try {
          text =
            originalResponseTextDescriptor?.get?.call(
              xhr
            ) ?? ""
        } catch {
          return
        }

        if (!text) {
          return
        }

        const result =
          sanitizePlayerResponse(text)

        if (!result.modified) {
          return
        }

        state.modifiedText = result.text
        state.modified = true

        try {
          state.modifiedResponse =
            JSON.parse(result.text)
        } catch {
          state.modifiedResponse = null
        }

        dispatchPlayerEvent("xhr", 1)
      }

      xhr.addEventListener(
        "readystatechange",
        () => {
          if (xhr.readyState === 4) {
            processResponse()
          }
        }
      )

      xhr.addEventListener(
        "load",
        processResponse
      )

      return (originalSend as any).call(
        xhr,
        body
      )
    }

  if (originalResponseTextDescriptor) {
    Object.defineProperty(
      XMLHttpRequest.prototype,
      "responseText",
      {
        configurable:
          originalResponseTextDescriptor.configurable,
        enumerable:
          originalResponseTextDescriptor.enumerable,
        get() {
          const state = metadata.get(this)

          if (
            state?.modified &&
            state.modifiedText !== null
          ) {
            return state.modifiedText
          }

          return originalResponseTextDescriptor.get?.call(
            this
          )
        }
      }
    )
  }

  if (originalResponseDescriptor) {
    Object.defineProperty(
      XMLHttpRequest.prototype,
      "response",
      {
        configurable:
          originalResponseDescriptor.configurable,
        enumerable:
          originalResponseDescriptor.enumerable,
        get() {
          const state = metadata.get(this)

          if (
            state?.modified &&
            state.modifiedResponse !== null
          ) {
            return state.modifiedResponse
          }

          return originalResponseDescriptor.get?.call(
            this
          )
        }
      }
    )
  }
}

function installPlaybackRecovery(): void {
  const state = window as YouTubeWindow

  if (state.__ytAdBlockerRecoveryInstalled) {
    return
  }

  state.__ytAdBlockerRecoveryInstalled = true

  let adSignalAt = 0
  let lastTime = -1
  let lastProgressAt = 0
  let recoveryAt = 0
  let recoveryVideo: HTMLVideoElement | null = null

  const markAdSignal = () => {
    adSignalAt = Date.now()
    recoveryAt = 0
    recoveryVideo = null
  }

  window.addEventListener(
    "yt-adblocker-player-response",
    markAdSignal
  )

  const inspect = () => {
    const video =
      document.querySelector("video")

    if (!video) {
      return
    }

    const now = Date.now()
    const currentTime = video.currentTime

    if (
      lastTime < 0 ||
      Math.abs(currentTime - lastTime) >= 0.05
    ) {
      lastTime = currentTime
      lastProgressAt = now
    }

    const adShowing =
      !!document.querySelector(".ad-showing")

    const adModule =
      !!document.querySelector(".video-ads")

    if (adShowing || adModule) {
      if (adSignalAt === 0) {
        markAdSignal()
      }

      return
    }

    if (adSignalAt === 0) {
      return
    }

    if (
      now - adSignalAt < 1200 ||
      now - lastProgressAt < 1500
    ) {
      return
    }

    if (
      recoveryAt !== 0 &&
      recoveryVideo === video
    ) {
      return
    }

    if (
      video.paused ||
      video.seeking ||
      !Number.isFinite(video.duration) ||
      video.duration <= 0
    ) {
      return
    }

    recoveryAt = now
    recoveryVideo = video

    const result = video.play()

    if (result instanceof Promise) {
      void result.catch(() => {})
    }

    window.dispatchEvent(
      new CustomEvent(
        "yt-adblocker-playback-recovery",
        {
          detail: {
            source: "stalled-after-ad",
            currentTime: video.currentTime,
            duration: video.duration
          }
        }
      )
    )

    window.setTimeout(() => {
      if (recoveryVideo !== video) {
        return
      }

      if (
        video.paused &&
        !video.seeking
      ) {
        recoveryAt = 0
        recoveryVideo = null
      }
    }, 1200)
  }

  inspect()

  const interval = window.setInterval(
    inspect,
    250
  )

  window.addEventListener(
    "beforeunload",
    () => {
      window.clearInterval(interval)
      window.removeEventListener(
        "yt-adblocker-player-response",
        markAdSignal
      )
    },
    { once: true }
  )
}

installFetchInterceptor()
installXHRInterceptor()
installInitialPlayerResponseProtection()
installPlaybackRecovery()
