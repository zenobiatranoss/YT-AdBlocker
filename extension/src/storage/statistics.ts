import type {
  ProtectionStatistics,
  StatisticsEvent,
  BlockedRequestEvent
} from "../shared/types"

const MAX_RECENT_EVENTS = 30
const MAX_RECENT_BLOCKED_REQUESTS = 30

const defaults: ProtectionStatistics = {
  detections: 0,
  interruptionsPrevented: 0,
  playbackRecoveries: 0,
  adRequestsBlocked: 0,
  playerResponsesIntercepted: 0,
  adPlacementsRemoved: 0,
  adsDisplayed: 0,
  lastDetectionAt: null,
  lastEvent: null,
  recentEvents: [],
  recentBlockedRequests: []
}

type StorageArea = {
  get: (keys?: string | string[] | null) => Promise<Record<string, unknown>>
  set: (items: Record<string, unknown>) => Promise<void>
}

function getStorage(): StorageArea {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    throw new Error("Browser storage is not available")
  }

  return chrome.storage.local
}

function validNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null
  }

  return value
}

function readEvent(value: unknown): StatisticsEvent | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const event = value as Partial<StatisticsEvent>

  if (typeof event.type !== "string" || typeof event.timestamp !== "number") {
    return null
  }

  return {
    type: event.type as StatisticsEvent["type"],
    timestamp: event.timestamp,
    ...(typeof event.details === "string"
      ? { details: event.details }
      : {})
  }
}

function readEvents(value: unknown): StatisticsEvent[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map(readEvent)
    .filter((event): event is StatisticsEvent => event !== null)
    .slice(-MAX_RECENT_EVENTS)
}

function readBlockedRequest(value: unknown): BlockedRequestEvent | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const event = value as Partial<BlockedRequestEvent>

  if (
    typeof event.timestamp !== "number" ||
    typeof event.url !== "string" ||
    typeof event.resourceType !== "string" ||
    typeof event.method !== "string" ||
    typeof event.initiator !== "string" ||
    typeof event.rule !== "string"
  ) {
    return null
  }

  return {
    timestamp: event.timestamp,
    url: event.url,
    resourceType: event.resourceType,
    method: event.method,
    initiator: event.initiator,
    rule: event.rule
  }
}

function readBlockedRequests(value: unknown): BlockedRequestEvent[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map(readBlockedRequest)
    .filter((event): event is BlockedRequestEvent => event !== null)
    .slice(-MAX_RECENT_BLOCKED_REQUESTS)
}

function readStatistics(value: unknown): ProtectionStatistics {
  if (!value || typeof value !== "object") {
    return { ...defaults }
  }

  const saved = value as Partial<ProtectionStatistics>

  return {
    detections:
      validNumber(saved.detections) ?? defaults.detections,
    interruptionsPrevented:
      validNumber(saved.interruptionsPrevented) ??
      defaults.interruptionsPrevented,
    playbackRecoveries:
      validNumber(saved.playbackRecoveries) ??
      defaults.playbackRecoveries,
    adRequestsBlocked:
      validNumber(saved.adRequestsBlocked) ??
      defaults.adRequestsBlocked,
    playerResponsesIntercepted:
      validNumber(saved.playerResponsesIntercepted) ??
      defaults.playerResponsesIntercepted,
    adPlacementsRemoved:
      validNumber(saved.adPlacementsRemoved) ??
      defaults.adPlacementsRemoved,
    adsDisplayed:
      validNumber(saved.adsDisplayed) ??
      defaults.adsDisplayed,
    lastDetectionAt:
      validNumber(saved.lastDetectionAt) ??
      defaults.lastDetectionAt,
    lastEvent:
      readEvent(saved.lastEvent) ?? defaults.lastEvent,
    recentEvents:
      readEvents(saved.recentEvents),
    recentBlockedRequests:
      readBlockedRequests(saved.recentBlockedRequests)
  }
}

export function getDefaultStatistics(): ProtectionStatistics {
  return {
    ...defaults,
    recentEvents: [],
    recentBlockedRequests: []
  }
}

