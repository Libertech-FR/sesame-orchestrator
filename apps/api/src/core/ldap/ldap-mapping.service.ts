import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { formatValidationErrors } from '~/_common/functions/format-validation-errors.function';
import { resolveConfigVariables } from '~/_common/functions/resolve-config-variables.function';
import { LdapMappingDto } from './_dto/ldap-mapping.dto';
import { LdapComputedEntry } from './_interfaces/ldap-options.interface';
import { LdapClientService } from './ldap-client.service';

type IdentityLike = {
  additionalFields?: { objectClasses?: string[]; attributes?: Record<string, unknown> };
  [key: string]: unknown;
};

/**
 * Convertit une valeur résolue en liste de valeurs LDAP (chaînes non vides)
 */
export function toLdapValues(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap((item) => toLdapValues(item));
  if (value instanceof Date) return [value.toISOString()];
  if (typeof value === 'boolean') return [value ? 'TRUE' : 'FALSE'];
  if (typeof value === 'object') return [];
  const str = String(value).trim();
  return str ? [str] : [];
}

/**
 * Charge le fichier de mapping LDAP et calcule l'entrée correspondant à une identité
 */
@Injectable()
export class LdapMappingService implements OnModuleInit {
  private readonly logger = new Logger(LdapMappingService.name);
  private cache: { mtimeMs: number; mapping: LdapMappingDto } | null = null;

  public constructor(private readonly client: LdapClientService) {}

  public onModuleInit(): void {
    if (!this.client.enabled) return;
    this.ensureDefaultMappingPresent();
  }

  /**
   * Lit le mapping (rechargé automatiquement si le fichier a été modifié)
   */
  public async getMapping(): Promise<LdapMappingDto> {
    const file = this.client.options.mappingFile;
    if (!existsSync(file)) {
      throw new Error(`Fichier de mapping LDAP introuvable : ${file}`);
    }

    const { mtimeMs } = statSync(file);
    if (this.cache?.mtimeMs === mtimeMs) return this.cache.mapping;

    const mapping = plainToInstance(LdapMappingDto, parse(readFileSync(file, 'utf-8')) ?? {});
    try {
      await validateOrReject(mapping);
    } catch (errors) {
      throw new Error(formatValidationErrors(errors, path.basename(file)));
    }

    this.cache = { mtimeMs, mapping };
    return mapping;
  }

  /**
   * Branche des entrées d'identités (dn.baseDN du mapping, sans contexte d'identité)
   */
  public async resolveIdentitiesBaseDN(): Promise<string> {
    const mapping = await this.getMapping();
    const [baseDN] = toLdapValues(
      await resolveConfigVariables(mapping.dn.baseDN, { identity: {}, ldap: { baseDN: this.client.options.baseDN } }),
    );
    return baseDN || this.client.options.baseDN;
  }

  public async computeEntry(identity: IdentityLike): Promise<LdapComputedEntry> {
    const mapping = await this.getMapping();
    const context = { identity, ldap: { baseDN: this.client.options.baseDN } };

    const [rdnValue] = toLdapValues(await resolveConfigVariables(mapping.dn.rdnValue, context));
    const baseDN = toLdapValues(await resolveConfigVariables(mapping.dn.baseDN, context))[0];
    if (!rdnValue) throw new Error(`Valeur du RDN (${mapping.dn.rdnAttribute}) vide pour cette identité`);
    if (!baseDN) throw new Error('baseDN LDAP vide');

    const objectClasses = [...mapping.objectClasses];
    const attributes: Record<string, string[]> = {};

    if (mapping.additionalFields !== false) {
      for (const objectClass of identity.additionalFields?.objectClasses ?? []) {
        if (!objectClasses.some((oc) => oc.toLowerCase() === objectClass.toLowerCase()))
          objectClasses.push(objectClass);
      }
      for (const attrs of Object.values(identity.additionalFields?.attributes ?? {})) {
        if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) continue;
        for (const [name, value] of Object.entries(attrs as Record<string, unknown>)) {
          attributes[name] = toLdapValues(value);
        }
      }
    }

    for (const [name, template] of Object.entries(mapping.attributes)) {
      attributes[name] = toLdapValues(await resolveConfigVariables(template, context));
    }

    // le RDN doit toujours être présent et cohérent avec le DN
    attributes[mapping.dn.rdnAttribute] = [rdnValue];

    let match: LdapComputedEntry['match'] = null;
    if (mapping.dn.match?.attribute) {
      const [value] = toLdapValues(await resolveConfigVariables(mapping.dn.match.value, context));
      if (value) match = { attribute: mapping.dn.match.attribute, value };
    }

    return {
      dn: `${mapping.dn.rdnAttribute}=${escapeDnValue(rdnValue)},${baseDN}`,
      rdnAttribute: mapping.dn.rdnAttribute,
      objectClasses,
      attributes,
      match,
    };
  }

  private ensureDefaultMappingPresent(): void {
    const file = this.client.options.mappingFile;
    const defaultFile = path.join(process.cwd(), 'defaults', 'ldap', 'mapping.yml');
    if (existsSync(file) || !existsSync(defaultFile)) return;

    try {
      mkdirSync(path.dirname(file), { recursive: true });
      copyFileSync(defaultFile, file);
      this.logger.warn(`Copied default LDAP mapping file: ${file}`);
    } catch (e) {
      this.logger.error(`Error initializing LDAP mapping: ${e?.message || e}`);
    }
  }
}

/**
 * Échappement d'une valeur de RDN (RFC 4514)
 */
export function escapeDnValue(value: string): string {
  return value
    .replace(/[\\,+"<>;=]/g, (c) => `\\${c}`)
    .replace(/^([ #])/, '\\$1')
    .replace(/ $/, '\\ ');
}
