import WAWebJS from 'whatsapp-web.js'
import qrcode from 'qrcode-terminal'
import fs from 'node:fs'
import {
  chromePath,
  extractCommandFromPrefix,
  logger,
  LoggerType,
  parseArguments,
  parseArgumentsStructured,
  PREFIX,
} from './src/util.js'
import commands, { caiCommands } from './src/commands.js'

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
  userAgent:
    process.env.USER_AGENT ||
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  puppeteer: {
    headless: arg === 'debug' ? false : true,
    executablePath: chromePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
  logger(LoggerType.INFO, { name, fn, context: 'change_state' }, 'Client state:', state)
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
  const now = Date.now()
  let context = ''
  const matcher = [PREFIX, '<']
  const params = parseArguments(message.body, matcher)
  const parsed = parseArgumentsStructured(message.body, matcher)
  try {
    if (params && parsed) {
      const command = extractCommandFromPrefix(parsed.command, matcher)
      const chat = await message.getChat()
      chat.sendStateTyping()
      if (Object.hasOwn(commands, command)) {
        context = `message_create=\$${command}${command === PREFIX ? '!' : ''}`
        await commands[command].handler(message, params, parsed)
      } else if (Object.hasOwn(caiCommands, command)) {
        context = `message_create=<${command === matcher[1] ? `${params[1]}!${params[2]}` : command}`
        await caiCommands[command].handler(message, params, parsed)
      }
      logger(LoggerType.LOG, { name, fn, context: context }, 'Request handled:', `${(Date.now() - now) / 1000}s`)
    }
  } catch (err) {
    logger(LoggerType.ERROR, { name, fn, context }, err, 'Data:', { params, parsed })
  }
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
      client.pupBrowser?.on('disconnected', () => {
        logger(LoggerType.WARN, { name, fn, context: 'disconnected' }, 'Browser disconnected.')
        process.exit(0)
      })
      break
    } catch (e) {
      initialized = true
      logger(LoggerType.ERROR, { name, fn, context: 'initialize' }, 'Retrying client initialization in 5 seconds...')
      await new Promise((resolve) => setTimeout(resolve, 5000))
      console.clear()
      await client.destroy()
    }
  }
}

setTimeout(async () => {
  logger(LoggerType.WARN, { name, fn: 'setTimeout', context: 'destroy' }, 'Shutting down due to timeout...')
  await client.destroy()
  process.exit(0)
}, 5 * 60 * 60 * 1000 + 55 * 60 * 1000) // Maximum 5:55

main()
