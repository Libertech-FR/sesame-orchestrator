import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import fs from 'node:fs/promises';
import path from 'node:path';
import Handlebars from 'handlebars';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';
import { resolveConfigVariables } from '~/_common/functions/resolve-config-variables.function';
import { compileMjmlTemplate } from '~/_common/functions/compile-mjml-template.function';
import mjml2html from 'mjml';

/** Préfixe des templates envoyables manuellement depuis l’UI (hors flux internes Sesame). */
export const USER_SENDABLE_MAIL_TEMPLATE_PREFIX = 'mail_';

export function isUserSendableMailTemplate(templateName: string): boolean {
  return String(templateName || '')
    .trim()
    .startsWith(USER_SENDABLE_MAIL_TEMPLATE_PREFIX);
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
};

/** Contexte Handlebars pour l’aperçu : défauts + variables fournies. */
export function buildMailTemplatePreviewContext(variables?: Record<string, unknown>): Record<string, unknown> {
  return {
    ...MAIL_TEMPLATE_PREVIEW_DEFAULTS,
    ...(variables && typeof variables === 'object' ? variables : {}),
  };
}

export interface MailTemplateValidationIssue {
  source: 'mjml' | 'handlebars' | 'render' | 'variables';
  message: string;
  line?: number;
}

export interface MailTemplateValidationResult {
  valid: boolean;
  format: 'mjml' | 'hbs';
  errors: MailTemplateValidationIssue[];
  warnings: MailTemplateValidationIssue[];
}

export interface MailTemplateConfigVariable {
  key: string;
  label?: string;
  description?: string;
  example?: string;
  defaultValue?: unknown;
}

/** Placeholder Liquid faisant référence à l'identité (résolu uniquement à l'envoi / à l'aperçu). */
const IDENTITY_PLACEHOLDER = /\{\{[^}]*\bidentity\b/;

/** Helpers Handlebars natifs : ne sont pas des variables du contexte. */
const HANDLEBARS_BUILTIN_HELPERS = new Set(['if', 'unless', 'each', 'with', 'lookup', 'log']);

/** Marqueur de scope `#each` : la vérification se fait sur le premier élément de la collection. */
const EACH_ITEM = Symbol('each-item');

type TemplateScope = Array<string | typeof EACH_ITEM>;

interface TemplateVariableUsage {
  path: TemplateScope;
  line?: number;
}

/**
 * Collecte les chemins de variables référencés par un template Handlebars, en suivant les changements
 * de contexte (`#with`, `#each`, `../`). Les helpers inconnus conservent le contexte courant.
 */
function collectTemplateVariables(node: any, scopes: TemplateScope[], out: TemplateVariableUsage[]): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  const resolvePath = (p: any): TemplateScope | null => {
    if (p?.type !== 'PathExpression' || p.data) {
      return null;
    }
    const scope = scopes[scopes.length - 1 - (p.depth || 0)];
    if (!scope) {
      return null;
    }
    return [...scope, ...(p.parts || [])];
  };
  const addPath = (p: any): void => {
    const full = resolvePath(p);
    if (full?.length && !p.this && p.parts?.length) {
      out.push({ path: full, line: p.loc?.start?.line });
    }
  };
  const visitParams = (n: any): void => {
    for (const param of n.params || []) {
      addPath(param);
      collectTemplateVariables(param, scopes, out);
    }
    for (const pair of n.hash?.pairs || []) {
      addPath(pair.value);
      collectTemplateVariables(pair.value, scopes, out);
    }
  };

  switch (node.type) {
    case 'Program':
      for (const stmt of node.body || []) {
        collectTemplateVariables(stmt, scopes, out);
      }
      break;
    case 'MustacheStatement':
    case 'SubExpression': {
      const name = node.path?.original;
      if (node.params?.length || node.hash?.pairs?.length) {
        visitParams(node);
      } else if (!HANDLEBARS_BUILTIN_HELPERS.has(name) && !Handlebars.helpers?.[name]) {
        addPath(node.path);
      }
      break;
    }
    case 'BlockStatement': {
      const helper = node.path?.original;
      visitParams(node);
      if (!node.params?.length && !Handlebars.helpers?.[helper]) {
        // Bloc implicite {{#var}}…{{/var}}
        addPath(node.path);
      }
      const target = node.params?.[0] ? resolvePath(node.params[0]) : null;
      if (helper === 'with') {
        collectTemplateVariables(node.program, target ? [...scopes, target] : scopes, out);
      } else if (helper === 'each') {
        if (target) {
          collectTemplateVariables(node.program, [...scopes, [...target, EACH_ITEM]], out);
        }
      } else {
        collectTemplateVariables(node.program, scopes, out);
      }
      collectTemplateVariables(node.inverse, scopes, out);
      break;
    }
    default:
      break;
  }
}

