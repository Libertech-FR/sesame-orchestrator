export enum IdentityState {
  SYNCED = 99,
  PROCESSING = 50,
  TO_SYNC = 2,
  TO_VALIDATE = 1,
  UNKNOWN = 0,
  TO_CREATE = -1,
  TO_COMPLETE = -2,
  ON_ERROR = -3,
}

export enum IdentityLifecycle {
  WAIT = "W",
  OFFICIAL = "O",
  ACTIVE = "A",
  PROVISIONAL = "P",
  INACTIVE = "I",
  DELETED = "D",

  // IMPORTED = 3,
  // OFFICIAL = 2,
  // ACTIVE = 1,
  // PROVISIONAL = 0,
  // INACTIVE = -1,
  // DELETED = -2,
}
