import { SetMetadata } from '@nestjs/common'

export const CRON_CONSOLE_HANDLER_METADATA = 'sesame:cron-console-handler'

export type CronConsoleHandlerArgumentType = 'string' | 'number' | 'boolean'

export interface CronConsoleHandlerArgument {
  /** Nom de l'argument dans options cron / options CLI. */
  name: string
  label?: string
  description?: string
  type?: CronConsoleHandlerArgumentType
  default?: string | number | boolean
  required?: boolean
  /** Flag CLI (ex. `--source`). Par défaut : `--${name}`. */
  flag?: string
  /** Passe la valeur comme argument positionnel après la commande console. */
  positional?: boolean
}

export interface CronConsoleHandlerDescriptor {
  handler: string
  command: string
  label: string
  arguments: CronConsoleHandlerArgument[]
}

export interface CronConsoleHandlerOptions {
  /** Identifiant handler (ex. `lifecycle-execute`). */
  handler: string

  /** Commande console complète (ex. `lifecycle execute`). */
  command: string

  /** Libellé affiché dans l'interface d'administration. */
  label?: string

  /** Arguments CLI suggérés pour la configuration cron. */
  arguments?: CronConsoleHandlerArgument[]
}

const cronConsoleHandlerRegistry: CronConsoleHandlerDescriptor[] = []

export function getCronConsoleHandlers(): CronConsoleHandlerDescriptor[] {
  return [...cronConsoleHandlerRegistry].sort((left, right) => left.handler.localeCompare(right.handler))
}

export const CronConsoleHandler = (options: CronConsoleHandlerOptions) => {
  cronConsoleHandlerRegistry.push({
    handler: options.handler,
    command: options.command,
    label: options.label || options.handler,
    arguments: options.arguments || [],
  })

  return SetMetadata(CRON_CONSOLE_HANDLER_METADATA, options)
}
