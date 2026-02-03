import { ApiProperty } from '@nestjs/swagger'
import { Type, Transform } from 'class-transformer'
import { IsArray, IsNotEmpty, IsNumber, IsObject, IsOptional, ValidateNested, registerDecorator, ValidationOptions, ValidationArguments, isString, isNumber, IsString } from 'class-validator'
import { IdentityLifecycleDefault } from '~/management/identities/_enums/lifecycle.enum'

/**
 * Convertit les valeurs de déclencheur temporel en secondes
 *
 * @param {number | string} value - La valeur de déclencheur à transformer
 * @returns {number | undefined} La valeur convertie en secondes, ou undefined si invalide
 *
 * @description Effectue les conversions suivantes :
 * - Nombres : interprétés comme des jours et convertis en secondes
 * - Chaînes avec suffixe 'd' : interprétés comme des jours et convertis en secondes
 * - Chaînes avec suffixe 'm' : interprétés comme des minutes et convertis en secondes
 * - Chaînes avec suffixe 's' : déjà en secondes, valeur numérique extraite
 *
 * @throws {Error} Si la valeur ne correspond pas aux formats attendus
 *
 * @example
 * transformTriggerToSeconds(90)      // retourne 7776000 (90 jours en secondes)
 * transformTriggerToSeconds('90d')   // retourne 7776000
 * transformTriggerToSeconds('10m')   // retourne 600
 * transformTriggerToSeconds('45s')   // retourne 45
 */
function transformTriggerToSeconds(value: number | string): number | undefined {
  let isValid = false

  if (value === undefined || value === null) {
    return undefined
  }

  if (value === -1) {
    isValid = true
    return -1
  }

  /**
   * Validation de la valeur :
   * - Pour les nombres : doit être supérieur ou égal à 0
   * - Pour les chaînes : doit correspondre au format '\d+[dms]' (nombre suivi de d, m ou s)
   */
  if (isNumber(value)) {
    isValid = value < 0
  } else if (isString(value)) {
    const timeRegex = /^\d+[dms]$/
    if (timeRegex.test(value)) {
      // Extraction de la partie numérique et vérification de sa validité
      const numberPart = value.replace(/[dms]$/, '')
      const num = parseInt(numberPart, 10)
      isValid = num > 0
    }
  }

  if (!isValid) {
    throw new Error('Le déclencheur doit être un nombre (jours) ou une chaîne temporelle avec unité (ex: "90d", "10m", "45s")')
  }

  /**
   * Conversion des nombres en secondes.
   * Les nombres sont interprétés comme des jours : jours * 24h * 60min * 60s
   * Le signe du nombre est préservé (négatif reste négatif)
   */
  if (isNumber(value)) {
    return value * 24 * 60 * 60 // Conversion jours → secondes avec préservation du signe
  }

  /**
   * Conversion des chaînes temporelles en secondes selon l'unité :
   * - 'd' (jours) : × 24 × 60 × 60
   * - 'm' (minutes) : × 60
   * - 's' (secondes) : valeur inchangée
   */
  if (isString(value)) {
    const match = value.match(/^(\d+)([dms])$/)
    if (match) {
      const numValue = parseInt(match[1], 10)
      const unit = match[2]

      switch (unit) {
        case 'd': // jours
          return numValue * 24 * 60 * 60

        case 'm': // minutes
          return numValue * 60

        case 's': // secondes
          return numValue

        default:
          throw new Error(`Unité de temps non supportée : ${unit}`)
      }
    }
  }

  // Tentative de conversion en nombre si aucun format ne correspond
  return Number(value) || undefined
}

/**
 * Décorateur de validation personnalisé pour s'assurer qu'au moins une propriété 'rules' ou 'trigger' est définie
 *
 * @param {ValidationOptions} [validationOptions] - Options de validation class-validator
 * @returns {Function} Décorateur de classe
 *
 * @description Ce décorateur de classe valide qu'au moins l'une des deux propriétés suivantes est présente :
 * - `rules` : un objet contenant au moins une paire clé-valeur
 * - `trigger` : un nombre défini et non nul
 *
 * Cette validation garantit qu'une règle de transition de cycle de vie possède soit
 * des règles de filtrage, soit un déclencheur temporel, ou les deux.
 *
 * @example
 * @ValidateRulesOrTrigger({ message: 'Au moins rules ou trigger doit être fourni' })
 * class MaClasse {
 *   rules?: object;
 *   trigger?: number;
 * }
 */
function ValidateRulesOrTrigger(validationOptions?: ValidationOptions) {
  return function (constructor: Function) {
    registerDecorator({
      name: 'validateRulesOrTrigger',
      target: constructor,
      propertyName: undefined,
      options: validationOptions,
      validator: {
        validate(_: any, args: ValidationArguments) {
          const obj = args.object as ConfigRulesObjectIdentitiesDTO

          /**
           * Vérification de la présence de 'rules' ou 'trigger' :
           * - 'rules' doit être un objet avec au moins une clé
           * - 'trigger' doit être un nombre défini et non nul
           */
          const hasRules = obj.rules !== undefined && obj.rules !== null && (typeof obj.rules === 'object' && Object.keys(obj.rules).length > 0)
          const hasTrigger = obj.trigger !== undefined && obj.trigger !== null
          return hasRules || hasTrigger
        },
        defaultMessage(_: ValidationArguments) {
          return 'Au moins rules ou trigger doit être fourni'
        }
      }
    })
  }
}

