import { waddler } from 'waddler/duckdb-neo'
import { config } from 'dotenv'
import { logger, LoggerType } from '../util/logger.js'

const name = 'db/index'
const padding = 48
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
    } catch (e) {
      logger(
        LoggerType.WARN,
        { name, fn, context: 'dbUrl' },
        'MotherDuck connection failed, falling back to local db:',
        e
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
  } catch (e) {
    logger(LoggerType.ERROR, { name, fn, context: 'localdb' }, 'Error creating connection to local db:')
    throw e
  }
}

const sql = await createSqlConnection('wbt.db', process.env.DUCKDB)

export default sql
