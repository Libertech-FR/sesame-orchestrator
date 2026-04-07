import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import fs from 'node:fs/promises'
import path from 'node:path'
import Handlebars from 'handlebars'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { parse } from 'yaml'
import { resolveConfigVariables } from '~/_common/functions/resolve-config-variables.function'

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
      .filter((name) => name.startsWith('mail_'))
      .sort((a, b) => a.localeCompare(b))
  }

  public async renderPreviewHtml(template: string, variables?: Record<string, unknown>): Promise<string> {
    const templateName = String(template || '').trim()
    const filePath = path.join(this.getTemplatesDir(), `${templateName}.hbs`)
    const source = await fs.readFile(filePath, 'utf8')

    const compiled = Handlebars.compile(source, { strict: true })
    return compiled({
      // Valeurs minimales pour éviter les crash sur templates existants
      displayName: 'Preview',
      uid: 'preview',
      url: 'https://example.invalid/initaccount/preview',
      mail: 'preview@example.invalid',
      ...(variables || {}),
    })
  }
}

