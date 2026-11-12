import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Entry, EqualityFilter } from 'ldapts';
import { RequestContext } from 'nestjs-request-context';
import { ValidationException } from '~/_common/errors/ValidationException';
import { isConsoleEntrypoint } from '~/_common/functions/is-cli';
import { DataStatusEnum } from '~/management/identities/_enums/data-status';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { Identities } from '~/management/identities/_schemas/identities.schema';
import { IdentitiesCrudService } from '~/management/identities/identities-crud.service';
import { IdentitiesValidationService } from '~/management/identities/validations/identities.validation.service';
import { LDAP_IMPORT_DEFAULT_DEPARTMENT, LDAP_IMPORT_EMPLOYEE_TYPE, LDAP_IMPORT_ID_ATTRIBUTE } from './ldap.constants';
import { LdapClientService } from './ldap-client.service';
import { LdapMappingService } from './ldap-mapping.service';

const PAGE_SIZE = 500;
const LDAP_IMPORT_REQUEST_PATH = '/management/identities';
const LDAP_IMPORT_USERNAME = 'ldap-import';

/** Attributs LDAP repris dans inetOrgPerson (mono-valués côté Sesame, sauf departmentNumber) */
const SINGLE_VALUED_ATTRIBUTES = [
  'cn',
  'displayName',
  'facsimileTelephoneNumber',
  'givenName',
  'labeledURI',
  'mail',
  'mobile',
  'postalAddress',
  'preferredLanguage',
  'sn',
  'telephoneNumber',
  'title',
  'uid',
] as const;

export interface LdapImportReport {
  imported: number;
  skipped: number;
  errors: number;
}

function values(entry: Entry, attribute: string): string[] {
  const key = Object.keys(entry).find((k) => k.toLowerCase() === attribute.toLowerCase());
  if (!key || key === 'dn') return [];
  const raw = entry[key];
  return (Array.isArray(raw) ? raw : [raw])
    .map((v) => (Buffer.isBuffer(v) ? v.toString('utf-8') : String(v)))
    .filter((v) => v.trim() !== '');
}

/** Propriétés JSON Schema d'un schéma de champs additionnels, indexées par nom de schéma (= objectClass) */
export type AdditionalFieldsSchemas = Record<string, Record<string, { type?: string | string[] }>>;

/**
 * Convertit les valeurs LDAP d'un attribut selon le type déclaré dans le schéma de validation
 */
export function convertLdapValues(raw: string[], type?: string | string[]): unknown {
  const main = Array.isArray(type) ? type.find((t) => t !== 'null') : type;
  const scalar = (value: string): unknown => {
    switch (main) {
      case 'number':
      case 'integer': {
        const n = Number(value);
        return Number.isFinite(n) ? n : undefined;
      }
      case 'boolean':
        return /^(true|1|yes|on)$/i.test(value);
      default:
        return value;
    }
  };

  if (main === 'array') return raw;
  return raw.length ? scalar(raw[0]) : undefined;
}

/**
 * Champs additionnels d'une entrée LDAP, pour chaque schéma dont l'objectClass est portée par l'entrée
 */
export function ldapEntryToAdditionalFields(
  entry: Entry,
  schemas: AdditionalFieldsSchemas = {},
): { objectClasses: string[]; attributes: Record<string, Record<string, unknown>> } {
  const entryClasses = values(entry, 'objectClass').map((oc) => oc.toLowerCase());
  const objectClasses: string[] = [];
  const attributes: Record<string, Record<string, unknown>> = {};

  for (const [name, properties] of Object.entries(schemas)) {
    if (!entryClasses.includes(name.toLowerCase())) continue;
    const fields: Record<string, unknown> = {};
    for (const [attribute, definition] of Object.entries(properties ?? {})) {
      const converted = convertLdapValues(values(entry, attribute), definition?.type);
      if (converted !== undefined) fields[attribute] = converted;
    }
    objectClasses.push(name);
    attributes[name] = fields;
  }

  return { objectClasses, attributes };
}

/**
 * Convertit une entrée LDAP en identité Sesame (null si l'entrée est inexploitable)
 */
export function ldapEntryToIdentity(
  entry: Entry,
  schemas: AdditionalFieldsSchemas = {},
  { employeeType = LDAP_IMPORT_EMPLOYEE_TYPE, defaultDepartment = LDAP_IMPORT_DEFAULT_DEPARTMENT } = {},
): Partial<Identities> | null {
  const [entryUUID] = values(entry, LDAP_IMPORT_ID_ATTRIBUTE);
  const [uid] = values(entry, 'uid');
  const [cn] = values(entry, 'cn');
  if (!entryUUID || !uid || !cn) return null;

  const inetOrgPerson: Record<string, unknown> = {};
  for (const attribute of SINGLE_VALUED_ATTRIBUTES) {
    const [value] = values(entry, attribute);
    if (value !== undefined) inetOrgPerson[attribute] = value;
  }
  inetOrgPerson.sn = inetOrgPerson.sn ?? cn;
  const departmentNumber = values(entry, 'departmentNumber');
  inetOrgPerson.departmentNumber = departmentNumber.length ? departmentNumber : [defaultDepartment];
  inetOrgPerson.employeeType = employeeType;
  inetOrgPerson.employeeNumber = [entryUUID];

  return {
    inetOrgPerson: inetOrgPerson as unknown as Identities['inetOrgPerson'],
    additionalFields: ldapEntryToAdditionalFields(entry, schemas) as unknown as Identities['additionalFields'],
    // les comptes existent déjà dans l'annuaire : ils sont considérés comme synchronisés
    state: IdentityState.SYNCED,
    dataStatus: DataStatusEnum.ACTIVE,
    lastBackendSync: new Date(),
  };
}

