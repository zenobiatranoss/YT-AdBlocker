import {
  describe,
  expect,
  it
} from "vitest"

import {
  isYouTubePlayerRequest,
  sanitizePlayerResponse
} from "../../../extension/src/page/page-interceptor"

describe("page interceptor", () => {
  it("recognizes YouTube player requests", () => {
    expect(
      isYouTubePlayerRequest(
        "https://www.youtube.com/youtubei/v1/player?key=test"
      )
    ).toBe(true)

    expect(
      isYouTubePlayerRequest(
        "https://youtube.com/youtubei/v1/player"
      )
    ).toBe(true)

    expect(
      isYouTubePlayerRequest(
        "https://www.youtube.com/watch?v=test"
      )
    ).toBe(false)

    expect(
      isYouTubePlayerRequest(
        "https://example.com/youtubei/v1/player"
      )
    ).toBe(false)
  })

  it("removes player ad metadata", () => {
    const input = JSON.stringify({
      playabilityStatus: {
        status: "OK"
      },
      adPlacements: [
        {
          renderer: {
            adBreakRenderer: {}
          }
        }
      ],
      adSlots: [
        {
          adSlotRenderer: {}
        }
      ],
      playerAds: [
        {
          playerAdParams: {}
        }
      ]
    })

    const result = sanitizePlayerResponse(input)
    const parsed = JSON.parse(result.text)

    expect(result.modified).toBe(true)
    expect(parsed.playabilityStatus.status).toBe("OK")
    expect(parsed.adPlacements).toEqual([])
    expect(parsed.adSlots).toEqual([])
    expect(parsed.playerAds).toEqual([])
  })

  it("sanitizes nested ad metadata", () => {
    const input = JSON.stringify({
      responseContext: {},
      playerResponse: {
        adPlacements: [
          {
            renderer: {}
          }
        ],
        videoDetails: {
          videoId: "test"
        }
      }
    })

    const result = sanitizePlayerResponse(input)
    const parsed = JSON.parse(result.text)

    expect(result.modified).toBe(true)
    expect(parsed.playerResponse.adPlacements).toEqual([])
    expect(
      parsed.playerResponse.videoDetails.videoId
    ).toBe("test")
  })

  it("preserves responses without ad metadata", () => {
    const input = JSON.stringify({
      playabilityStatus: {
        status: "OK"
      },
      streamingData: {
        formats: []
      }
    })

    const result = sanitizePlayerResponse(input)

    expect(result.modified).toBe(false)
    expect(result.text).toBe(input)
  })

  it("does not modify invalid JSON", () => {
    const input = "not-json"

    const result = sanitizePlayerResponse(input)

    expect(result.modified).toBe(false)
    expect(result.text).toBe(input)
  })
})

describe("initial player response sanitization", () => {
  it("removes embedded ad metadata without removing playback data", async () => {
    const module = await import(
      "../../../extension/src/page/page-interceptor"
    )

    const response = {
      playabilityStatus: {
        status: "OK"
      },
      videoDetails: {
        videoId: "test"
      },
      streamingData: {
        formats: [
          {
            url: "https://example.com/video"
          }
        ]
      },
      adPlacements: [
        {
          renderer: {
            adBreakServiceRenderer: {}
          }
        }
      ],
      playerAds: [
        {
          playerAdParams: {
            showInstream: true
          }
        }
      ]
    }

    const sanitized = JSON.parse(
      module.sanitizePlayerResponse(
        JSON.stringify(response)
      ).text
    )

    expect(sanitized.playabilityStatus.status).toBe("OK")
    expect(sanitized.videoDetails.videoId).toBe("test")
    expect(sanitized.streamingData.formats).toHaveLength(1)
    expect(sanitized.adPlacements).toEqual([])
    expect(sanitized.playerAds).toEqual([])
  })
})

describe("initial player response sanitization", () => {
  it("removes embedded ad metadata without removing playback data", async () => {
    const module = await import(
      "../../../extension/src/page/page-interceptor"
    )

    const response = {
      playabilityStatus: {
        status: "OK"
      },
      videoDetails: {
        videoId: "test"
      },
      streamingData: {
        formats: [
          {
            url: "https://example.com/video"
          }
        ]
      },
      adPlacements: [
        {
          renderer: {
            adBreakServiceRenderer: {}
          }
        }
      ],
      playerAds: [
        {
          playerAdParams: {
            showInstream: true
          }
        }
      ]
    }

    const sanitized = JSON.parse(
      module.sanitizePlayerResponse(
        JSON.stringify(response)
      ).text
    )

    expect(sanitized.playabilityStatus.status).toBe("OK")
    expect(sanitized.videoDetails.videoId).toBe("test")
    expect(sanitized.streamingData.formats).toHaveLength(1)
    expect(sanitized.adPlacements).toEqual([])
    expect(sanitized.playerAds).toEqual([])
  })
})
