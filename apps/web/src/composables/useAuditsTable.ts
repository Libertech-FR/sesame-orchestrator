type FetchAuditsRowsOptions = {
  http: any
  url: string
  page: number
  limit: number
  sortBy: string
  descending: boolean
  additionalSortFields?: Record<string, string>
  extraQuery?: Record<string, any>
}

type AuditDiffResult = {
  original: string
  modified: string
  hasChanges: boolean
  truncated: boolean
}

const AUDIT_DIFF_LIMITS = {
  maxChangesForDiff: 250,
  maxStringLength: 2000,
  maxDepth: 6,
  maxArrayItems: 100,
  maxObjectKeys: 100,
  maxJsonLength: 120000,
}

export function createDefaultAuditDiffDialogState() {
  return {
    open: false,
    loading: false,
    hasChanges: false,
    original: '',
    modified: '',
    author: '',
    date: '',
  }
}

export function getAuditOperationLabel(op?: string): string {
  switch (op) {
    case 'insert':
      return 'Creation'
    case 'update':
      return 'Mise à jour'
    case 'delete':
      return 'Suppression'
    case 'replace':
      return 'Remplacement'
    default:
      return op || 'Inconnue'
  }
}

export function getAuditOperationColor(op?: string): string {
  switch (op) {
    case 'insert':
      return 'positive'
    case 'update':
      return 'primary'
    case 'delete':
      return 'negative'
    case 'replace':
      return 'warning'
    default:
      return 'grey-7'
  }
}

export function formatAuditChangeLabel(change: any): string {
  const path = change?.path || 'unknown'
  const type = change?.type || 'CHANGE'
  return `${type}: ${path}`
}

export function resolveAuditSortField(sortBy: string, additionalSortFields: Record<string, string> = {}): string {
  if (additionalSortFields[sortBy]) return additionalSortFields[sortBy]
  if (sortBy === 'author') return 'agent.name'
  if (sortBy === 'op') return 'op'
  return 'metadata.createdAt'
}

export async function fetchAuditsRows({
  http,
  url,
  page,
  limit,
  sortBy,
  descending,
  additionalSortFields = {},
  extraQuery = {},
}: FetchAuditsRowsOptions): Promise<{ rows: any[]; total: number }> {
  const sortField = resolveAuditSortField(sortBy, additionalSortFields)
  const res = await http.get(url, {
    query: {
      page,
      limit,
      [`sort[${sortField}]`]: descending ? 'desc' : 'asc',
      ...extraQuery,
    },
  })

  return {
    rows: res?._data?.data || [],
    total: res?._data?.total || 0,
  }
}

function sanitizeDetailedValue(value: any, depth = 0): any {
  if (value === null || value === undefined) return value

  if (depth >= AUDIT_DIFF_LIMITS.maxDepth) {
    return '[truncated: max depth reached]'
  }

  if (typeof value === 'string') {
    if (value.length <= AUDIT_DIFF_LIMITS.maxStringLength) return value
    return `${value.slice(0, AUDIT_DIFF_LIMITS.maxStringLength)}...[truncated ${value.length - AUDIT_DIFF_LIMITS.maxStringLength} chars]`
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    const sliced = value.slice(0, AUDIT_DIFF_LIMITS.maxArrayItems).map((item) => sanitizeDetailedValue(item, depth + 1))
    if (value.length > AUDIT_DIFF_LIMITS.maxArrayItems) {
      return [
        ...sliced,
        `[truncated: ${value.length - AUDIT_DIFF_LIMITS.maxArrayItems} more items]`,
      ]
    }
    return sliced
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value)
    const slicedEntries = entries.slice(0, AUDIT_DIFF_LIMITS.maxObjectKeys)
    const sanitized: Record<string, any> = {}

    for (const [key, child] of slicedEntries) {
      sanitized[key] = sanitizeDetailedValue(child, depth + 1)
    }

    if (entries.length > AUDIT_DIFF_LIMITS.maxObjectKeys) {
      sanitized.__truncatedKeys = `[truncated: ${entries.length - AUDIT_DIFF_LIMITS.maxObjectKeys} more keys]`
    }

    return sanitized
  }

  return String(value)
}

function stringifyDiffPayload(payload: Record<string, any>): string {
  const json = JSON.stringify(payload, null, 2)
  if (json.length <= AUDIT_DIFF_LIMITS.maxJsonLength) return json
  return `${json.slice(0, AUDIT_DIFF_LIMITS.maxJsonLength)}\n...[truncated ${json.length - AUDIT_DIFF_LIMITS.maxJsonLength} chars]`
}

export function buildAuditDiffFromChanges(changes: any[]): AuditDiffResult {
  if (!Array.isArray(changes) || changes.length === 0) {
    return {
      original: '',
      modified: '',
      hasChanges: false,
      truncated: false,
    }
  }

  const originalObject: Record<string, any> = {}
  const modifiedObject: Record<string, any> = {}
  const selectedChanges = changes.slice(0, AUDIT_DIFF_LIMITS.maxChangesForDiff)

  for (const change of selectedChanges) {
    const path = Array.isArray(change?.path) ? change.path.join('.') : `${change?.path || ''}`
    if (!path) continue

    switch (change?.type) {
      case 'CHANGE':
        if (Object.prototype.hasOwnProperty.call(change, 'oldValue')) {
          originalObject[path] = sanitizeDetailedValue(change.oldValue)
        }
        if (Object.prototype.hasOwnProperty.call(change, 'value')) {
          modifiedObject[path] = sanitizeDetailedValue(change.value)
        }
        break
      case 'CREATE':
        if (Object.prototype.hasOwnProperty.call(change, 'value')) {
          modifiedObject[path] = sanitizeDetailedValue(change.value)
        }
        break
      case 'REMOVE':
        if (Object.prototype.hasOwnProperty.call(change, 'oldValue')) {
          originalObject[path] = sanitizeDetailedValue(change.oldValue)
        }
        break
      default:
        if (Object.prototype.hasOwnProperty.call(change, 'oldValue')) {
          originalObject[path] = sanitizeDetailedValue(change.oldValue)
        }
        if (Object.prototype.hasOwnProperty.call(change, 'value')) {
          modifiedObject[path] = sanitizeDetailedValue(change.value)
        }
    }
  }

  return {
    original: stringifyDiffPayload(originalObject),
    modified: stringifyDiffPayload(modifiedObject),
    hasChanges: true,
    truncated: changes.length > AUDIT_DIFF_LIMITS.maxChangesForDiff,
  }
}

export async function fetchAuditDetails(http: any, auditId: string): Promise<any> {
  const res = await http.get(`/core/audits/${auditId}`)
  return res?._data?.data || {}
}
