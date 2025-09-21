import fs from 'node:fs'
import { PREFIX } from '../env.js'
import { logger, LoggerType } from './logger.js'

const name = 'misc'

/**
\\(⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)/

(｡•́‿•̀｡)

(｡^‿^｡)

(//ω//)

(≧◡≦)

(>///<)
 */
export function blushReact(index?: number) {
  const blush = ['\\(⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)/', '(｡•́‿•̀｡)', '(｡^‿^｡)', '(//ω//)', '(≧◡≦)', '(>///<)']
  return blush[index || Math.floor(Math.random() * blush.length)]
}

function isValidPrefix(input: string, prefix = [PREFIX]) {
  for (const p of prefix) {
    if (input.startsWith(p)) return true
  }
  return false
}

function tokenize(command: string): string[] {
  const regex = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|[^\s]+/g
  const tokens: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(command)) !== null) {
    let token = match[1] ?? match[2] ?? match[0]
    token = token.replace(/\\(["'\\])/g, '$1')
    tokens.push(token)
  }
  return tokens
}

function parseArguments(input: string, prefix = [PREFIX]) {
  if (isValidPrefix(input, prefix)) {
    return tokenize(input)
  }
}

function parseArgumentsFlat(input: string, prefix = [PREFIX]) {
  if (isValidPrefix(input, prefix)) {
    const msg = input.split(' ')
    const command = msg.shift() as string
    return { command, msg: msg.join(' ') }
  }
}

export type ParsedCommand = {
  command: string
  flags: Record<string, string | boolean>
  positional: string[]
  body: string
}

export function parseArgumentsStructured(input: string, prefix = [PREFIX]): ParsedCommand | undefined {
  const tokens = tokenize(input.trim())
  if (tokens.length && isValidPrefix(input, prefix)) {
    const [command, ...args] = tokens
    const flags: Record<string, string | boolean> = {}
    const positional: string[] = []
    let i = 0
    while (i < args.length) {
      const token = args[i]
      if (token.startsWith('-') || token.startsWith('+')) {
        const next = args[i + 1]
        if (next === undefined || next.startsWith('-') || next.startsWith('+')) {
          flags[token] = true
          i += 1
        } else {
          flags[token] = next
          i += 2
        }
      } else {
        positional.push(token)
        i += 1
      }
    }
    const body = input.split(' ')
    body.shift()
    return { command, flags, positional, body: body.join(' ') }
  }
}

export async function sleep(ms: number) {
  return await new Promise<void>((r) => setTimeout(r, ms))
}

/**
 * @deprecated
 * @returns Guessed Google Chrome installation path.
 */
export function chromePath() {
  const fn = 'chromePath'
  try {
    const chrome = {
      env: process.env.CHROME_PATH || '',
      platform: {
        win32: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        linux: '/usr/bin/google-chrome-stable',
      } as Record<NodeJS.Platform, string>,
    }
    const envPath = chrome.env
    if (envPath && fs.existsSync(envPath)) {
      logger(LoggerType.INFO, { name, fn }, 'Using env.CHROME_PATH:', envPath)
      return envPath
    } else {
      const platformPath = chrome.platform[process.platform]
      if (platformPath && fs.existsSync(platformPath)) {
        logger(LoggerType.INFO, { name, fn }, 'Using Chrome on path:', platformPath)
        return platformPath
      } else {
        return logger(
          LoggerType.WARN,
          { name, fn, context: 'existsSync' },
          'Cannot find Google Chrome installation binary, using Puppeteer bundled Chromium instead.'
        ) as undefined
      }
    }
  } catch (e) {
    console.error(e)
  }
}
