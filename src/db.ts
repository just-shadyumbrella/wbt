import { waddler } from 'waddler/neo'
import { config } from 'dotenv'
import { logger, LoggerType } from './util.js'

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
  data json default '[]'::JSON not null,
)`
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

const cai = {
  new: async (roomName: string, chatId: string, charName: string) => {
    const rm = `${roomName}:${chatId}`
    const [result] = await sql/* sql */ `insert into cai (room, name) values (${rm}, ${charName})`
    logger(LoggerType.LOG, { name, fn: 'cai', context: 'new' }, 'New room:', rm, charName, result)
    return result
  },
  enter: async (roomName: string, chatId: string, senderNumber: string) => {
    const rm = `${roomName}:${chatId}`
    const [p] = await sql/* sql */ `select participant from cai where room = ${rm}`
    const participant = JSON.parse(p.participant) as string[]
    const newParticipant = appendArray(participant, [senderNumber])
    const [result] = await sql/* sql */ `update cai set participant = ${JSON.stringify(
      newParticipant
    )} where room = ${rm}`
    logger(LoggerType.LOG, { name, fn: 'cai', context: 'enter' }, senderNumber, 'entered room:', rm, result)
    return result
  },
  exit: async (roomName: string, chatId: string, senderNumber: string) => {
    const rm = `${roomName}:${chatId}`
    const [p] = await sql/* sql */ `select participant from cai where room = ${rm}`
    const participant = JSON.parse(p.participant) as string[]
    const newParticipant = participant.filter((n) => n !== senderNumber)
    const [result] = await sql/* sql */ `update cai set participant = ${JSON.stringify(
      newParticipant
    )} where room = ${rm}`
    logger(LoggerType.LOG, { name, fn: 'cai', context: 'exit' }, senderNumber, 'exited room:', rm, result)
    return result
  },
  updateMemory: async (roomName: string, chatId: string, data: { role: 'user' | 'assistant'; content: string }[]) => {
    const rm = `${roomName}:${chatId}`
    return sql/* sql */ `update cai set data = ${data} where room = ${rm}`
  },
  resetMemory: async (roomName: string, chatId: string, data: { role: 'user' | 'assistant'; content: string }[]) => {
    const rm = `${roomName}:${chatId}`
    return sql/* sql */ `update cai set data = ${data} where room = ${rm}`
  },
  getMemory: async (roomName: string, chatId: string) => {
    const rm = `${roomName}:${chatId}`
    return sql/* sql */ `select data from cai where room = ${rm}`
  },
  list: async (chatId: string) => {
    const chat = `%:${chatId}`
    return sql/* sql */ `select * from cai where room like ${chat}`
  },
  rename: async (roomName: string, chatId: string, newRoomName: string) => {
    const rm = `${roomName}:${chatId}`
    return sql/* sql */ `update cai set room = ${`${newRoomName}:${chatId}`} where room = ${rm}`
  },
  delete: async (roomName: string, chatId: string) => {
    const rm = `${roomName}:${chatId}`
    return sql/* sql */ `delete from cai where room = ${rm}`
  },
}

await dbInit()

export { cai }

export default sql
