import { spawn } from 'child_process'

export async function imageMagick(pathOrBuffer: string | Buffer, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const binary = 'magick'
    const resultChunks: Buffer[] = []
    const inputIsBuffer = Buffer.isBuffer(pathOrBuffer)
    if (!inputIsBuffer) args.unshift(pathOrBuffer)
    const child = spawn(binary, [...args, 'png:-'])
    if (inputIsBuffer) {
      child.stdin.write(pathOrBuffer)
      child.stdin.end()
    }
    child.stdin.on('error', (error: Error) => {
      const errorMsg = `Failed to write to ImageMagick stdin: ${error.message}`
      console.error(`[ImageMagick Error] ${errorMsg}`)
      reject(new Error(errorMsg))
    })
    child.stdout.on('data', (chunk) => resultChunks.push(chunk))
    child.stderr.on('data', (data) => {
      console.error('[ImageMagick]', data.toString())
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(resultChunks))
      } else {
        reject(new Error(`ImageMagick exited with code ${code}`))
      }
    })
  })
}

export async function FFmpeg(pathOrBuffer: string | Buffer, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const binary = 'ffmpeg'
    const resultChunks: Buffer[] = []
    const inputIsBuffer = Buffer.isBuffer(pathOrBuffer)
    if (!inputIsBuffer) args.unshift('-i', pathOrBuffer)
    const child = spawn(binary, [...args, 'pipe:1'])
    if (inputIsBuffer) {
      child.stdin.write(pathOrBuffer)
      child.stdin.end()
    }
    child.stdout.on('data', (chunk) => resultChunks.push(chunk))
    child.stderr.on('data', (data) => {
      const out = data.toString() as string
      if (out.toLocaleLowerCase().includes('error')) {
        console.error(out)
      } else {
        console.log(out)
      }
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(resultChunks))
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`))
      }
    })
  })
}

export async function FFProbe(pathOrBuffer: string | Buffer, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const binary = 'ffprobe'
    const resultChunks: Buffer[] = []
    const inputIsBuffer = Buffer.isBuffer(pathOrBuffer)
    if (!inputIsBuffer) args.unshift(pathOrBuffer)
    const child = spawn(binary, [...args])
    if (inputIsBuffer) {
      child.stdin.write(pathOrBuffer)
      child.stdin.end()
    }
    child.stdout.on('data', (chunk) => resultChunks.push(chunk))
    child.stderr.on('data', (data) => {
      const out = data.toString() as string
      if (out.toLocaleLowerCase().includes('error')) {
        console.error(out)
      } else {
        console.log(out)
      }
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(resultChunks))
      } else {
        reject(new Error(`FFProbe exited with code ${code}`))
      }
    })
  })
}

export async function YTdlp(link: string, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const binary = 'yt-dlp'
    const resultChunks: Buffer[] = []
    const child = spawn(binary, [link, ...args])
    child.stdout.on('data', (chunk) => resultChunks.push(chunk))
    child.stderr.on('data', (data) => {
      const out = data.toString() as string
      if (out.toLocaleLowerCase().includes('error')) {
        console.error(out)
      } else {
        console.log(out)
      }
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(resultChunks))
      } else {
        reject(new Error(`YTdlp exited with code ${code}`))
      }
    })
  })
}
