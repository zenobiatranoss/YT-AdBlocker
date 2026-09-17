type NativeResponse<T = unknown> = {
  id?: string
  ok: boolean
  status?: number
  data?: T
  error?: string
}

type NativeMessage = {
  type:
    | "status"
    | "stats"
    | "rules"
    | "filter"
    | "detection"
    | "interruption-prevented"
    | "playback-recovery"
  id: string
  body?: unknown
}

class NativeClient {
  private port: chrome.runtime.Port | null = null
  private pending = new Map<
    string,
    {
      resolve: (value: unknown) => void
      reject: (reason: unknown) => void
      timer: ReturnType<typeof setTimeout>
    }
  >()

  private connect(): chrome.runtime.Port {
    if (this.port) {
      return this.port
    }

    const port = chrome.runtime.connectNative("yt_adblocker")

    this.port = port

    port.onMessage.addListener(message => {
      this.handleResponse(message as NativeResponse)
    })

    port.onDisconnect.addListener(() => {
      const error =
        chrome.runtime.lastError?.message ??
        "native host disconnected"

      if (this.port === port) {
        this.port = null
      }

      for (const [id, pending] of this.pending) {
        clearTimeout(pending.timer)
        pending.reject(new Error(error))
        this.pending.delete(id)
      }
    })

    return port
  }

  async request<T = unknown>(
    type: NativeMessage["type"],
    body?: unknown,
    timeout = 15000
  ): Promise<T> {
    const id = crypto.randomUUID()
    const port = this.connect()

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error("native host request timed out"))
      }, timeout)

      this.pending.set(id, {
        resolve: value => resolve(value as T),
        reject,
        timer
      })

      try {
        port.postMessage({
          type,
          id,
          ...(body !== undefined ? { body } : {})
        } satisfies NativeMessage)
      } catch (error) {
        clearTimeout(timer)
        this.pending.delete(id)

        if (this.port === port) {
          this.port = null
        }

        reject(error)
      }
    })
  }

  async status(): Promise<unknown> {
    return this.request("status")
  }

  async stats(): Promise<unknown> {
    return this.request("stats")
  }

  async rules(): Promise<unknown> {
    return this.request("rules")
  }

  async filter<T = unknown>(
    body: unknown,
    timeout = 750
  ): Promise<T> {
    return this.request<T>("filter", body, timeout)
  }

  disconnect(): void {
    const port = this.port

    this.port = null

    port?.disconnect()
  }

  private handleResponse(response: NativeResponse): void {
    if (!response.id) {
      return
    }

    const pending = this.pending.get(response.id)

    if (!pending) {
      return
    }

    this.pending.delete(response.id)
    clearTimeout(pending.timer)

    if (!response.ok) {
      pending.reject(
        new Error(
          response.error ??
          "native request failed"
        )
      )
      return
    }

    pending.resolve(response.data)
  }
}

export const nativeClient = new NativeClient()
