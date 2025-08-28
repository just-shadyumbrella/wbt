import ky from 'ky'
import { Message } from 'whatsapp-web.js'
import { CustomError, resolvePathOrBuffer } from '../util/data.js'
import { USER_AGENT } from '../env.js'

export const WPWFilters = ['hitam', 'coklat', 'nerd', 'piggy', 'carbon', 'botak'] as const

type WPWRequest = {
  filter: (typeof WPWFilters)[number]
  /**
   * Base64 encoded string (`/9j/...`)
   */
  imageData: string
}
type WPWResponse = {
  /**
   * Base64 URL encoded string (`data:image/png;base64,...`)
   */
  processedImageUrl: string
  status: 'success' | 'failed'
}

const msgs = {
  process: {
    ai: '```🤖 AI image processing...```',
    done: '```🤖 Done!```',
  },
}

const api = 'https://wpw.my.id/api/process-image' // POST json

export async function WPW(msg: Message, image: string | Buffer, filter: WPWRequest['filter']) {
  if (!WPWFilters.includes(filter)) {
    throw new CustomError(`Invalid filter. Valid filters are ${WPWFilters.join(', ')}.`, {
      name: 'WPWFilterError',
    })
  }
  const buffer = resolvePathOrBuffer(image)
  const request: WPWRequest = {
    filter,
    imageData: buffer.toString('base64'),
  }
  try {
    const msg2 = await msg.reply(msgs.process.ai)
    const response = await ky
      .post(api, {
        json: request,
        headers: {
          'User-Agent': USER_AGENT,
          'Accept-Language': 'id-ID',
        },
        timeout: 3 * 60 * 1000,
      })
      .json<WPWResponse>()

    if (response.status === 'success') {
      const base64 = response.processedImageUrl.replace(/^data:image\/\w+;base64,/, '')
      await msg2.edit('```🤖 Done!```')
      return Buffer.from(base64, 'base64')
    } else {
      throw new CustomError('Server response status failed.', {
        name: 'WPWError',
      })
    }
  } catch (e) {
    throw e
  }
}
