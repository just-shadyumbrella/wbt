import { Lru, Fifo } from 'toad-cache'
import sql from './index.js'
import { chars, MessagesSlot } from '../ai/@openrouter.js'
import { deepMerge, uniquePlaceholder } from '../util/data.js'
import { logger, LoggerType } from '../util/logger.js'

const name = 'db/cai'

async function dbInit() {
  await sql/* sql */ `use wbt.main`
  return Promise.all([
    sql/* sql */ `
    create table if not exists cai (
      room varchar not null primary key,
      name varchar not null,
      participant json default '[]'::JSON not null,
      owner varchar not null,
      private boolean default true not null,
      memory int default 16 not null,
      data json default '[]'::JSON not null,
      created timestamp default (now()) not null,
      updated timestamp default (now()) not null,
    )`,
  ])
}

// Default data filler
const CaiRowData = {
  room: uniquePlaceholder(),
  name: 'Shiina' as keyof typeof chars,
  participant: [] as string[],
  owner: '',
  private: true,
  memory: 16,
  data: [] as MessagesSlot,
  created: new Date(),
  updated: new Date(),
}

export type CaiRowData_Data = typeof CaiRowData

export type CaiRowData_Insert = Partial<CaiRowData_Data> & {
  room: string
  name: string
  owner: string
}

export type CaiRowData_Update = Partial<CaiRowData_Data> & {
  room: string
}

new Date().toLocaleTimeString

const RowCache = new Lru<CaiRowData_Data>(4, 1000 * 60)
const caiHistory = new Fifo<MessagesSlot>(16)

export default {
  list: async (chatId: string, sortBy: 'charName' | 'owner' = 'owner') => {
    const chat = `%:${chatId}`
    const result =
      sortBy === 'charName'
        ? await sql/* sql */ `select * from cai where room like ${chat} order by name`
        : await sql/* sql */ `select * from cai where room like ${chat} order by owner`
    return result as CaiRowData_Data[]
  },
  get: async (roomName: string, chatId: string) => {
    const rm = `${roomName}:${chatId}`
    const cache = RowCache.get(rm)
    return (
      cache ||
      await (async () => {
        const [result] = await sql/* sql */ `select * from cai where room = ${rm}`
        logger(LoggerType.LOG, { name, fn: 'get', context: rm}, 'Gathered data via SQL.')
        return result as CaiRowData_Data || {}
      })()
    )
  },
  ins: async (data: CaiRowData_Insert) => {
    const newCaiRowData = { ...CaiRowData, ...data }
    RowCache.set(newCaiRowData.room, newCaiRowData)
    return await sql/* sql */ `insert or replace into cai values (
      ${newCaiRowData.room},
      ${newCaiRowData.name},
      ${JSON.stringify(newCaiRowData.participant)},
      ${newCaiRowData.owner},
      ${newCaiRowData.private},
      ${newCaiRowData.memory},
      ${newCaiRowData.data as { role: 'user' | 'assistant'; content: string }[]},
      ${newCaiRowData.created},
      ${newCaiRowData.updated}
    )`
  },
  set: async (data: CaiRowData_Update) => {
    const cache = RowCache.get(data.room)
    const get =
      cache ||
      (await (async () => {
        const [result] = await sql/* sql */ `select * from cai where room = ${data.room}`
        logger(LoggerType.LOG, { name, fn: 'set->get', context: data.room }, 'Gathered data via SQL.')
        return result as CaiRowData_Data | {}
      })())
    const setData = deepMerge(CaiRowData, get, data) as CaiRowData_Data
    setData.updated = new Date()
    RowCache.set(setData.room, setData)
    return await sql/* sql */ `insert or replace into cai values (
      ${setData.room},
      ${setData.name},
      ${JSON.stringify(setData.participant)},
      ${setData.owner},
      ${setData.private},
      ${setData.memory},
      ${setData.data as { role: 'user' | 'assistant'; content: string }[]},
      ${setData.created},
      ${setData.updated}
    )`
  },
  delete: async (roomName: string, chatId: string) => {
    const rm = `${roomName}:${chatId}`
    const [result] = await sql/* sql */ `delete from cai where room = ${rm}`
    RowCache.delete(rm)
    return result
  },
}

await dbInit()
