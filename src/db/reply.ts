import util from 'node:util'
import _ from 'lodash'
import { Lru } from 'toad-cache'
import { IntRange, PartialDeep } from 'type-fest'
import sql, { OperationRowData } from './index.js'
import { logger, LoggerType } from '../util/logger.js'

const tableName = 'reply'
const name = `db/${tableName}`

async function dbInit() {
  return await sql/* sql */ `
    create table if not exists ${sql.raw(tableName)} (
      "id" varchar not null primary key,
      "type" int not null default 0,
      "string" varchar not null,
    )`
}

const ReplyMatchType = ['exact', 'startwith', 'endwidth', 'contain', 'regex'] as const

type ReplyRowData = {
  id: string
  type: IntRange<0, typeof ReplyMatchType.length>
  string: string
}

const RowCache = new Lru<ReplyRowData>(16)

export default {
  matchType: (type: (typeof ReplyMatchType)[number]) => {
    return ReplyMatchType.indexOf(type) as ReplyRowData['type']
  },
  get: async (id: string) => {
    const cache = RowCache.get(id)
    return (
      cache ||
      (await (async () => {
        const [result] = await sql<ReplyRowData>/* sql */ `select * from reply where id = ${id}`
        return result
      })())
    )
  },
  set: async (data: PartialDeep<ReplyRowData> & { id: string; string: string }) => {
    const cache = RowCache.get(data.id)
    const get =
      cache ||
      (await (async () => {
        const [result] = await sql<ReplyRowData>/* sql */ `select * from reply where id = ${data.id}`
        logger(LoggerType.LOG, { name, fn: 'set->get', context: data.id }, 'Gathered data via SQL.')
        return result
      })())
    const setData = _.merge(get, data)
    RowCache.set(data.id, setData)
    return await sql<OperationRowData>/* sql */ `insert or replace into ${sql.raw(tableName)} values (${sql.raw(
      Object.values(setData)
        .map((e) => util.inspect(e, { depth: null }))
        .join(', ')
    )})`
  },
  list: async (data: {field?: keyof ReplyRowData | '*', sort?: keyof ReplyRowData } = {}) => {
    return await sql<ReplyRowData>/* sql */ `select ${sql.raw(data.field || '*')} from reply order by ${sql.raw(data.sort || 'id')}`
  },
  del: async (id: string) => {
    return sql<OperationRowData>/* sql */ `delete from reply where id = ${id}`
  },
}

await dbInit()
