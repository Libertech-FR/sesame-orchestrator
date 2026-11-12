jest.mock('~/management/identities/identities-crud.service', () => ({
  IdentitiesCrudService: class IdentitiesCrudService {},
}));

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ModuleRef } from '@nestjs/core';
import { NoSuchObjectError } from 'ldapts';
import { RequestContext } from 'nestjs-request-context';
import { ActionType } from '~/core/backends/_enum/action-type.enum';
import { LdapClientService } from '~/core/ldap/ldap-client.service';
import { computeLdapChanges, LdapIdentitiesService } from '~/core/ldap/ldap-identities.service';
import {
  convertLdapValues,
  ldapEntryToAdditionalFields,
  ldapEntryToIdentity,
  LdapImportService,
} from '~/core/ldap/ldap-import.service';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { escapeDnValue, LdapMappingService, toLdapValues } from '~/core/ldap/ldap-mapping.service';

const MAPPING = `
dn:
  rdnAttribute: uid
  rdnValue: '{{ identity.inetOrgPerson.uid }}'
  baseDN: 'ou=people,{{ ldap.baseDN }}'
  match:
    attribute: employeeNumber
    value: '{{ identity.inetOrgPerson.employeeNumber }}'
objectClasses: [top, inetOrgPerson]
attributes:
  cn: '{{ identity.inetOrgPerson.cn }}'
  sn: '{{ identity.inetOrgPerson.sn }}'
  mail: '{{ identity.inetOrgPerson.mail }}'
  employeeNumber: '{{ identity.inetOrgPerson.employeeNumber }}'
  departmentNumber: '{{ identity.inetOrgPerson.departmentNumber }}'
additionalFields: true
`;

const identity = {
  inetOrgPerson: {
    uid: 'jdoe',
    cn: 'John Doe',
    sn: 'Doe',
    mail: null,
    employeeNumber: '42',
    departmentNumber: ['A', 'B'],
  },
  additionalFields: { objectClasses: ['supannPerson'], attributes: { supannPerson: { supannCivilite: 'M.' } } },
};

function setup() {
  const dir = mkdtempSync(path.join(tmpdir(), 'ldap-mapping-'));
  const mappingFile = path.join(dir, 'mapping.yml');
  writeFileSync(mappingFile, MAPPING);

  const options = { enabled: true, baseDN: 'dc=example,dc=org', mappingFile };
  const ldap = {
    search: jest.fn(),
    add: jest.fn(),
    modify: jest.fn(),
    modifyDN: jest.fn(),
    del: jest.fn(),
  };
  const client = {
    options,
    enabled: true,
    withClient: (fn: (c: typeof ldap) => Promise<unknown>) => fn(ldap),
  } as unknown as LdapClientService;
  const mapping = new LdapMappingService(client);
  const service = new LdapIdentitiesService(client, mapping);
  return { ldap, mapping, service };
}

describe('LdapMappingService', () => {
  it('computes DN, object classes and attributes', async () => {
    const { mapping } = setup();
    const entry = await mapping.computeEntry(identity);

    expect(entry.dn).toBe('uid=jdoe,ou=people,dc=example,dc=org');
    expect(entry.objectClasses).toEqual(['top', 'inetOrgPerson', 'supannPerson']);
    expect(entry.attributes).toMatchObject({
      uid: ['jdoe'],
      cn: ['John Doe'],
      mail: [],
      employeeNumber: ['42'],
      departmentNumber: ['A', 'B'],
      supannCivilite: ['M.'],
    });
    expect(entry.match).toEqual({ attribute: 'employeeNumber', value: '42' });
  });

  it('escapes DN values and converts values', () => {
    expect(escapeDnValue('Doe, John')).toBe('Doe\\, John');
    expect(toLdapValues([1, '', null, true])).toEqual(['1', 'TRUE']);
  });
});

describe('computeLdapChanges', () => {
  it('adds missing object classes, replaces changed and deletes emptied attributes', () => {
    const changes = computeLdapChanges(
      {
        dn: 'uid=jdoe',
        objectClass: ['top', 'inetOrgPerson'],
        cn: 'Old',
        mail: 'old@x.org',
        departmentNumber: ['B', 'A'],
      },
      {
        dn: 'uid=jdoe',
        rdnAttribute: 'uid',
        objectClasses: ['top', 'inetOrgPerson', 'supannPerson'],
        attributes: { cn: ['John Doe'], mail: [], departmentNumber: ['A', 'B'], sn: [] },
      },
    );

    expect(changes.map((c) => `${c.operation}:${c.modification.type}`)).toEqual([
      'add:objectClass',
      'replace:cn',
      'delete:mail',
    ]);
  });
});

