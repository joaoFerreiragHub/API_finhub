import { createClient } from 'redis'
import { logError, logInfo } from '../utils/logger'

interface RedisClientConfig {
  url: string
  connectTimeoutMs: number
  label?: string
}

export type AppRedisClient = ReturnType<typeof createClient>

let sharedRedisClient: AppRedisClient | null = null
let sharedRedisConfigKey: string | null = null
let sharedRedisLabel = 'default'

const buildRedisConfigKey = (config: RedisClientConfig): string =>
  `${config.url}|${config.connectTimeoutMs}`

export const getOrCreateRedisClient = (config: RedisClientConfig): AppRedisClient => {
  const configKey = buildRedisConfigKey(config)

  if (sharedRedisClient) {
    if (sharedRedisConfigKey !== configKey) {
      throw new Error('Redis client ja inicializado com configuracao diferente.')
    }
    return sharedRedisClient
  }

  sharedRedisLabel = config.label ?? 'default'

  const client = createClient({
    url: config.url,
    socket: {
      connectTimeout: config.connectTimeoutMs,
      reconnectStrategy: (attempts: number) => Math.min(attempts * 200, 2000),
    },
  })

  client.on('error', (error) => {
    logError('redis_client_error', error, { label: sharedRedisLabel })
  })

  client.on('ready', () => {
    logInfo('redis_client_ready', { label: sharedRedisLabel })
  })

  sharedRedisClient = client
  sharedRedisConfigKey = configKey

  return client
}

export const connectRedisClient = async (client: AppRedisClient): Promise<void> => {
  if (!client.isOpen) {
    await client.connect()
  }

  await client.ping()
}

export const closeRedisClient = async (): Promise<void> => {
  if (!sharedRedisClient) {
    return
  }

  const clientToClose = sharedRedisClient
  sharedRedisClient = null
  sharedRedisConfigKey = null

  if (!clientToClose.isOpen) {
    return
  }

  try {
    await clientToClose.quit()
  } catch (error) {
    logError('redis_client_close_failed', error, { label: sharedRedisLabel })
  }
}
