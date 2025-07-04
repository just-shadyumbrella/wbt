import WAWebJS from 'whatsapp-web.js'
import qrcode from 'qrcode-terminal'
import fs from 'node:fs'
import { chromePath, logger, LoggerType, parseArguments, PREFIX } from './src/util.js'
import commands from './src/commands.js'

try {
  fs.rmSync('.wwebjs_cache', { recursive: true, force: true })
} catch (e) {
  console.error(e)
}

const name = 'index',
  fn = 'client'
const arg = process.argv[2]
if (arg === 'debug')
  logger(LoggerType.WARN, { name, fn: 'debug' }, 'Debug mode enabled. Unhide browser window and skip some prefetch.')
if (arg === 'pushauth')
  logger(LoggerType.WARN, { name, fn: 'pushauth' }, 'Push browser profile to cloud, automatically exit on ready.')

export const client = new WAWebJS.Client({
  authStrategy: new WAWebJS.LocalAuth({
    dataPath: './tokens',
  }),
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  puppeteer: {
    headless: arg === 'debug' ? false : true,
    executablePath: chromePath(),
    args: ['--no-sandbox','--disable-setuid-sandbox'],
    timeout: 0, // If browser startup slower
  },
})

client.on('auth_failure', (message) => logger(LoggerType.ERROR, { name, fn, context: 'auth_failure' }, message))
client.on('authenticated', () =>
  logger(LoggerType.INFO, { name, fn, context: 'authenticated' }, `Client authenticated.`)
)
client.on('disconnected', (message) => {
  logger(LoggerType.WARN, { name, fn, context: 'disconnected' }, `Client ${message.toLocaleLowerCase()}.`)
  if (message === 'LOGOUT') {
    logger(LoggerType.INFO, { name, fn, context: 'initialize' }, 'Reinitializing client...')
    main()
  }
})
client.on('loading_screen', (message) =>
  logger(LoggerType.LOG, { name, fn, context: 'loading_screen' }, `Client loading ${message}%`)
)
client.on('change_state', (state) =>
  logger(LoggerType.INFO, { name, fn, context: 'change_state' }, `Client \`${state}\`.`)
)
client.on('ready', async () => {
  logger(LoggerType.INFO, { name, fn, context: 'ready' }, `Client ready.`)
  if (arg === 'pushauth') {
    logger(LoggerType.WARN, { name, fn, context: 'pushauth' }, 'Awaiting client sync to be done...')
    setTimeout(async () => {
      logger(LoggerType.WARN, { name, fn: 'setTimeout', context: 'pushauth' }, 'Exiting...')
      await client.destroy()
      process.exit(0)
    }, 30000)
  }
})
client.on('remote_session_saved', (message) =>
  logger(LoggerType.LOG, { name, fn, context: 'remote_session_saved' }, `Client remote session saved`, message)
)
// client.on('message_revoke_everyone', (message) => console.log('Message revoked:', message))

client.on('qr', (qr) => {
  console.log('Scan QR:')
  qrcode.generate(qr, { small: true })
})

client.on('message_create', async (message) => {
  const params = parseArguments(message.body)
  if (params) {
    const command = params[0].replace(PREFIX, '')
    if (Object.hasOwn(commands, command)) {
      try {
        const now = Date.now()
        const chat = await message.getChat()
        chat.sendStateTyping()
        await commands[command].handler(message, params)
        logger(
          LoggerType.LOG,
          { name, fn, context: `message_create=\$${command}` },
          'Request handled:',
          `${(Date.now() - now) / 1000}s`
        )
      } catch (err) {
        logger(LoggerType.ERROR, { name, fn, context: `message_create=\$${command}` }, err, 'Params:', params)
      }
    }
  }
})

client.pupBrowser?.on('disconnected', () => {
  logger(LoggerType.ERROR, { name, fn, context: 'disconnected' }, 'Browser disconnected.')
})

let initialized = false
async function main() {
  while (true) {
    logger(
      initialized ? LoggerType.WARN : LoggerType.INFO,
      { name, fn, context: 'initialize' },
      initialized ? 'Reinitializing client...' : 'Initializing client...'
    )
    try {
      await client.initialize()
      break
    } catch (e) {
      initialized = true
      console.error(e)
      logger(LoggerType.ERROR, { name, fn, context: 'initialize' }, 'Retrying client initialization in 5 seconds...')
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }
}

setTimeout(async () => {
  logger(LoggerType.WARN, { name, fn: 'setTimeout', context: 'destroy' }, 'Shutting down due to timeout...')
  await client.destroy()
  process.exit(0)
}, 5 * 60 * 60 * 1000 + 50 * 60 * 1000) // Maximum 5:50

main()
