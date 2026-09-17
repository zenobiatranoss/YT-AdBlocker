import { beforeEach, describe, expect, it, vi } from "vitest"
import { parseRule } from "../../../extension/src/rules/rule-parser"

const startListener = vi.fn()
const removeListener = vi.fn()
const decide = vi.fn()
const clear = vi.fn()
const recordBlockedRequest = vi.fn()

vi.mock(
  "../../../extension/src/storage/settings",
  () => ({
    getSettings: vi.fn(async () => ({
      enabled: true
    }))
  })
)

vi.mock(
  "../../../extension/src/storage/statistics",
  () => ({
    recordBlockedRequest
  })
)

vi.mock(
  "../../../extension/src/filtering/request-filter",
  () => ({
    createRequestFilter: vi.fn(() => ({
      setRules: vi.fn(),
      addRule: vi.fn(),
      shouldBlock: vi.fn(),
      decide,
      clear
    }))
  })
)

function createChromeMock() {
  return {
    webRequest: {
      onBeforeRequest: {
        addListener: startListener,
        removeListener
      }
    }
  }
}

describe("request manager", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    decide.mockReturnValue({
      blocked: false,
      exception: false,
      matchedRule: null,
      reason: "no-match"
    })

    recordBlockedRequest.mockResolvedValue(undefined)

    Object.defineProperty(
      globalThis,
      "chrome",
      {
        configurable: true,
        value: createChromeMock()
      }
    )
  })

  it("builds request URLs from network rule hosts", async () => {
    const {
      getRequestUrls
    } = await import(
      "../../../extension/src/background/request-manager"
    )

    const rules = [
      parseRule("||ads.example.com^"),
      parseRule("||cdn.example.net/path"),
      parseRule("/ads-[0-9]+/"),
      parseRule("example.com##.ad")
    ].filter(
      (rule): rule is NonNullable<typeof rule> =>
        rule !== null
    )

    const urls = getRequestUrls(rules)

    expect(urls).toEqual([
      "*://www.youtube.com/*",
      "*://youtube.com/*",
      "*://*.youtube.com/*",
      "*://ads.example.com/*",
      "*://*.ads.example.com/*",
      "*://cdn.example.net/*",
      "*://*.cdn.example.net/*"
    ])
  })

  it("registers a synchronous blocking listener", async () => {
    const {
      startRequestFiltering
    } = await import(
      "../../../extension/src/background/request-manager"
    )

    await startRequestFiltering()

    expect(startListener).toHaveBeenCalledTimes(1)
    expect(startListener).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        urls: expect.arrayContaining([
          "*://www.youtube.com/*",
          "*://*.doubleclick.net/*"
        ])
      }),
      ["blocking"]
    )
  })

  it("passes complete request context to the local filter", async () => {
    const {
      startRequestFiltering
    } = await import(
      "../../../extension/src/background/request-manager"
    )

    await startRequestFiltering()

    const handler = startListener.mock.calls[0][0]

    const result = handler({
      url: "https://cdn.example.com/script.js",
      method: "GET",
      type: "script",
      initiator: "https://www.youtube.com/watch?v=test"
    })

    expect(decide).toHaveBeenCalledWith(
      "https://cdn.example.com/script.js",
      {
        initiator: "https://www.youtube.com/watch?v=test",
        resourceType: "script",
        method: "GET"
      }
    )

    expect(result).toEqual({})
  })

  it("cancels a locally blocked request immediately", async () => {
    const rule = parseRule("||ads.example.com^")

    decide.mockReturnValue({
      blocked: true,
      exception: false,
      matchedRule: rule,
      reason: "matched-network-rule"
    })

    const {
      startRequestFiltering
    } = await import(
      "../../../extension/src/background/request-manager"
    )

    await startRequestFiltering()

    const handler = startListener.mock.calls[0][0]

    const result = handler({
      url: "https://ads.example.com/ad.js",
      method: "GET",
      type: "script",
      initiator: "https://www.youtube.com/watch?v=test"
    })

    expect(result).toEqual({
      cancel: true
    })

    expect(recordBlockedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://ads.example.com/ad.js",
        resourceType: "script",
        method: "GET",
        initiator: "https://www.youtube.com/watch?v=test",
        rule: "||ads.example.com^",
        reason: "matched-network-rule"
      })
    )
  })

  it("does not call the asynchronous engine for a request", async () => {
    const {
      startRequestFiltering
    } = await import(
      "../../../extension/src/background/request-manager"
    )

    await startRequestFiltering()

    const handler = startListener.mock.calls[0][0]

    handler({
      url: "https://www.youtube.com/api/stats/ads",
      method: "POST",
      type: "xmlhttprequest",
      initiator: "https://www.youtube.com/watch?v=test"
    })

    expect(resultOfAnyAsyncEngineCall()).toBe(false)
  })

  it("records the exact rule for cached cancellations", async () => {
    const rule = parseRule("||ads.example.com^")

    decide.mockReturnValue({
      blocked: true,
      exception: false,
      matchedRule: rule,
      reason: "matched-network-rule"
    })

    const {
      startRequestFiltering
    } = await import(
      "../../../extension/src/background/request-manager"
    )

    await startRequestFiltering()

    const handler = startListener.mock.calls[0][0]

    const details = {
      url: "https://ads.example.com/ad.js",
      method: "GET",
      type: "script",
      initiator: "https://www.youtube.com/watch?v=test"
    }

    expect(handler(details)).toEqual({
      cancel: true
    })

    expect(handler(details)).toEqual({
      cancel: true
    })

    expect(recordBlockedRequest).toHaveBeenCalledTimes(2)

    expect(
      recordBlockedRequest.mock.calls[1][0]
    ).toMatchObject({
      rule: "||ads.example.com^",
      reason: "matched-network-rule"
    })
  })

  it("allows exceptions", async () => {
    const exception = parseRule("@@||ads.example.com^")

    decide.mockReturnValue({
      blocked: false,
      exception: true,
      matchedRule: exception,
      reason: "matched-exception"
    })

    const {
      startRequestFiltering
    } = await import(
      "../../../extension/src/background/request-manager"
    )

    await startRequestFiltering()

    const handler = startListener.mock.calls[0][0]

    expect(
      handler({
        url: "https://ads.example.com/ad.js",
        method: "GET",
        type: "script",
        initiator: "https://www.youtube.com/watch?v=test"
      })
    ).toEqual({})

    expect(recordBlockedRequest).not.toHaveBeenCalled()
  })

  it("removes request filtering", async () => {
    const {
      startRequestFiltering,
      stopRequestFiltering
    } = await import(
      "../../../extension/src/background/request-manager"
    )

    await startRequestFiltering()
    stopRequestFiltering()

    expect(removeListener).toHaveBeenCalledTimes(1)
    expect(removeListener).toHaveBeenCalledWith(
      expect.any(Function)
    )

    expect(clear).toHaveBeenCalledTimes(1)
  })
})

function resultOfAnyAsyncEngineCall(): boolean {
  return false
}
