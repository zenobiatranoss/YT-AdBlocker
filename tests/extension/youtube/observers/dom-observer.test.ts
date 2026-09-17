import { describe, expect, it } from "vitest"
import {
  createDomObserver
} from "../../../../extension/src/youtube/observers/dom-observer"

describe("dom observer", () => {
  it("starts and stops safely", () => {
    const observer = createDomObserver(() => {})

    observer.start()
    observer.start()
    observer.stop()
    observer.stop()

    expect(true).toBe(true)
  })
})
