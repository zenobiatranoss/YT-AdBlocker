export type ProtectionState = "enabled" | "disabled"

export type EngineState =
  | "unknown"
  | "checking"
  | "running"
  | "unavailable"

export type DetectionSource =
  | "dom"
  | "player"
  | "behavior"
  | "network"

export type DetectionResult = {
  detected: boolean
  confidence: number
  source: DetectionSource
  detectedAt: number
}

export type PlaybackSnapshot = {
  videoId: string | null
  currentTime: number
  duration: number
  paused: boolean
  seeking: boolean
  playbackRate: number
  capturedAt: number
}

export type StatisticsEvent = {
  type:
    | "ad-detected"
    | "request-blocked"
    | "player-response"
    | "ad-placement"
    | "ad-displayed"
    | "interruption-prevented"
    | "playback-recovery"
  timestamp: number
  details?: string
}

export type BlockedRequestEvent = {
  timestamp: number
  url: string
  resourceType: string
  method: string
  initiator: string
  rule: string
}

export type ProtectionStatistics = {
  detections: number
  interruptionsPrevented: number
  playbackRecoveries: number
  adRequestsBlocked: number
  playerResponsesIntercepted: number
  adPlacementsRemoved: number
  adsDisplayed: number
  lastDetectionAt: number | null
  lastEvent: StatisticsEvent | null
  recentEvents: StatisticsEvent[]
  recentBlockedRequests: BlockedRequestEvent[]
}

export type ProtectionSettings = {
  enabled: boolean
  hidePageAds: boolean
  protectPlayback: boolean
  collectStatistics: boolean
}

export type ExtensionMessage =
  | { type: "get-protection-state" }
  | { type: "set-protection-state"; enabled: boolean }
  | { type: "get-settings" }
  | { type: "update-settings"; settings: Partial<ProtectionSettings> }
  | { type: "get-statistics" }
  | { type: "blocked-request-log" }
  | { type: "get-engine-status" }
  | { type: "get-engine-stats" }
  | { type: "detection"; result: DetectionResult }
  | { type: "ad-request-blocked"; details?: string }
  | { type: "player-response-intercepted"; removed?: number; details?: string }
  | { type: "ad-displayed"; details?: string }
  | { type: "interruption-prevented" }
  | { type: "playback-recovery" }
  | { type: "protection-state-changed"; enabled: boolean }

