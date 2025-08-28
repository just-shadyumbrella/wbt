import path from 'node:path'
import crypto from 'node:crypto'
import ky from 'ky'
import _ from 'lodash'
import { fileTypeFromBuffer } from 'file-type'
import { Message } from 'whatsapp-web.js'
import { CustomError, resolvePathOrBuffer } from '../util/data.js'
import { USER_AGENT } from '../env.js'
import { IntRange } from 'type-fest'

export const photoToolCommand = ['enhance', 'upscale', 'removebg'] as const

const msgs = {
  upload: {
    prepare: '```🤖 Preparing upload...```',
    upload: '```🤖 Uploading image...```',
    done: '```🤖 Upload image done!```',
  },
  process: {
    ai: '```🤖 AI image processing...```',
    done: '```🤖 Done!```',
  },
}

export async function uploadPhoto(image: Buffer, folder = 'uploads', msg: Message) {
  const fileType = await fileTypeFromBuffer(image)
  if (fileType) {
    const supportedExts = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'tiff']
    if (!fileType.ext || !supportedExts.includes(fileType.ext)) {
      throw new CustomError(`Unsupported image format. Valid formats are ${supportedExts.join(', ')}.`, {
        name: 'FormatPhotoError',
      })
    }
    const fileName = `${crypto.randomUUID()}.${fileType.ext}`
    try {
      const msg2 = await msg.reply(msgs.upload.prepare)

      // Get signed URL
      const signedUrlResponse = await ky
        .post('https://pxpic.com/getSignedUrl', {
          json: { folder, fileName },
          headers: { 'Content-Type': 'application/json' },
        })
        .json<{ presignedUrl: string }>()

      await msg2.edit(msgs.upload.upload)

      // Upload image
      await ky.put(signedUrlResponse.presignedUrl, {
        body: new Uint8Array(image),
        headers: { 'Content-Type': fileType.mime },
      })

      await msg2.edit(msgs.upload.done)
      const url = new URL(path.join(folder, fileName), 'https://files.fotoenhancer.com')
      return { ..._.merge(fileType, url), msg: msg2 }
    } catch (e) {
      throw e
    }
  } else {
    throw new CustomError('Could not process buffer.', { name: 'PhotoBufferError' })
  }
}

export async function photoTool(
  msg: Message,
  image: string | Buffer | URL,
  tool: (typeof photoToolCommand)[number],
  options?: {
    imageQuality?: IntRange<0, 100>
    compressLevel?: IntRange<0, 9>
    upscalingLevel?: IntRange<0, 4>
  }
) {
  const img = await (async () => {
    if (image instanceof URL) {
      const buffer = await ky.get(image.href).arrayBuffer()
      const fileType = await fileTypeFromBuffer(buffer)
      return { ..._.merge(fileType, image), msg }
    } else {
      const buffer = resolvePathOrBuffer(image)
      return await uploadPhoto(buffer, undefined, msg)
    }
  })()

  if (img.ext && options) {
    const params = new URLSearchParams({
      imageUrl: img.href,
      targetFormat: 'png',
      needCompress: options.compressLevel ? 'yes' : 'no',
      imageQuality: String(options.imageQuality || '100'),
      compressLevel: String(options.compressLevel || '6'),
      fileOriginalExtension: img.ext,
      aiFunction: tool,
      upscalingLevel: String(options.upscalingLevel || tool === 'upscale' ? '2' : ''),
    })

    try {
      const msg = img.msg
      const msg2 = msg.fromMe ? await msg.edit(msgs.process.ai) : await msg.reply(msgs.process.ai)
      const response = await ky
        .post('https://pxpic.com/callAiFunction', {
          body: params.toString(),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': USER_AGENT,
            'accept-language': 'id-ID',
          },
          timeout: 3 * 60 * 1000,
        })
        .json<{ resultImageUrl: string }>()

      if (msg2) await msg2.edit(msgs.process.done)

      return new URL(response.resultImageUrl)
    } catch (e) {
      throw e
    }
  }
}
