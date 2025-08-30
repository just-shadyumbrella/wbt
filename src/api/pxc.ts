import ky from 'ky'
import { Message } from 'whatsapp-web.js'
import { resolvePathOrBuffer } from '../util/data.js'
import { USER_AGENT } from '../env.js'

const msgs = {
  process: {
    job: '_🤖 Job processing..._',
    done: '*🤖 Done!*',
  },
}

export async function PXC(msg: Message, image: string | Buffer) {
  const buffer = resolvePathOrBuffer(image)
  const formData = new FormData()
  formData.append('image', new Blob([Uint8Array.from(buffer)]), 'blob')
  formData.append('scale', '2')
  try {
    const msg2 = await msg.reply(msgs.process.job)
    const job = await ky
      .post('https://api2.pixelcut.app/image/upscale/v1', {
        body: formData,
        headers: {
          Referer: 'https://www.pixelcut.ai/',
          Origin: 'https://www.pixelcut.ai',
          'User-Agent': USER_AGENT,
          'X-Client-Version': 'web',
        },
        timeout: 3 * 60 * 1000,
      })
      .json<{ result_url: string }>()
    msg2.edit(msgs.process.done)
    return new URL(job.result_url)
  } catch (e) {
    throw e
  }
}
