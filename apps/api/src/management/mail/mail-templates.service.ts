import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import fs from 'node:fs/promises'
import path from 'node:path'
import Handlebars from 'handlebars'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { parse } from 'yaml'
import { resolveConfigVariables } from '~/_common/functions/resolve-config-variables.function'

/** Préfixe des templates envoyables manuellement depuis l’UI (hors flux internes Sesame). */
export const USER_SENDABLE_MAIL_TEMPLATE_PREFIX = 'mail_'

export function isUserSendableMailTemplate(templateName: string): boolean {
  return String(templateName || '')
    .trim()
    .startsWith(USER_SENDABLE_MAIL_TEMPLATE_PREFIX)
}

/** Valeurs fictives pour l’aperçu UI (variables runtime non prédictibles, ex. code de reset). */
export const MAIL_TEMPLATE_PREVIEW_DEFAULTS: Record<string, unknown> = {
  displayName: 'Jean Dupont (aperçu)',
  uid: 'preview.user',
  url: 'https://example.invalid/preview',
  mail: 'preview@example.invalid',
  code: '123456',
  token: 'preview-token-exemple',
  subject: 'Sujet (aperçu)',
  appName: 'Sesame',
  title: 'Titre (aperçu)',
  message: 'Message exemple pour l’aperçu du template.',
  ctaUrl: 'https://example.invalid/preview/action',
  ctaLabel: 'Ouvrir (aperçu)',
  hibpCount: 0,
}

/** Contexte Handlebars pour l’aperçu : défauts + variables fournies. */
export function buildMailTemplatePreviewContext(variables?: Record<string, unknown>): Record<string, unknown> {
  return {
    ...MAIL_TEMPLATE_PREVIEW_DEFAULTS,
    ...(variables && typeof variables === 'object' ? variables : {}),
  }
}

@Injectable()
export class MailTemplatesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MailTemplatesService.name)

  public onApplicationBootstrap(): void {
    this.ensureDefaultConfigPresent()
  }

  private ensureDefaultConfigPresent(): void {
    const configDir = path.join(process.cwd(), 'configs', 'mail')
    const defaultsDir = path.join(process.cwd(), 'defaults', 'mail')

    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true })
    }

    try {
      const files = readdirSync(configDir)
      const defaultFiles = readdirSync(defaultsDir)

      for (const file of defaultFiles) {
        if (!files.includes(file)) {
          const defaultFile = readFileSync(path.join(defaultsDir, file), 'utf-8')
          writeFileSync(path.join(configDir, file), defaultFile)
          this.logger.warn(`Copied default mail config file: ${file}`)
        }
      }
    } catch (e) {
      this.logger.error(`Error initializing mail configs: ${e?.message || e}`)
    }
  }

  private getTemplatesDir(): string {
    // Même chemin que la config MailerModule (voir app.module.ts)
    return path.join(process.cwd(), 'templates')
  }

  public async getMailTemplatesConfig(): Promise<{
    variables: Array<{
      key: string
      label?: string
      description?: string
      example?: string
      defaultValue?: unknown
    }>
  }> {
    const configPath = path.join(process.cwd(), 'configs', 'mail', 'mail_templates.yml')
    const raw = readFileSync(configPath, 'utf8')
    const parsed = parse(raw) as any
    const cfg = (parsed?.mailTemplates || {}) as any

    const resolved = await resolveConfigVariables(cfg)

    return {
      variables: Array.isArray((resolved as any)?.variables) ? (resolved as any).variables : [],
    }
  }

  public async listTemplates(): Promise<string[]> {
    const dir = this.getTemplatesDir()
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => name.endsWith('.hbs'))
      .map((name) => name.replace(/\.hbs$/, ''))
      .sort((a, b) => {
        const aSendable = isUserSendableMailTemplate(a)
        const bSendable = isUserSendableMailTemplate(b)
        if (aSendable !== bSendable) {
          return aSendable ? -1 : 1
        }
        return a.localeCompare(b)
      })
  }

  public async renderPreviewHtml(template: string, variables?: Record<string, unknown>): Promise<string> {
    const templateName = String(template || '').trim()
    const filePath = path.join(this.getTemplatesDir(), `${templateName}.hbs`)
    const source = await fs.readFile(filePath, 'utf8')

    // strict: false + défauts : l’aperçu ne doit pas échouer sur des variables runtime (ex. code reset).
    const compiled = Handlebars.compile(source, { strict: false })
    return compiled(buildMailTemplatePreviewContext(variables))
  }
}

