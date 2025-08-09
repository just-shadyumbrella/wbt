import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import WAWebJS, { MessageMedia } from 'whatsapp-web.js'
import { create, all } from 'mathjs'
import { client } from '../index.js'
import { chars, chat, chatUsingHistory, history, memorySlotLimit } from './ai/@openrouter.js'
import warn from './db/warn.js'
import { logger, LoggerType } from './util/logger.js'
import { pkg, sysinfo, tmpDir } from './util/si.js'
import { ParsedCommand, PREFIX, isAdmin, useHelp, extractFlatPhoneNumberFromMessage, getChat } from './util/wa.js'
import { YTdlp } from './cli.js'

const math = create(all)
const WBT = {
  'Menu Utama': {
    start: {
      description: 'Hello world.',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        return await message.reply(
          `🤖 Mode bot aktif! 😁\n\nSilahkan kirim perintah \`${PREFIX}help\` untuk list perintah.`
        )
      },
    },
    help: {
      description: 'Menampilkan pesan ini.',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        return await message.reply(help)
      },
    },
    status: {
      description: 'Cek status host.',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        return await message.reply(await sysinfo())
      },
    },
    upcoming: {
      description: 'Cek fitur-fitur yang direncanakan developer.',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        return await message.reply(fs.readFileSync(path.join(process.cwd(), 'src', 'upcoming.md')).toString())
      },
    },
  },
  /*
  'Menu Grup (belum selesai)': {
    promote: {
      description: 'Cek status host.',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        return await message.reply(await sysinfo())
      },
    },
    demote: {
      description: 'Cek status host.',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        return await message.reply(await sysinfo())
      },
    },
    warn: {
      description: 'null. 👑',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        if (await isAdmin(message)) {
          const command = params.shift()
          if (params.length < 1)
            return await message.reply(useHelp([`${command} <@mention> <level?>`, `[MESSAGE] ↩️ ${command} <level?>`]))
          const who = await(async () => {
            const expect = params[0]
            const isLevel = Number(expect)
            if (isNaN(isLevel)) {
              if (expect.startsWith('@')) {
                return expect.replace('@', '')
              }
            } else if (message.hasQuotedMsg) {
              const msgQ = await message.getQuotedMessage()
              return await extractFlatPhoneNumberFromMessage(msgQ)
            }
          })()
          const level = Number(params[params.length - 1])
          if (who && level) {
            const { numbers } = await warn.get(message.id.remote)
            numbers.
          }
        }
      },
    },
    setwarn: {
      description: 'null. 👑',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        if (await isAdmin(message)) {
          warn.set({ chat_id: message.id.remote })
          return await message.reply('Warn setup.')
        }
      },
    },
  },*/
  'Menu Fun': {
    percent: {
      description: 'Seberapa persen keberuntungan kamu.',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        const command = params.shift()
        if (params.length < 1) return await message.reply(useHelp([`${command} <pertanyaan>`]))
        return await message.reply(`${Math.round(Math.random() * 100).toString()}%`)
      },
    },
  },
  'Karakter AI (experimental!)': {
    /*
    new: {
      description: 'Buat room baru.',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        const command = params.shift()
        if (params.length < 1) return await message.reply(useHelp([`${command} <nama karakter> <room name>`]))
        const charName = params.shift()
        if (charName) {
          const roomName = params.join(' ')
          const result = await cai.new(roomName, message.id.remote, charName)
          return await message.reply(`Room ${roomName} telah dibuat.`)
        }
      },
    },
    */
    list: {
      description: 'List karakter AI yang tersedia.',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        params.shift()
        const Chars = Object.keys(chars).map((e) => `*@${e}*`)
        return await message.reply(`*🎭 List karakter AI yang tersedia:*\n\n${Chars.join('\n')}`)
      },
    },
  },
  'Menu Lain': {
    math: {
      description: 'Pustaka mathjs.org (alpha: entahlah, coba aja pake)',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        const command = params.shift()
        if (params.length < 1) return await message.reply(useHelp([`${command} <expressions>`]))
        return await message.reply(math.evaluate(params.join(' ')).toString())
      },
    },
    tomedia: {
      description: 'Ubah link jadi media WhatsApp.',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        const command = params.shift()
        let link = ''
        if (message.hasQuotedMsg && message.type === WAWebJS.MessageTypes.TEXT) {
          const msgQ = await message.getQuotedMessage()
          link = msgQ.links[0].link
        } else if (params.length < 1) {
          return await message.reply(useHelp([`${command} [hd] [<number: resolution>] ↩️? <link>`]))
        } else {
          link = message.links[0].link
        }
        try {
          const filepath = path.join(process.cwd(), '.tmp', crypto.randomBytes(16).toString('hex'))
          await YTdlp(link, `--merge-output-format mkv -o ${filepath}`.split(' '))
          const mediaUpload = WAWebJS.MessageMedia.fromFilePath(filepath)
          return await message.reply(mediaUpload, undefined, {
            caption: '_Info menyusul..._',
          })
        } catch (error) {
          throw error
        }
      },
    },
    /*
    waq: {
      description: 'Whatsapp sticker',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        const command = params[0]
        if (message.hasQuotedMsg) {
          const contact = await message.getContact()
          const name = contact.pushname
          const number = await contact.getFormattedNumber()
          const pp = await contact.getProfilePicUrl()
          const realMsg = message.body
          const waq = await client.pupBrowser?.newPage()
          await waq?.setContent(`<body style="background: transparent">
  <div class="container">
    <img src="./.tmp/rsi.jpeg" />
    <div class="triangle"></div>
    <div class="chat">
      <div class="header">
        <span class="username">Fulan binti Fulani Al-Fulana</span>
        <span class="number">+62 812-3456-7890</span>
      </div>
      <article class="message"></article>
    </div>
  </div>
  <style>
    .container {
      display: flex;
      font-family: Roboto, system-ui;
      font-size: 12px;
      line-height: 1.25;
    }
    .container img {
      height: 24px;
      width: 24px;
      border-radius: 50%;
    }
    .container .triangle {
      position: relative;
      width: 0;
      height: 0;
      border-top: 6px solid white;
      border-left: 6px solid transparent;
      left: 1;
    }
    .container .chat {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0.25rem 0.5rem;
      background: white;
      border-radius: 0 0.75rem 0.75rem 0.75rem;
      box-shadow: 0 1px 1px 0px rgb(0 0 0 / 0.25);
    }
    .container .chat .header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .container .chat .header .username {
      font-weight: bold;
      color: #e91e63;
    }
    .container .chat .header .number {
      color: grey;
      white-space: nowrap;
    }
    .container .chat .message {
      margin: 0;
      width: 100%;
      max-width: 256px;
      font-size: 14px;
      white-space: pre-line;
    }
  </style>
</body>`)
        } else {
          return await message.reply(useHelp([`[MESSAGE] ↩️ ${command}`]))
        }
      },
    },
    */
    brat: {
      description: 'Brat generator.',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        const command = params.shift()
        let realMsg = ''
        if (message.hasQuotedMsg && message.type === WAWebJS.MessageTypes.TEXT) {
          const msgQ = await message.getQuotedMessage()
          realMsg = msgQ.body
        } else if (params.length < 1) {
          return await message.reply(useHelp([`${command} ↩️? <text>`]))
        } else {
          const msg = message.body.split(' ')
          msg.shift()
          realMsg = msg.join(' ')
        }
        realMsg = realMsg.replace(/\n/g, ' ')
        const brat = await client.pupBrowser?.newPage()
        await brat?.goto('https://www.bratgenerator.com')
        await brat?.evaluate((realMsg) => {
          const br = document.querySelector('#toggleButtonWhite') as HTMLDivElement
          const ti = document.querySelector('#textInput') as HTMLInputElement
          const ov = document.querySelector('div#textOverlay') as HTMLDivElement
          ov.style.padding = '2rem'
          br.click()
          ti.value = realMsg
          ti.dispatchEvent(new Event('input', { bubbles: true }))
        }, realMsg)
        const br = await brat?.waitForSelector('div#textOverlay')
        const screenshot = await br?.screenshot({
          encoding: 'base64',
          fromSurface: true,
        })
        if (typeof screenshot === 'string') {
          // fs.writeFileSync('screenshot.png', Buffer.from(screenshot, 'base64'))
          await brat?.close()
          return await message.reply(new WAWebJS.MessageMedia('image/png', screenshot), undefined, {
            sendMediaAsSticker: true,
          })
        }
      },
    },
    /*
    brot: {
      description: 'Brat ngabz',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        const command = params.shift()
        let realMsg = ''
        if (message.hasQuotedMsg && message.type === WAWebJS.MessageTypes.TEXT) {
          const msgQ = await message.getQuotedMessage()
          realMsg = msgQ.body
        } else if (params.length < 1) {
          return await message.reply(useHelp([`${command} <text>`]))
        } else {
          const msg = message.body.split(' ')
          msg.shift()
          realMsg = msg.join(' ')
        }
        const brat = await client.pupBrowser?.newPage()
        await brat?.setContent(
          `<div id="brat" style="background: white;display: flex;font-weight: 500;font-family: arial_narrowregular, 'Arial Narrow', sans-serif;font-size: 100px;filter: blur(2px);text-align: justify;text-align-last: justify;align-items: center;line-height: 1.25;padding: 1rem;"><span></span></div>`
        )
        await brat?.evaluate((realMsg) => {
          const div = document.querySelector('div#brat') as HTMLDivElement | null
          const span = document.querySelector('div#brat span') as HTMLSpanElement | null
          if (div && span) {
            span.innerText = realMsg
            // Get initial dimensions
            const style = getComputedStyle(div)
            const height = parseFloat(style.height)
            const width = parseFloat(style.width)
            // Calculate a base size (geometric mean)
            const baseSize = Math.sqrt(height * width)
            // Set width to base size (with px)
            div.style.width = `${baseSize}px`
            // Adjust width to fit span content
            const spanWidth = parseFloat(getComputedStyle(span).width)
            div.style.width = `${spanWidth}px`
          }
        }, realMsg)
        const div = await brat?.waitForSelector('div#brat')
        const screenshot = await div?.screenshot({
          encoding: 'base64',
          fromSurface: true,
        })
        if (typeof screenshot === 'string') {
          // fs.writeFileSync('screenshot.png', Buffer.from(screenshot, 'base64'))
          await brat?.close()
          return await message.reply(new WAWebJS.MessageMedia('image/png', screenshot), undefined, {
            sendMediaAsSticker: true,
          })
        }
      },
    },*/
    brot: {
      description: 'Brat generator versi saya. 😃',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        const command = params.shift()
        let realMsg = ''
        if (message.hasQuotedMsg && message.type === WAWebJS.MessageTypes.TEXT) {
          const msgQ = await message.getQuotedMessage()
          realMsg = msgQ.body
        } else if (params.length < 1) {
          return await message.reply(useHelp([`${command} ↩️? <text>`]))
        } else {
          const msg = message.body.split(' ')
          msg.shift()
          realMsg = msg.join(' ')
        }
        const brat = await client.pupBrowser?.newPage()
        await brat?.setContent(
          /* html */ `<div id="brat" style="display: flex;font-weight: 500;font-family: arial_narrowregular, 'Arial Narrow', sans-serif;font-size: 100px;filter: blur(2px);text-align: justify;text-align-last: justify;align-items: center;line-height: 1.25;padding: 1rem;"><span></span></div>`
        )
        await brat?.evaluate((realMsg) => {
          const div = document.querySelector('div#brat') as HTMLDivElement | null
          const span = document.querySelector('div#brat span') as HTMLSpanElement | null
          if (div && span) {
            span.innerText = realMsg
            // Get initial dimensions
            const style = getComputedStyle(div)
            const height = parseFloat(style.height)
            const width = parseFloat(style.width)
            // Calculate a base size (geometric mean)
            const baseSize = Math.sqrt(height * width)
            // Set width to base size (with px)
            div.style.width = `${baseSize}px`
            // Adjust width to fit span content
            const spanWidth = parseFloat(getComputedStyle(span).width)
            div.style.width = `${spanWidth}px`
            // Ensure the div is square-ish
            const newHeight = parseFloat(getComputedStyle(div).height)
            const newWidth = parseFloat(getComputedStyle(div).width)
            if (newHeight > newWidth) {
              div.style.width = `${newHeight}px`
            } else {
              div.style.height = `${newWidth}px`
            }
          }
        }, realMsg)
        const div = await brat?.waitForSelector('div#brat')
        const screenshot = await div?.screenshot({
          encoding: 'base64',
          fromSurface: true,
        })
        if (typeof screenshot === 'string') {
          // fs.writeFileSync('screenshot.png', Buffer.from(screenshot, 'base64'))
          await brat?.close()
          return await message.reply(new WAWebJS.MessageMedia('image/png', screenshot), undefined, {
            sendMediaAsSticker: true,
          })
        }
      },
    },
    sticker: {
      description: 'Pembuat stiker.',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        const command = params.shift()
        let mediaMsg: WAWebJS.Message | null = null
        if (message.hasMedia) {
          mediaMsg = message
        } else if (message.hasQuotedMsg) {
          const msgQ = await message.getQuotedMessage()
          if (msgQ.hasMedia) {
            mediaMsg = msgQ
          }
        }
        if (mediaMsg) {
          const media = await mediaMsg.downloadMedia()
          const name = parsed.flags['-n']
          const author = parsed.flags['-a']
          const category = parsed.flags['-c']
          return await message.reply(media, undefined, {
            sendMediaAsSticker: true,
            stickerName: typeof name === 'string' ? name : `${pkg.name} v${pkg.version}`,
            stickerAuthor: typeof author === 'string' ? author : 'github.com/just-shadyumbrella/wbt',
            stickerCategories: typeof category === 'string' ? category.split(' ') : undefined,
          })
        } else {
          return await message.reply(
            useHelp(
              [`[IMAGE|VIDEO] ↩️? ${command} [-a "<text>"] [-n "<text>"] [-c "...<emoji>"]`],
              `*📝 Argumen*

\`-a\` Author (teks kiri)
\`-n\` Nama (teks kanan)
\`-c\` Kategori (tag emoji stiker untuk memudahkan pencarian)

\`Experimental\` Dapat dikirim via dokumen.`
            )
          )
        }
      },
    },
    [PREFIX]: {
      description: '?',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        params.shift()
        return await devCommands[params[0]](message, params, parsed)
      },
    },
  },
}

