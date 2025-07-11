import { waddler } from 'waddler/neo'
import { config } from 'dotenv'
import { logger, LoggerType } from './util.js'
import { chars, MessagesSlot, Models } from './ai/@openrouter.js'

const name = 'db'
config()

async function createSqlConnection(dbLocalPath: string, dbUrl?: string) {
  const fn = 'createSqlConnection'
  if (dbUrl) {
    try {
      const sql = waddler({
        url: dbUrl,
        min: 1,
        max: 8,
        accessMode: 'read_write',
      })
      // Attempt a lightweight query to verify connection
      const [result] = await sql`SELECT 1`
      if (result['1'] === 1) {
        logger(LoggerType.INFO, { name, fn, context: 'dbUrl' }, 'Connected to MotherDuck.')
      } else {
        logger(LoggerType.WARN, { name, fn, context: 'dbUrl' }, 'Something is not right:', result)
      }
      return sql
    } catch (err) {
      logger(
        LoggerType.WARN,
        { name, fn, context: 'dbUrl' },
        'MotherDuck connection failed, falling back to local db:',
        err
      )
    }
  } else {
    logger(LoggerType.WARN, { name, fn, context: 'dbUrl' }, 'MotherDuck URL not provided, using local db')
  }
  // Fallback to local db
  try {
    const sql = waddler({
      url: dbLocalPath,
      min: 1,
      max: 8,
      accessMode: 'read_write',
    })
    // Attempt a lightweight query to verify connection
    const [result] = await sql`SELECT 1`
    if (result['1'] === 1) {
      logger(LoggerType.INFO, { name, fn, context: 'localdb' }, 'Connected to local db:', dbLocalPath)
    } else {
      logger(LoggerType.WARN, { name, fn, context: 'localdb' }, 'Looks like something is not right:', result)
    }
    return sql
  } catch (err) {
    logger(LoggerType.ERROR, { name, fn, context: 'localdb' }, 'Error creating connection to local db:')
    throw err
  }
}

const sql = await createSqlConnection('wbt.db', process.env.DUCKDB)

async function dbInit() {
  await sql/* sql */ `use wbt.main`
  return await sql/* sql */ `
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
)`
}

export type CaiRowData = {
  room: string
  name: string
  participant: string[]
  owner: string
  private: boolean
  memory: number
  data: MessagesSlot
  created: Date
  updated: Date
}

function appendArray<T>(target: T[], source: T[]): T[] {
  const set = new Set(target)
  for (const item of source) {
    if (!set.has(item)) {
      set.add(item)
      target.push(item)
    }
  }
  return target
}

/**
 * WARNING: This is low level functions, uses alongside correctly. Errors are not handled.
 */
