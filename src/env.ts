import { config } from 'dotenv'

config()

export const PREFIX = process.env.PREFIX || '/'
export const OWNER_NUMBER = process.env.OWNER_NUMBER
export const PHONE_NUMBER = process.env.PHONE_NUMBER
export const USER_AGENT =
  process.env.USER_AGENT ||
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
export const DUCKDB = process.env.DUCKDB