export async function getStatistics(): Promise<ProtectionStatistics> {
  const storage = getStorage()
  const result = await storage.get("statistics")

  return readStatistics(result.statistics)
}

async function saveStatistics(
  statistics: ProtectionStatistics
): Promise<ProtectionStatistics> {
  const storage = getStorage()
  const next = readStatistics(statistics)

  await storage.set({
    statistics: next
  })

  return next
}

let writeQueue = Promise.resolve()

function enqueue(
  update: (
    current: ProtectionStatistics
  ) => ProtectionStatistics
): Promise<ProtectionStatistics> {
  const operation = writeQueue.then(async () => {
    const current = await getStatistics()
    return saveStatistics(update(current))
  })

  writeQueue = operation.then(
    () => undefined,
    () => undefined
  )

  return operation
}

function addEvent(
  statistics: ProtectionStatistics,
  event: StatisticsEvent
): ProtectionStatistics {
  const recentEvents = [
    ...statistics.recentEvents,
    event
  ].slice(-MAX_RECENT_EVENTS)

  return {
    ...statistics,
    lastEvent: event,
    recentEvents
  }
}

export function recordDetection(
  detectedAt = Date.now()
): Promise<ProtectionStatistics> {
  return enqueue(current =>
    addEvent(
      {
        ...current,
        detections: current.detections + 1,
        lastDetectionAt: detectedAt
      },
      {
        type: "ad-detected",
        timestamp: detectedAt
      }
    )
  )
}

export function recordBlockedRequest(
  event: BlockedRequestEvent
): Promise<ProtectionStatistics> {
  return enqueue(current => {
    const recentBlockedRequests = [
      ...current.recentBlockedRequests,
      event
    ].slice(-MAX_RECENT_BLOCKED_REQUESTS)

    return addEvent(
      {
        ...current,
        adRequestsBlocked: current.adRequestsBlocked + 1,
        recentBlockedRequests
      },
      {
        type: "request-blocked",
        timestamp: event.timestamp,
        details: event.rule
      }
    )
  })
}

export function recordAdRequestBlocked(
  details?: string
): Promise<ProtectionStatistics> {
  return enqueue(current =>
    addEvent(
      {
        ...current,
        adRequestsBlocked: current.adRequestsBlocked + 1
      },
      {
        type: "request-blocked",
        timestamp: Date.now(),
        ...(details ? { details } : {})
      }
    )
  )
}

export function recordPlayerResponseIntercepted(
  removed = 0,
  details?: string
): Promise<ProtectionStatistics> {
  return enqueue(current =>
    addEvent(
      {
        ...current,
        playerResponsesIntercepted:
          current.playerResponsesIntercepted + 1,
        adPlacementsRemoved:
          current.adPlacementsRemoved + Math.max(0, removed)
      },
      {
        type: "player-response",
        timestamp: Date.now(),
        details:
          details ??
          `removed ${Math.max(0, removed)} ad placements`
      }
    )
  )
}

export function recordAdDisplayed(
  details?: string
): Promise<ProtectionStatistics> {
  return enqueue(current =>
    addEvent(
      {
        ...current,
        adsDisplayed: current.adsDisplayed + 1
      },
      {
        type: "ad-displayed",
        timestamp: Date.now(),
        ...(details ? { details } : {})
      }
    )
  )
}

export function recordInterruptionPrevented(): Promise<ProtectionStatistics> {
  return enqueue(current =>
    addEvent(
      {
        ...current,
        interruptionsPrevented:
          current.interruptionsPrevented + 1
      },
      {
        type: "interruption-prevented",
        timestamp: Date.now()
      }
    )
  )
}

export function recordPlaybackRecovery(): Promise<ProtectionStatistics> {
  return enqueue(current =>
    addEvent(
      {
        ...current,
        playbackRecoveries:
          current.playbackRecoveries + 1
      },
      {
        type: "playback-recovery",
        timestamp: Date.now()
      }
    )
  )
}

export function resetStatistics(): Promise<ProtectionStatistics> {
  return enqueue(() => getDefaultStatistics())
}

