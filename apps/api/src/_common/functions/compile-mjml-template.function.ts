import { Logger } from '@nestjs/common';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import mjml2html from 'mjml';

const logger = new Logger('MjmlTemplate');

/**
 * Convertit `<templateName>.mjml` en `<templateName>.hbs` si la source MJML existe
 * et que le fichier Handlebars est absent ou plus ancien.
 *
 * Les expressions Handlebars (`{{ var }}`) sont conservées telles quelles par MJML.
 * Les blocs (`{{#each}}`, `{{#if}}`) placés entre deux composants MJML doivent être
 * encapsulés dans `<mj-raw>` pour ne pas être rejetés par le parseur.
 *
 * @returns true si le fichier .hbs a été (re)généré
 */
export function compileMjmlTemplate(templatesDir: string, templateName: string): boolean {
  const mjmlPath = path.join(templatesDir, `${templateName}.mjml`);
  if (!existsSync(mjmlPath)) {
    return false;
  }

  const hbsPath = path.join(templatesDir, `${templateName}.hbs`);
  if (existsSync(hbsPath) && statSync(hbsPath).mtimeMs >= statSync(mjmlPath).mtimeMs) {
    return false;
  }

  const { html, errors } = mjml2html(readFileSync(mjmlPath, 'utf-8'), {
    filePath: mjmlPath,
    validationLevel: 'soft',
    keepComments: false,
  });
  for (const error of errors) {
    logger.warn(`${templateName}.mjml:${error.line} ${error.message}`);
  }

  writeFileSync(hbsPath, html);
  logger.log(`Template ${templateName}.hbs généré depuis ${templateName}.mjml`);

  return true;
}
