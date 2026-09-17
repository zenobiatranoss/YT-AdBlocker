function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^\.+/, "")
}

export function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

export function domainMatches(
  hostname: string,
  domain: string
): boolean {
  const host = normalizeDomain(hostname)
  const target = normalizeDomain(domain)

  if (!host || !target) {
    return false
  }

  return host === target || host.endsWith(`.${target}`)
}
