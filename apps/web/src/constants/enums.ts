export enum IdentityState {
  SYNCED = 99,
  PROCESSING = 50,
  TO_SYNC = 2,
  TO_VALIDATE = 1,
  UNKNOWN = 0,
  TO_CREATE = -1,
  TO_COMPLETE = -2,
  ON_ERROR = -3,
  NO_SYNC = -99,
}

export enum IdentityLifecycle {
  ACTIVE = 'A',
  INACTIVE = 'I',
  DELETED = 'D',
}

export enum DataStatus {
  ACTIVE = 1,
  NOTINITIALIZED = 0,
  DELETED = -1,
  PASSWORDNEEDTOBECHANGED = -2,
  INACTIVE = -3,
}
