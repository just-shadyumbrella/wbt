import chalk from 'chalk'
import { execSync } from 'node:child_process'

chalk.level = 1

export enum LoggerType {
  LOG,
  INFO,
  WARN,
  ERROR,
}

export function logger(
  type: LoggerType,
  module: { name: string; fn: string; context?: string; padding?: number },
  ...data: any[]
) {
  const consol = {
    [LoggerType.LOG]: {
      log: 'log',
      chalk: chalk.white,
    },
    [LoggerType.INFO]: {
      log: 'info',
      chalk: chalk.cyan,
    },
    [LoggerType.WARN]: {
      log: 'warn',
      chalk: chalk.yellow,
    },
    [LoggerType.ERROR]: {
      log: 'error',
      chalk: chalk.red,
    },
  }
  if (type === LoggerType.WARN) playBeep('background')
  if (type === LoggerType.ERROR) playBeep('foreground')
  if (typeof data[0] === 'string') data[0] = consol[type].chalk(data[0])
  return console[consol[type].log](
    consol[type].chalk(leftAlignWithSpaces(consol[type].log.toUpperCase(), consol[LoggerType.ERROR].log.length)),
    `[${chalk.magenta(new Date().toISOString())}]`,
    leftAlignWithSpaces(
      `[${chalk.green(`${module.name}:${module.fn}${module.context ? `?${module.context}` : ''}`)}]`,
      module.padding
    ),
    ...data
  )
}

export function leftAlignWithSpaces(text: string, maxlength = 42) {
  const cleanText = text.trim()
  const r = maxlength >= cleanText.length ? maxlength - cleanText.length : 0
  return `${text}${' '.repeat(r)}`
}

function playBeep(type: 'foreground' | 'background') {
  if (process.platform === 'win32' && type === 'background') {
    execSync('rundll32 user32.dll,MessageBeep')
    return
  }
  if (process.stdout.isTTY) {
    process.stdout.write('\x07') // Under VSCode won't work
  }
}
