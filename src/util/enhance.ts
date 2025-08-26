import { readFileSync } from 'fs'
import { extname } from 'path'
import ky, { HTTPError } from 'ky'

interface SignedUrlResponse {
  presignedUrl: string
}

interface ApiResponse {
  resultImageUrl: string
}

interface UpscaleResult {
  success: true
  data: {
    image: Buffer
    imageUrl: string
    size: string
  }
}

interface UpscaleError {
  success: false
  error: string
  code?: string
}

type UpscaleResponse = UpscaleResult | UpscaleError

const MIME_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
} as const

const API_ENDPOINTS = {
  signedUrl: 'https://pxpic.com/getSignedUrl',
  aiFunction: 'https://pxpic.com/callAiFunction',
  fileBase: 'https://files.fotoenhancer.com/uploads/',
} as const

class UpscaleError extends Error {
  constructor(message: string, public code?: string, public originalError?: unknown) {
    super(message)
    this.name = 'UpscaleError'
  }
}

const generateFileName = (ext: string): string => {
  const randomId = Math.random().toString(36).slice(2, 8)
  return `${randomId}.${ext}`
}

const getMimeType = (ext: string): string => {
  const normalizedExt = ext.toLowerCase() as keyof typeof MIME_TYPES
  return MIME_TYPES[normalizedExt] ?? 'application/octet-stream'
}

const formatSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)}${units[unitIndex]}`
}

const processImageInput = (imageInput: string | Buffer): { buffer: Buffer; ext: string } => {
  if (typeof imageInput === 'string') {
    try {
      const buffer = readFileSync(imageInput)
      const ext = extname(imageInput).slice(1) || 'jpg'
      return { buffer, ext }
    } catch (error) {
      throw new UpscaleError(`Failed to read image file: ${imageInput}`, 'FILE_READ_ERROR', error)
    }
  }

  if (Buffer.isBuffer(imageInput)) {
    return { buffer: imageInput, ext: 'jpg' }
  }

  throw new UpscaleError('Invalid input type. Expected file path string or Buffer.', 'INVALID_INPUT_TYPE')
}

const getSignedUrl = async (fileName: string): Promise<string> => {
  try {
    const response = await ky
      .post(API_ENDPOINTS.signedUrl, {
        json: { folder: 'uploads', fileName },
        timeout: 30000,
      })
      .json<SignedUrlResponse>()

    return response.presignedUrl
  } catch (error) {
    if (error instanceof HTTPError) {
      throw new UpscaleError(
        `Failed to get signed URL: ${error.response.status} ${error.response.statusText}`,
        'SIGNED_URL_ERROR',
        error
      )
    }
    throw new UpscaleError('Network error while getting signed URL', 'NETWORK_ERROR', error)
  }
}

const uploadImage = async (presignedUrl: string, buffer: Buffer, mimeType: string): Promise<void> => {
  try {
    await ky.put(presignedUrl, {
      body: new Uint8Array(buffer),
      headers: { 'Content-Type': mimeType },
      timeout: 60000,
    })
  } catch (error) {
    if (error instanceof HTTPError) {
      throw new UpscaleError(
        `Failed to upload image: ${error.response.status} ${error.response.statusText}`,
        'UPLOAD_ERROR',
        error
      )
    }
    throw new UpscaleError('Network error while uploading image', 'NETWORK_ERROR', error)
  }
}

const processImage = async (imageUrl: string): Promise<string> => {
  const params = new URLSearchParams({
    imageUrl,
    targetFormat: 'png',
    needCompress: 'no',
    imageQuality: '100',
    compressLevel: '6',
    fileOriginalExtension: 'png',
    aiFunction: 'upscale',
    upscalingLevel: '',
  })

  try {
    const response = await ky
      .post(API_ENDPOINTS.aiFunction, {
        body: params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
          'Accept-Language': 'id-ID',
        },
        timeout: 120000, // AI processing can take longer
      })
      .json<ApiResponse>()

    if (!response.resultImageUrl) {
      throw new UpscaleError('Invalid response from AI service: missing result URL', 'INVALID_API_RESPONSE')
    }

    return response.resultImageUrl
  } catch (error) {
    if (error instanceof HTTPError) {
      throw new UpscaleError(
        `AI processing failed: ${error.response.status} ${error.response.statusText}`,
        'AI_PROCESSING_ERROR',
        error
      )
    }
    throw new UpscaleError('Network error during AI processing', 'NETWORK_ERROR', error)
  }
}

const downloadResult = async (resultUrl: string): Promise<Buffer> => {
  try {
    const response = await ky.get(resultUrl, {
      timeout: 60000,
    })

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    if (error instanceof HTTPError) {
      throw new UpscaleError(
        `Failed to download result: ${error.response.status} ${error.response.statusText}`,
        'DOWNLOAD_ERROR',
        error
      )
    }
    throw new UpscaleError('Network error while downloading result', 'NETWORK_ERROR', error)
  }
}

/**
 * Upscales an image using the pxpic.com API
 * @param imageInput - File path string or Buffer containing the image data
 * @returns Promise resolving to upscale result or error
 */
export const enhance = async (imageInput: string | Buffer): Promise<UpscaleResponse> => {
  try {
    // Process input
    const { buffer, ext } = processImageInput(imageInput)
    const mimeType = getMimeType(ext)
    const fileName = generateFileName(ext)

    // Get signed URL for upload
    const presignedUrl = await getSignedUrl(fileName)

    // Upload image
    await uploadImage(presignedUrl, buffer, mimeType)

    // Process image with AI
    const imageUrl = `${API_ENDPOINTS.fileBase}${fileName}`
    const resultImageUrl = await processImage(imageUrl)

    // Download result
    const resultBuffer = await downloadResult(resultImageUrl)

    return {
      success: true,
      data: {
        image: resultBuffer,
        imageUrl: resultImageUrl,
        size: formatSize(resultBuffer.length),
      },
    }
  } catch (error) {
    console.error('Upscale operation failed:', error)

    if (error instanceof UpscaleError) {
      return error;
    }

    return new UpscaleError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      'UNKNOWN_ERROR',
      error
    );
  }
}

export default enhance