/** Résout un chemin dans le contexte ; `skip` si la collection d'un `#each` est vide (non vérifiable). */
function resolveTemplateVariable(context: unknown, scope: TemplateScope): { skip: boolean; value?: unknown } {
  let current: any = context;
  for (const part of scope) {
    if (part === EACH_ITEM) {
      const items = Array.isArray(current)
        ? current
        : current && typeof current === 'object'
          ? Object.values(current)
          : [];
      if (!items.length) {
        return { skip: true };
      }
      current = items[0];
      continue;
    }
    if (current == null || typeof current !== 'object') {
      return { skip: false, value: undefined };
    }
    current = current[part];
  }
  return { skip: false, value: current };
}

function formatTemplateScope(scope: TemplateScope): string {
  return scope
    .map((part) => (part === EACH_ITEM ? '[0]' : part))
    .join('.')
    .replace(/\.\[0\]/g, '[0]');
}

function findSourceLine(source: string, scope: TemplateScope): number | undefined {
  const last = [...scope].reverse().find((part): part is string => typeof part === 'string');
  if (!last) {
    return undefined;
  }
  const escaped = last.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\{\\{[^}]*\\b${escaped}\\b`);
  const index = source.split('\n').findIndex((line) => pattern.test(line));
  return index >= 0 ? index + 1 : undefined;
}

@Injectable()
export class MailTemplatesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MailTemplatesService.name);

  public onApplicationBootstrap(): void {
    this.ensureDefaultConfigPresent();
    this.ensureDefaultTemplatesPresent();
  }
  private ensureDefaultTemplatesPresent(): void {
    const templateDir = path.join(process.cwd(), 'templates');
    const defaultsDir = path.join(process.cwd(), 'defaults', 'templates');
    if (!existsSync(templateDir)) {
      mkdirSync(templateDir, { recursive: true });
    }
    try {
      const files = readdirSync(templateDir);
      const defaultFiles = readdirSync(defaultsDir);

      for (const file of defaultFiles) {
        if (!files.includes(file)) {
          const defaultFile = readFileSync(path.join(defaultsDir, file), 'utf-8');
          writeFileSync(path.join(templateDir, file), defaultFile);
          this.logger.warn(`Copied default template file: ${file}`);
        }
      }
    } catch (e) {
      this.logger.error(`Error initializing mail templates: ${e?.message || e}`);
    }
  }
  private ensureDefaultConfigPresent(): void {
    const configDir = path.join(process.cwd(), 'configs', 'mail');
    const defaultsDir = path.join(process.cwd(), 'defaults', 'mail');

    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    try {
      const files = readdirSync(configDir);
      const defaultFiles = readdirSync(defaultsDir);

      for (const file of defaultFiles) {
        if (!files.includes(file)) {
          const defaultFile = readFileSync(path.join(defaultsDir, file), 'utf-8');
          writeFileSync(path.join(configDir, file), defaultFile);
          this.logger.warn(`Copied default mail config file: ${file}`);
        }
      }
    } catch (e) {
      this.logger.error(`Error initializing mail configs: ${e?.message || e}`);
    }
  }

  private getTemplatesDir(): string {
    // Même chemin que la config MailerModule (voir app.module.ts)
    return path.join(process.cwd(), 'templates');
  }

  /** Variables déclarées dans `mail_templates.yml`, sans résolution des placeholders. */
  public async getRawMailTemplateVariables(): Promise<MailTemplateConfigVariable[]> {
    const configPath = path.join(process.cwd(), 'configs', 'mail', 'mail_templates.yml');
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = parse(raw) as any;
    const variables = parsed?.mailTemplates?.variables;
    return Array.isArray(variables) ? variables : [];
  }

  /**
   * Config exposée à l'UI. Sans identité, les valeurs dépendant de l'identité (`{{ identity.* }}`)
   * sont laissées brutes : elles sont résolues par identité à l'envoi (voir `resolveVariableDefaults`).
   */
  public async getMailTemplatesConfig(): Promise<{ variables: MailTemplateConfigVariable[] }> {
    const variables = await this.getRawMailTemplateVariables();
    const resolved = await Promise.all(
      variables.map(async (v) => {
        if (typeof v?.defaultValue === 'string' && IDENTITY_PLACEHOLDER.test(v.defaultValue)) {
          return {
            ...v,
            ...(await resolveConfigVariables({ ...v, defaultValue: undefined })),
            defaultValue: v.defaultValue,
          };
        }
        return resolveConfigVariables(v);
      }),
    );
    return { variables: resolved };
  }

  /**
   * Valeurs par défaut des variables de `mail_templates.yml`, résolues pour une identité donnée
   * (placeholders Liquid avec contexte `date` + `identity`).
   */
  public async resolveVariableDefaults(
    identity?: unknown,
    variables?: MailTemplateConfigVariable[],
  ): Promise<Record<string, unknown>> {
    const list = variables ?? (await this.getRawMailTemplateVariables().catch(() => []));
    const out: Record<string, unknown> = {};
    for (const v of list) {
      const key = String(v?.key || '').trim();
      if (!key || key === 'subject') {
        continue;
      }
      const value = await resolveConfigVariables(v.defaultValue, identity ? { identity } : {});
      out[key] = value ?? '';
    }
    return out;
  }

  public async listTemplates(): Promise<string[]> {
    const dir = this.getTemplatesDir();
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => /\.(hbs|mjml)$/.test(name))
      .map((name) => name.replace(/\.(hbs|mjml)$/, ''))
      .filter((name, index, names) => names.indexOf(name) === index)
      .sort((a, b) => {
        const aSendable = isUserSendableMailTemplate(a);
        const bSendable = isUserSendableMailTemplate(b);
        if (aSendable !== bSendable) {
          return aSendable ? -1 : 1;
        }
        return a.localeCompare(b);
      });
  }

  public async renderPreviewHtml(template: string, variables?: Record<string, unknown>): Promise<string> {
    const templateName = String(template || '').trim();
    compileMjmlTemplate(this.getTemplatesDir(), templateName);
    const filePath = path.join(this.getTemplatesDir(), `${templateName}.hbs`);
    const source = await fs.readFile(filePath, 'utf8');

    // strict: false + défauts : l’aperçu ne doit pas échouer sur des variables runtime (ex. code reset).
    const compiled = Handlebars.compile(source, { strict: false });
    const defaults = await this.resolveVariableDefaults(variables?.identity);
    return compiled(buildMailTemplatePreviewContext({ ...defaults, ...(variables || {}) }));
  }

  /**
   * Valide un template sans effet de bord sur le disque : syntaxe MJML (si source .mjml),
   * syntaxe Handlebars, rendu avec les valeurs d'aperçu et variables non déclarées.
   */
  public async validateTemplate(
    template: string,
    variables?: Record<string, unknown>,
  ): Promise<MailTemplateValidationResult> {
    const templateName = String(template || '').trim();
    const dir = this.getTemplatesDir();
    const mjmlPath = path.join(dir, `${templateName}.mjml`);
    const hbsPath = path.join(dir, `${templateName}.hbs`);
    const format: MailTemplateValidationResult['format'] = existsSync(mjmlPath) ? 'mjml' : 'hbs';
    const errors: MailTemplateValidationIssue[] = [];
    const warnings: MailTemplateValidationIssue[] = [];

    if (
      !templateName ||
      templateName.includes('/') ||
      templateName.includes('\\') ||
      (format === 'hbs' && !existsSync(hbsPath))
    ) {
      errors.push({ source: 'handlebars', message: `Template introuvable : ${templateName}` });
      return { valid: false, format, errors, warnings };
    }

    let hbsSource = '';
    if (format === 'mjml') {
      try {
        const result = mjml2html(await fs.readFile(mjmlPath, 'utf8'), {
          filePath: mjmlPath,
          validationLevel: 'soft',
          keepComments: false,
        });
        for (const error of result.errors || []) {
          errors.push({ source: 'mjml', line: error.line, message: error.message });
        }
        hbsSource = result.html;
      } catch (e) {
        errors.push({ source: 'mjml', message: String(e?.message || e) });
        return { valid: false, format, errors, warnings };
      }
    } else {
      hbsSource = await fs.readFile(hbsPath, 'utf8');
    }

    let ast: any;
    try {
      ast = Handlebars.parse(hbsSource);
    } catch (e) {
      const message = String(e?.message || e);
      const line = Number(/line (\d+)/.exec(message)?.[1]) || undefined;
      errors.push({ source: 'handlebars', line, message });
      return { valid: false, format, errors, warnings };
    }

    const configDefaults = await this.resolveVariableDefaults(variables?.identity);
    try {
      Handlebars.compile(hbsSource, { strict: false })(
        buildMailTemplatePreviewContext({ ...configDefaults, ...(variables || {}) }),
      );
    } catch (e) {
      errors.push({ source: 'render', message: String(e?.message || e) });
    }

    this.checkTemplateVariables({
      ast,
      templateName,
      source: format === 'mjml' ? await fs.readFile(mjmlPath, 'utf8') : hbsSource,
      variables,
      configDefaults,
      errors,
      warnings,
    });

    return { valid: errors.length === 0, format, errors, warnings };
  }

  /**
   * Vérifie que chaque variable du template est résolue dans le contexte réel d'envoi :
   * variables de `mail_templates.yml`, variables fournies, `subject` et l'identité testée.
   * Les valeurs fictives de l'aperçu ne sont admises que pour les templates internes (alimentés au runtime).
   */
  private checkTemplateVariables(args: {
    ast: any;
    templateName: string;
    source: string;
    variables?: Record<string, unknown>;
    configDefaults: Record<string, unknown>;
    errors: MailTemplateValidationIssue[];
    warnings: MailTemplateValidationIssue[];
  }): void {
    const provided = args.variables && typeof args.variables === 'object' ? args.variables : {};
    const context: Record<string, unknown> = {
      ...(isUserSendableMailTemplate(args.templateName) ? {} : MAIL_TEMPLATE_PREVIEW_DEFAULTS),
      ...args.configDefaults,
      subject: '',
      ...provided,
    };
    const hasIdentity = provided.identity != null && typeof provided.identity === 'object';

    const usages: TemplateVariableUsage[] = [];
    collectTemplateVariables(args.ast, [[]], usages);

    const seen = new Set<string>();
    const undefinedVariables: string[] = [];
    const emptyIdentityPaths: string[] = [];
    let identityUsed = false;
    for (const usage of usages) {
      const label = formatTemplateScope(usage.path);
      if (seen.has(label)) {
        continue;
      }
      seen.add(label);

      if (usage.path[0] === 'identity') {
        identityUsed = true;
        if (!hasIdentity) {
          continue;
        }
      }
      const { skip, value } = resolveTemplateVariable(context, usage.path);
      if (skip || (value !== undefined && value !== null)) {
        continue;
      }
      const line = findSourceLine(args.source, usage.path) ?? usage.line;
      const display = line ? `${label} (l.${line})` : label;
      if (usage.path[0] === 'identity') {
        emptyIdentityPaths.push(display);
      } else {
        undefinedVariables.push(display);
      }
    }

    if (undefinedVariables.length) {
      args.errors.push({
        source: 'variables',
        message: `Variable(s) non définie(s) (ni dans mail_templates.yml, ni dans les variables additionnelles) : ${undefinedVariables.join(', ')}`,
      });
    }
    if (emptyIdentityPaths.length) {
      args.warnings.push({
        source: 'variables',
        message: `Attribut(s) d'identité absent(s) pour l'identité testée : ${emptyIdentityPaths.join(', ')}`,
      });
    }
    if (identityUsed && !hasIdentity) {
      args.warnings.push({
        source: 'variables',
        message: 'Aucune identité sélectionnée : les variables identity.* n’ont pas été vérifiées.',
      });
    }
  }
}
