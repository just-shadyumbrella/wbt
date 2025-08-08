import fs from 'node:fs'
import { config } from 'dotenv'
import WAWebJS from 'whatsapp-web.js'

config()

export const PREFIX = process.env.PREFIX || '/'

export const PHONE_NUMBER = process.env.PHONE_NUMBER

export const readMore = ` ${'\u{34f}'.repeat(1024 * 3)}`

/**
\\(⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)/

(｡•́‿•̀｡)

(｡^‿^｡)

(//ω//)

(≧◡≦)

(>///<)
 */
export function blushReact(index?: number) {
  const blush = ['\\(⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)/', '(｡•́‿•̀｡)', '(｡^‿^｡)', '(//ω//)', '(≧◡≦)', '(>///<)']
  return blush[index || Math.floor(Math.random() * blush.length)]
}


export function parseArguments(input: string, prefix: string[] = [PREFIX]) {
  function processEscapes(str: string) {
    return str.replace(/\\"/g, '"')
  }
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0
  while (i < input.length) {
    const char = input[i]
    if (char === '"') {
      if (i > 0 && input[i - 1] === '\\') {
        current += char
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === '\\' && i + 1 < input.length && input[i + 1] === '"') {
      current += char
    } else if (char === ' ' && !inQuotes) {
      if (current.length > 0) {
        result.push(processEscapes(current))
        current = ''
      }
    } else {
      current += char
    }
    i++
  }
  // Add the last token if it exists
  if (current.length > 0) {
    result.push(processEscapes(current))
  }
  const command = result[0]
  if (command) {
    const prefixValid = (() => {
      for (const p of prefix) {
        if (command.startsWith(p)) return true
      }
    })()
    if (prefixValid) return result
  }
}

export type ParsedCommand = {
  command: string
  flags: Record<string, string | boolean>
  positional: string[]
}

function tokenize(command: string): string[] {
  const regex = /"([^"]*)"|'([^']*)'|[^\s]+/g
  const tokens: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(command)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[0])
  }
  return tokens
}

export function parseArgumentsStructured(input: string, prefix: string[] = [PREFIX]): ParsedCommand | undefined {
  const tokens = tokenize(input.trim())
  if (tokens.length > 0) {
    const prefixValid = (() => {
      for (const p of prefix) {
        if (tokens[0].startsWith(p)) return true
      }
    })()
    if (prefixValid) {
      const [command, ...args] = tokens
      const flags: Record<string, string | boolean> = {}
      const positional: string[] = []
      let i = 0
      while (i < args.length) {
        const token = args[i]
        if (token.startsWith('-') || token.startsWith('+')) {
          const next = args[i + 1]
          if (next === undefined || next.startsWith('-') || next.startsWith('+')) {
            flags[token] = true
            i += 1
          } else {
            flags[token] = next
            i += 2
          }
        } else {
          positional.push(token)
          i += 1
        }
      }
      return { command, flags, positional }
    }
  }
}

export function extractCommandFromPrefix(command: string, prefix: string[] = [PREFIX]) {
  let _ = ''
  for (const p of prefix) {
    if (command === p) return command
    if (command.startsWith(p)) {
      _ = command.replace(p, '')
      break
    }
  }
  return _
}

export function useHelp(commandInstructions: string[], description?: string) {
  const formattedInstructions = commandInstructions.map((e) => `\`${e}\``)
  return `💡 *Penggunaan*\n\n${formattedInstructions.join('\n')}${description ? `\n\n${description}` : ''}`
}

/* WA Utils */

export function chromePath() {
  if (process.platform === 'win32') {
    const win_chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    try {
      const stat = fs.statSync(win_chrome)
      if (stat.isFile()) return win_chrome
    } catch (err) {
      console.error(err)
    }
  }
}

export function extractFlatPhoneNumber(number: string) {
  return number.replace(/(@\w+)(\.\w+(\.\w+)?[^.\W])$/g, '')
}

export async function extractFlatPhoneNumberFromMessage(message: WAWebJS.Message) {
  return extractFlatPhoneNumber(getAuthor(message))
}

export function getAuthor(message: WAWebJS.Message) {
  return message.author || message.from
}

export async function getGroupAdmins(message: WAWebJS.Message) {
  const chat = (await message.getChat()) as GroupChat
  if (chat.isGroup) {
    return chat.participants.filter((e) => e.isAdmin || e.isSuperAdmin)
  }
}

export async function isAdmin(message: WAWebJS.Message) {
  const admins = await getGroupAdmins(message)
  if (admins) {
    for (const admin of admins) {
      if (admin.id._serialized === (getAuthor(message))) return true
    }
  }
  return false
}

// export async function isMyselfAdmin(message: WAWebJS.Message) {
//   const admins = await getGroupAdmins(message)
//   if (admins) {
//     for (const admin of admins) {
//       if (admin.id._serialized === getAuthor(message)) return true
//     }
//   }
//   return false
// }

export type Chat = WAWebJS.Chat & { client: WAWebJS.Client; lastMessage: { client: WAWebJS.Client } }
export type GroupChat = WAWebJS.GroupChat & { client: WAWebJS.Client; lastMessage: { client: WAWebJS.Client } }

/**
 * If `client` property is unnecessarry
 */
export async function getChat(message: WAWebJS.Message, noClient = false) {
  const chat = (await message.getChat()) as Chat | GroupChat
  if (noClient) {
    const { client, ...chatWithoutClient } = chat
    const { client: lastClient, ...lastMessageWithoutClient } = chat.lastMessage
    return { ...chatWithoutClient, lastMessage: lastMessageWithoutClient }
  }
  return chat
}
