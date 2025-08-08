import { Lru } from 'toad-cache'
import sql from './index.js'
import { deepMerge, uniquePlaceholder } from '../util/data.js'
import { logger, LoggerType } from '../util/logger.js'

const name = 'db/group_settings'

async function dbInit() {
  await sql/* sql */ `use wbt.main`
  return Promise.all([
    sql/* sql */ `
    create table if not exists group_settings (
      id varchar not null primary key,
      data json default '{}'::JSON not null,
    )`,
  ])
}

const bluff = Math.floor(Math.random() * 10000000000)

// Default data filler
export const GroupSettingsRowData = {
  id: `${uniquePlaceholder()}:${bluff}@g.us`,
  data: {} as any,
}

export type GroupSettingsRowData_Data = typeof GroupSettingsRowData


const RowCache = new Lru<GroupSettingsRowData_Data>(16)

export default {
  get: async (groupId: string, key: string) => {
    const id = `${key}:${groupId}`
    const cache = RowCache.get(id)
    return (
      cache ||
      (await (async () => {
        const [result] = await sql/* sql */ `select * from group_settings where id = ${id}`
        logger(LoggerType.LOG, { name, fn: 'get', context: id }, 'Gathered data via SQL.')
        return (result as GroupSettingsRowData_Data) || {}
      })())
    )
  },
  set: async (data: GroupSettingsRowData_Data) => {
    const cache = RowCache.get(data.id)
    const get =
      cache ||
      (await (async () => {
        const [result] = await sql/* sql */ `select * from group_settings where id = ${data.id}`
        logger(LoggerType.LOG, { name, fn: 'set->get', context: data.id }, 'Gathered data via SQL.')
        return (result as GroupSettingsRowData_Data) || {}
      })())
    const setData = deepMerge(GroupSettingsRowData, get, data)
    RowCache.set(data.id, setData)
    return await sql/* sql */ `insert or replace into group_settings values (${setData.id}, ${setData.data})`
  },
  delete: async (groupId: string, key: string) => {
    const id = `${key}:${groupId}`
    const [result] = await sql/* sql */ `delete from group_settings where id = ${id}`
    RowCache.delete(id)
    return result
  },
}

await dbInit()