/**
 * DTO de configuration des règles de transition du cycle de vie des identités
 *
 * @class ConfigRulesObjectIdentitiesDTO
 * @description Définit une règle de transition automatique entre états de cycle de vie.
 * Une règle spécifie :
 * - Les états source depuis lesquels la transition peut se faire
 * - Les conditions de déclenchement (temporelles et/ou basées sur des règles)
 * - L'état cible de la transition
 * - Les mutations à appliquer lors de la transition
 *
 * @example
 * {
 *   sources: ['OFFICIAL'],
 *   dateKey: 'lastLifecycleUpdate',
 *   trigger: 90, // 90 jours
 *   target: 'MANUAL',
 *   mutation: { status: 'archived' }
 * }
 */
@ValidateRulesOrTrigger({ message: 'Au moins rules ou trigger doit être fourni' })
export class ConfigRulesObjectIdentitiesDTO {
  /**
   * États source du cycle de vie depuis lesquels cette règle peut s'appliquer
   *
   * @type {IdentityLifecycleDefault[]}
   * @description Liste des états de cycle de vie qui déclenchent cette règle.
   * Une identité doit être dans l'un de ces états pour que la règle soit évaluée.
   *
   * @example ['OFFICIAL', 'MANUAL']
   */
  @ApiProperty({
    type: String,
    enum: IdentityLifecycleDefault,
    description: 'États source du cycle de vie de l\'identité',
    example: IdentityLifecycleDefault.OFFICIAL,
    required: true,
  })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  public sources: IdentityLifecycleDefault[]

  /**
   * Clé de date utilisée pour calculer le déclencheur temporel
   *
   * @type {string}
   * @default 'lastLifecycleUpdate'
   * @description Nom du champ de date dans le document d'identité à utiliser
   * comme référence pour calculer le délai du trigger.
   *
   * @example 'lastLifecycleUpdate', 'createdAt', 'lastModified'
   */
  @IsOptional()
  @IsString()
  public dateKey: string = 'lastLifecycleUpdate'

  /**
   * Règles de filtrage conditionnelles pour l'application de la transition
   *
   * @type {object}
   * @description Objet de règles permettant de filtrer les identités éligibles.
   * Fonctionne comme une requête MongoDB pour sélectionner les documents concernés.
   *
   * @example { department: 'IT', status: { $ne: 'disabled' } }
   */
  @IsOptional()
  @IsObject()
  public rules: object

  /**
   * Mutations à appliquer lors de la transition d'état
   *
   * @type {object}
   * @description Objet définissant les modifications à apporter aux champs de l'identité
   * lors de l'exécution de la transition. Permet de mettre à jour des attributs en plus
   * du changement d'état.
   *
   * @example { archived: true, archivedDate: new Date() }
   */
  @IsOptional()
  @IsObject()
  public mutation: object

  /**
   * Déclencheur temporel de la transition en secondes
   *
   * @type {number}
   * @description Délai après lequel la transition doit s'exécuter, calculé depuis la date
   * spécifiée dans `dateKey`. Peut être fourni comme nombre (jours) ou chaîne avec unité.
   *
   * @example 90 (90 jours), '90d' (90 jours), '10m' (10 minutes), '45s' (45 secondes)
   */
  @IsOptional()
  @Transform(({ value }) => transformTriggerToSeconds(value))
  @IsNumber()
  @ApiProperty({
    oneOf: [
      { type: 'number', description: 'Nombre représentant des jours ou -1 pour le trigger depuis une tâche' },
      { type: 'string', description: 'Chaîne temporelle avec unité (d=jours, m=minutes, s=secondes)' }
    ],
    required: false,
    description: 'Déclencheur temporel en nombre (jours) ou chaîne avec unité, ou -1 pour le trigger depuis une tâche',
    examples: [90, '90d', '10m', '45s', -1]
  })
  public trigger: number

  /**
   * État cible du cycle de vie après la transition
   *
   * @type {IdentityLifecycleDefault}
   * @description État de cycle de vie vers lequel l'identité sera transitionnée
   * lorsque les conditions de la règle sont satisfaites.
   *
   * @example IdentityLifecycleDefault.MANUAL
   */
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    enum: IdentityLifecycleDefault,
    description: 'État cible du cycle de vie pour l\'identité',
    example: IdentityLifecycleDefault.MANUAL,
    required: true,
  })
  public target: IdentityLifecycleDefault
}

/**
 * DTO de schéma de configuration des règles de cycle de vie
 *
 * @class ConfigRulesObjectSchemaDTO
 * @description Conteneur principal pour l'ensemble des règles de transition de cycle de vie.
 * Structure la configuration globale en regroupant toutes les règles applicables aux identités.
 *
 * @example
 * {
 *   identities: [
 *     {
 *       sources: ['OFFICIAL'],
 *       trigger: 90,
 *       target: 'MANUAL'
 *     },
 *     {
 *       sources: ['MANUAL'],
 *       trigger: '30d',
 *       target: 'ARCHIVED'
 *     }
 *   ]
 * }
 */
export class ConfigRulesObjectSchemaDTO {
  /**
   * Collection des règles de transition de cycle de vie pour les identités
   *
   * @type {ConfigRulesObjectIdentitiesDTO[]}
   * @description Tableau contenant l'ensemble des règles de transition automatique
   * appliquées aux identités. Chaque règle définit une transition possible entre états.
   *
   * @example
   * [
   *   { sources: ['OFFICIAL'], trigger: 90, target: 'MANUAL' },
   *   { sources: ['MANUAL'], trigger: 30, target: 'ARCHIVED' }
   * ]
   */
  @IsOptional()
  @IsArray()
  @ApiProperty({
    type: ConfigRulesObjectIdentitiesDTO,
    required: false,
  })
  @ValidateNested({ each: true })
  @Type(() => ConfigRulesObjectIdentitiesDTO)
  public identities: ConfigRulesObjectIdentitiesDTO[]
}
