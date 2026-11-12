import { Injectable, Logger } from '@nestjs/common';
import { Attribute, Change, Client, Entry, EqualityFilter, NoSuchObjectError } from 'ldapts';
import { ActionType } from '~/core/backends/_enum/action-type.enum';
import { WorkerResultInterface } from '~/core/backends/_interfaces/worker-result.interface';
import { LdapComputedEntry } from './_interfaces/ldap-options.interface';
import { LDAP_IMPORT_DEFAULT_DEPARTMENT, LDAP_IMPORT_EMPLOYEE_TYPE, LDAP_IMPORT_ID_ATTRIBUTE } from './ldap.constants';
import { LdapClientService } from './ldap-client.service';
import { LdapMappingService } from './ldap-mapping.service';

export const LDAP_BACKEND_NAME = 'ldap';

/** Actions prises en charge par le module LDAP natif (à la place du daemon) */
export const LDAP_HANDLED_ACTIONS: ReadonlySet<string> = new Set([
  ActionType.IDENTITY_CREATE,
  ActionType.IDENTITY_UPDATE,
  ActionType.IDENTITY_DELETE,
]);

export type LdapOperation = 'add' | 'modify' | 'rename+modify' | 'unchanged' | 'delete' | 'absent';

export interface LdapOperationResult {
  dn: string;
  operation: LdapOperation;
  changes?: string[];
}

function entryValues(entry: Entry, attribute: string): string[] {
  const key = Object.keys(entry).find((k) => k.toLowerCase() === attribute.toLowerCase());
  if (!key || key === 'dn') return [];
  const raw = entry[key];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((value) => (Buffer.isBuffer(value) ? value.toString('utf-8') : String(value)));
}

function sameValues(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sorted = [...b].sort();
  return [...a].sort().every((value, i) => value === sorted[i]);
}

/**
 * Calcule les modifications à appliquer à une entrée existante pour la rendre conforme à l'entrée calculée.
 * Les objectClass manquants sont ajoutés (jamais retirés), les attributs différents remplacés,
 * les attributs vidés supprimés.
 */
export function computeLdapChanges(existing: Entry, target: LdapComputedEntry): Change[] {
  const changes: Change[] = [];

  const currentClasses = entryValues(existing, 'objectClass').map((oc) => oc.toLowerCase());
  const missingClasses = target.objectClasses.filter((oc) => !currentClasses.includes(oc.toLowerCase()));
  if (missingClasses.length) {
    changes.push(
      new Change({ operation: 'add', modification: new Attribute({ type: 'objectClass', values: missingClasses }) }),
    );
  }

  for (const [type, values] of Object.entries(target.attributes)) {
    if (type.toLowerCase() === 'objectclass') continue;
    const current = entryValues(existing, type);
    if (!values.length) {
      if (current.length) changes.push(new Change({ operation: 'delete', modification: new Attribute({ type }) }));
      continue;
    }
    if (!sameValues(current, values)) {
      changes.push(new Change({ operation: 'replace', modification: new Attribute({ type, values }) }));
    }
  }

  return changes;
}

/** departmentNumber par défaut posé à l'import : propre à Sesame, il n'est pas écrit dans l'annuaire */
function isDefaultDepartment(attributes: Record<string, string[]>, defaultDepartment: string): boolean {
  const key = Object.keys(attributes).find((k) => k.toLowerCase() === 'departmentnumber');
  const values = key ? attributes[key] : [];
  return values.length === 1 && values[0] === defaultDepartment;
}

/**
 * Écriture des identités dans l'annuaire LDAP (création / modification / suppression)
 */
@Injectable()
export class LdapIdentitiesService {
  private readonly logger = new Logger(LdapIdentitiesService.name);

  public constructor(
    private readonly client: LdapClientService,
    private readonly mapping: LdapMappingService,
  ) {}

  private get importEmployeeType(): string {
    return this.client.options.importEmployeeType || LDAP_IMPORT_EMPLOYEE_TYPE;
  }

  private get importDefaultDepartment(): string {
    return this.client.options.importDefaultDepartment || LDAP_IMPORT_DEFAULT_DEPARTMENT;
  }

  public handles(actionType: string): boolean {
    return this.client.enabled && LDAP_HANDLED_ACTIONS.has(actionType);
  }

  /**
   * Exécute l'action et retourne un résultat au format des workers du daemon
   */
  public async execute(
    actionType: string,
    jobId: string,
    identity: Record<string, unknown>,
  ): Promise<WorkerResultInterface> {
    try {
      const result =
        actionType === ActionType.IDENTITY_DELETE ? await this.delete(identity) : await this.upsert(identity);
      this.logger.log(`[${actionType}] ${result.operation} ${result.dn}`);
      return this.buildResult(actionType, jobId, 0, `${result.operation} ${result.dn}`, result);
    } catch (error) {
      const message = error?.message || String(error);
      this.logger.error(`[${actionType}] ${message}`, error?.stack);
      return this.buildResult(actionType, jobId, 1, message);
    }
  }

