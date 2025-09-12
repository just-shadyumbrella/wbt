import fs from 'node:fs'
import path from 'node:path'
import util from 'node:util'
import crypto from 'node:crypto'
import ky from 'ky'
import WAWebJS from 'whatsapp-web.js'
import { create, all } from 'mathjs'
import { fileTypeFromBuffer } from 'file-type'
import { IntRange } from 'type-fest'
import { client } from '../index.js'
import { fastfetch, YTdlp } from './cli-wrapper.js'
import { PREFIX } from './env.js'
import { logger, LoggerType } from './util/logger.js'
import { pkg, sysinfo, tmpDir, versions } from './util/si.js'
import {
  useHelp,
  isOwner,
  isMyselfAdmin,
  checkIsMyselfAdmin,
  extractFlatId,
  getAuthorId,
  getGroupParticipants,
  getGroupAdmins,
  getGroupMembers,
  filterMyselfFromParticipants,
} from './util/wa.js'
import { mathVM } from './util/vm.js'
import { bratGenerator, brotGenerator } from './api/pupscrap.js'
import { ParsedCommand, sleep } from './util/misc.js'
import { photoTool, photoToolCommand, uploadPhoto } from './api/photo.js'
import { WPW, WPWFilters } from './api/wpw.js'
import _ from 'lodash'
import { EZRemove } from './api/ezremove.js'
import { PXC } from './api/pxc.js'
import { REJobType, Remaker } from './api/remaker.js'

