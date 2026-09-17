import { startLifecycle } from "./lifecycle"
import { handleMessage } from "./message-router"
import { startMessageServer } from "../messaging/server"
import { startRequestFiltering } from "./request-manager"
import { checkEngine } from "./native-bridge"

async function bootstrap(): Promise<void> {
  startLifecycle()
  startMessageServer(handleMessage)

  await checkEngine()
  await startRequestFiltering()
}

void bootstrap()
