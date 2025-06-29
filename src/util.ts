import fs from 'node:fs'
import chalk from 'chalk'
import WAWebJS from 'whatsapp-web.js'
import { config } from 'dotenv'

config()

export enum LoggerType {
  LOG = 'log',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export function logger(type: LoggerType, module: string, ...data: any[]) {
  let prefix = ''
  switch (type) {
    case LoggerType.LOG:
      prefix = chalk.white('LOG  ')
      break
    case LoggerType.INFO:
      prefix = chalk.blue('INFO ')
      break
    case LoggerType.WARN:
      prefix = chalk.yellow('WARN ')
      break
    case LoggerType.ERROR:
      prefix = chalk.red('ERROR')
      break
  }
  return console[type](`${prefix}`, `${leftAlignWithSpaces(`[${chalk.green(module)}]`)}:`, ...data)
}

export function leftAlignWithSpaces(text: string, maxlength = 46) {
  const r = maxlength >= text.length ? maxlength - text.length : 0
  return `${text}${' '.repeat(r)}`
}

const PREFIX = process.env.PREFIX || '/'

export function parseArguments(input: string): [string, string[]] | undefined {
  function processEscapes(str: string) {
    // Replace escaped quotes with regular quotes
    return str.replace(/\\"/g, '"')
  }
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0
  while (i < input.length) {
    const char = input[i]
    if (char === '"') {
      // Check if this quote is escaped
      if (i > 0 && input[i - 1] === '\\') {
        // This is an escaped quote - add it to current token
        current += char
      } else {
        // This is a quote boundary - toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === '\\' && i + 1 < input.length && input[i + 1] === '"') {
      // This is an escape sequence for a quote - skip the backslash
      // The quote will be handled in the next iteration
      current += char
    } else if (char === ' ' && !inQuotes) {
      // Space outside quotes - end current token
      if (current.length > 0) {
        // Process escape sequences in the final token
        result.push(processEscapes(current))
        current = ''
      }
    } else {
      // Regular character or space inside quotes
      current += char
    }
    i++
  }
  // Add the last token if it exists
  if (current.length > 0) {
    result.push(processEscapes(current))
  }
  const command = result[0]
  if (command && command.startsWith(PREFIX)) {
    result.shift()
    return [command.replace(PREFIX, ''), result]
  }
}

/* WA Utils */

export function chromePath() {
  if (process.platform === 'win32') {
    const win_chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    const stat = fs.statSync(win_chrome)
    if (stat.isFile()) return win_chrome
  }
}

export type Chat = WAWebJS.Chat & { client: WAWebJS.Client; lastMessage: { client: WAWebJS.Client } }
export type GroupChat = WAWebJS.GroupChat & { client: WAWebJS.Client; lastMessage: { client: WAWebJS.Client } }

/**
 * If `client` property is unnecessarry
 */
export async function chatFilter(chat: Chat | GroupChat) {
  const { client, ...chatWithoutClient } = chat
  const { client: lastClient, ...lastMessageWithoutClient } = chat.lastMessage
  return { ...chatWithoutClient, lastMessage: lastMessageWithoutClient }
}