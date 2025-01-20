//status de l enregistrement pour le soft delete
//ACTIVE quand l'enregistrement est actif
//INACTIVE quand l' identité doit etre disable sur les backend
//DELETED : soft delete
export enum DataStatusEnum {
  ACTIVE = 1,
  NOTINITIALIZED = 0,
  DELETED = -1,
  PASSWORDNEEDTOBECHANGED=-2,
  INACTIVE = -3,
}
