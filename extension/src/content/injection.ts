let injected = false

export function injectPageInterceptor(): void {
  if (
    injected ||
    typeof document === "undefined"
  ) {
    return
  }

  injected = true

  const script = document.createElement("script")

  script.src = chrome.runtime.getURL(
    "page-interceptor.js"
  )

  script.dataset.ytAdblocker = "true"

  const target =
    document.head ||
    document.documentElement

  target.appendChild(script)
  script.remove()
}