  public async upsert(identity: Record<string, unknown>): Promise<LdapOperationResult> {
    const target = await this.mapping.computeEntry(identity);
    const attributesToRead = ['objectClass', ...Object.keys(target.attributes)];

    return this.client.withClient(async (client) => {
      let existing = await this.findByDn(client, target.dn, attributesToRead);
      let renamed = false;

      // compte importé depuis l'annuaire : retrouvé par entryUUID et modifié sur place (son DN est conservé)
      const imported = existing ? null : await this.findImported(client, identity, attributesToRead);
      if (imported) {
        // ni l'attribut du RDN existant, ni les identifiants propres à Sesame (employeeNumber = entryUUID, employeeType = LDAP)
        const preserved = [
          imported.dn.split('=')[0].trim(),
          'employeeNumber',
          'employeeType',
          ...(isDefaultDepartment(target.attributes, this.importDefaultDepartment) ? ['departmentNumber'] : []),
        ].map((a) => a.toLowerCase());
        const changes = computeLdapChanges(imported, target).filter(
          (c) => !preserved.includes(c.modification.type.toLowerCase()),
        );
        if (changes.length) await client.modify(imported.dn, changes);
        return {
          dn: imported.dn,
          operation: changes.length ? ('modify' as const) : ('unchanged' as const),
          changes: changes.map((change) => `${change.operation}:${change.modification.type}`),
        };
      }

      if (!existing && target.match) {
        const previous = await this.findByMatch(client, target.match, attributesToRead);
        if (previous) {
          await client.modifyDN(previous.dn, target.dn);
          existing = await this.findByDn(client, target.dn, attributesToRead);
          renamed = true;
        }
      }

      if (!existing) {
        const attributes: Record<string, string[]> = { objectClass: target.objectClasses };
        for (const [type, values] of Object.entries(target.attributes)) {
          if (values.length) attributes[type] = values;
        }
        await client.add(target.dn, attributes);
        return { dn: target.dn, operation: 'add' as const };
      }

      const changes = computeLdapChanges(existing, target);
      if (changes.length) await client.modify(target.dn, changes);

      return {
        dn: target.dn,
        operation: renamed ? ('rename+modify' as const) : changes.length ? ('modify' as const) : ('unchanged' as const),
        changes: changes.map((change) => `${change.operation}:${change.modification.type}`),
      };
    });
  }

  public async delete(identity: Record<string, unknown>): Promise<LdapOperationResult> {
    const target = await this.mapping.computeEntry(identity);

    return this.client.withClient(async (client) => {
      let dn = target.dn;
      if (!(await this.findByDn(client, dn, ['1.1']))) {
        const found =
          (await this.findImported(client, identity, ['1.1'])) ??
          (target.match ? await this.findByMatch(client, target.match, ['1.1']) : null);
        dn = found?.dn ?? dn;
      }

      try {
        await client.del(dn);
        return { dn, operation: 'delete' as const };
      } catch (error) {
        // suppression idempotente : l'entrée n'existe déjà plus
        if (error instanceof NoSuchObjectError) return { dn, operation: 'absent' as const };
        throw error;
      }
    });
  }

  private async findByDn(client: Client, dn: string, attributes: string[]): Promise<Entry | null> {
    try {
      const { searchEntries } = await client.search(dn, { scope: 'base', attributes });
      return searchEntries[0] ?? null;
    } catch (error) {
      if (error instanceof NoSuchObjectError) return null;
      throw error;
    }
  }

  /**
   * Entrée d'une identité importée depuis l'annuaire (employeeType LDAP, employeeNumber = entryUUID)
   */
  private async findImported(
    client: Client,
    identity: Record<string, any>,
    attributes: string[],
  ): Promise<Entry | null> {
    const person = identity?.inetOrgPerson;
    if (person?.employeeType !== this.importEmployeeType) return null;
    const entryUUID = Array.isArray(person.employeeNumber) ? person.employeeNumber[0] : person.employeeNumber;
    if (!entryUUID) return null;
    return this.findByMatch(client, { attribute: LDAP_IMPORT_ID_ATTRIBUTE, value: String(entryUUID) }, attributes);
  }

  private async findByMatch(
    client: Client,
    match: { attribute: string; value: string },
    attributes: string[],
  ): Promise<Entry | null> {
    const { searchEntries } = await client.search(this.client.options.baseDN, {
      scope: 'sub',
      filter: new EqualityFilter({ attribute: match.attribute, value: match.value }),
      attributes,
      sizeLimit: 2,
    });
    if (searchEntries.length > 1) {
      throw new Error(`Plusieurs entrées LDAP correspondent à ${match.attribute}=${match.value}`);
    }
    return searchEntries[0] ?? null;
  }

  private buildResult(
    actionType: string,
    jobId: string,
    status: number,
    message: string,
    data?: LdapOperationResult,
  ): WorkerResultInterface {
    const info = { status, message, ...(data ? { data } : {}) };
    return {
      jobName: actionType,
      jobId,
      status,
      data: {
        [LDAP_BACKEND_NAME]: {
          backend: LDAP_BACKEND_NAME,
          status,
          ...(status === 0 ? { output: info } : { error: info }),
        },
      },
    };
  }
}
