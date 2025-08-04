import crypto from 'node:crypto'

export function uniquePlaceholder() {
  return crypto.randomBytes(5).toString('base64url').toUpperCase()
}

type DeepMergeable = Record<string, any> | any[]

// Alternative: Single function that handles both 2-item and multiple item merging
export function deepMerge<T extends DeepMergeable>(...items: T[]): T {
  if (items.length === 0) {
    throw new Error('At least one argument is required')
  }

  if (items.length === 1) {
    return items[0]
  }

  if (items.length === 2) {
    return deepMergeTwo(items[0], items[1])
  }

  return items.reduce((acc, current) => deepMergeTwo(acc, current))
}

// Helper function to check if an object is a plain object (not a class instance)
function isPlainObject(obj: any): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  // Check if it's an array
  if (Array.isArray(obj)) {
    return false
  }

  // Check if it's a built-in object type
  if (
    obj instanceof Date ||
    obj instanceof RegExp ||
    obj instanceof Error ||
    obj instanceof Map ||
    obj instanceof Set ||
    obj instanceof WeakMap ||
    obj instanceof WeakSet ||
    obj instanceof Promise ||
    obj instanceof ArrayBuffer
  ) {
    return false
  }

  // Check if it has a constructor that's not Object
  const proto = Object.getPrototypeOf(obj)
  if (proto === null) {
    return true // Object.create(null)
  }

  // Check if it's a plain object created with {} or new Object()
  return proto === Object.prototype || Object.getPrototypeOf(proto) === null
}

// Rename the original function for internal use
function deepMergeTwo<T extends DeepMergeable>(target: T, source: T): T {
  // Handle null/undefined cases
  if (source === null || source === undefined) {
    return target
  }

  if (target === null || target === undefined) {
    return source
  }

  // If both are arrays, concatenate them
  if (Array.isArray(target) && Array.isArray(source)) {
    return [...target, ...source] as T
  }

  // If both are plain objects (not class instances), merge recursively
  if (isPlainObject(target) && isPlainObject(source)) {
    const result = { ...target } as Record<string, any>

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (key in result) {
          // Recursively merge if both values exist
          result[key] = deepMergeTwo(result[key], source[key])
        } else {
          // Add new property
          result[key] = source[key]
        }
      }
    }

    return result as T
  }

  // For primitive types or mismatched types, source overwrites target
  return source
}

// Main function with spread parameters
function deepMergeAll<T extends DeepMergeable>(...items: T[]): T {
  if (items.length === 0) {
    throw new Error('At least one argument is required')
  }

  if (items.length === 1) {
    return items[0]
  }

  return items.reduce((acc, current) => deepMerge(acc, current))
}
