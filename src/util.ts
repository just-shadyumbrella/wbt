import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import chalk from 'chalk'
import si from 'systeminformation'
import WAWebJS from 'whatsapp-web.js'
import { config } from 'dotenv'

chalk.level = 1
config()

/* CONSTANTS */
console.log('Gathering `package.json`...')
console.time('Package information stored')
const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json')).toString())
const bun = process.versions.bun,
  node = process.versions.node
const versions = [
  bun ? `Bun v${bun}` : undefined,
  node ? `NodeJS v${node}` : undefined,
  [pkg['name'], pkg['version']].join(' v'),
].filter((e) => e !== undefined)
console.timeEnd('Package information stored')

export const PREFIX = process.env.PREFIX || '/'

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

/* SYSTEM INFO */
const tmpDir = path.join(process.cwd(), '.tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)

async function loadOrCache<T>(filename: string, getter: () => Promise<T>): Promise<T> {
  const filePath = path.join(tmpDir, filename)
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf-8')
      return JSON.parse(fileContent)
    } catch (err) {
      logger(LoggerType.WARN, { name: 'util', fn: 'loadOrCache' }, `Cannot load cache for \`${filename}\`:`, err)
    }
  }
  const data = await getter()
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2))
  return data
}

console.log('Gathering system information...')
console.time('System information stored')
const system = await loadOrCache('system.json', si.system)
console.timeEnd('System information stored')

console.log('Gathering OS information...')
console.time('OS information stored')
const osInfo = await loadOrCache('osInfo.json', si.osInfo)
console.timeEnd('OS information stored')
console.log('Gathering CPU information...')
console.time('CPU information stored')
const cpu = await loadOrCache('cpu.json', si.cpu)
console.timeEnd('CPU information stored')
export async function sysinfo() {
  // const time = si.time() // Somewhat causes Puppeteer to close unexpectedly
  console.log('Gathering memory information...')
  console.time('Memory information gathered')
  const mem = await si.mem()
  console.timeEnd('Memory information gathered')
  console.log('Gathering filesystem information...')
  console.time('Filesystem information gathered')
  const fsSize = await si.fsSize()
  console.timeEnd('Filesystem information gathered')
  return `*System Uptime:* ${new Date(os.uptime() * 1000).toISOString().substr(11, 8)}
*Runner:* ${system.manufacturer} ${system.model}${system.virtual ? ' (Virtualized)' : ''} ${system.version}
*OS:* ${osInfo.distro} ${osInfo.release}${osInfo.codename ? ` "${osInfo.codename}"` : ''} (kernel: ${osInfo.kernel} ${
    osInfo.arch
  })
*CPU:* ${cpu.manufacturer} ${cpu.brand} (${cpu.cores} cores available, up to ${cpu.speed} GHz)
*Memory:* ${convertByteUnit(mem.used, 'GB')}/${convertByteUnit(mem.total, 'GB')} GB
*Disk:* ${convertByteUnit(fsSize[0].used, 'GB')}/${convertByteUnit(fsSize[0].size, 'GB')} GB

*💼 Project*${readMore}
\`\`\`
${JSON.stringify(pkg, null, 2)}
\`\`\`
> ${versions.join(' | ')}`
}

/* UTILS */

export function convertByteUnit(bytes: number, unit: 'KB' | 'MB' | 'GB') {
  const units = {
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  }
  const value = bytes / units[unit]
  const result = Math.round(value * 100) / 100
  return result
}

export enum LoggerType {
  LOG,
  INFO,
  WARN,
  ERROR,
}

export function logger(type: LoggerType, module: { name: string; fn: string; context?: string }, ...data: any[]) {
  const consol = {
    [LoggerType.LOG]: {
      log: 'log',
      chalk: chalk.white,
    },
    [LoggerType.INFO]: {
      log: 'info',
      chalk: chalk.blue,
    },
    [LoggerType.WARN]: {
      log: 'warn',
      chalk: chalk.yellow,
    },
    [LoggerType.ERROR]: {
      log: 'error',
      chalk: chalk.red,
    },
  }
  if (typeof data[0] === 'string') data[0] = consol[type].chalk(data[0])
  return console[consol[type].log](
    consol[type].chalk(leftAlignWithSpaces(consol[type].log.toUpperCase(), consol[LoggerType.ERROR].log.length)),
    leftAlignWithSpaces(`[${chalk.green(`${module.name}:${module.fn}${module.context ? `?${module.context}` : ''}`)}]`),
    ...data
  )
}

export function leftAlignWithSpaces(text: string, maxlength = 42) {
  const r = maxlength >= text.length ? maxlength - text.length : 0
  return `${text}${' '.repeat(r)}`
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
        if (token.startsWith('-')) {
          const next = args[i + 1]
          if (next === undefined || next.startsWith('-')) {
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
