import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { formatValidationErrors } from '~/_common/functions/format-validation-errors.function';
import { IdentitiesDefaultsDto } from '~/settings/_dto/identities-defaults.dto';

/**
 * Valeurs par défaut des identités, lues depuis `configs/identities/defaults.yml`
 * (initialisé depuis `defaults/identities/defaults.yml` s'il est absent).
 */
@Injectable()
export class IdentitiesDefaultsService implements OnModuleInit {
  private readonly logger = new Logger(IdentitiesDefaultsService.name);
  private readonly file = path.join(process.cwd(), 'configs', 'identities', 'defaults.yml');
  private readonly defaultFile = path.join(process.cwd(), 'defaults', 'identities', 'defaults.yml');

  public onModuleInit(): void {
    if (existsSync(this.file) || !existsSync(this.defaultFile)) return;

    try {
      mkdirSync(path.dirname(this.file), { recursive: true });
      copyFileSync(this.defaultFile, this.file);
      this.logger.warn(`Copied default identities defaults file: ${this.file}`);
    } catch (e) {
      this.logger.error(`Error initializing identities defaults: ${e?.message || e}`);
    }
  }

  /**
   * Relu à chaque appel : une modification du fichier est prise en compte sans redémarrage.
   * Un fichier absent ou invalide renvoie des valeurs vides (l'erreur est journalisée).
   */
  public async getDefaults(): Promise<IdentitiesDefaultsDto> {
    const empty = new IdentitiesDefaultsDto();
    if (!existsSync(this.file)) return empty;

    try {
      const dto = plainToInstance(IdentitiesDefaultsDto, parse(readFileSync(this.file, 'utf-8')) || {});
      await validateOrReject(dto, { whitelist: true });

      const objectClasses = [
        ...new Set((dto.local?.objectClasses || []).map((oc) => `${oc}`.trim()).filter(Boolean)),
      ].filter((oc) => oc.toLowerCase() !== 'inetorgperson');
      return { local: { objectClasses } };
    } catch (e) {
      const message = Array.isArray(e) ? formatValidationErrors(e, path.basename(this.file)) : e?.message || e;
      this.logger.error(`Invalid identities defaults file ${this.file}: ${message}`);
      return empty;
    }
  }
}
