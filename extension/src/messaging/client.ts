import type { ExtensionMessage } from "../shared/types"
import type { MessageResponse } from "./messages"

type RuntimeClient = {
  sendMessage: (message: ExtensionMessage) => Promise<MessageResponse>
}

function getRuntime(): RuntimeClient {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    throw new Error("Browser messaging API is not available")
  }

  return chrome.runtime as unknown as RuntimeClient
}

export async function sendMessage(
  message: ExtensionMessage
): Promise<MessageResponse> {
  return getRuntime().sendMessage(message)
}

export async function requestData<T>(
  message: ExtensionMessage
): Promise<T> {
  const response = await sendMessage(message)

  if (!response.ok) {
    throw new Error(response.error)
  }

  return response.data as T
}
