import vm from 'node:vm'
import { create, all } from 'mathjs'

const math = create(all, {
  number: 'BigNumber',
  precision: 64,
})

const context = { math }
vm.createContext(context)

export function mathVM(code: string) {
  return vm.runInNewContext(code, context)
}