const math = create(all, { number: 'BigNumber', precision: 64 })
const WBT = {
  '📊 Menu Utama': {
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
    fastfetch: {
      description: 'System information fetcher.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const distros = [
          'alpine3_small',
          'arch_small',
          'debian_small',
          'fedora_small',
          'gentoo_small',
          'kali_small',
          'manjaro_small',
          'raspbian_small',
          'rhel_small',
          'ubuntu_small',
        ]
        const distro = parsed.positional[0] || distros[Math.floor(Math.random() * distros.length)]
        const logo = (await fastfetch(`-l ${distro} --pipe 1`.split(' ')))
          .toString()
          .replace(/\x1b.*/g, '')
          .trimEnd()
        const fast = (await fastfetch('-l none --pipe 1'.split(' '))).toString()
        const ff = `\`\`\`${logo}\`\`\`\n\n${fast
          .replace(/(\x1b.*|-{2,})\s+/g, '')
          .trimEnd()
          .replace(/([a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+|((^\w+[ a-zA-z0-9()\\/\-:]+|\b\w+\b):)|\d{2,}%)/gm, '*$1*')
          .replace(/^(\*(\w+[ a-zA-z0-9()\\/\-:]+:)\*)/gm, '- $1')
          .replace(/(\d+x\d+|\d+"|#\d+|(@ )?[\d.]+ [\w]?Hz)/g, '`$1`')
          .replace(/(\()(([A-Z]+:\\|\/)[0-9a-zA-Z_\-+\\/]*)(\))/g, '(`$2`)')}`
        return await message.reply(
          `${ff}\n\n*💼 Project*\n\`\`\`${JSON.stringify(pkg, null, 2)}\`\`\`\n\n> ${versions.join(' | ')}`
        )
      },
    },
    upcoming: {
      description: 'Cek fitur-fitur yang direncanakan developer.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        return await message.reply(fs.readFileSync(path.resolve(process.cwd(), 'src', 'upcoming.md')).toString())
      },
    },
  },
  '🎎 Menu Grup (belum selesai)': {
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
              `🤖 ${failures.map((e) => `@${extractFlatId(e)}`).join(', ')} sudah jadi admin`,
              { mentions: failures }
            )
          }
          if (successes.length) {
            let author = await getAuthorId(message, true, true)
            author = author === client.info.wid.user ? '*Saya*' : `@${author}`
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
          const owner = (
            await client.getContactLidAndPhone([
              (await getGroupParticipants(message)).filter((e) => e.isSuperAdmin)[0].id._serialized,
            ])
          )[0]
          let isOwnerMentioned = false
          let successes: string[] = []
          let failures: string[] = []
          for (const mention of mentions) {
            try {
              await chat.demoteParticipants([mention])
              successes.push(mention)
            } catch {
              if (mention === owner.lid || mention === owner.pn) {
                isOwnerMentioned = true
              } else {
                failures.push(mention)
              }
            }
          }
          if (isOwnerMentioned)
            await client.sendMessage(message.id.remote, `🤖 @${extractFlatId(owner.lid)} adalah pemilik grup`, {
              mentions: [owner.lid],
            })
          if (failures.length)
            await client.sendMessage(
              message.id.remote,
              `🤖 ${failures.map((e) => `@${extractFlatId(e)}`).join(', ')} bukan admin`,
              { mentions: failures }
            )
          if (successes.length) {
            let author = await getAuthorId(message, true, true)
            author = author === client.info.wid.user ? '*Saya*' : `@${author}`
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
          author = author === client.info.wid.user ? '*Saya*' : `@${author}`
          const msg = parsed.flags['-m']
          const result = await message.reply(
            `🤖 ${author} mengeluarkan ${mentions.map((e) => `@${extractFlatId(e)}`).join(', ')} 👑${
              msg ? `\n\n⚠️ ${msg}` : ''
            }`,
            undefined,
            { mentions }
          )
          await chat.removeParticipants(mentions)
          return result
        }
      },
    },
  },
  '🕹️ Menu Game': {
    rc: {
      description: 'List redeem code aktif untuk beberapa game yang tersedia.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const { command, positional } = parsed
        const games = ['genshin', 'hkrpg', 'nap'] as const
        const game = (positional[0] || '') as (typeof games)[number]
        if (!games.includes(game))
          return await message.reply(
            useHelp(
              [`${command} <game>`],
              `Pilihan game tersedia saat ini: ${games.map((e) => `\`${e}\``).join(', ')}.`
            )
          )
        const json = await ky.get(`https://hoyo-codes.seria.moe/codes?game=${game}`).json<{
          codes: {
            id: number
            code: string
            status: 'OK' | 'NOT_OK'
            game: (typeof games)[number]
            rewards: string
          }[]
          game: (typeof games)[number]
        }>()
        return await message.reply(
          `*💡 Redeem code aktif \`${game}\`:*\n\n${json.codes.map((e) => `\`${e.code}\`\n${e.rewards}`).join('\n\n')}`
        )
      },
    },
  },
  '🔮 Menu AI': {
    phototool: {
      description: 'Manipulasi gambar berbasis AI.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const { command, flags } = parsed
        let mediaMsg: WAWebJS.Message | null = null
        if (message.hasMedia) {
          mediaMsg = message
        } else if (message.hasQuotedMsg) {
          const msgQ = await message.getQuotedMessage()
          if (msgQ.hasMedia) {
            mediaMsg = msgQ
          }
        }
        const tool = (parsed.positional[0] || '') as (typeof photoToolCommand)[number]
        if (photoToolCommand.includes(tool) && mediaMsg) {
          const media = await mediaMsg.downloadMedia()
          const doc = flags['-doc'] as boolean
          const c = Number(flags['-c']) as IntRange<0, 9>
          const q = Number(flags['-q']) as IntRange<0, 100>
          const u = Number(flags['-u']) as IntRange<0, 4>
          const result = await photoTool(message, Buffer.from(media.data, 'base64'), tool, {
            compressLevel: !isNaN(c) ? c : undefined,
            imageQuality: !isNaN(q) ? q : undefined,
            upscalingLevel: !isNaN(q) ? u : undefined,
          })
          if (result) {
            const upload = await WAWebJS.MessageMedia.fromUrl(result.href)
            return await message.reply(upload, undefined, {
              caption: `🤖 *${_.upperFirst(tool)}* tool applied!`,
              sendMediaAsDocument: doc,
              sendMediaAsHd: !doc,
            })
          }
        } else {
          return await message.reply(
            useHelp(
              [`[IMAGE] ↩️? ${command} [${photoToolCommand.join(' | ')}] [-c <0-9>] [-q <0-100>] [-u <2-4>] [-doc]`],
              `*📝 Argumen*

