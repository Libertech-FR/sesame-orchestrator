
# Documentation Technique - Service de Validation des Identités (Mise à Jour)

## Description
Cette documentation mise à jour décrit les améliorations apportées au service de validation des identités dans une application NestJS. Ce service utilise `yup` pour la validation des données et `ajv` pour gérer la validation des schémas JSON et YML. Les fichiers de configuration YML sont chargés dynamiquement et convertis en schémas `yup` pour valider les données utilisateur.

## Services

### IdentitiesValidationService

#### Modifications Clés
- Extraction de la logique de validation d'attributs dans une méthode privée `validateAttribute`, améliorant la lisibilité et la maintenabilité.
- Utilisation améliorée de la gestion des erreurs pour fournir des messages d'erreur spécifiques.
- Commentaires et annotations de type TypeScript ajoutés pour une meilleure compréhension et utilisation du type checking de TypeScript.

#### Méthodes
- `validate(data: AdditionalFieldsPart): Promise<object>`
  - Valide les données fournies en utilisant des schémas de validation `yup`.
  - Les schémas sont chargés à partir de fichiers YAML spécifiques à chaque classe d'objet.
  - Renvoie une promesse rejetée avec les détails des erreurs en cas d'échec de la validation.
- `private validateAttribute(key: string, attribute: any): Promise<string | null>`
  - Valide un attribut individuel.
  - Renvoie un message d'erreur spécifique ou `null` si la validation réussit.

#### Utilisation
```typescript
@Injectable()
class IdentitiesValidationService {
  async validate(data: AdditionalFieldsPart): Promise<object> {
    // ... Implémentation de la validation
  }

  private async validateAttribute(key: string, attribute: any): Promise<string | null> {
    // ... Implémentation de la validation d'un attribut individuel
  }
}
```

## Modèles

### AdditionalFieldsPart
- Représente les champs supplémentaires d'une identité.
- Utilisé par `IdentitiesValidationService` pour la validation.

### ConfigObjectSchemaDTO
- Nouveau modèle ajouté pour représenter les schémas de configuration des objets.

## Configuration

### Fichiers YAML
- Chaque classe d'objet a son fichier de configuration YAML correspondant.
- Ces fichiers sont utilisés pour générer des schémas de validation `yup`.

## Intégrations

### Intégration avec AJV
- AJV est utilisé pour compiler et valider les schémas JSON.
- Amélioration de la gestion des erreurs et des validations de schémas.

### Intégration avec Mongoose
- Les schémas Mongoose sont définis comme auparavant.
- La validation `yup` est intégrée dans le cycle de vie des documents Mongoose via des hooks (`pre validate`, `pre save`).

## Module

### IdentitiesModule
- Configure le schéma Mongoose et intègre le service de validation avec les améliorations apportées.
