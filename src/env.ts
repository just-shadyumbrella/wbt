import { config } from 'dotenv'
import puppeteer from 'puppeteer-extra'

console.time('Latest user agent gathered')
const browser = await puppeteer.default.launch()
const userAgent = await browser.userAgent()
await browser.close()
console.timeEnd('Latest user agent gathered')

config()

export const PREFIX = process.env.PREFIX || '/'
export const OWNER_NUMBER = process.env.OWNER_NUMBER
export const PHONE_NUMBER = process.env.PHONE_NUMBER
export const USER_AGENT =
  process.env.USER_AGENT ||
  userAgent ||
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
export const DUCKDB = process.env.DUCKDB
