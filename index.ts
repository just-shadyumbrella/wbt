import pkg from 'whatsapp-web.js'
const { Client, LocalAuth } = pkg
import qrcode from 'qrcode-terminal'
import { chromePath, logger, LoggerType, parseArguments } from './src/util.js'
import commands from './src/commands.js'

/* CONSTANTS */

const client = new Client({
  authStrategy: new LocalAuth(),
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Safari/605.1.15',
  puppeteer: {
    headless: false,
    executablePath: chromePath(),
    timeout: 0, // Most runners issue
    args: ['--no-sandbox', '--disable-encryption', '--disable-machine-id'],
  },
})

client.on('auth_failure', (message) => logger(LoggerType.ERROR, 'index:client?auth_failure', message))
client.on('authenticated', () => logger(LoggerType.LOG, 'index:client?authenticated', 'Client authenticated.'))
client.on('disconnected', (message) => logger(LoggerType.WARN, 'index:client?disconnected', `Client \`${message}\``))
client.on('loading_screen', (message) =>
  logger(LoggerType.LOG, 'index:client?loading_screen', `Client loading ${message}%`)
)
client.on('ready', () => logger(LoggerType.INFO, 'index:client?ready', `Client ready.`))
client.on('remote_session_saved', (message) =>
  logger(LoggerType.LOG, 'index:client?remote_session_saved', `Client remote session saved`, message)
)
// client.on('message_revoke_everyone', (message) => console.log('Message revoked:', message))

client.on('qr', (qr) => {
  console.log('Scan QR:')
  qrcode.generate(qr, { small: true })
})

client.on('message_create', async (message) => {
  const parsed = parseArguments(message.body)
  if (!parsed) return
  const [command, params] = parsed
  if (Object.hasOwn(commands, command)) {
    try {
      await commands[command].handler(message, params)
    } catch (err) {
      logger(LoggerType.ERROR, `index:client?message_create=\$${command}`, err, 'Params:', err)
    }
  }
})

client.initialize()