\`-c\` Level kompresi (Default: \`6\`).
\`-q\` Level kualitas (Default: \`100\`).
\`-u\` Level upscale (Default: \`0\`).
\`-doc\` Kirim sebagai dokumen.

🧪 Dapat dikirim via dokumen.`
            )
          )
        }
      },
    },
    remaker: {
      description: `Alternatif \`${PREFIX}phototool\`.`,
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const { command, flags } = parsed
        let mediaMsg: WAWebJS.Message | null = null
        if (message.hasMedia) {
          mediaMsg = message
        } else if (message.hasQuotedMsg) {
          const msgQ = await message.getQuotedMessage()
          if (msgQ.hasMedia) {
            mediaMsg = msgQ
          }
        }
        const type = _.startCase(_.camelCase(parsed.positional[0] || '')).replace(
          /\s+/g,
          '_'
        ) as (typeof REJobType)[number]
        if (REJobType.includes(type) && mediaMsg) {
          const media = await mediaMsg.downloadMedia()
          const doc = flags['-doc'] as boolean
          const result = await Remaker(message, Buffer.from(media.data, 'base64'), type)
          if (result) {
            const upload = await WAWebJS.MessageMedia.fromUrl(result.href)
            return await message.reply(upload, undefined, {
              caption: `🤖 *${type}* applied!`,
              sendMediaAsDocument: doc,
              sendMediaAsHd: !doc,
            })
          }
        } else {
          return await message.reply(
            useHelp(
              [`[IMAGE] ↩️? ${command} [${REJobType.map((e) => _.kebabCase(e)).join(' | ')}] [-doc]`],
              `*📝 Argumen*

\`-doc\` Kirim sebagai dokumen.

🧪 Dapat dikirim via dokumen.`
            )
          )
        }
      },
    },
    ezremove: {
      description: 'Remove BG alternatif.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const { command, flags } = parsed
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
          const doc = flags['-doc'] as boolean
          const result = await EZRemove(message, Buffer.from(media.data, 'base64'))
          if (result) {
            const upload = await WAWebJS.MessageMedia.fromUrl(result.href)
            return await message.reply(upload, undefined, {
              sendMediaAsDocument: doc,
              sendMediaAsHd: !doc,
            })
          }
        } else {
          return await message.reply(
            useHelp(
              [`[IMAGE] ↩️? ${command} [-doc]`],
              `*📝 Argumen*

\`-doc\` Kirim sebagai dokumen.

🧪 Dapat dikirim via dokumen.`
            )
          )
        }
      },
    },
    pxc: {
      description: 'Upscale gambar alternatif.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const { command, flags } = parsed
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
          const doc = flags['-doc'] as boolean
          const result = await PXC(message, Buffer.from(media.data, 'base64'))
          if (result) {
            const upload = await WAWebJS.MessageMedia.fromUrl(result.href)
            return await message.reply(upload, undefined, {
              sendMediaAsDocument: doc,
              sendMediaAsHd: !doc,
            })
          }
        } else {
          return await message.reply(
            useHelp(
              [`[IMAGE] ↩️? ${command} [-doc]`],
              `*📝 Argumen*

\`-doc\` Kirim sebagai dokumen.

🧪 Dapat dikirim via dokumen.`
            )
          )
        }
      },
    },
    wpw: {
      description: 'Anuin waifu 🤭',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const { command, flags } = parsed
        let mediaMsg: WAWebJS.Message | null = null
        if (message.hasMedia) {
          mediaMsg = message
        } else if (message.hasQuotedMsg) {
          const msgQ = await message.getQuotedMessage()
          if (msgQ.hasMedia) {
            mediaMsg = msgQ
          }
        }
        const filter = (parsed.positional[0] || '') as (typeof WPWFilters)[number]
        if (WPWFilters.includes(filter) && mediaMsg) {
          const media = await mediaMsg.downloadMedia()
          const doc = flags['-doc'] as boolean
          const result = await WPW(message, Buffer.from(media.data, 'base64'), filter)
          if (result) {
            const fileType = await fileTypeFromBuffer(result)
            if (fileType) {
              const upload = new WAWebJS.MessageMedia(fileType.mime, result.toString('base64'))
              return await message.reply(upload, undefined, {
                caption: `🤖 *${_.upperFirst(filter)}* filter applied!`,
                sendMediaAsDocument: doc,
                sendMediaAsHd: !doc,
              })
            }
          }
        } else {
          return await message.reply(
            useHelp(
              [`[IMAGE] ↩️? ${command} [${WPWFilters.join(' | ')}] [-doc]`],
              `*📝 Argumen*

\`-doc\` Kirim sebagai dokumen.

🧪 Dapat dikirim via dokumen.`
            )
          )
        }
      },
    },
  },
  '🎭 Menu Fun': {
    percent: {
      description: 'Seberapa persen keberuntungan kamu.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const { command, positional } = parsed
        if (!positional.length) return await message.reply(useHelp([`${command} <pertanyaan>`]))
        return await message.reply(`${Math.round(Math.random() * 100).toString()}%`)
      },
    },
  },
  '🖼️ Menu Stiker': {
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

\`-n\` Nama (teks kiri), \`-N\` untuk menghapus.
\`-a\` Author (teks kanan), \`-A\` untuk menghapus.
\`-c\` Kategori (tag emoji stiker untuk memudahkan pencarian).

🧪 Dapat dikirim via dokumen.`
            )
          )
        }
      },
    },
    rsticker: {
      description: 'Reverse sticker.',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        const { command } = parsed
        let media: WAWebJS.MessageMedia | undefined
        if (message.hasQuotedMsg) {
          const msgQ = await message.getQuotedMessage()
          if (msgQ.hasMedia && msgQ.type === WAWebJS.MessageTypes.STICKER) {
            media = await msgQ.downloadMedia()
          }
        }
        if (media) {
          const doc = parsed.flags['-doc'] as boolean
          const link = parsed.flags['-link'] as boolean
          const upload = link
            ? await (async () => {
                const url = await uploadPhoto(Buffer.from(media.data, 'base64'), undefined, message)
                return `🔗 ${url.href}`
              })()
            : doc
            ? WAWebJS.MessageMedia.fromFilePath(
                await (async () => {
                  const filename = `sticker-${crypto.randomUUID()}.webp`
                  const filePath = path.resolve(tmpDir(), filename)
                  fs.writeFileSync(filePath, Buffer.from(media.data, 'base64'))
                  await sleep(10000)
                  return filePath
                })()
              )
            : media
          return await message.reply(upload, undefined, {
            sendMediaAsHd: !doc,
            sendMediaAsDocument: doc,
          })
        } else {
          return await message.reply(
            useHelp(
              [`[STICKER] ↩️ ${command}`],
              `*📝 Argumen*

\`-link\` Kirim sebagai download link.
\`-doc\` Kirim sebagai dokumen.`
            )
          )
        }
      },
    },
  },
  '🧩 Menu Lain': {
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
          const filePath = path.resolve(process.cwd(), tmpDir(), crypto.randomUUID())
          await YTdlp(link, `-f [vcodec=h264]/b --merge-output-format mp4 --recode-video mp4 -o ${filePath}`.split(' '))
          const mediaUpload = WAWebJS.MessageMedia.fromFilePath(filePath)
          mediaUpload.mimetype = 'video/mp4'
          const J = JSON.parse((await YTdlp(link, ['-J'])).toString())
          return await message.reply(mediaUpload, undefined, {
            caption: `🔮 *${J.extractor_key}*

*Author:* ${J.uploader}
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
    [PREFIX]: {
      description: '?',
      handler: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
        if (await isOwner(message)) {
          const devCommand = parsed.positional[0]
          try {
            return await devCommands[devCommand](message, parsed)
          } catch (e) {
            if (
              e instanceof TypeError &&
              e.message.includes('devCommands') &&
              e.message.includes('is not a function')
            ) {
              e.message = `\`${devCommand}\` tidak ada`
              throw e
            }
          }
        }
      },
    },
  },
}

