import { requestData, sendMessage } from "../src/messaging/client"
import type {
  ProtectionSettings,
  ProtectionStatistics,
  EngineState,
  StatisticsEvent
} from "../src/shared/types"

const status = document.querySelector("#status")
const toggle = document.querySelector("#toggle")
const detections = document.querySelector("#detections")
const blocked = document.querySelector("#blocked")
const displayed = document.querySelector("#displayed")
const playerResponses = document.querySelector("#player-responses")
const placements = document.querySelector("#placements")
const prevented = document.querySelector("#prevented")
const recoveries = document.querySelector("#recoveries")
const engineRequests = document.querySelector("#engine-requests")
const engineBlocked = document.querySelector("#engine-blocked")
const engineAllowed = document.querySelector("#engine-allowed")
const engineRuleHits = document.querySelector("#engine-rule-hits")
const engineDetections = document.querySelector("#engine-detections")
const engineInterruptions = document.querySelector("#engine-interruptions")
const engineRecoveries = document.querySelector("#engine-recoveries")
const lastEvent = document.querySelector("#last-event")
const lastEventTime = document.querySelector("#last-event-time")
const eventList = document.querySelector("#event-list")
const statisticsToggle = document.querySelector("#statistics-toggle")
const statisticsPanel = document.querySelector("#statistics-panel")

function setText(
  element: Element | null,
  value: string
): void {
  if (element) {
    element.textContent = value
  }
}

function eventName(event: StatisticsEvent): string {
  const names: Record<StatisticsEvent["type"], string> = {
    "ad-detected": "Ad detected",
    "request-blocked": "Ad request blocked",
    "player-response": "Player response modified",
    "ad-placement": "Ad placement removed",
    "ad-displayed": "Ad displayed",
    "interruption-prevented": "Interruption prevented",
    "playback-recovery": "Playback recovered"
  }

  return names[event.type]
}

function eventTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}

function renderEvents(
  events: StatisticsEvent[]
): void {
  if (!eventList) {
    return
  }

  eventList.replaceChildren()

  if (events.length === 0) {
    const empty = document.createElement("span")
    empty.className = "event-meta"
    empty.textContent = "No events yet"
    eventList.appendChild(empty)
    return
  }

  for (const event of [...events].reverse()) {
    const item = document.createElement("div")
    item.className = "event"

    const name = document.createElement("span")
    name.className = "event-name"
    name.textContent = eventName(event)

    const meta = document.createElement("span")
    meta.className = "event-meta"
    meta.textContent = [
      eventTime(event.timestamp),
      event.details ?? ""
    ].filter(Boolean).join(" · ")

    item.append(name, meta)
    eventList.appendChild(item)
  }
}

type EngineStatistics = {
  runtime?: {
    requests?: number
    blocked?: number
    allowed?: number
    responses?: number
    rule_hits?: number
  }
  persistent?: {
    detections?: number
    interruptions_prevented?: number
    playback_recoveries?: number
    requests?: number
    blocked_requests?: number
    allowed_requests?: number
    responses?: number
    rule_hits?: number
    last_detection_at?: number
  }
}

function renderEngineStatistics(
  statistics: EngineStatistics
): void {
  const persistent = statistics.persistent ?? {}

  setText(
    engineRequests,
    String(persistent.requests ?? 0)
  )
  setText(
    engineBlocked,
    String(persistent.blocked_requests ?? 0)
  )
  setText(
    engineAllowed,
    String(persistent.allowed_requests ?? 0)
  )
  setText(
    engineRuleHits,
    String(persistent.rule_hits ?? 0)
  )
  setText(
    engineDetections,
    String(persistent.detections ?? 0)
  )
  setText(
    engineInterruptions,
    String(persistent.interruptions_prevented ?? 0)
  )
  setText(
    engineRecoveries,
    String(persistent.playback_recoveries ?? 0)
  )
}

function renderStatistics(
  statistics: ProtectionStatistics
): void {
  setText(detections, String(statistics.detections))
  setText(blocked, String(statistics.adRequestsBlocked))
  setText(displayed, String(statistics.adsDisplayed))
  setText(
    playerResponses,
    String(statistics.playerResponsesIntercepted)
  )
  setText(placements, String(statistics.adPlacementsRemoved))
  setText(
    prevented,
    String(statistics.interruptionsPrevented)
  )
  setText(
    recoveries,
    String(statistics.playbackRecoveries)
  )

  if (statistics.lastEvent) {
    setText(
      lastEvent,
      eventName(statistics.lastEvent)
    )
    setText(
      lastEventTime,
      eventTime(statistics.lastEvent.timestamp)
    )
  } else {
    setText(lastEvent, "No events yet")
    setText(lastEventTime, "")
  }

  renderEvents(statistics.recentEvents)
}

async function refresh(): Promise<void> {
  try {
    const settings =
      await requestData<ProtectionSettings>({
        type: "get-settings"
      })

    const statistics =
      await requestData<ProtectionStatistics>({
        type: "get-statistics"
      })

    const engine =
      await requestData<{ status: EngineState }>({
        type: "get-engine-status"
      })

    let engineStatistics: EngineStatistics | null = null

    if (engine.status === "running") {
      engineStatistics =
        await requestData<EngineStatistics>({
          type: "get-engine-stats"
        })
    }

    const engineStatus: Record<EngineState, string> = {
      unknown: "Engine: Unknown",
      checking: "Engine: Checking",
      running: "Engine: Running",
      unavailable: "Engine: Unavailable"
    }

    setText(
      status,
      `${settings.enabled ? "Active" : "Disabled"} · ${engineStatus[engine.status]}`
    )

    setText(
      toggle,
      settings.enabled ? "OFF" : "ON"
    )

    renderStatistics(statistics)

    if (engineStatistics) {
      renderEngineStatistics(engineStatistics)
    } else {
      renderEngineStatistics({})
    }
  } catch (error) {
    setText(
      status,
      error instanceof Error
        ? error.message
        : String(error)
    )
  }
}

toggle?.addEventListener(
  "click",
  async () => {
    const settings =
      await requestData<ProtectionSettings>({
        type: "get-settings"
      })

    await sendMessage({
      type: "set-protection-state",
      enabled: !settings.enabled
    })

    await refresh()
  }
)

statisticsToggle?.addEventListener("click", () => {
  if (!statisticsPanel || !statisticsToggle) {
    return
  }

  const expanded = statisticsPanel.classList.toggle("expanded")
  statisticsToggle.innerHTML = `Statistics <span>${expanded ? "▴" : "▾"}</span>`
})

void refresh()

