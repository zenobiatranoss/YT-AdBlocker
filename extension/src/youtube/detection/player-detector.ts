export type PlayerDetection = {
  detected: boolean
  reasons: string[]
}

function hasAdShowing(player: Element | null): boolean {
  return Boolean(player?.classList.contains("ad-showing"))
}

function hasAdAttributes(player: Element | null): boolean {
  if (!player) {
    return false
  }

  return (
    player.hasAttribute("data-ad-showing") ||
    player.getAttribute("data-ad-showing") === "true"
  )
}

export function detectPlayerAdState(
  root: ParentNode = document
): PlayerDetection {
  const reasons: string[] = []

  const player =
    root.querySelector("#movie_player") ??
    root.querySelector(".html5-video-player")

  if (hasAdShowing(player)) {
    reasons.push("ad-showing")
  }

  if (hasAdAttributes(player)) {
    reasons.push("data-ad-showing")
  }

  return {
    detected: reasons.length > 0,
    reasons
  }
}