let help = `*📝 Info penggunaan cukup kirim perintah tanpa argumen, atau \`${PREFIX}[perintah] help\`. Beberapa perintah dapat digunakan tanpa argumen.*\n\n> 👑 Hanya Admin\n`
let commands: Record<string, (typeof WBT)['📊 Menu Utama']['start']> = {}
for (const menu in WBT) {
  const menu_command_list: string[] = []
  for (const command in WBT[menu]) {
    commands[command] = WBT[menu][command]
    if (command !== PREFIX) menu_command_list.push(`- \`${PREFIX}${command}\` ${commands[command].description}`)
  }
  help += `\n*${menu}*\n${menu_command_list.join('\n')}\n`
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
  mentions: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
    const mentionsCT = await message.getMentions()
    return await message.reply(
      `*Raw:*\n\n${message.mentionedIds.join('\n')}\n\n*Formatted:*\n\n${mentionsCT.map((e) => e.id.user).join('\n')}`
    )
  },
  admins: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
    const mins = await getGroupAdmins(message)
    const admins = mins.filter((e) => e.isAdmin)
    const owner = mins.filter((e) => e.isSuperAdmin)
    return await message.reply(
      `*👑 Owner*\n\n${owner[0].id.user}\n\n*👑 Admin*\n\n${admins.map((e) => e.id.user).join('\n')}`
    )
  },
  body: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
    if (message.hasQuotedMsg) {
      const msgQ = await message.getQuotedMessage()
      return await message.reply(`🤖 Message: \`\`\`${msgQ.body}\`\`\``)
    }
  },
  msg: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
    if (message.hasQuotedMsg) {
      const msgQ = await message.getQuotedMessage()
      return await message.reply(`🤖 Message: \`\`\`${JSON.stringify(msgQ, null, 2)}\`\`\``)
    }
  },
  meadmin: async (message: WAWebJS.Message, parsed: ParsedCommand) => {
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
