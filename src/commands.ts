import WAWebJS from 'whatsapp-web.js'

export type Commands = {
  description: string
  handler: (message: WAWebJS.Message, params: string[]) => Promise<unknown>
}

let help: string

export const commands = {
  start: {
    description: 'Hello world',
    handler: async (message: WAWebJS.Message, params: string[]) => {
      const chat = await message.getChat()
      return chat.sendMessage('🤖 Mode bot aktif! 😁\n\nSilahkan kirim perintah `/help` untuk list perintah.', {
        quotedMessageId: message.id._serialized,
      })
    },
  },
}
