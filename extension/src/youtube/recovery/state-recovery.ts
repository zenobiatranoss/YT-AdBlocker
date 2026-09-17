import type { PlaybackSnapshot } from "../../shared/types"

export type PlaybackStateStore = {
  save: (snapshot: PlaybackSnapshot) => void
  get: () => PlaybackSnapshot | null
  clear: () => void
}

export function createPlaybackStateStore(): PlaybackStateStore {
  let snapshot: PlaybackSnapshot | null = null

  function save(nextSnapshot: PlaybackSnapshot): void {
    snapshot = {
      ...nextSnapshot
    }
  }

  function get(): PlaybackSnapshot | null {
    if (!snapshot) {
      return null
    }

    return {
      ...snapshot
    }
  }

  function clear(): void {
    snapshot = null
  }

  return {
    save,
    get,
    clear
  }
}