const cai = {
  room: {
    new: async (roomName: string, chatId: string, charName: keyof typeof chars, senderNumber: string) => {
      const rm = `${roomName}:${chatId}`
      const [result] =
        await sql/* sql */ `insert into cai (room, name, owner) values (${rm}, ${charName}, ${senderNumber})`
      // logger(LoggerType.LOG, { name, fn: 'cai', context: 'new' }, 'New room:', rm, charName, result)
      return result
    },
    enter: async (roomName: string, chatId: string, senderNumber: string) => {
      const rm = `${roomName}:${chatId}`
      const [p] = await sql/* sql */ `select participant from cai where room = ${rm}`
      const participant = p.participant as string[]
      const newParticipant = appendArray(participant, [senderNumber])
      const [result] = await sql/* sql */ `update cai set participant = ${JSON.stringify(
        newParticipant
      )}, updated = (now()) where room = ${rm}`
      // logger(LoggerType.LOG, { name, fn: 'cai', context: 'enter' }, senderNumber, 'entered room:', rm, result)
      return result
    },
    exit: async (roomName: string, chatId: string, senderNumber: string) => {
      const rm = `${roomName}:${chatId}`
      const [p] = await sql/* sql */ `select participant from cai where room = ${rm}`
      const participant = p.participant as string[]
      const newParticipant = participant.filter((n) => n !== senderNumber)
      const [result] = await sql/* sql */ `update cai set participant = ${JSON.stringify(
        newParticipant
      )}, updated = (now()) where room = ${rm}`
      // logger(LoggerType.LOG, { name, fn: 'cai', context: 'exit' }, senderNumber, 'exited room:', rm, result)
      return result
    },
    memory: {
      setSlotLimit: async (roomName: string, chatId: string, memorySlotLimit: number) => {
        const rm = `${roomName}:${chatId}`
        const [result] =
          await sql/* sql */ `update cai set memory = ${memorySlotLimit}, updated = (now()) where room = ${rm}`
        return result
      },
      getSlotLimit: async (roomName: string, chatId: string) => {
        const rm = `${roomName}:${chatId}`
        const [result] = await sql/* sql */ `select memory from cai where room = ${rm}`
        return result.memory as number
      },
      update: async (roomName: string, chatId: string, data: { role: 'user' | 'assistant'; content: string }[]) => {
        const rm = `${roomName}:${chatId}`
        const [od] = await sql/* sql */ `select data, memory from cai where room = ${rm}`
        const memory = od.memory as number
        const oldData = od.data as typeof data
        // Prepend new data to old data
        const combinedData = [...data, ...oldData]
        // Truncate to the most recent 'limitSlot' entries (FIFO)
        const truncatedData = combinedData.slice(0, memory)
        const [result] = await sql/* sql */ `update cai set data = ${JSON.stringify(
          truncatedData
        )}, updated = (now()) where room = ${rm}`
        return result
      },
      reset: async (roomName: string, chatId: string) => {
        const rm = `${roomName}:${chatId}`
        const [result] = await sql/* sql */ `update cai set data = '[]', updated = (now()) where room = ${rm}`
        return result
      },
      get: async (roomName: string, chatId: string) => {
        const rm = `${roomName}:${chatId}`
        const [result] = await sql/* sql */ `select data from cai where room = ${rm}`
        return result.data as MessagesSlot
      },
    },
    rename: async (roomName: string, chatId: string, newRoomName: string) => {
      const rm = `${roomName}:${chatId}`
      const [result] =
        await sql/* sql */ `update cai set room = ${`${newRoomName}:${chatId}`}, updated = (now()) where room = ${rm}`
      return result
    },
    delete: async (roomName: string, chatId: string) => {
      const rm = `${roomName}:${chatId}`
      const [result] = await sql/* sql */ `delete from cai where room = ${rm}`
      return result
    },
    private: {
      get: async (roomName: string, chatId: string) => {
        const rm = `${roomName}:${chatId}`
        const [result] = await sql/* sql */ `select private from cai where room = ${rm}`
        return result.private as boolean
      },
      set: async (roomName: string, chatId: string, set: boolean) => {
        const rm = `${roomName}:${chatId}`
        const [result] =
          await sql/* sql */ `update cai set private = ${set}, updated = (now()) where room = ${rm}`
        return result
      },
    },
  },
  /**
   * IMPORTANT function overall
   */
  whereAmI: async (chatId: string, senderNumber: string) => {
    const rm = `%:${chatId}`
    const [result] = await sql/* sql */ `
    select *
    from cai,
         unnest(json_extract(participant, '$')::varchar[]) as p(user)
    where room like ${rm} and p.user = ${senderNumber}
  `
    return result as CaiRowData
  },
  list: async (chatId: string, sortBy: 'charName' | 'owner' = 'owner') => {
    const chat = `%:${chatId}`
    const result =
      sortBy === 'charName'
        ? await sql/* sql */ `select * from cai where room like ${chat} order by name`
        : await sql/* sql */ `select * from cai where room like ${chat} order by owner`
    return result as CaiRowData[]
  },
}

await dbInit()

export { cai }

export default sql