/**
 * Import initial des comptes de l'annuaire LDAP lorsque la base Sesame ne contient aucune identité
 */
@Injectable()
export class LdapImportService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LdapImportService.name);

  public constructor(
    private readonly moduleRef: ModuleRef,
    private readonly client: LdapClientService,
    private readonly mapping: LdapMappingService,
  ) {}

  /**
   * Résolu à la demande : IdentitiesModule importe (indirectement) LdapModule
   */
  protected get identitiesService(): IdentitiesCrudService {
    return this.moduleRef.get(IdentitiesCrudService, { strict: false });
  }

  protected get validationService(): IdentitiesValidationService {
    return this.moduleRef.get(IdentitiesValidationService, { strict: false });
  }

  /**
   * Charge les schémas de champs additionnels listés dans `import.additionalFields` du mapping
   */
  protected async loadAdditionalFieldsSchemas(): Promise<AdditionalFieldsSchemas> {
    const names = (await this.mapping.getMapping()).import?.additionalFields ?? [];
    const schemas: AdditionalFieldsSchemas = {};
    for (const name of names) {
      const schema = await this.validationService.findOne(name);
      schemas[name] = schema?.properties ?? {};
    }
    return schemas;
  }

  public async onApplicationBootstrap(): Promise<void> {
    if (!this.client.enabled || isConsoleEntrypoint()) return;

    try {
      await this.importIfEmpty();
    } catch (error) {
      this.logger.error(`Import initial LDAP impossible : ${error?.message || error}`, error?.stack);
    }
  }

  public async importIfEmpty(): Promise<LdapImportReport | null> {
    const count = await this.identitiesService.model.estimatedDocumentCount().exec();
    if (count > 0) return null;

    this.logger.warn('Base Sesame vide : import des comptes depuis LDAP...');
    const report = await this.runInSystemContext(() => this.importAll());
    this.logger.warn(
      `Import LDAP terminé : ${report.imported} importé(s), ${report.skipped} ignoré(s), ${report.errors} en erreur`,
    );
    return report;
  }

  /**
   * Hors requête HTTP (démarrage), les services d'identités ont besoin d'un contexte de requête :
   * le chemin détermine le nom des événements (management.identities.service.*),
   * l'utilisateur alimente les métadonnées (createdBy) et l'historique.
   */
  protected runInSystemContext<T>(fn: () => Promise<T>): Promise<T> {
    const req = {
      path: LDAP_IMPORT_REQUEST_PATH,
      headers: {},
      user: { _id: '000000000000000000000000', username: LDAP_IMPORT_USERNAME },
    };
    return RequestContext.cls.run(new RequestContext(req, {}), fn);
  }

  public async importAll(): Promise<LdapImportReport> {
    const baseDN = await this.mapping.resolveIdentitiesBaseDN();
    const report: LdapImportReport = { imported: 0, skipped: 0, errors: 0 };
    const schemas = await this.loadAdditionalFieldsSchemas();
    const additionalAttributes = Object.values(schemas).flatMap((properties) => Object.keys(properties));
    if (Object.keys(schemas).length) {
      this.logger.log(`Champs additionnels importés : ${Object.keys(schemas).join(', ')}`);
    }

    await this.client.withClient(async (client) => {
      const pages = client.searchPaginated(baseDN, {
        scope: 'sub',
        filter: new EqualityFilter({ attribute: 'objectClass', value: 'inetOrgPerson' }),
        attributes: [
          ...SINGLE_VALUED_ATTRIBUTES,
          'departmentNumber',
          'objectClass',
          LDAP_IMPORT_ID_ATTRIBUTE,
          ...additionalAttributes,
        ],
        paged: { pageSize: PAGE_SIZE },
      });

      for await (const { searchEntries } of pages) {
        for (const entry of searchEntries) {
          await this.importEntry(entry, report, schemas);
        }
      }
    });

    return report;
  }

  private async importEntry(entry: Entry, report: LdapImportReport, schemas: AdditionalFieldsSchemas): Promise<void> {
    const identity = ldapEntryToIdentity(entry, schemas, {
      employeeType: this.client.options.importEmployeeType,
      defaultDepartment: this.client.options.importDefaultDepartment,
    });
    if (!identity) {
      this.logger.warn(`Entrée ignorée (uid, cn ou ${LDAP_IMPORT_ID_ATTRIBUTE} manquant) : ${entry.dn}`);
      report.skipped++;
      return;
    }

    try {
      const created = await this.identitiesService.create<Identities>(identity);
      await this.identitiesService.generateFingerprint(created as unknown as Identities);
      report.imported++;
    } catch (error) {
      // détail des règles en faute pour les erreurs de validation (ValidationException.getValidations)
      const details = error instanceof ValidationException ? ` ${JSON.stringify(error.getValidations())}` : '';
      this.logger.error(`Import de ${entry.dn} impossible : ${error?.message || error}${details}`);
      report.errors++;
    }
  }
}
