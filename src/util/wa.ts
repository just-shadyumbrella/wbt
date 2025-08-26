import fs from 'node:fs'
import WAWebJS from 'whatsapp-web.js'
import { config } from 'dotenv'
import { logger, LoggerType } from './logger.js'
import { client } from '../../index.js'

config()
const name = 'wa'

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

export function extractMentions(input: string, except = '.,!?()'): string[] {
  const escaped = except.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
  const regex = new RegExp(`(?:^|\\s)@([a-zA-Z0-9._-]+)(?=$|\\s|[${escaped}])`, 'g')
  return Array.from(input.matchAll(regex), (m) => m[1]).filter((u) => !/^\d+$/.test(u))
}

function isValidPrefix(input: string, prefix = [PREFIX]) {
  for (const p of prefix) {
    if (input.startsWith(p)) return true
  }
  return false
}

function tokenize(command: string): string[] {
  const regex = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|[^\s]+/g
  const tokens: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(command)) !== null) {
    let token = match[1] ?? match[2] ?? match[0]
    token = token.replace(/\\(["'\\])/g, '$1')
    tokens.push(token)
  }
  return tokens
}

function parseArguments(input: string, prefix = [PREFIX]) {
  if (isValidPrefix(input, prefix)) {
    return tokenize(input)
  }
}

function parseArgumentsFlat(input: string, prefix = [PREFIX]) {
  if (isValidPrefix(input, prefix)) {
    const msg = input.split(' ')
    const command = msg.shift() as string
    return { command, msg: msg.join(' ') }
  }
}

export type ParsedCommand = {
  command: string
  flags: Record<string, string | boolean>
  positional: string[]
  body: string
}

export function parseArgumentsStructured(input: string, prefix = [PREFIX]): ParsedCommand | undefined {
  const tokens = tokenize(input.trim())
  if (tokens.length && isValidPrefix(input, prefix)) {
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
    const body = input.split(' ')
    body.shift()
    return { command, flags, positional, body: body.join(' ') }
  }
}

export function useHelp(commandInstructions: string[], description?: string) {
  const formattedInstructions = commandInstructions.map((e) => `\`${e}\``)
  return `💡 *Penggunaan*\n\n${formattedInstructions.join('\n')}${description ? `\n\n${description}` : ''}`
}

/* WA Utils */

export function chromePath() {
  const fn = 'chromePath'
  try {
    const chrome = {
      env: process.env.CHROME_PATH || '',
      platform: {
        win32: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        linux: '/usr/bin/google-chrome-stable',
      } as Record<NodeJS.Platform, string>,
    }
    const envPath = chrome.env
    if (envPath && fs.existsSync(envPath)) {
      logger(LoggerType.INFO, { name, fn }, 'Using env.CHROME_PATH:', envPath)
      return envPath
    } else {
      const platformPath = chrome.platform[process.platform]
      if (platformPath && fs.existsSync(platformPath)) {
        logger(LoggerType.INFO, { name, fn }, 'Using Chrome on path:', platformPath)
        return platformPath
      } else {
        return logger(
          LoggerType.WARN,
          { name, fn, context: 'existsSync' },
          'Cannot find Google Chrome installation binary, using Puppeteer bundled Chromium instead.'
        ) as undefined
      }
    }
  } catch (e) {
    console.error(e)
  }
}

export function extractFlatId(number: string) {
  return number.replace(/(@)([a-z.]+)/g, '').replace('@', '')
}

export async function getAuthorId(message: WAWebJS.Message, toCUS = true, flat = false) {
  let from = message.author || message.from
  if (toCUS && from.endsWith('@lid')) from = (await client.getContactLidAndPhone([from]))[0].pn
  return flat ? extractFlatId(from) : from
}

/**
 * No lid
 */
export async function getGroupParticipants(message: WAWebJS.Message) {
  const chat = (await message.getChat()) as GroupChat
  return chat.isGroup ? chat.participants : []
}

export async function getGroupAdmins(message: WAWebJS.Message) {
  const participants = (await getGroupParticipants(message)) as WAWebJS.GroupParticipant[]
  return participants.length ? participants.filter((e) => e.isAdmin || e.isSuperAdmin) : []
}

export async function getGroupMembers(message: WAWebJS.Message) {
  const participants = (await getGroupParticipants(message)) as WAWebJS.GroupParticipant[]
  return participants.length ? participants.filter((e) => !e.isAdmin || !e.isSuperAdmin) : []
}

export function getParticipantsId(
  participants: WAWebJS.GroupParticipant[],
  to: keyof WAWebJS.ContactId = '_serialized'
) {
  return participants.map((e) => e.id[to])
}

export async function isOwner(message: WAWebJS.Message) {
  const owners = process.env.OWNER_NUMBER?.split(',') || []
  for (const owner of owners) {
    if ((await getAuthorId(message, true)) === `${owner}@c.us`) return true
  }
  return false
}

export async function isAdmin(message: WAWebJS.Message, user?: string) {
  const admins = await getGroupAdmins(message)
  if (admins) {
    for (const admin of admins) {
      if (admin.id._serialized === (user || (await getAuthorId(message)))) return true
    }
  }
  return false
}

export async function isMyselfAdmin(message: WAWebJS.Message) {
  return await isAdmin(message, `${process.env.PHONE_NUMBER}@c.us`)
}

export async function checkIsMyselfAdmin(message: WAWebJS.Message) {
  const isAdmin = await isMyselfAdmin(message)
  isAdmin ? void 0 : await message.reply('🤖 Maaf, saya belum jadi admin! 🙏🏻')
  return isAdmin
}

export async function filterMyselfFromParticipants(participants: string[], replaceWith?: string) {
  const me = (await client.getContactLidAndPhone([`${PHONE_NUMBER}@c.us`]))[0]
  let myselfThere = false
  const filtered = replaceWith
    ? participants.map((e) => {
        if (e === me.pn || e === me.lid || e === PHONE_NUMBER) {
          myselfThere = true
          return replaceWith
        }
        return e
      })
    : participants.filter((e) => {
        if (e === me.pn || e === me.lid || e === PHONE_NUMBER) {
          myselfThere = true
          return false
        }
        return true
      })
  return { participants: filtered, myselfThere }
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
