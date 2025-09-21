import fs from 'node:fs'
import crypto from 'node:crypto'

export function resolvePathOrBuffer(input: string | Buffer): Buffer {
  return Buffer.isBuffer(input) ? input : fs.readFileSync(input)
}

export function getProductSerial() {
  return crypto.randomBytes(16).toString('hex')
}

export class CustomError<T> extends Error {
  response?: T
  constructor(message?: string, options?: { name?: string; response?: T }) {
    super(message)
    this.name = options?.name ?? 'CustomError'
    this.response = options?.response
  }
}
