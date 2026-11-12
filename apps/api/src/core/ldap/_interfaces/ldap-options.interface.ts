export interface LdapOptions {
  enabled: boolean;
  url: string;
  bindDN: string;
  bindPassword: string;
  baseDN: string;
  startTLS: boolean;
  tlsRejectUnauthorized: boolean;
  timeout: number;
  mappingFile: string;
  /** employeeType des identités importées (SESAME_LDAP_IMPORT_EMPLOYEE_TYPE, défaut LDAP) */
  importEmployeeType: string;
  /** departmentNumber par défaut des identités importées (SESAME_LDAP_IMPORT_DEFAULT_DEPARTMENT, défaut LDAP) */
  importDefaultDepartment: string;
}

/**
 * Entrée LDAP calculée à partir d'une identité
 */
export interface LdapComputedEntry {
  dn: string;
  rdnAttribute: string;
  objectClasses: string[];
  /** Attributs à écrire ; un tableau vide signifie « attribut à supprimer » */
  attributes: Record<string, string[]>;
  match?: { attribute: string; value: string } | null;
}
