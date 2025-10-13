import { config } from 'dotenv'
import puppeteer from 'puppeteer-extra'
import { chromePath } from './util/misc.js'

config()

export const CHROME_PATH = process.env.CHROME_PATH || chromePath() || puppeteer.default.executablePath()
export const USER_AGENT =
  process.env.USER_AGENT ||
  (await (async () => {
    try {
      console.time('Latest user agent gathered')
      const browser = await puppeteer.default.launch({ executablePath: CHROME_PATH })
      const userAgent = (await browser.userAgent()).replace('Headless', '')
      await browser.close()
      console.timeEnd('Latest user agent gathered')
      return userAgent
    } catch (e) {
      console.error(e)
    }
  })()) ||
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
export const PREFIX = process.env.PREFIX || '/'
export const OWNER_NUMBER = process.env.OWNER_NUMBER
export const PHONE_NUMBER = process.env.PHONE_NUMBER
export const DUCKDB = process.env.DUCKDB
