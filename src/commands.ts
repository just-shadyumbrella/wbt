import fs from 'node:fs'
import path from 'node:path'
import util from 'node:util'
import crypto from 'node:crypto'
import ky from 'ky'
import WAWebJS from 'whatsapp-web.js'
import { create, all } from 'mathjs'
import { client } from '../index.js'
import { logger, LoggerType } from './util/logger.js'
import { pkg, sysinfo, tmpDir } from './util/si.js'
import {
  ParsedCommand,
  PREFIX,
  useHelp,
  isOwner,
  isMyselfAdmin,
  checkIsMyselfAdmin,
  extractFlatId,
  PHONE_NUMBER,
  getAuthorId,
  getGroupParticipants,
  getGroupAdmins,
  getGroupMembers,
  filterMyselfFromParticipants,
} from './util/wa.js'
import { YTdlp } from './cli.js'
import { mathVM } from './util/vm.js'
import { bratGenerator, brotGenerator, enhancePhoto } from './util/pupscrap.js'

const math = create(all, { number: 'BigNumber', precision: 64 })
const WBT = {
  'Menu Utama': {
    start: {
      description: 'Hello world.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        return await message.reply(
          `🤖 Mode bot aktif! 😁\n\nSilahkan kirim perintah \`${PREFIX}help\` untuk list perintah.`
        )
      },
    },
    help: {
      description: 'Menampilkan pesan ini.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        return await message.reply(help)
      },
    },
    status: {
      description: 'Cek status host.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        return await message.reply(await sysinfo())
      },
    },
    upcoming: {
      description: 'Cek fitur-fitur yang direncanakan developer.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        return await message.reply(fs.readFileSync(path.resolve(process.cwd(), 'src', 'upcoming.md')).toString())
      },
    },
  },
  'Menu Grup (belum selesai)': {
    promote: {
      description: 'Angkat member sebagai admin. 👑',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        if (await checkIsMyselfAdmin(message)) {
          const { command, positional } = parsed
          let mentions: string[] = []
          if (message.hasQuotedMsg) {
            const msgQ = await message.getQuotedMessage()
            mentions = [await getAuthorId(msgQ, false)]
          } else if (!positional.length) {
            return await message.reply(useHelp([`[MESSAGE] ↩️ ${command}`, `${command} <...@mention>`]))
          } else {
            mentions = message.mentionedIds
          }
          const chat = (await message.getChat()) as WAWebJS.GroupChat
          mentions = (await filterMyselfFromParticipants(mentions)).participants
          let successes: string[] = []
          let failures: string[] = []
          for (const mention of mentions) {
            try {
              await chat.promoteParticipants([mention])
              successes.push(mention)
            } catch {
              failures.push(mention)
            }
          }
          if (failures.length) {
            await client.sendMessage(
              message.id.remote,
              `🤖 ${failures.map((e) => `@${extractFlatId(e)}`).join(', ')} sudah jadi admin.`,
              { mentions: failures }
            )
          }
          if (successes.length) {
            let author = await getAuthorId(message, true, true)
            author = author === PHONE_NUMBER ? '*Saya*' : `@${author}`
            const msg = parsed.flags['-m']
            return await message.reply(
              `🤖 ${successes.map((e) => `@${extractFlatId(e)}`).join(', ')} diangkat jadi admin oleh ${author} 👑${
                msg ? `\n\n⚠️ ${msg}` : ''
              }`,
              undefined,
              { mentions }
            )
          }
        }
      },
    },
    demote: {
      description: 'Kudeta member dari tahta admin. 👑',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        if (await checkIsMyselfAdmin(message)) {
          const { command, positional } = parsed
          let mentions: string[] = []
          if (message.hasQuotedMsg) {
            const msgQ = await message.getQuotedMessage()
            mentions = [await getAuthorId(msgQ, false)]
          } else if (!positional.length) {
            return await message.reply(useHelp([`[MESSAGE] ↩️ ${command}`, `${command} <...@mention>`]))
          } else {
            mentions = message.mentionedIds
          }
          const chat = (await message.getChat()) as WAWebJS.GroupChat
          mentions = (await filterMyselfFromParticipants(mentions)).participants
          let successes: string[] = []
          let failures: string[] = []
          for (const mention of mentions) {
            try {
              await chat.demoteParticipants([mention])
              successes.push(mention)
            } catch {
              failures.push(mention)
            }
          }
          if (failures.length) {
            await client.sendMessage(
              message.id.remote,
              `🤖 ${failures.map((e) => `@${extractFlatId(e)}`).join(', ')} bukan admin.`,
              { mentions: failures }
            )
          }
          if (successes.length) {
            let author = await getAuthorId(message, true, true)
            author = author === PHONE_NUMBER ? '*Saya*' : `@${author}`
            const msg = parsed.flags['-m']
            return await message.reply(
              `🤖 ${author} menurunkan jabatan ${mentions.map((e) => `@${extractFlatId(e)}`).join(', ')} 👑${
                msg ? `\n\n⚠️ ${msg}` : ''
              }`,
              undefined,
              { mentions }
            )
          }
        }
      },
    },
    kick: {
      description: 'Keluarkan member dari grup. 👑',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        if (await checkIsMyselfAdmin(message)) {
          const { command, positional } = parsed
          let mentions: string[] = []
          if (message.hasQuotedMsg) {
            const msgQ = await message.getQuotedMessage()
            mentions = [await getAuthorId(msgQ, false)]
          } else if (!positional.length) {
            return await message.reply(useHelp([`[MESSAGE] ↩️ ${command}`, `${command} <...@mention>`]))
          } else {
            mentions = message.mentionedIds
          }
          const chat = (await message.getChat()) as WAWebJS.GroupChat
          mentions = (await filterMyselfFromParticipants(mentions)).participants
          let author = await getAuthorId(message, true, true)
          author = author === PHONE_NUMBER ? '*Saya*' : `@${author}`
          const msg = parsed.flags['-m']
          const result = await message.reply(
            `🤖 ${author} mengeluarkan ${mentions.map((e) => `@${extractFlatId(e)}`).join(', ')} 👑${
              msg ? `\n\n⚠️ ${msg}` : ''
            }`,
            undefined,
            { mentions }
          )
          return await chat.removeParticipants(mentions)
        }
      },
    },
  },
  'Menu Game': {
    rc: {
      description: 'List redeem code aktif untuk beberapa game yang tersedia.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const { command, positional } = parsed
        const game = positional[0] || ''
        const games = ['genshin', 'starrail', 'honkai', 'themis', 'zenless']
        if (!games.includes(game))
          return await message.reply(
            useHelp(
              [`${command} <game>`],
              `Pilihan game tersedia saat ini: ${games.map((e) => `\`${e}\``).join(', ')}.`
            )
          )
        const json = await ky
          .get<{
            active: {
              code: string
              rewards: string[]
            }[]
            inactive: {
              code: string
              rewards: string[]
            }[]
          }>(`https://api.ennead.cc/mihoyo/${game}/codes`)
          .json()
        return await message.reply(
          `*💡 Redeem code aktif \`${game}\`:*\n\n${json.active
            .map((e) => `\`${e.code}\`\n${e.rewards.join(', ')}`)
            .join('\n\n')}`
        )
      },
    },
  },
  'Menu Fun': {
    percent: {
      description: 'Seberapa persen keberuntungan kamu.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const { command, positional } = parsed
        if (!positional.length) return await message.reply(useHelp([`${command} <pertanyaan>`]))
        return await message.reply(`${Math.round(Math.random() * 100).toString()}%`)
      },
    },
  },
  'Karakter AI (experimental!)': {
    /*
    new: {
      description: 'Buat room baru.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const command = params.shift()
        !if (params.length) return await message.reply(useHelp([`${command} <nama karakter><room name>`]))
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
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        // params.shift()
        // const Chars = Object.keys(chars).map((e) => `*@${e}*`)
        // return await message.reply(`*🎭 List karakter AI yang tersedia:*\n\n${Chars.join('\n')}`)
      },
    },
  },
  'Menu Lain': {
    math: {
      description: 'Kalkulator sederhana mathjs.org',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const { command, body } = parsed
        if (body) return await message.reply(`🧮 ${math.evaluate(body).toString()}`)
        return await message.reply(
          useHelp([`${command} <expressions>`], `Selengkapnya dapat lihat format ekspresi di mathjs.org`)
        )
      },
    },
    mathvm: {
      description: 'VM mathjs.org',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const { command, body } = parsed
        if (body) return await message.reply(`🖥️ ${util.inspect(mathVM(body), { depth: null })}`)
        return await message.reply(useHelp([`${command} <code>`], `Semua fitur selengkapnya di mathjs.org`))
      },
    },
    tomedia: {
      description: 'Ubah link jadi media WhatsApp.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const { command, positional } = parsed
        let link = ''
        if (message.hasQuotedMsg && message.type === WAWebJS.MessageTypes.TEXT) {
          const msgQ = await message.getQuotedMessage()
          link = msgQ.links[0].link
        } else if (!positional.length) {
          return await message.reply(useHelp([`${command} ↩️? <link>`]))
        } else {
          link = message.links[0].link
        }
        try {
          const filePath = path.resolve(process.cwd(), tmpDir(), crypto.randomBytes(16).toString('hex'))
          await YTdlp(link, `-f [vcodec=h264]/b --merge-output-format mp4 --recode-video mp4 -o ${filePath}`.split(' '))
          const mediaUpload = WAWebJS.MessageMedia.fromFilePath(filePath)
          mediaUpload.mimetype = 'video/mp4'
          const J = JSON.parse((await YTdlp(link, ['-J'])).toString())
          return await message.reply(mediaUpload, undefined, {
            caption: `🔮 *${J.extractor}*

*Author:* ${J.artist}
*Upload:* ${J.upload_date}
*Views:* ${J.view_count}
*Likes:* ${J.like_count}
*Comments:* ${J.comment_count}
*Repost:* ${J.repost_count}
*Description:* ${J.description}`,
          })
        } catch (e) {
          throw e
        }
      },
    },
    /*
    waq: {
      description: 'Whatsapp sticker',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
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
    enhance: {
      description: 'Peningkatkan kualitas foto.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const { command } = parsed
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
          const browser = client.pupBrowser
          if (browser) {
            const media = await mediaMsg.downloadMedia()
            const filePath = path.resolve(process.cwd(), tmpDir(), `${crypto.randomBytes(16).toString('hex')}.jpg`)
            fs.writeFileSync(filePath, Buffer.from(media.data, 'base64'))
            const enhanced = await enhancePhoto(browser, filePath)
            if (typeof enhanced === 'string') {
              return await message.reply(new WAWebJS.MessageMedia('image/jpeg', enhanced), undefined, {
                sendMediaAsHd: true
              })
            }
          }
        } else {
          return await message.reply(useHelp([`[IMAGE] ↩️? ${command}`]))
        }
      },
    },
    brat: {
      description: 'Brat generator.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const { command, positional, body } = parsed
        let realMsg = body
        if (message.hasQuotedMsg && message.type === WAWebJS.MessageTypes.TEXT) {
          const msgQ = await message.getQuotedMessage()
          realMsg = msgQ.body
        } else if (!positional.length) {
          return await message.reply(useHelp([`${command} ↩️? <text>`]))
        }
        const browser = client.pupBrowser
        const brat = await bratGenerator(browser, realMsg)
        if (typeof brat === 'string') {
          return await message.reply(new WAWebJS.MessageMedia('image/png', brat), undefined, {
            sendMediaAsSticker: true,
          })
        }
      },
    },
    brot: {
      description: 'Brat generator versi saya. 😃',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const { command, positional, body } = parsed
        let realMsg = body
        if (message.hasQuotedMsg && message.type === WAWebJS.MessageTypes.TEXT) {
          const msgQ = await message.getQuotedMessage()
          realMsg = msgQ.body
        } else if (!positional.length) {
          return await message.reply(useHelp([`${command} ↩️? <text>`]))
        }
        const browser = client.pupBrowser
        const brat = await brotGenerator(browser, realMsg)
        if (typeof brat === 'string') {
          return await message.reply(new WAWebJS.MessageMedia('image/png', brat), undefined, {
            sendMediaAsSticker: true,
          })
        }
      },
    },
    sticker: {
      description: 'Pembuat stiker.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const { command } = parsed
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
            stickerName:
              typeof name === 'string' ? name : parsed.flags['-N'] ? undefined : `${pkg.name} v${pkg.version}`,
            stickerAuthor:
              typeof author === 'string'
                ? author
                : parsed.flags['-A']
                ? undefined
                : 'github.com/just-shadyumbrella/wbt',
            stickerCategories: typeof category === 'string' ? category.split(' ') : undefined,
          })
        } else {
          return await message.reply(
            useHelp(
              [`[IMAGE|VIDEO] ↩️? ${command} [-n "<text>" | -N] [-a "<text>" | -A] [-c "<...emoji>"]`],
              `*📝 Argumen*

\`-n\` Nama (teks kiri), \`-N\` untuk menghapus
\`-a\` Author (teks kanan), \`-A\` untuk menghapus
\`-c\` Kategori (tag emoji stiker untuk memudahkan pencarian)

\`Experimental\` Dapat dikirim via dokumen.`
            )
          )
        }
      },
    },
    [PREFIX]: {
      description: '?',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        if (await isOwner(message)) return await devCommands[parsed.positional[0]](message, parsed)
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
  shutdown: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
    logger(
      LoggerType.WARN,
      { name: 'commands', fn: 'devCommands', context: 'shutdown' },
      'Shutting down command triggered...'
    )
    await client.destroy()
    process.exit(0)
  },
  isadmin: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
    return await message.reply(`🤖 Saya ${(await isMyselfAdmin(message)) ? 'adalah' : 'bukan'} admin 👑`)
  },
}

export const builtInMentions = {
  everyone: async (message: WAWebJS.Message) => {
    return await getGroupParticipants(message)
  },
  admin: async (message: WAWebJS.Message) => {
    return await getGroupAdmins(message)
  },
  member: async (message: WAWebJS.Message) => {
    return await getGroupMembers(message)
  },
}

export default commands
