import fs from 'node:fs'
import WAWebJS from 'whatsapp-web.js'
import { create, all } from 'mathjs'
import { client } from '../index.js'
import { cai } from './db.js'
import { extractFlatPhoneNumber, getAuthor, logger, LoggerType, ParsedCommand, PREFIX, sysinfo, useHelp } from './util.js'
import { chars, chat, chatUsingHistory } from './ai/@openrouter.js'

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
  },
  'Menu Grup': {
    // promote: {
    //   description: 'Cek status host.',
    //   handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
    //     return await message.reply(await sysinfo())
    //   },
    // },
    // demote: {
    //   description: 'Cek status host.',
    //   handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
    //     return await message.reply(await sysinfo())
    //   },
    // },
    kick: {
      description: 'Keluarkan member. 👑',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        // params = params.map((e) => e.replace('@', ''))
        // console.log(params)
        return
      },
    },
  },
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
  'Karakter AI (Mohon bantuannya!)': {
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
    list: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
      params.shift()
      const Chars = Object.keys(chars).map(e => `*@${e}*`)
      return await message.reply(Chars.join('\n'))
    }
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
          /* html */ `<div id="brat" style="background: white;display: flex;font-weight: 500;font-family: arial_narrowregular, 'Arial Narrow', sans-serif;font-size: 100px;filter: blur(2px);text-align: justify;text-align-last: justify;align-items: center;line-height: 1.25;padding: 1rem;"><span></span></div>`
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
    },
    crot: {
      description: 'Brat kotak ngabz',
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
      description: 'Yups ngabz',
      handler: async (message: WAWebJS.Message, params: string[], parsed: ParsedCommand) => {
        const command = params.shift()
        let mediaMsg = {} as WAWebJS.Message
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
          return await message.reply(media, undefined, { sendMediaAsSticker: true })
        } else {
          return await message.reply(useHelp([`[IMAGE|VIDEO] ${command}`, `[IMAGE|VIDEO] ↩️ ${command}`]))
        }
      },
    },
  },
}

let help = `*Info penggunaan cukup kirim perintah tanpa argumen, atau \`${PREFIX}[perintah] help\`. Beberapa perintah dapat digunakan tanpa argumen.*\n\n> 👑 Hanya Admin\n`
let commands: Record<string, (typeof WBT)['Menu Utama']['start']> = {}
for (const menu in WBT) {
  const menu_command_list: string[] = []
  for (const command in WBT[menu]) {
    commands[command] = WBT[menu][command]
    menu_command_list.push(`- \`${PREFIX}${command}\` ${commands[command].description}`)
  }
  help += `\n*🔰 ${menu}*\n${menu_command_list.join('\n')}\n`
}

export const devCommands = {
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

export const etCommands = {
  Shiina: async (message: WAWebJS.Message, params: string[]) => {
    params.shift()
    const result = await chatUsingHistory(extractFlatPhoneNumber(getAuthor(message)), message.id.remote, 'Shiina', params.join(' '))
    if (typeof result === 'string') {
      return await message.reply(`*👧 Shiina*\n\n${result}`)
    }
  }
}

export default commands
