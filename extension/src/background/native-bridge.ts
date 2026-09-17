import { nativeClient } from "../messaging/native-client"

export type EngineFilterInput = {
  url: string
  method?: string
  resource?: string
  initiator?: string
  headers?: Record<string, string>
}

export type EngineFilterResponse = {
  blocked: boolean
  rule?: string
  reason?: string
  processed?: boolean
}

export type DetectionEvent = {
  detectedAt: number
  confidence: number
  source: string
}

export type EngineState =
  | "unknown"
  | "checking"
  | "running"
  | "unavailable"

let engineState: EngineState = "unknown"
let statusCheck: Promise<boolean> | null = null

export function getEngineStatus(): EngineState {
  return engineState
}

export async function checkEngine(): Promise<boolean> {
  if (statusCheck) {
    return statusCheck
  }

  engineState = "checking"

  statusCheck = nativeClient.status()
    .then(response => {
      const available = Boolean(response)

      engineState = available
        ? "running"
        : "unavailable"

      return available
    })
    .catch(error => {
      console.error("[YT-AdBlocker] native engine status failed", error)
      engineState = "unavailable"
      return false
    })
    .finally(() => {
      statusCheck = null
    })

  return statusCheck
}

export async function filterThroughEngine(
  input: EngineFilterInput
): Promise<EngineFilterResponse | null> {
  try {
    const response =
      await nativeClient.filter<EngineFilterResponse>(
        input,
        750
      )

    engineState = "running"

    return response
  } catch {
    engineState = "unavailable"
    return null
  }
}

export async function recordDetection(
  event: DetectionEvent
): Promise<boolean> {
  try {
    await nativeClient.request(
      "detection",
      event,
      3000
    )

    engineState = "running"

    return true
  } catch {
    return false
  }
}

export async function recordInterruptionPrevented(): Promise<boolean> {
  try {
    await nativeClient.request(
      "interruption-prevented",
      undefined,
      3000
    )

    engineState = "running"

    return true
  } catch {
    return false
  }
}

export async function recordPlaybackRecovery(): Promise<boolean> {
  try {
    await nativeClient.request(
      "playback-recovery",
      undefined,
      3000
    )

    engineState = "running"

    return true
  } catch {
    return false
  }
}

export async function getEngineStats(): Promise<unknown> {
  return nativeClient.stats()
}

export async function getEngineRules(): Promise<unknown> {
  return nativeClient.rules()
}
