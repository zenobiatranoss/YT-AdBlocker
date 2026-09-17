export class ExtensionError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = "ExtensionError"
  }
}

export class MessageError extends ExtensionError {
  constructor(message: string) {
    super(message, "MESSAGE_ERROR")
    this.name = "MessageError"
  }
}

export class StorageError extends ExtensionError {
  constructor(message: string) {
    super(message, "STORAGE_ERROR")
    this.name = "StorageError"
  }
}
