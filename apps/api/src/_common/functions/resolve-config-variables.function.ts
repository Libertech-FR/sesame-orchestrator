import dayjs from 'dayjs'
import { Liquid } from 'liquidjs'

const liquidEngine = new Liquid({
  strictVariables: false,
  strictFilters: false,
})

function normalizeDate(value: unknown): dayjs.Dayjs {
  if (value instanceof Date) {
    return dayjs(value)
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return dayjs(value)
  }
  return dayjs()
}

liquidEngine.registerFilter('dateFormat', (value: unknown, format: string = 'YYYY-MM-DD HH:mm:ss') => {
  return normalizeDate(value).format(format)
})

liquidEngine.registerFilter('unixMs', (value: unknown) => {
  return normalizeDate(value).valueOf()
})

liquidEngine.registerFilter('unixSeconds', (value: unknown) => {
  return normalizeDate(value).unix()
})

function buildTemplateContext(): Record<string, unknown> {
  const now = dayjs()
  return {
    date: {
      now: now.valueOf(),
      isoNow: now.toISOString(),
      nowDate: now.toDate(),
      unix: now.valueOf(),
      unixSeconds: now.unix(),
      today: now.format('YYYY-MM-DD'),
      yesterday: now.subtract(1, 'day').format('YYYY-MM-DD'),
      tomorrow: now.add(1, 'day').format('YYYY-MM-DD'),
    },
  }
}

function getValueFromPath(context: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.').filter(Boolean)
  let current: unknown = context

  for (const segment of segments) {
    if (!current || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }

  return current
}

export async function resolveConfigVariables<T>(input: T): Promise<T> {
  if (input === null || input === undefined) {
    return input
  }

  if (Array.isArray(input)) {
    const resolved = await Promise.all(input.map((item) => resolveConfigVariables(item)))
    return resolved as T
  }

  if (typeof input === 'object') {
    const entries = await Promise.all(
      Object.entries(input as Record<string, unknown>).map(async ([key, value]) => {
        return [key, await resolveConfigVariables(value)] as const
      }),
    )

    return Object.fromEntries(entries) as T
  }

  if (typeof input === 'string') {
    if (!input.includes('{{')) {
      return input
    }

    const context = buildTemplateContext()
    const exactTemplate = input.match(/^\{\{\s*([a-zA-Z0-9._-]+)\s*\}\}$/)
    if (exactTemplate) {
      try {
        await liquidEngine.parseAndRender(input, context)
        const fromContext = getValueFromPath(context, exactTemplate[1])
        if (fromContext !== undefined) {
          return fromContext as T
        }
      } catch {
        return input
      }
    }

    try {
      const rendered = await liquidEngine.parseAndRender(input, context)
      return rendered as T
    } catch {
      return input
    }
  }

  return input
}
