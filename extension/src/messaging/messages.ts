import type {
  ExtensionMessage,
  ProtectionSettings,
  ProtectionStatistics
} from "../shared/types"

export type MessageResponse =
  | {
      ok: true
      data?: unknown
    }
  | {
      ok: false
      error: string
    }

export type MessageHandler = (
  message: ExtensionMessage
) => Promise<MessageResponse>

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  if (!value || typeof value !== "object") {
    return false
  }

  const message = value as Record<string, unknown>

  switch (message.type) {
    case "get-protection-state":
    case "get-settings":
    case "get-statistics":
    case "get-engine-status":
    case "get-engine-stats":
    case "interruption-prevented":
    case "playback-recovery":
    case "ad-request-blocked":
    case "player-response-intercepted":
    case "ad-displayed":
      return true

    case "protection-state-changed":
      return typeof message.enabled === "boolean"

    case "set-protection-state":
      return typeof message.enabled === "boolean"

    case "update-settings":
      return (
        typeof message.settings === "object" &&
        message.settings !== null &&
        !Array.isArray(message.settings)
      )

    case "detection":
      return (
        typeof message.result === "object" &&
        message.result !== null
      )

    default:
      return false
  }
}

export function success(data?: unknown): MessageResponse {
  return {
    ok: true,
    data
  }
}

export function failure(error: string): MessageResponse {
  return {
    ok: false,
    error
  }
}

export type SettingsResponse = ProtectionSettings
export type StatisticsResponse = ProtectionStatistics
