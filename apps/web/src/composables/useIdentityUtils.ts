import { get, isArray, isObject, objectify } from 'radash'

export function useIdentityUtils() {
  const keys = <TValue extends object>(value: TValue): string[] => {
    if (!value) return []

    const getKeys = (nested: any, paths: string[]): string[] => {
      if (isObject(nested)) {
        return Object.entries(nested).flatMap(([k, v]) => getKeys(v, [...paths, k]))
      }

      if (isArray(nested)) {
        if (nested.length > 0 && ['string', 'number', 'boolean'].includes(typeof nested[0])) {
          return nested.flatMap((item) => getKeys(item, paths))
        }

        return nested.flatMap((item, i) => getKeys(item, [...paths, `${i}`]))
      }

      return [paths.join('.')]
    }

    return getKeys(value, [])
  }

  const toPlainAndCrush = <TValue extends object>(value: TValue): object => {
    return objectify(
      keys(value),
      (k) => k,
      (k) => get(value, k),
    )
  }

  return { toPlainAndCrush }
}
