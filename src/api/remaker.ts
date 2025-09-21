import ky from 'ky'
import { Message } from 'whatsapp-web.js'
import { CustomError, getProductSerial, resolvePathOrBuffer } from '../util/data.js'
import { USER_AGENT } from '../env.js'
import { IntRange } from 'type-fest'

export const REJobType = ['Upscaler', 'Unblur', 'Enhancer', 'Face_Restore', 'Removebg'] as const

type REResponse = {
  /**
   * Success is `100000`
   */
  code: number
  message: {
    en: string
    zh: string
  }
}

type REJobOutput = REResponse & {
  result: {
    job_id: string
  } | null
}

type REFreeTimes = REResponse & {
  result: {
    free_times: IntRange<0, 81>
  } | null
}

type REResultOutput = REResponse & {
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

const api = {
  enhance: ky.create({
    prefixUrl: 'https://api.remaker.ai/api/pai/v4/ai-enhance',
    timeout: 3 * 60 * 1000,
    headers: {
      'Product-Serial': getProductSerial(),
      'Product-Code': '067003',
      'User-Agent': USER_AGENT,
    },
  }),
  removebg: ky.create({
    prefixUrl: 'https://api.remaker.ai/api/pai/v4/ai-removebg-new',
    timeout: 3 * 60 * 1000,
    headers: {
      'Product-Serial': getProductSerial(),
      'User-Agent': USER_AGENT,
    },
  }),
}

export async function getFreeTimes(type: keyof typeof api) {
  const response = await api[type].get('free_times').json<REFreeTimes>()
  if (response.code === 100000 && response.result) return response.result.free_times
}

async function RERemove(msg: Message, image: Buffer) {
  const formData = new FormData()
  formData.append('image_file', new Blob([Uint8Array.from(image)]), 'blob')
  try {
    const msg2 = await msg.reply(msgs.process.prepare)
    const job = await api.removebg
      .post('create-job', {
        body: formData,
      })
      .json<REJobOutput>()
    if (job.code === 100000 && job.result) {
      await msg2.edit(msgs.process.job)
      return new Promise<URL>((resolve, reject) => {
        const checkJob = setInterval(async () => {
          try {
            //@ts-expect-error
            const result = await api.removebg.get(`get-job/${job.result.job_id}`).json<REResultOutput>()
            if (result.code === 100000 && result.result) {
              clearInterval(checkJob)
              await msg2.edit(msgs.process.done)
              await msg2.reply(`🤖 *Free* credits left: ${await getFreeTimes('removebg')}`)
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
      throw new CustomError<REJobOutput>('Job failed.', {
        name: 'EZJobFailed',
        response: job,
      })
    }
  } catch (e) {
    throw e
  }
}

export async function Remaker(msg: Message, image: string | Buffer, type: (typeof REJobType)[number]) {
  const buffer = resolvePathOrBuffer(image)
  if (type === 'Removebg') return RERemove(msg, buffer)
  const formData = new FormData()
  formData.append('type', type)
  formData.append('original_image_file', new Blob([Uint8Array.from(buffer)]), 'blob')
  try {
    const msg2 = await msg.reply(msgs.process.prepare)
    const job = await api.enhance
      .post('create-job-new', {
        body: formData,
      })
      .json<REJobOutput>()
    if (job.code === 100000 && job.result) {
      await msg2.edit(msgs.process.job)
      return new Promise<URL>((resolve, reject) => {
        const checkJob = setInterval(async () => {
          try {
            //@ts-expect-error
            const result = await api.enhance.get(`get-job/${job.result.job_id}`).json<REResultOutput>()
            if (result.code === 100000 && result.result) {
              clearInterval(checkJob)
              await msg2.edit(msgs.process.done)
              await msg2.reply(`🤖 *Free* credits left: ${await getFreeTimes('enhance')}`)
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
              name: 'REJobTimeout',
            })
          )
        }, 3 * 60 * 1000) // 3 min timeout
      })
    } else {
      throw new CustomError<REJobOutput>('Job failed.', {
        name: 'REJobFailed',
        response: job,
      })
    }
  } catch (e) {
    throw e
  }
}
