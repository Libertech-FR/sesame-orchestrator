import { IAccessInfo } from "nest-access-control"

export const AC_ADMIN_ROLE = 'admin'
export const AC_GUEST_ROLE = 'guest'

export const AC_INTERNAL_ROLE_PREFIX = 'interne_'
export const AC_INTERNAL_ROLE_LECTURE = 'interne_lecture'
export const AC_INTERNAL_ROLE_ECRITURE = 'interne_ecriture'
export const AC_INTERNAL_ROLE_GESTION = 'interne_gestion'

export const AC_DEFAULT_ROLES = [
  { name: AC_ADMIN_ROLE, displayName: 'Administrateur', description: 'Accès total au système.', inherits: [] },
  { name: AC_GUEST_ROLE, displayName: 'Invité', description: 'Accès minimal (base commune).', inherits: [] },
] as const

export const AC_INTERNAL_DEFAULT_ROLES = [
  { name: AC_INTERNAL_ROLE_LECTURE, displayName: 'Interne - Lecture', description: 'Lecture sur les ressources internes.', inherits: [AC_GUEST_ROLE] },
  { name: AC_INTERNAL_ROLE_ECRITURE, displayName: 'Interne - Écriture', description: 'Création / mise à jour sur les ressources internes.', inherits: [AC_INTERNAL_ROLE_LECTURE] },
  { name: AC_INTERNAL_ROLE_GESTION, displayName: 'Interne - Gestion', description: 'Gestion avancée (dont suppression) sur les ressources internes.', inherits: [AC_INTERNAL_ROLE_ECRITURE] },
] as const

export const AC_ALL_DEFAULT_ROLES = [
  ...AC_DEFAULT_ROLES,
  ...AC_INTERNAL_DEFAULT_ROLES,
] as const

export enum AC_ACTIONS {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum AC_POSSESSIONS {
  OWN = 'own',
  ANY = 'any',
}

export const AC_DEFAULT_POSSESSION = AC_POSSESSIONS.ANY

export const AC_INTERNAL_DEFAULT_ROLES_GRANTS: IAccessInfo[] = [
  // AC_INTERNAL_ROLE_LECTURE
  { role: AC_INTERNAL_ROLE_LECTURE, action: AC_ACTIONS.READ, resource: '/management/identities' },

  { role: AC_INTERNAL_ROLE_LECTURE, action: AC_ACTIONS.READ, resource: '/management/lifecycle' },

  // AC_INTERNAL_ROLE_ECRITURE
  { role: AC_INTERNAL_ROLE_ECRITURE, action: AC_ACTIONS.CREATE, resource: '/management/identities' },
  { role: AC_INTERNAL_ROLE_ECRITURE, action: AC_ACTIONS.UPDATE, resource: '/management/identities' },
  { role: AC_INTERNAL_ROLE_ECRITURE, action: AC_ACTIONS.DELETE, resource: '/management/identities' },

  { role: AC_INTERNAL_ROLE_ECRITURE, action: AC_ACTIONS.CREATE, resource: '/management/lifecycle' },
  { role: AC_INTERNAL_ROLE_ECRITURE, action: AC_ACTIONS.UPDATE, resource: '/management/lifecycle' },
  { role: AC_INTERNAL_ROLE_ECRITURE, action: AC_ACTIONS.DELETE, resource: '/management/lifecycle' },

  // AC_INTERNAL_ROLE_GESTION
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.READ, resource: '/core/agents' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.CREATE, resource: '/core/agents' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.UPDATE, resource: '/core/agents' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.DELETE, resource: '/core/agents' },

  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.READ, resource: '/core/audits' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.CREATE, resource: '/core/audits' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.UPDATE, resource: '/core/audits' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.DELETE, resource: '/core/audits' },

  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.READ, resource: '/core/cron' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.CREATE, resource: '/core/cron' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.UPDATE, resource: '/core/cron' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.DELETE, resource: '/core/cron' },

  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.READ, resource: '/core/jobs' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.CREATE, resource: '/core/jobs' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.UPDATE, resource: '/core/jobs' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.DELETE, resource: '/core/jobs' },

  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.READ, resource: '/settings/mailadm' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.CREATE, resource: '/settings/mailadm' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.UPDATE, resource: '/settings/mailadm' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.DELETE, resource: '/settings/mailadm' },

  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.READ, resource: '/settings/passwdadm' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.CREATE, resource: '/settings/passwdadm' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.UPDATE, resource: '/settings/passwdadm' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.DELETE, resource: '/settings/passwdadm' },

  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.READ, resource: '/settings/smsadm' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.CREATE, resource: '/settings/smsadm' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.UPDATE, resource: '/settings/smsadm' },
  { role: AC_INTERNAL_ROLE_GESTION, action: AC_ACTIONS.DELETE, resource: '/settings/smsadm' },
] as const
