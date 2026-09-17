import { createYouTubeSession } from "./youtube"
import { injectPageInterceptor } from "./injection"
import { requestData } from "../messaging/client"
import type { ProtectionSettings } from "../shared/types"

const session = createYouTubeSession()
let enabled = false

async function loadSettings(): Promise<void> {
  try {
    const settings = await requestData<ProtectionSettings>({
      type: "get-settings"
    })

    enabled = settings.enabled

    if (enabled) {
      session.start()
    } else {
      session.stop()
    }
  } catch {
    enabled = true
    session.start()
  }
}

if (
  window.location.hostname === "www.youtube.com" ||
  window.location.hostname === "youtube.com" ||
  window.location.hostname.endsWith(".youtube.com")
) {
  injectPageInterceptor()
  void loadSettings()

  window.addEventListener(
    "yt-adblocker-player-response",
    event => {
      if (!enabled) return

      const detail =
        event instanceof CustomEvent &&
        event.detail &&
        typeof event.detail === "object"
          ? event.detail as Record<string, unknown>
          : {}

      const removed =
        typeof detail.removed === "number"
          ? detail.removed
          : 0

      const source =
        typeof detail.source === "string"
          ? detail.source
          : "unknown"

      void requestData({
        type: "player-response-intercepted",
        removed,
        details: source
      })
    }
  )

  window.addEventListener(
    "yt-adblocker-playback-recovery",
    event => {
      if (!enabled) return

      void requestData({
        type: "playback-recovery"
      }).catch(() => {})
    }
  )

  window.addEventListener(
    "yt-adblocker-ad-displayed",
    event => {
      if (!enabled) return

      const detail =
        event instanceof CustomEvent &&
        event.detail &&
        typeof event.detail === "object"
          ? event.detail as Record<string, unknown>
          : {}

      const source =
        typeof detail.source === "string"
          ? detail.source
          : "unknown"

      void requestData({
        type: "ad-displayed",
        details: source
      }).catch(() => {})
    }
  )

}

chrome.runtime.onMessage.addListener(
  message => {
    if (
      !message ||
      typeof message !== "object" ||
      !("type" in message)
    ) {
      return
    }

    if (
      message.type === "protection-state-changed" &&
      "enabled" in message &&
      typeof message.enabled === "boolean"
    ) {
      enabled = message.enabled

      if (enabled) {
        session.start()
      } else {
        session.stop()
      }
    }
  }
)
