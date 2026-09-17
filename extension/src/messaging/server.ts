import type { ExtensionMessage } from "../shared/types"
import {
  failure,
  isExtensionMessage,
  type MessageHandler,
  type MessageResponse
} from "./messages"

type RuntimeMessageEvent = {
  addListener: (
    listener: (
      message: unknown,
      sender: unknown,
      sendResponse: (response: MessageResponse) => void
    ) => boolean | void
  ) => void
}

export function startMessageServer(handler: MessageHandler): void {
  if (typeof chrome === "undefined" || !chrome.runtime?.onMessage) {
    throw new Error("Browser messaging API is not available")
  }

  const event = chrome.runtime.onMessage as unknown as RuntimeMessageEvent

  event.addListener((message, _sender, sendResponse) => {
    if (!isExtensionMessage(message)) {
      sendResponse(failure("Invalid extension message"))
      return false
    }

    void handler(message as ExtensionMessage)
      .then(sendResponse)
      .catch(error => {
        const message =
          error instanceof Error ? error.message : "Unknown message error"

        sendResponse(failure(message))
      })

    return true
  })
}