let help = `*📝 Info penggunaan cukup kirim perintah tanpa argumen, atau \`${PREFIX}[perintah] help\`. Beberapa perintah dapat digunakan tanpa argumen.*\n\n> 👑 Hanya Admin\n`
let commands: Record<string, (typeof WBT)['Menu Utama']['start']> = {}
for (const menu in WBT) {
  const menu_command_list: string[] = []
  for (const command in WBT[menu]) {
    commands[command] = WBT[menu][command]
    if (command !== PREFIX) menu_command_list.push(`- \`${PREFIX}${command}\` ${commands[command].description}`)
  }
  help += `\n*🔰 ${menu}*\n${menu_command_list.join('\n')}\n`
}

const devCommands = {
  shutdown: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
    logger(
      LoggerType.WARN,
      { name: 'commands', fn: 'devCommands', context: 'shutdown' },
      'Shutting down command triggered...'
    )
    await client.destroy()
    process.exit(0)
  },
}

const caiSettings = {
  // < [charName] <command> <param> <value?>
  history: {
    descripton: 'Setelan memori lokal.',
    handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
      const cmd = params[3]
      if (cmd === 'reset') {
        const char = params[2]
        const key = `${await extractFlatPhoneNumberFromMessage(message)}:${char}:${message.id.remote}`
        history(key, [])
        return await message.reply(`Reset history for character: \`${char}\``)
      } else {
        const mem = Number(cmd)
        return await message.reply(`Current history slot: \`${memorySlotLimit(mem)}\``)
      }
    },
  },
}

export const caiCommands = {
  '<': {
    descripton: 'Pengaturan bot roleplay.',
    handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
      const command = params[2]
      if (Object.hasOwn(caiSettings, command)) {
        caiSettings[command].handler(message, params, parsed)
      }
    },
  },
  Shiina: {
    descripton: 'Adik kelas yang imut~',
    handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
      params.shift()
      const result = await chatUsingHistory(
        await extractFlatPhoneNumberFromMessage(message),
        message.id.remote,
        'Shiina',
        params.join(' ')
      )
      if (typeof result === 'string') {
        return await message.reply(`*🎀 Shiina*\n\n${result}`)
      }
    },
  },
}

export default commands
