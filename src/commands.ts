import fs from 'node:fs'
import WAWebJS from 'whatsapp-web.js'
import { create, all } from 'mathjs'
import { client } from '../index.js'
import { PREFIX, getChat, sysinfo, useHelp } from './util.js'

const math = create(all)

export async function sendText(message: WAWebJS.Message, text: string, quoted = true) {
  const chat = await getChat(message)
  return chat.sendMessage(text, {
    quotedMessageId: quoted ? message.id._serialized : undefined,
  })
}

const WBT = {
  'Menu Utama': {
    start: {
      description: 'Hello world.',
      handler: async (message: WAWebJS.Message, params: string[]) => {
        return await message.reply(
          `🤖 Mode bot aktif! 😁\n\nSilahkan kirim perintah \`${PREFIX}help\` untuk list perintah.`
        )
      },
    },
    help: {
      description: 'Menampilkan pesan ini.',
      handler: async (message: WAWebJS.Message, params: string[]) => {
        return await message.reply(help)
      },
    },
    status: {
      description: 'Cek status host.',
      handler: async (message: WAWebJS.Message, params: string[]) => {
        return await message.reply(await sysinfo())
      },
    },
  },
  'Menu Grup': {
    // promote: {
    //   description: 'Cek status host.',
    //   handler: async (message: WAWebJS.Message, params: string[]) => {
    //     return await sendText(message, await sysinfo())
    //   },
    // },
    // demote: {
    //   description: 'Cek status host.',
    //   handler: async (message: WAWebJS.Message, params: string[]) => {
    //     return await sendText(message, await sysinfo())
    //   },
    // },
    kick: {
      description: 'Keluarkan member. 👑',
      handler: async (message: WAWebJS.Message, params: string[]) => {
        params = params.map((e) => e.replace('@', ''))
        console.log(params)
        return
      },
    },
  },
  'Menu Fun': {
    percent: {
      description: 'Seberapa persen keberuntungan kamu.',
      handler: async (message: WAWebJS.Message, params: string[]) => {
        const command = params[0]
        if (params.length < 2) return await sendText(message, useHelp([`${command} <pertanyaan>`]))
        return await message.reply(`${Math.round(Math.random() * 100).toString()}%`)
      },
    },
  },
  // 'Karakter AI (Mohon bantuannya!)': {},
  'Menu Lain': {
    math: {
      description: 'Pustaka mathjs.org (alpha: entahlah, coba aja pake)',
      handler: async (message: WAWebJS.Message, params: string[]) => {
        const command = params[0]
        if (params.length < 2) return await sendText(message, useHelp([`${command} <expressions>`]))
        params.shift()
        return await message.reply(math.evaluate(params.join(' ')).toString())
      },
    },
    brot: {
      description: 'Brat ngabz',
      handler: async (message: WAWebJS.Message, params: string[]) => {
        const command = params[0]
        let realMsg = ''
        if (message.hasQuotedMsg) {
          const msgQ = await message.getQuotedMessage()
          realMsg = msgQ.body
        } else if (params.length < 2) {
          return await sendText(message, useHelp([`${command} <expressions>`]))
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
            const height = Number(getComputedStyle(div).height.replace('px', ''))
            const width = Number(getComputedStyle(div).width.replace('px', ''))
            const size = Math.sqrt(height * width)
            div.style.width = size.toString()
            const spanWidth = Number(getComputedStyle(span).width.replace('px', ''))
            div.style.width = (size + (spanWidth - size)).toString()
          }
        }, realMsg)
        const div = await brat?.waitForSelector('div')
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
      handler: async (message: WAWebJS.Message, params: string[]) => {
        const command = params[0]
        let mediaMsg = {} as WAWebJS.Message
        if (message.hasQuotedMsg) {
          const msgQ = await message.getQuotedMessage()
          if (msgQ.hasMedia) {
            mediaMsg = msgQ
          }
        } else if (message.hasMedia) {
          mediaMsg = message
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

export default commands
