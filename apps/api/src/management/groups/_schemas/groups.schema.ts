import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { FilterGroups } from '~/_common/functions/filter-schema-groups.function';
import { MixedValue } from '~/_common/types/mixed-value.type';
import { historyPlugin } from '~/_common/plugins/mongoose/history.plugin';
import { IdentityState } from '~/management/identities/_enums/states.enum';

export type GroupsDocument = Groups & Document;

export enum GroupType {
  STATIC = 'static',
  DYNAMIC = 'dynamic',
  SUPER = 'super',
}

/**
 * Groupe d'identités, équivalent de l'objectClass LDAP `groupOfNames`.
 * L'appartenance est portée par le groupe (`member`), le `memberOf` d'une identité est calculé.
 * Pour un groupe dynamique, `member` est calculé à partir de `filters`.
 * Un supergroupe n'a pas de membres et n'est jamais synchronisé : il génère un groupe statique (enfant)
 * par valeur distincte de l'attribut `attribute` des identités, rattaché via `supergroup`.
 */
@Schema({ versionKey: false, minimize: false })
export class Groups extends AbstractSchema {
  @Prop({ type: String, required: true, unique: true, trim: true })
  public cn: string;

  @Prop({ type: String, default: null })
  public description?: string;

  @Prop({ type: String, default: null, trim: true, lowercase: true })
  public mail?: string;

  @Prop({ type: Types.ObjectId, ref: 'GroupFamilies', default: null })
  public family?: Types.ObjectId | null;

  @Prop({ type: String, enum: GroupType, default: GroupType.STATIC })
  public type: GroupType;

  /**
   * Filtre de sélection des membres d'un groupe dynamique, au format des clés signées
   * de `filters[...]` (ex: `{ "@state": ["1"], "^inetOrgPerson.employeeType": "/^etd/i" }`),
   * ou liste de tels filtres combinés par OU.
   * Le résultat de son évaluation est stocké dans `member`.
   */
  @Prop({ type: Object, default: null })
  public filters?: FilterGroups | null;

  /**
   * Chemin de l'attribut des identités (ex: `inetOrgPerson.departmentNumber`) à partir duquel
   * un supergroupe génère ses groupes enfants
   */
  @Prop({ type: String, default: null })
  public attribute?: string | null;

  /**
   * Supergroupe ayant généré ce groupe ; le groupe est alors géré automatiquement
   */
  @Prop({ type: Types.ObjectId, ref: 'Groups', default: null })
  public supergroup?: Types.ObjectId | null;

  @Prop({ type: [Types.ObjectId], ref: 'Identities', default: [] })
  public member: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'Identities', default: [] })
  public owner?: Types.ObjectId[];

  @Prop({ type: Number, enum: IdentityState, default: IdentityState.TO_SYNC })
  public state: IdentityState;

  @Prop({ type: Date, default: null })
  public lastBackendSync: Date;

  @Prop({ type: Object })
  public customFields?: { [key: string]: MixedValue };
}

export const GroupsSchema = SchemaFactory.createForClass(Groups)
  .plugin(historyPlugin, {
    collectionName: Groups.name,
  })
  .index({ member: 1 })
  .index({ family: 1 })
  .index({ type: 1 })
  .index({ supergroup: 1 });
