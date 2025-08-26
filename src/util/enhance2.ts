import ky, { type KyInstance } from 'ky'
import { createHash, randomBytes } from 'node:crypto'

// Types
interface ApiResponse<T = unknown> {
  creator: string
  status: boolean
  result?: T
  error?: string
}

interface JobResponse {
  code: number
  result?: {
    job_id: string
    output?: string[]
  }
  message?: {
    en?: string
    id?: string
  }
}

interface JobStatusResponse {
  code: number
  result?: {
    output?: string[]
  }
  message?: {
    en?: string
    id?: string
  }
}

interface UpscaleResponse {
  result_url?: string
}

// Constants
const COMMON_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0',
} as const

const API_ENDPOINTS = {
  ezRemove: {
    createJob: 'https://api.ezremove.ai/api/ez-remove/background-remove/create-job',
    getJob: (jobId: string) => `https://api.ezremove.ai/api/ez-remove/background-remove/get-job/${jobId}`,
  },
  pixelcut: 'https://api2.pixelcut.app/image/upscale/v1',
  remaker: {
    createJob: 'https://api.remaker.ai/api/pai/v4/ai-enhance/create-job-new',
    getJob: (jobId: string) => `https://api.remaker.ai/api/pai/v4/ai-enhance/get-job/${jobId}`,
  },
  catbox: 'https://catbox.moe/user/api.php',
} as const

export class Generator {
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'] as const
    const k = 1024
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / k ** i).toFixed(2))} ${units[i]}`
  }

  private static generateFingerprint(): string {
    const components = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      '1920x1080',
      new Date().getTimezoneOffset().toString(),
      'en-US',
      'Win32',
      randomBytes(8).toString('hex'),
      Date.now().toString(),
      process.pid?.toString() ?? '0',
      Math.floor(Math.random() * 1_000_000).toString(),
    ]

    return createHash('md5').update(components.join('|')).digest('hex')
  }

  static getFingerprint(): string {
    return this.generateFingerprint()
  }
}

export class ApiClient {
  private readonly http: KyInstance
  private readonly creator: string

  constructor(creator = 'api-client') {
    this.creator = creator
    this.http = ky.create({
      timeout: 30000,
      retry: {
        limit: 2,
        methods: ['get', 'post'],
      },
    })
  }

  private createFormData(fields: Record<string, string | Buffer | number>): FormData {
    const form = new FormData()

    for (const [key, value] of Object.entries(fields)) {
      if (value instanceof Buffer) {
        form.append(key, new Blob([new Uint8Array(value)]), 'blob')
      } else {
        form.append(key, value.toString())
      }
    }

    return form
  }

  private createResponse<T>(data: T): ApiResponse<T> {
    return {
      creator: this.creator,
      status: true,
      result: data,
    }
  }

  private createError(error: string): ApiResponse {
    return {
      creator: this.creator,
      status: false,
      error,
    }
  }

  private async pollJobStatus(
    getJobUrl: string,
    headers: Record<string, string>,
    processingCode: number,
    interval = 3000
  ): Promise<JobStatusResponse> {
    const poll = async (): Promise<JobStatusResponse> => {
      const response = await this.http.get(getJobUrl, { headers }).json<JobStatusResponse>()

      if (response.code === 100000 && response.result?.output) {
        return response
      }

      if (response.code === processingCode) {
        await new Promise((resolve) => setTimeout(resolve, interval))
        return poll()
      }

      throw new Error(
        `Job failed: ${response.message?.en ?? response.message?.id ?? 'Unknown error'} (Code: ${response.code})`
      )
    }

    return poll()
  }

  async removeBackground(image: Buffer): Promise<ApiResponse<{ job_id: string; image_url: string }>> {
    try {
      const productSerial = Generator.getFingerprint()
      const form = this.createFormData({ image_file: image })

      const headers = {
        ...COMMON_HEADERS,
        'product-serial': productSerial,
        Referer: 'https://ezremove.ai/',
        Origin: 'https://ezremove.ai',
      }

      // Create job
      const createResponse = await this.http
        .post(API_ENDPOINTS.ezRemove.createJob, {
          body: form,
          headers,
        })
        .json<JobResponse>()

      if (createResponse.code !== 100000) {
        const errorMsg = createResponse.message?.en ?? createResponse.message?.id ?? 'Unknown error'
        return this.createError(`Job creation failed: ${errorMsg}`)
      }

      const jobId = createResponse.result!.job_id

      // Poll for completion
      const jobHeaders = {
        authorization: '',
        'product-serial': productSerial,
        Referer: 'https://ezremove.ai/',
        Origin: 'https://ezremove.ai',
      }

      const statusResponse = await this.pollJobStatus(API_ENDPOINTS.ezRemove.getJob(jobId), jobHeaders, 300001)

      return this.createResponse({
        job_id: jobId,
        image_url: statusResponse.result!.output![0],
      })
    } catch (error) {
      return this.createError(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  async upscaleImageV2(buffer: Buffer): Promise<ApiResponse<string>> {
    try {
      const form = this.createFormData({
        image: buffer,
        scale: 2,
      })

      const headers = {
        Accept: 'application/json',
        Referer: 'https://www.pixelcut.ai/',
        Origin: 'https://www.pixelcut.ai',
        'x-client-version': 'web',
      }

      const response = await this.http
        .post(API_ENDPOINTS.pixelcut, {
          body: form,
          headers,
        })
        .json<UpscaleResponse>()

      if (!response.result_url) {
        return this.createError('No result URL returned from upscale service')
      }

      return this.createResponse(response.result_url)
    } catch (error) {
      return this.createError(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  async upscaleImageV1(buffer: Buffer): Promise<ApiResponse<{ job_id: string; image_url: string }>> {
    try {
      const productSerial = Generator.getFingerprint()
      const form = this.createFormData({
        type: 'Enhancer',
        original_image_file: buffer,
      })

      const headers = {
        ...COMMON_HEADERS,
        authorization: '',
        'product-code': '067003',
        'product-serial': productSerial,
        Referer: 'https://remaker.ai/',
      }

      // Create job
      const createResponse = await this.http
        .post(API_ENDPOINTS.remaker.createJob, {
          body: form,
          headers,
        })
        .json<JobResponse>()

      if (createResponse.code !== 100000) {
        const errorMsg = createResponse.message?.en ?? 'Unknown error'
        return this.createError(`Job creation failed: ${errorMsg}`)
      }

      const jobId = createResponse.result!.job_id

      // Poll for completion
      const statusResponse = await this.pollJobStatus(API_ENDPOINTS.remaker.getJob(jobId), headers, 300013)

      return this.createResponse({
        job_id: jobId,
        image_url: statusResponse.result!.output![0],
      })
    } catch (error) {
      return this.createError(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  async uploadImage(buffer: Buffer): Promise<ApiResponse<string>> {
    try {
      const form = this.createFormData({
        fileToUpload: buffer,
        reqtype: 'fileupload',
        userhash: '',
      })

      const response = await this.http
        .post(API_ENDPOINTS.catbox, {
          body: form,
        })
        .text()

      return this.createResponse(response)
    } catch (error) {
      return this.createError(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }
}

// Legacy compatibility exports
export default class Tools extends ApiClient {
  // Alias methods for backward compatibility
  removeBackground = this.removeBackground.bind(this)
  reminiV1 = this.upscaleImageV1.bind(this)
  reminiV2 = this.upscaleImageV2.bind(this)
  uploadImage = this.uploadImage.bind(this)
}
