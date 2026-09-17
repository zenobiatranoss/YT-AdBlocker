import type { ExtensionMessage } from "../shared/types"
import {
  recordDetection as recordLocalDetection,
  recordAdRequestBlocked,
  recordPlayerResponseIntercepted,
  recordAdDisplayed,
  recordInterruptionPrevented as recordLocalInterruption,
  recordPlaybackRecovery as recordLocalRecovery,
  getStatistics
} from "../storage/statistics"
import {
  getSettings,
  updateSettings
} from "../storage/settings"
import {
  failure,
  success,
  type MessageResponse
} from "../messaging/messages"
import {
  startRequestFiltering,
  stopRequestFiltering
} from "./request-manager"
import {
  recordDetection,
  recordInterruptionPrevented,
  recordPlaybackRecovery,
  getEngineStatus,
  getEngineStats
} from "./native-bridge"

export async function handleMessage(
  message: ExtensionMessage
): Promise<MessageResponse> {
  try {
    switch (message.type) {
      case "get-protection-state": {
        const settings = await getSettings()

        return success({
          enabled: settings.enabled
        })
      }

      case "set-protection-state": {
        const settings = await updateSettings({
          enabled: message.enabled
        })

        if (settings.enabled) {
          await startRequestFiltering()
        } else {
          stopRequestFiltering()
        }

        if (chrome.tabs?.query && chrome.tabs?.sendMessage) {
          const tabs = await chrome.tabs.query({
            url: [
              "*://www.youtube.com/*",
              "*://youtube.com/*",
              "*://*.youtube.com/*"
            ]
          })

          await Promise.all(
            tabs
              .filter(tab => typeof tab.id === "number")
              .map(tab =>
                chrome.tabs.sendMessage(tab.id!, {
                  type: "protection-state-changed",
                  enabled: settings.enabled
                }).catch(() => {})
              )
          )
        }

        return success(settings)
      }

      case "get-settings":
        return success(await getSettings())

      case "update-settings":
        return success(await updateSettings(message.settings))

      case "get-statistics":
        return success(await getStatistics())

      case "blocked-request-log": {
        const statistics = await getStatistics()
        return success(statistics.recentBlockedRequests)
      }

      case "get-engine-status":
        return success({
          status: getEngineStatus()
        })

      case "get-engine-stats":
        return success(await getEngineStats())

      case "detection":
        await recordLocalDetection(message.result.detectedAt)

        void recordDetection({
          detectedAt: message.result.detectedAt,
          confidence: message.result.confidence,
          source: message.result.source
        })

        return success()

      case "ad-request-blocked":
        await recordAdRequestBlocked(message.details)
        return success()

      case "player-response-intercepted":
        await recordPlayerResponseIntercepted(
          message.removed ?? 0,
          message.details
        )
        return success()

      case "ad-displayed":
        await recordAdDisplayed(message.details)
        return success()

      case "interruption-prevented":
        await recordLocalInterruption()
        void recordInterruptionPrevented()
        return success()

      case "playback-recovery":
        await recordLocalRecovery()
        void recordPlaybackRecovery()
        return success()

      default:
        return failure("Unsupported extension message")
    }
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Unknown error"
    )
  }
}