describe('LdapIdentitiesService', () => {
  it('adds the entry when it does not exist', async () => {
    const { ldap, service } = setup();
    ldap.search.mockRejectedValueOnce(new NoSuchObjectError()).mockResolvedValueOnce({ searchEntries: [] });

    const result = await service.execute(ActionType.IDENTITY_UPDATE, 'job1', identity);

    expect(result.status).toBe(0);
    expect(ldap.add).toHaveBeenCalledWith(
      'uid=jdoe,ou=people,dc=example,dc=org',
      expect.objectContaining({ objectClass: ['top', 'inetOrgPerson', 'supannPerson'], cn: ['John Doe'] }),
    );
    expect(ldap.add.mock.calls[0][1]).not.toHaveProperty('mail');
  });

  it('modifies the entry when it exists', async () => {
    const { ldap, service } = setup();
    ldap.search.mockResolvedValueOnce({
      searchEntries: [
        {
          dn: 'uid=jdoe,ou=people,dc=example,dc=org',
          objectClass: ['top', 'inetOrgPerson', 'supannPerson'],
          uid: 'jdoe',
          cn: 'Old',
        },
      ],
    });

    const result = await service.execute(ActionType.IDENTITY_UPDATE, 'job1', identity);

    expect(result.status).toBe(0);
    expect(ldap.add).not.toHaveBeenCalled();
    expect(ldap.modify).toHaveBeenCalledTimes(1);
  });

  it('renames the entry found by the match attribute', async () => {
    const { ldap, service } = setup();
    ldap.search
      .mockResolvedValueOnce({ searchEntries: [] })
      .mockResolvedValueOnce({ searchEntries: [{ dn: 'uid=old,ou=people,dc=example,dc=org' }] })
      .mockResolvedValueOnce({ searchEntries: [{ dn: 'uid=jdoe,ou=people,dc=example,dc=org', objectClass: ['top'] }] });

    const result = await service.execute(ActionType.IDENTITY_UPDATE, 'job1', identity);

    expect(result.data.ldap.output?.data).toMatchObject({ operation: 'rename+modify' });
    expect(ldap.modifyDN).toHaveBeenCalledWith(
      'uid=old,ou=people,dc=example,dc=org',
      'uid=jdoe,ou=people,dc=example,dc=org',
    );
  });

  it('deletes idempotently', async () => {
    const { ldap, service } = setup();
    ldap.search.mockResolvedValueOnce({ searchEntries: [{ dn: 'uid=jdoe,ou=people,dc=example,dc=org' }] });
    ldap.del.mockRejectedValueOnce(new NoSuchObjectError());

    const result = await service.execute(ActionType.IDENTITY_DELETE, 'job1', identity);

    expect(result.status).toBe(0);
    expect(result.data.ldap.output?.data).toMatchObject({ operation: 'absent' });
  });

  it('returns a worker error result on failure', async () => {
    const { ldap, service } = setup();
    ldap.search.mockRejectedValueOnce(new Error('connection refused'));

    const result = await service.execute(ActionType.IDENTITY_UPDATE, 'job1', identity);

    expect(result.status).toBe(1);
    expect(result.data.ldap.error?.message).toBe('connection refused');
  });
});

describe('LdapIdentitiesService (imported accounts)', () => {
  const imported = {
    inetOrgPerson: { uid: 'jdoe', cn: 'John Doe', sn: 'Doe', employeeType: 'LDAP', employeeNumber: ['1b2c-uuid'] },
  };

  it('finds imported accounts by entryUUID and modifies them in place, keeping RDN and LDAP identifiers', async () => {
    const { ldap, service } = setup();
    ldap.search.mockRejectedValueOnce(new NoSuchObjectError()).mockResolvedValueOnce({
      searchEntries: [
        { dn: 'cn=John Doe,ou=staff,dc=example,dc=org', objectClass: ['top', 'inetOrgPerson'], cn: 'Old', sn: 'Old' },
      ],
    });

    const result = await service.execute(ActionType.IDENTITY_UPDATE, 'job1', imported);

    expect(result.status).toBe(0);
    expect(ldap.search.mock.calls[1][1].filter.toString()).toBe('(entryUUID=1b2c-uuid)');
    expect(ldap.modifyDN).not.toHaveBeenCalled();
    expect(ldap.add).not.toHaveBeenCalled();
    const [dn, changes] = ldap.modify.mock.calls[0];
    expect(dn).toBe('cn=John Doe,ou=staff,dc=example,dc=org');
    const types = changes.map((c) => c.modification.type);
    expect(types).toContain('sn');
    expect(types).not.toContain('cn');
    expect(types).not.toContain('employeeNumber');
    expect(types).not.toContain('employeeType');
  });

  it('deletes imported accounts found by entryUUID', async () => {
    const { ldap, service } = setup();
    ldap.search
      .mockResolvedValueOnce({ searchEntries: [] })
      .mockResolvedValueOnce({ searchEntries: [{ dn: 'cn=John Doe,ou=staff,dc=example,dc=org' }] });

    await service.execute(ActionType.IDENTITY_DELETE, 'job1', imported);

    expect(ldap.del).toHaveBeenCalledWith('cn=John Doe,ou=staff,dc=example,dc=org');
  });
});

