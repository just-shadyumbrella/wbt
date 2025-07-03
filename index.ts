import WAWebJS from 'whatsapp-web.js'
import qrcode from 'qrcode-terminal'
import { chromePath, logger, LoggerType, parseArguments, PREFIX } from './src/util.js'
import commands from './src/commands.js'

const arg = process.argv[2]
if (arg === 'debug') logger(LoggerType.WARN, 'debug', 'Debug mode enabled. Unhide browser window and skip some prefetch.')
if (arg === 'pushauth')
  logger(LoggerType.WARN, 'pushauth', 'Push browser profile to cloud, automatically exit on ready.')

const client = new WAWebJS.Client({
  authStrategy: new WAWebJS.LocalAuth({
    dataPath: './tokens',
  }),
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  puppeteer: {
    headless: arg === 'debug' ? false : true,
    executablePath: chromePath(),
    timeout: 0, // Most runners issue
    args: ['--no-sandbox', '--disable-encryption', '--disable-machine-id'],
  },
})

client.on('auth_failure', (message) => logger(LoggerType.ERROR, 'index:client?auth_failure', message))
client.on('authenticated', () => logger(LoggerType.INFO, 'index:client?authenticated', `Client authenticated.`))
client.on('disconnected', (message) => {
  logger(LoggerType.WARN, 'index:client?disconnected', `Client ${message.toLocaleLowerCase()}.`)
  if (message === 'LOGOUT') {
    logger(LoggerType.INFO, 'client?initialize', 'Reinitializing client...')
    client.initialize().catch((_) => _) // Fixes
  }
})
client.on('loading_screen', (message) =>
  logger(LoggerType.LOG, 'index:client?loading_screen', `Client loading ${message}%`)
)
client.on('ready', async () => {
  logger(LoggerType.INFO, 'index:client?ready', `Client ready.`)
  if (arg === 'pushauth') {
    logger(LoggerType.WARN, 'index:client?ready', 'Push auth mode, exiting...')
    setTimeout(async() => {
      await client.destroy()
      process.exit(0)
    }, 30000);
  }
})
client.on('remote_session_saved', (message) =>
  logger(LoggerType.LOG, 'index:client?remote_session_saved', `Client remote session saved`, message)
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
          `index:client?message_create=\$${command}`,
          'Request handled:',
          `${(Date.now() - now) / 1000}s`
        )
      } catch (err) {
        logger(LoggerType.ERROR, `index:client?message_create=\$${command}`, err, 'Params:', params)
      }
    }
  }
})

logger(LoggerType.INFO, 'client?initialize', 'Initializing client...')
client.initialize().catch((_) => _) // Fixes

setTimeout(async () => {
  logger(LoggerType.WARN, 'setTimeout', 'Shutting down due to timeout...')
  await client.destroy()
  process.exit(0)
}, 5 * 60 * 60 * 1000 + 50 * 60 * 1000) // Maximum 5:50
