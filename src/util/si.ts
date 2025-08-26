import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import si from 'systeminformation'
import {logger, LoggerType} from './logger.js'
import { readMore } from './wa.js'

console.log('Gathering `package.json`...')
console.time('Package information stored')
export const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json')).toString())
const bun = process.versions.bun,
  node = process.versions.node
const versions = [
  bun ? `Bun v${bun}` : undefined,
  node ? `NodeJS v${node}` : undefined,
  [pkg['name'], pkg['version']].join(' v'),
].filter((e) => e !== undefined)
console.timeEnd('Package information stored')

export function tmpDir() {
  const tmpDir = path.resolve(process.cwd(), '.tmp')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)
  return tmpDir
}

async function loadOrCache<T>(filename: string, getter: () => Promise<T>): Promise<T> {
  const filePath = path.resolve(tmpDir(), filename)
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf-8')
      return JSON.parse(fileContent)
    } catch (e) {
      logger(LoggerType.WARN, { name: 'util', fn: 'loadOrCache' }, `Cannot load cache for \`${filename}\`:`, e)
    }
  }
  const data = await getter()
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2))
  return data
}

console.log('Gathering system information...')
console.time('System information stored')
const system = await loadOrCache('system.json', si.system)
console.timeEnd('System information stored')

console.log('Gathering OS information...')
console.time('OS information stored')
const osInfo = await loadOrCache('osInfo.json', si.osInfo)
console.timeEnd('OS information stored')
console.log('Gathering CPU information...')
console.time('CPU information stored')
const cpu = await loadOrCache('cpu.json', si.cpu)
console.timeEnd('CPU information stored')
export async function sysinfo() {
  // const time = si.time() // Somewhat causes Puppeteer to close unexpectedly
  console.log('Gathering memory information...')
  console.time('Memory information gathered')
  const mem = await si.mem()
  console.timeEnd('Memory information gathered')
  console.log('Gathering filesystem information...')
  console.time('Filesystem information gathered')
  const fsSize = await si.fsSize()
  console.timeEnd('Filesystem information gathered')
  return `*System Uptime:* ${new Date(os.uptime() * 1000).toISOString().substr(11, 8)}
*Runner:* ${system.manufacturer} ${system.model}${system.virtual ? ' (Virtualized)' : ''} ${system.version}
*OS:* ${osInfo.distro} ${osInfo.release}${osInfo.codename ? ` "${osInfo.codename}"` : ''} (kernel: ${osInfo.kernel} ${
    osInfo.arch
  })
*CPU:* ${cpu.manufacturer} ${cpu.brand} (${cpu.cores} cores available, up to ${cpu.speed} GHz)
*Memory:* ${convertByteUnit(mem.used, 'GB')}/${convertByteUnit(mem.total, 'GB')} GB
*Disk:* ${convertByteUnit(fsSize[0].used, 'GB')}/${convertByteUnit(fsSize[0].size, 'GB')} GB

*💼 Project*${readMore}
\`\`\`
${JSON.stringify(pkg, null, 2)}
\`\`\`
> ${versions.join(' | ')}`
}

/* UTILS */

export function convertByteUnit(bytes: number, unit: 'KB' | 'MB' | 'GB') {
  const units = {
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  }
  const value = bytes / units[unit]
  const result = Math.round(value * 100) / 100
  return result
}