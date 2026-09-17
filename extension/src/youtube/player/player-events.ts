export type PlayerEventName =
  | "play"
  | "pause"
  | "playing"
  | "waiting"
  | "seeking"
  | "seeked"
  | "ended"
  | "ratechange"
  | "timeupdate"
  | "durationchange"

export type PlayerEventListener = (
  event: Event,
  video: HTMLVideoElement
) => void

const playerEvents: PlayerEventName[] = [
  "play",
  "pause",
  "playing",
  "waiting",
  "seeking",
  "seeked",
  "ended",
  "ratechange",
  "timeupdate",
  "durationchange"
]

export function listenToPlayer(
  video: HTMLVideoElement,
  listener: PlayerEventListener
): () => void {
  const handlers = new Map<PlayerEventName, EventListener>()

  for (const name of playerEvents) {
    const handler: EventListener = event => {
      listener(event, video)
    }

    handlers.set(name, handler)
    video.addEventListener(name, handler)
  }

  return () => {
    for (const [name, handler] of handlers) {
      video.removeEventListener(name, handler)
    }

    handlers.clear()
  }
}
