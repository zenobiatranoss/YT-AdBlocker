export type BehaviorSnapshot = {
  currentTime: number
  paused: boolean
  seeking: boolean
  playbackRate: number
}

export type BehaviorDetection = {
  suspicious: boolean
  score: number
  reasons: string[]
}

export function analyzePlaybackBehavior(
  before: BehaviorSnapshot,
  after: BehaviorSnapshot
): BehaviorDetection {
  const reasons: string[] = []
  let score = 0

  const timeMovedBackward =
    after.currentTime + 0.25 < before.currentTime

  if (
    timeMovedBackward &&
    !before.seeking &&
    !after.seeking
  ) {
    score += 35
    reasons.push("unexpected-backward-seek")
  }

  if (
    !before.paused &&
    after.paused &&
    !before.seeking &&
    !after.seeking
  ) {
    score += 20
    reasons.push("unexpected-pause")
  }

  if (
    before.playbackRate > 0 &&
    after.playbackRate === 0
  ) {
    score += 20
    reasons.push("playback-rate-zero")
  }

  return {
    suspicious: score >= 35,
    score,
    reasons
  }
}
