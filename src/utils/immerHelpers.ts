import { produce, Draft } from 'immer'

/**
 * Helper function to add items to an array in an immutable way
 */
export function pushToArray<T>(array: T[], ...items: T[]): T[] {
  return produce(array, draft => {
    draft.push(...items as Draft<T>[])
  })
}

/**
 * Helper function to remove items from an array by index in an immutable way
 */
export function removeFromArrayByIndex<T>(array: T[], index: number, deleteCount = 1): T[] {
  return produce(array, draft => {
    draft.splice(index, deleteCount)
  })
}

/**
 * Helper function to remove items from an array by value in an immutable way
 */
export function removeFromArray<T>(array: T[], item: T): T[] {
  return produce(array, draft => {
    const index = draft.indexOf(item as Draft<T>)
    if (index !== -1) {
      draft.splice(index, 1)
    }
  })
}

/**
 * Helper function to update a property in an immutable way
 */
export function updateProperty<T, K extends keyof T>(obj: T, key: K, value: T[K]): T {
  return produce(obj, draft => {
    (draft as any)[key] = value
  })
}

/**
 * Helper function to update an object in an array by finding it first
 */
export function updateObjectInArray<T>(
  array: T[],
  predicate: (item: T) => boolean,
  updater: (draft: Draft<T>) => void
): T[] {
  return produce(array, draft => {
    const item = draft.find((value) => predicate(value as T))
    if (item) {
      updater(item)
    }
  })
}