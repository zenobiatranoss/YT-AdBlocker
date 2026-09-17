export type DomDetection = {
  detected: boolean
  matches: string[]
}

const selectors = [
  ".ad-showing",
  ".ytp-ad-player-overlay",
  ".ytp-ad-overlay-container",
  ".ytp-ad-text",
  ".ytp-ad-preview-container",
  ".ytp-ad-image-overlay",
  ".video-ads.ytp-ad-module",
  ".ytp-ad-module",
  "#player-ads",
  ".ytd-display-ad-renderer",
  "ytd-ad-slot-renderer",
  "ytd-promoted-sparkles-web-renderer",
  "ytd-in-feed-ad-layout-renderer",
  "ytd-banner-promo-renderer"
]

export function detectAdElements(
  root: ParentNode = document
): DomDetection {
  const matches: string[] = []

  for (const selector of selectors) {
    try {
      if (root.querySelector(selector)) {
        matches.push(selector)
      }
    } catch {
      continue
    }
  }

  return {
    detected: matches.length > 0,
    matches
  }
}
