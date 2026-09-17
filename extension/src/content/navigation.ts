export type NavigationListener = (
  url: string
) => void

const navigationEvents = [
  "yt-navigate-finish",
  "popstate",
  "yt-page-data-updated"
]

export function listenToNavigation(
  listener: NavigationListener
): () => void {
  let previousUrl = window.location.href

  const check = () => {
    const nextUrl = window.location.href

    if (nextUrl === previousUrl) {
      return
    }

    previousUrl = nextUrl
    listener(nextUrl)
  }

  for (const event of navigationEvents) {
    window.addEventListener(event, check)
  }

  return () => {
    for (const event of navigationEvents) {
      window.removeEventListener(event, check)
    }
  }
}
