import fs from 'node:fs'
import WAWebJS from 'whatsapp-web.js'
import qrcode from 'qrcode-terminal'
import { PHONE_NUMBER, PREFIX, USER_AGENT } from './src/env.js'
import commands, { builtInMentions } from './src/commands.js'
import { logger, LoggerType } from './src/util/logger.js'
import { extractMentions, readMore, getParticipantsId, filterMyselfFromParticipants } from './src/util/wa.js'
import { chromePath, parseArgumentsStructured } from './src/util/misc.js'

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
  pairWithPhoneNumber: {
    phoneNumber: PHONE_NUMBER || '',
    showNotification: true,
  },
  userAgent: USER_AGENT,
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
  await client.setAutoDownloadAudio(false)
  await client.setAutoDownloadDocuments(false)
  await client.setAutoDownloadPhotos(false)
  await client.setAutoDownloadVideos(false)
  await client.setBackgroundSync(true)
  console.log(client.info.wid)
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

client.on('code', (code) => {
  console.log('Pairing Code:', code.match(/.{1,4}/g)?.join('-'))
})

client.on('message_create', async (message) => {
  const now = Date.now()
  let context = ''
  const matcher = [PREFIX]
  const parsed = parseArgumentsStructured(message.body, matcher)
  try {
    if (parsed) {
      const command = parsed.command.replace(new RegExp(`(${matcher.join('|')})(?=\\S)`), '')
      const { positional } = parsed
      const chat = await message.getChat()
      await chat.syncHistory()
      await chat.sendStateTyping()
      let success = false
      if (Object.hasOwn(commands, command)) {
        context = `message_create=\$${command === PREFIX ? positional[0] : command}`
        await commands[command].handler(message, parsed)
        success = true
      }
      if (success)
        logger(LoggerType.LOG, { name, fn, context: context }, 'Request handled:', `${(Date.now() - now) / 1000}s`)
    }
  } catch (e) {
    try {
      const err = e as Error
      await message.reply(`🤖 ${err.name}:\n\`\`\`${err.message}\`\`\``)
    } catch (e2) {
      logger(LoggerType.ERROR, { name, fn, context }, e2, 'Message:', {
        message: message.hasMedia ? message.type : message.body,
        parsed,
      })
    }
  }
  try {
    type Mention = keyof typeof builtInMentions
    const mentions = extractMentions(message.body)
    const retrievesIds: Record<Mention | string, string[]> = {}
    const retrievesFlatIds: Record<Mention | string, string[]> = {}
    let success = false
    for (const mention of mentions) {
      if (Object.hasOwn(builtInMentions, mention)) {
        const participantsIds = await builtInMentions[mention as keyof typeof builtInMentions](message)
        retrievesIds[mention] = (await filterMyselfFromParticipants(getParticipantsId(participantsIds))).participants
        retrievesFlatIds[mention] = (
          await filterMyselfFromParticipants(getParticipantsId(participantsIds, 'user'), 'Saya')
        ).participants
        success = true
      }
    }
    if (success) {
      context = `message_create=${mentions.map((e) => `@${e}`).join(',')}`
      logger(LoggerType.LOG, { name, fn, context: context }, 'Mention handled:', `${(Date.now() - now) / 1000}s`)
      const keys = Object.keys(retrievesIds)
      return await message.reply(
        `${keys.map((e) => (e === 'Saya' ? '*Saya*' : `*@${e}*`)).join(' ')}${readMore}\n\n${keys
          .map((e) => `${retrievesFlatIds[e].map((id) => (id === 'Saya' ? '*Saya*' : `@${id}`)).join(', ')}`)
          .join('\n\n')}`,
        undefined,
        {
          mentions: Object.values(retrievesIds).flat(),
        }
      )
    }
  } catch (e) {
    logger(LoggerType.ERROR, { name, fn, context }, e, 'Message:', { message: message.body, parsed })
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
      logger(LoggerType.INFO, { name, fn, context: 'version' }, await client.getWWebVersion())
      client.pupBrowser?.on('disconnected', () => {
        logger(LoggerType.WARN, { name, fn, context: 'disconnected' }, 'Browser disconnected.')
        process.exit(0)
      })
      break
    } catch (e) {
      initialized = true
      logger(LoggerType.ERROR, { name, fn, context: 'initialize' }, e)
      logger(LoggerType.WARN, { name, fn, context: 'initialize' }, 'Retrying client initialization in 5 seconds...')
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
}, 6 * 60 * 60 * 1000)

main()
