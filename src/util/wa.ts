import WAWebJS from 'whatsapp-web.js'
import { client } from '../../index.js'
import { OWNER_NUMBER } from '../env.js'

export const readMore = ` ${'\u{34f}'.repeat(1024 * 3)}`

export function extractMentions(input: string, except = '.,!?()'): string[] {
  const escaped = except.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
  const regex = new RegExp(`(?:^|\\s)@([a-zA-Z0-9._-]+)(?=$|\\s|[${escaped}])`, 'g')
  return Array.from(input.matchAll(regex), (m) => m[1]).filter((u) => !/^\d+$/.test(u))
}

export function useHelp(commandInstructions: string[], description?: string) {
  const formattedInstructions = commandInstructions.map((e) => `\`${e}\``)
  return `💡 *Penggunaan*\n\n${formattedInstructions.join('\n')}${description ? `\n\n${description}` : ''}`
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
  const owners = OWNER_NUMBER?.split(',') || []
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
  return await isAdmin(message, client.info.wid._serialized)
}

export async function checkIsMyselfAdmin(message: WAWebJS.Message) {
  const isAdmin = await isMyselfAdmin(message)
  isAdmin ? void 0 : await message.reply('🤖 Maaf, saya belum jadi admin! 🙏🏻')
  return isAdmin
}

export async function filterMyselfFromParticipants(participants: string[], replaceWith?: string) {
  const me = (await client.getContactLidAndPhone([client.info.wid._serialized]))[0]
  let myselfThere = false
  const filtered = replaceWith
    ? participants.map((e) => {
        if (e === me.pn || e === me.lid || e === client.info.wid.user) {
          myselfThere = true
          return replaceWith
        }
        return e
      })
    : participants.filter((e) => {
        if (e === me.pn || e === me.lid || e === client.info.wid.user) {
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
