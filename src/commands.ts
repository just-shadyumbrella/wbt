import WAWebJS from 'whatsapp-web.js'
import { getChat, PREFIX, sysinfo } from './util.js'

export async function sendText(message: WAWebJS.Message, text: string, quoted = true) {
  const chat = await getChat(message)
  console.log(chat)
  return chat.sendMessage(text, {
    quotedMessageId: quoted ? message.id._serialized : undefined,
  })
}

const WBT = {
  'Menu Utama': {
    start: {
      description: 'Hello world.',
      handler: async (message: WAWebJS.Message, params: string[]) => {
        return await sendText(message, `🤖 Mode bot aktif! 😁\n\nSilahkan kirim perintah \`${PREFIX}help\` untuk list perintah.`)
      },
    },
    help: {
      description: 'Menampilkan pesan ini.',
      handler: async (message: WAWebJS.Message, params: string[]) => {
        return await sendText(message, help)
      },
    },
    status: {
      description: 'Cek status host.',
      handler: async (message: WAWebJS.Message, params: string[]) => {
        return await sendText(message, await sysinfo())
      },
    },
  },
  'Menu Grup': {
    promote: {
      description: 'Cek status host.',
      handler: async (message: WAWebJS.Message, params: string[]) => {
        return await sendText(message, await sysinfo())
      },
    },
    demote: {
      description: 'Cek status host.',
      handler: async (message: WAWebJS.Message, params: string[]) => {
        return await sendText(message, await sysinfo())
      },
    },
  },
  'Menu Fun': {
    percent: {
      description: 'Seberapa persen keberuntungan kamu.',
      handler: async (message: WAWebJS.Message, params: string[]) => {
        return await sendText(message, Math.round(Math.random() * 100).toString())
      },
    },
  },
  // 'Karakter AI (Mohon bantuannya!)': {},
  // 'Menu Lain': {},
}

let help = `*Info penggunaan cukup kirim perintah tanpa argumen, atau \`${PREFIX}[perintah] help\`. Beberapa perintah dapat digunakan tanpa argumen.*\n\n> 👑 Hanya Admin\n`
let commands: Record<string, (typeof WBT)['Menu Utama']['start']> = {}
for (const menu in WBT) {
  const menu_command_list: string[] = []
  for (const command in WBT[menu]) {
    commands[command] = WBT[menu][command]
    menu_command_list.push(`\`${command}\` ${commands[command].description}`)
  }
  help += `\n*🔰 ${menu}*\n${menu_command_list.join('\n')}\n`
}

export default commands
