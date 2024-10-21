//status de l enregistrement pour le soft delete
//ACTIVE quand l'enregistrement est actif
//INACTIVE quand l' identité doit etre disable sur les backend
//DELETED : soft delete
export enum DataStatusEnum {
  ACTIVE = 1,
  INACTIVE = 0,
  DELETED = -1,
}
