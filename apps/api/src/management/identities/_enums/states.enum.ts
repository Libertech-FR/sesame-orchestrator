export enum IdentityState {
  SYNCED = 99,
  PROCESSING = 50,
  TO_SYNC = 2,
  TO_VALIDATE = 1,
  UNKNOWN = 0,
  TO_CREATE = -1,
  TO_COMPLETE = -2,
  ON_ERROR = -3,
  DONT_SYNC = -99,
}
