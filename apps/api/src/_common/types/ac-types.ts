export const AC_ADMIN_ROLE = 'admin'
export const AC_GUEST_ROLE = 'guest'

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
