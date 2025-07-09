import OpenAI from 'openai'
import { config } from 'dotenv'
import Raiden from './ai/raiden.js'
import Wanderer from './ai/wanderer.js'
import { logger, LoggerType } from './util.js'

const name = 'openrouter'
const chars = { Raiden, Wanderer }

export function makePromptTemplate(definition: string) {
  return `[PERLU DIINGAT: Kamu berbicara dengan banyak {{user}}, setiap pesan dari {{user}} selalu diawali dengan "@628XXXXXXXXXX", harap balas dengan menyebut mereka bila perlu agar jelas kepada siapa kamu menjawab.]

[Kamu sedang memerankan karakter ini seakurat mungkin, jadi buat percakapan seolah kau adalah mereka:]

${definition}

[GUNAKAN BAHASA INDONESIA YANG BAIK DAN BENAR MULAI DARI SEKARANG]`
}

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

export enum Models {
  V3 = 'deepseek/deepseek-chat-v3-0324:free',
  Chimera = 'tngtech/deepseek-r1t-chimera:free',
  R1Q = 'deepseek/deepseek-r1-0528-qwen3-8b:free',
  R1 = 'deepseek/deepseek-r1-0528:free',
  Qwen = 'qwen/qwen3-235b-a22b:free',
  Nemo = 'mistralai/mistral-nemo:free',
  DeepHermes = 'nousresearch/deephermes-3-mistral-24b-preview:free',
  Dolphin = 'cognitivecomputations/dolphin3.0-mistral-24b:free',
  Gemma = 'google/gemma-3-27b-it:free',
  Exp = 'google/gemini-2.0-flash-exp:free', // Rate limited for some reason
  Nemotron3 = 'nvidia/llama-3.3-nemotron-super-49b-v1:free',
  Nemotron1 = 'nvidia/llama-3.1-nemotron-ultra-253b-v1:free',
  Instruct = 'meta-llama/llama-3.3-70b-instruct:free',
  Scout = 'meta-llama/llama-4-scout:free',
  Maverick = 'meta-llama/llama-4-maverick:free',
}

const keys = process.env.OPENROUTER?.split(',')

export async function chat(
  user: string,
  room: string,
  charName: keyof typeof chars,
  msg: string,
  modelOptions: OpenAI.ChatCompletionCreateParams
) {
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
        const options: OpenAI.ChatCompletionCreateParams = {
          ...modelOptions,
          messages: [
            { role: 'system', content: chars[charName] },
            // ...history, // ← Tambahkan seluruh memori sebelumnya
            { role: 'user', content: `@${user}: ${msg}` }, // ← Tambahkan pesan terbaru
          ],
          stream: false,
        }
        logger(LoggerType.LOG, { name, fn }, 'OpenAI:', options)
        const completion = await openai.chat.completions.create(options)
        const content = completion.choices[0].message.content
        return modelResponseFix(user, content || '')
      } catch (error) {
        logger(LoggerType.ERROR, { name, fn }, `Error using key ${ky}:`, error)
      }
    }
    throw new Error('All keys are exhausted or failed')
  } else {
    throw new Error('No key provided')
  }
}
