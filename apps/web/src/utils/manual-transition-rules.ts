type IdentityRecord = Record<string, unknown>

function getValueByPath(object: IdentityRecord, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') {
      return undefined
    }
    return (current as IdentityRecord)[key]
  }, object)
}

function matchesFilterValue(actual: unknown, expected: unknown): boolean {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    const operators = expected as Record<string, unknown>
    if ('$ne' in operators) {
      return actual !== operators.$ne
    }
    if ('$in' in operators && Array.isArray(operators.$in)) {
      return operators.$in.includes(actual)
    }
    if ('$nin' in operators && Array.isArray(operators.$nin)) {
      return !operators.$nin.includes(actual)
    }
  }

  return actual === expected
}

export function isEmptyManualTransitionFilter(filter?: Record<string, unknown>): boolean {
  return !filter || Object.keys(filter).length === 0
}

export function matchesIdentityFilter(identity: IdentityRecord, filter: Record<string, unknown>): boolean {
  if (isEmptyManualTransitionFilter(filter)) {
    return true
  }

  return Object.entries(filter).every(([path, expected]) => matchesFilterValue(getValueByPath(identity, path), expected))
}

export type ManualTransitionRule = {
  source: string
  targets: string[]
  filter?: Record<string, unknown>
}

export function findManualTransitionRule(
  source: string,
  rules: ManualTransitionRule[],
  identity?: IdentityRecord,
): ManualTransitionRule | undefined {
  const sourceRules = rules.filter((rule) => rule.source === source)
  if (sourceRules.length === 0) {
    return undefined
  }

  if (identity) {
    for (const rule of sourceRules) {
      if (!isEmptyManualTransitionFilter(rule.filter) && matchesIdentityFilter(identity, rule.filter!)) {
        return rule
      }
    }
  }

  return sourceRules.find((rule) => isEmptyManualTransitionFilter(rule.filter))
}

export function getManualTransitionRuleKey(rule: ManualTransitionRule): string {
  const filterKey = rule.filter ? JSON.stringify(rule.filter) : ''
  return `${rule.source}::${filterKey}`
}
