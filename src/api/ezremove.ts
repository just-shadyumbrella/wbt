import crypto from 'node:crypto'
import ky from 'ky'
import { Message } from 'whatsapp-web.js'
import { CustomError, getProductSerial, resolvePathOrBuffer } from '../util/data.js'
import { USER_AGENT } from '../env.js'

type EZResponse = {
  /**
   * Success is `100000`
   */
  code: number
  message: {
    en: string
    zh: string
  }
}

type EZJobOutput = EZResponse & {
  result: {
    job_id: string
  } | null
}

type EZResultOutput = EZResponse & {
  result: {
    output: string[]
  } | null
}

const msgs = {
  process: {
    prepare: '_🤖 Preparing job..._',
    job: '_🤖 Job processing..._',
    done: '*🤖 Done!*',
  },
}

const productSerial = getProductSerial()
const api = ky.create({
  prefixUrl: 'https://api.ezremove.ai/api/ez-remove/background-remove',
  timeout: 3 * 60 * 1000,
  headers: {
    'Product-Serial': productSerial,
    'User-Agent': USER_AGENT,
  },
})

export async function EZRemove(msg: Message, image: string | Buffer) {
  const buffer = resolvePathOrBuffer(image)
  const formData = new FormData()
  formData.append('image_file', new Blob([Uint8Array.from(buffer)]), 'blob')
  try {
    const msg2 = await msg.reply(msgs.process.prepare)
    const job = await api
      .post('create-job', {
        body: formData,
      })
      .json<EZJobOutput>()
    if (job.code === 100000 && job.result) {
      await msg2.edit(msgs.process.job)
      return new Promise<URL>((resolve, reject) => {
        const checkJob = setInterval(async () => {
          try {
            //@ts-expect-error
            const result = await api.get(`get-job/${job.result.job_id}`, {}).json<EZResultOutput>()
            if (result.code === 100000 && result.result) {
              clearInterval(checkJob)
              await msg2.edit(msgs.process.done)
              resolve(new URL(result.result.output[0]))
            }
          } catch (err) {
            clearInterval(checkJob)
            reject(err)
          }
        }, 5000)
        setTimeout(() => {
          clearInterval(checkJob)
          reject(
            new CustomError('Job timeout.', {
              name: 'EZJobTimeout',
            })
          )
        }, 3 * 60 * 1000) // 3 min timeout
      })
    } else {
      throw new CustomError<EZJobOutput>('Job failed.', {
        name: 'EZJobFailed',
        response: job,
      })
    }
  } catch (e) {
    throw e
  }
}
