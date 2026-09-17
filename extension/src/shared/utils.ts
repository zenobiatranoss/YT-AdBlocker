export function clamp(value: number, minimum: number, maximum: number): number {
  if (value < minimum) {
    return minimum
  }

  if (value > maximum) {
    return maximum
  }

  return value
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function createId(prefix = "ytab"): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now().toString(36)}-${random}`
}