describe('LdapImportService', () => {
  function setupImport(count: number) {
    const { ldap, mapping } = setup();
    const entries = [
      {
        dn: 'uid=a,dc=example,dc=org',
        uid: 'a',
        cn: 'Alice A',
        mail: 'a@x.org',
        entryUUID: 'uuid-a',
        departmentNumber: ['D1'],
      },
      { dn: 'uid=b,dc=example,dc=org', uid: 'b', cn: 'Bob' },
    ];
    Object.assign(ldap, {
      searchPaginated: jest.fn(async function* () {
        yield { searchEntries: entries };
      }),
    });
    const identitiesService = {
      model: { estimatedDocumentCount: () => ({ exec: async () => count }) },
      create: jest.fn(async (data) => data),
      generateFingerprint: jest.fn(),
    };
    const client = (mapping as unknown as { client: LdapClientService }).client;
    const moduleRef = { get: () => identitiesService } as unknown as ModuleRef;
    return { service: new LdapImportService(moduleRef, client, mapping), identitiesService };
  }

  it('maps an LDAP entry to a synced identity with employeeType LDAP and employeeNumber = entryUUID', () => {
    const identity = ldapEntryToIdentity({ dn: 'x', uid: 'a', cn: 'Alice A', entryUUID: 'uuid-a' });

    expect(identity.inetOrgPerson).toMatchObject({
      uid: 'a',
      cn: 'Alice A',
      sn: 'Alice A',
      employeeType: 'LDAP',
      employeeNumber: ['uuid-a'],
    });
    expect(identity.inetOrgPerson.departmentNumber).toEqual(['LDAP']);
    expect(identity.state).toBe(IdentityState.SYNCED);
    expect(identity.lastBackendSync).toBeInstanceOf(Date);
  });

  it('imports accounts when the Sesame base is empty and skips unusable entries', async () => {
    const { service, identitiesService } = setupImport(0);

    const report = await service.importIfEmpty();

    expect(report).toEqual({ imported: 1, skipped: 1, errors: 0 });
    expect(identitiesService.create).toHaveBeenCalledTimes(1);
    expect(identitiesService.create.mock.calls[0][0].inetOrgPerson).toMatchObject({
      uid: 'a',
      mail: 'a@x.org',
      departmentNumber: ['D1'],
    });
  });

  it('creates identities inside a system request context (events and metadata need one)', async () => {
    const { service, identitiesService } = setupImport(0);
    const seen: unknown[] = [];
    identitiesService.create.mockImplementation(async (data) => {
      seen.push(RequestContext.currentContext?.req);
      return data;
    });

    await service.importIfEmpty();

    expect(seen[0]).toMatchObject({ path: '/management/identities', user: { username: 'ldap-import' } });
    expect(RequestContext.currentContext).toBeUndefined();
  });

  it('does nothing when identities already exist', async () => {
    const { service, identitiesService } = setupImport(3);

    expect(await service.importIfEmpty()).toBeNull();
    expect(identitiesService.create).not.toHaveBeenCalled();
  });
});

describe('LDAP import of additional fields', () => {
  const schemas = {
    sogxuser: {
      sogxquota: { type: 'number' },
      sogxdisableflag: { type: 'number' },
      proxyaddress: { type: 'array' },
    },
  };

  it('imports attributes of the schemas whose objectClass is on the entry, converted by type', () => {
    const fields = ldapEntryToAdditionalFields(
      {
        dn: 'x',
        objectClass: ['top', 'inetOrgPerson', 'sogxUser'],
        proxyAddress: ['a@x.org', 'b@x.org'],
        sogxdisableflag: '0',
      },
      schemas,
    );

    expect(fields).toEqual({
      objectClasses: ['sogxuser'],
      attributes: { sogxuser: { proxyaddress: ['a@x.org', 'b@x.org'], sogxdisableflag: 0 } },
    });
  });

  it('ignores schemas whose objectClass is absent', () => {
    expect(
      ldapEntryToAdditionalFields({ dn: 'x', objectClass: ['inetOrgPerson'], sogxdisableflag: '1' }, schemas),
    ).toEqual({
      objectClasses: [],
      attributes: {},
    });
  });

  it('converts scalar values', () => {
    expect(convertLdapValues(['12'], 'integer')).toBe(12);
    expect(convertLdapValues(['abc'], 'number')).toBeUndefined();
    expect(convertLdapValues(['TRUE'], 'boolean')).toBe(true);
    expect(convertLdapValues(['x', 'y'], 'string')).toBe('x');
    expect(convertLdapValues([], 'array')).toEqual([]);
  });
});
