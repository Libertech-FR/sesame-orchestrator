
# Documentation Technique - Service de Validation des Identités

## Description
Ce document décrit le fonctionnement du service de validation des identités dans une application NestJS, en utilisant `yup` pour la validation des données.

## Services

### IdentitiesValidationService

#### Méthodes
- `validate(data: AdditionalFieldsPart): Promise<object>`
  - Valide les données fournies en utilisant des schémas de validation `yup`.
  - Les schémas de validation sont chargés à partir de fichiers de configuration YAML spécifiques à chaque classe d'objet.
  - En cas d'erreur de validation, une promesse rejetée est renvoyée avec les détails des erreurs.

#### Utilisation
```typescript
@Injectable()
class IdentitiesValidationService {
  async validate(data: AdditionalFieldsPart): Promise<object> {
    // ... Implémentation de la validation
  }

  private getValidator(type, required = false): yup.AnyObject {
    // ... Implémentation du sélecteur de validateur
  }

  async createSchema(attributes: ConfigObjectAttributeDTO[]): Promise<yup.ObjectSchema<any>> {
    // ... Création du schéma yup
  }
}
```

## Modèles

### AdditionalFieldsPart
- Représente les champs supplémentaires d'une identité.
- Utilisé par `IdentitiesValidationService` pour la validation.

### inetOrgPerson
- Représente une personne dans l'organisation.
- Défini avec des champs spécifiques comme `cn`, `sn`, `uid`, etc.

## Configuration

### Fichiers YAML
- Chaque classe d'objet a son fichier de configuration YAML correspondant.
- Exemple : `supann.yml` contient la configuration pour la classe d'objet `supannPerson`.

## Intégration avec Mongoose
- Les schémas Mongoose sont utilisés pour définir le modèle de données.
- Des hooks (`pre validate`, `pre save`) sont utilisés pour intégrer la validation `yup` dans le cycle de vie des documents Mongoose.

## Module

### IdentitiesModule
- Configure le schéma Mongoose et intègre le service de validation.
