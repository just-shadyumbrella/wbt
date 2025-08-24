import { Lru } from 'toad-cache'
import type { PartialDeep } from 'type-fest'
import sql from './index.js'
import GroupSettings, { GroupSettingsRowData } from './group_settings.js'
import { deepMerge } from '../util/data.js'
import { logger, LoggerType } from '../util/logger.js'
import { extractFlatId } from '../util/wa.js'

const name = 'db/warn'

async function dbInit() {
  await sql/* sql */ `use wbt.main`
  return Promise.all([
    sql/* sql */ `
    create table if not exists warn (
      id varchar not null primary key,
      level int default 0 not null,
    )`,
  ])
}

const bluff = Math.floor(Math.random() * 10000000000)

// Default data filler
const WarnRowData = {
  id: `628${bluff}:${bluff}@g.us`,
  level: 0 as 0 | 1 | 2 | 3 | 4,
}

const GroupSettingsRowData_Warn = {
  ...GroupSettingsRowData,
  data: {
    msg: {
      level1: { up: '$1 memberi peingatan kepada $2.', down: 'Level peringatan $2 diturunkan ke $3' },
      level2: {
        up: '$1 memberi peingatan kepada $2. Sekarang kamu sudah tidak bisa menggunakan bot.',
        down: 'Level peringatan $2 diturunkan ke $3',
      },
      level3: { up: '$1 memberi peingatan terakhir kepada $2.', down: 'Level peringatan $2 diturunkan ke $3' },
      level4: {
        up: '$1 telah memberikan pelanggaran terakhir kepada $2, sehingga $2 dikeluarkan sesuai kebijakan.',
        down: 'Level peringatan $2 diturunkan ke $3',
      },
    },
  },
}

export type WarnRowData_Data = typeof WarnRowData

export type WarnRowData_Update = Partial<WarnRowData_Data> & {
  id: string
}

export type GroupSettingsRowData_Warn_Data = typeof GroupSettingsRowData_Warn

export type GroupSettingsRowData_Warn_Data_Update = {
  id: string
  data?: PartialDeep<GroupSettingsRowData_Warn_Data['data']>
}

const RowCache = new Lru<WarnRowData_Data>(4)

export default {
  settings: {
    get: async (groupId: string) => {
      return (await GroupSettings.get(groupId, 'warn')) as GroupSettingsRowData_Warn_Data
    },
    set: async (data: GroupSettingsRowData_Warn_Data_Update) => {
      data.id = `warn:${data.id}`
      const setData = deepMerge(GroupSettingsRowData_Warn, data) as GroupSettingsRowData_Warn_Data
      return await GroupSettings.set(setData)
    },
    delete: async (groupId: string) => {
      return await GroupSettings.delete(groupId, 'warn')
    },
  },
  get: async (senderNumber: string, groupId: string) => {
    const id = `${senderNumber}:${groupId}`
    const cache = RowCache.get(id)
    return (
      cache ||
      (await (async () => {
        const [result] = await sql/* sql */ `select * from warn where id = ${id}`
        logger(LoggerType.LOG, { name, fn: 'get', context: id }, 'Gathered data via SQL.')
        return (result as WarnRowData_Data) || {}
      })())
    )
  },
  set: async (data: WarnRowData_Update) => {
    const cache = RowCache.get(data.id)
    const get =
      cache ||
      (await (async () => {
        const [result] = await sql/* sql */ `select * from warn where id = ${data.id}`
        logger(LoggerType.LOG, { name, fn: 'set->get', context: data.id }, 'Gathered data via SQL.')
        return (result as WarnRowData_Data) || {}
      })())
    const setData = deepMerge(WarnRowData, get, data) as WarnRowData_Data
    RowCache.set(data.id, setData)
    return await sql/* sql */ `insert or replace into warn values (${setData.id}, ${setData.level})`
  },
  delete: async (senderNumber: string, groupId: string) => {
    const id = `${senderNumber}:${groupId}`
    const [result] = await sql/* sql */ `delete from warn where id = ${id}`
    RowCache.delete(id)
    return result
  },
}

function warnMessageFormat(msg: string, adminId: string, memberId: string, level: number) {
  return msg
    .replaceAll('$1', `@${extractFlatId(adminId)}`)
    .replaceAll('$2', `@${extractFlatId(memberId)}`)
    .replaceAll('$3', level.toString())
}

await dbInit()
