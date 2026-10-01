import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { MailerOptions } from '@nestjs-modules/mailer';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { compileMjmlTemplate } from '~/_common/functions/compile-mjml-template.function';

/**
 * Adapter Handlebars qui génère à la volée `<template>.hbs` depuis `<template>.mjml`
 * lorsque la source MJML est plus récente, avant de déléguer le rendu à Handlebars.
 *
 * Le template précompilé est invalidé dès que le `.hbs` change sur disque, quelle que soit
 * l'origine de la modification (conversion MJML, aperçu UI, édition manuelle).
 */
export class MjmlHandlebarsAdapter extends HandlebarsAdapter {
  private readonly compiledMtimes = new Map<string, number>();

  public compile(mail: any, callback: any, mailerOptions: MailerOptions): void {
    const template = String(mail?.data?.template || '');
    const baseDir = mailerOptions?.template?.dir || '';
    const templatePath = path.isAbsolute(template) ? template : path.join(baseDir, template);
    const templateDir = path.dirname(templatePath);
    const templateName = path.basename(templatePath, path.extname(templatePath));

    try {
      compileMjmlTemplate(templateDir, templateName);

      const hbsPath = path.join(templateDir, `${templateName}.hbs`);
      const mtime = existsSync(hbsPath) ? statSync(hbsPath).mtimeMs : 0;
      if (this.compiledMtimes.get(hbsPath) !== mtime) {
        // Le cache du HandlebarsAdapter est indexé par chemin relatif sans extension
        const cacheKey = path.relative(baseDir, path.join(templateDir, templateName));
        delete (this as unknown as { precompiledTemplates: Record<string, unknown> }).precompiledTemplates[cacheKey];
        this.compiledMtimes.set(hbsPath, mtime);
      }
    } catch (e) {
      return callback(e);
    }

    return super.compile(mail, callback, mailerOptions);
  }
}
