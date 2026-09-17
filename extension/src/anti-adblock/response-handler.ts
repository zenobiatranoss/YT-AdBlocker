import type { AntiAdblockAnalysis } from "./analyzer"
import type { AntiAdblockRecoveryResult } from "./recovery"

export type AntiAdblockResponse = {
  handled: boolean
  recovery: AntiAdblockRecoveryResult | null
}

export async function handleAntiAdblock(
  analysis: AntiAdblockAnalysis,
  recover: () => Promise<AntiAdblockRecoveryResult>
): Promise<AntiAdblockResponse> {
  if (!analysis.detected) {
    return {
      handled: false,
      recovery: null
    }
  }

  const recovery = await recover()

  return {
    handled: recovery.attempted,
    recovery
  }
}
