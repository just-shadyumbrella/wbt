import OpenAI from 'openai'
import { config } from 'dotenv'
import { logger, LoggerType } from '../util/logger.js'
import Raiden from './raiden.js'
import Wanderer from './wanderer.js'
import Shiina from './shiina.js'

const name = 'openrouter'
export const chars = { Shiina, Raiden, Wanderer }

config()

// Markdown to WhatsApp format
function modelResponseFix(user: string, content: string): string {
  const fn = 'modelResponseFix'
  // Escape user for regex
  const escapedUser = user.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // 1. Markdown to WhatsApp format (bold & italic)
  // Replace bold (**text**) → *text*
  let result = content.replace(/\*\*(.*?)\*\*/g, '*$1*')
  // Replace italic (*text*) → _text_
  result = result.replace(/\*(.*?)\*/g, '_$1_')
  // 2. User mention replacement
  // Replace unformatted mentions of the user unless preceded by @, also with the literal word "user"
  const userPattern = new RegExp(`(?<!@)${escapedUser}\\b`, 'g')
  const genericUserPattern = /\buser\b|\{\{user\}\}/g
  let mentionFixApplied = false,
    userFixApplied = false
  result = result
    .replace(userPattern, () => {
      mentionFixApplied = true
      return `@${user}`
    })
    .replace(genericUserPattern, () => {
      mentionFixApplied = true
      return `@${user}`
    })
  if (mentionFixApplied) {
    logger(LoggerType.WARN, { name, fn }, 'User mention `@628XXXXXXXXXX` fix has been made.')
  }
  if (userFixApplied) {
    logger(LoggerType.WARN, { name, fn }, '`user` mention fix has been made.')
  }
  // 3. Remove leading and trailing spaces (+2)
  let originalResult = result
  result = result.replace(/ {2,}/g, '')
  if (originalResult !== result) {
    logger(LoggerType.WARN, { name, fn }, 'Trailing spaces fix has been made.')
  }
  // 3. Remove leading and trailing spaces in paragraphs
  originalResult = result
  result = result.replace(/^\(|\)$/g, '')
  if (originalResult !== result) {
    logger(LoggerType.WARN, { name, fn }, 'Parenthesis fix has been made.')
  }
  // 4. Fix dash
  originalResult = result
  result = result.replaceAll(' - ', '—')
  if (originalResult !== result) {
    logger(LoggerType.WARN, { name, fn }, 'Dash fix has been made.')
  }
  return result
}

const keys = process.env.OPENROUTER?.split(',')

export type MessagesSlot = OpenAI.Chat.Completions.ChatCompletionMessageParam[]

/**
 * @param user The name of user the bot will call for.
 * @param charName The name of character definition available. See `chars` above.
 * @param msg Message to send.
 * @param modelOptions Model used, parameters, and more. See more at OpenRouter Docs.
 * @param messagesSlot This is important for memory.
 * @param memorySlotLimit This is the limit of messages in memory.
 */
export async function chat(
  user: string,
  charName: keyof typeof chars,
  msg: string,
  messagesSlot: MessagesSlot = []
): Promise<MessagesSlot> {
  const fn = 'chat'
  if (keys) {
    for (const key of keys) {
      const ky = key.slice(0, 16) + '***' + key.slice(-8)
      try {
        logger(LoggerType.LOG, { name, fn }, 'Using key:', ky)
        const openai = new OpenAI({
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: key,
        })
        const definition = chars[charName] as OpenAI.ChatCompletionCreateParams
        const MessagesSlotPush: MessagesSlot = [...messagesSlot, { role: 'user', content: `@${user}: ${msg}` }]
        const completion = await openai.chat.completions.create({
          ...chars[charName],
          messages: [...definition.messages, ...MessagesSlotPush],
          stream: false,
        })
        const content = completion.choices[0].message.content
        return [...MessagesSlotPush, { role: 'assistant', content: modelResponseFix(user, content || '') }]
      } catch (e) {
        logger(LoggerType.ERROR, { name, fn }, `Error using key ${ky}:`, e)
      }
    }
    throw new Error('All keys are exhausted or failed')
  } else {
    throw new Error('No key provided')
  }
}

/** Map based in-memory storage for chat history. */

let MemorySlotLimit = 16

export function memorySlotLimit(limit?: number) {
  if (limit) MemorySlotLimit = limit
  return MemorySlotLimit
}

const History = new Map<string, MessagesSlot>()

export function history(key: string, messagesSlot?: MessagesSlot) {
  if (messagesSlot) {
    // Always keep only the latest MemorySlotLimit messages
    const truncatedMemory = messagesSlot.slice(-MemorySlotLimit)
    History.set(key, truncatedMemory)
  }
  return History.get(key) || []
}

export async function chatUsingHistory(
  senderNumber: string,
  chatId: string,
  charName: keyof typeof chars,
  msg: string
) {
  const key = `${senderNumber}:${charName}:${chatId}`
  const prevHistory = history(key)
  const result = await chat(senderNumber, charName, msg, prevHistory)
  history(key, result.slice(-MemorySlotLimit))
  return result[result.length - 1].content
}
