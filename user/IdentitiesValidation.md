
# Documentation du Système de Validation d'Identité

## Vue d'ensemble

Le système de validation d'identité utilise des fichiers de configuration YAML pour définir des règles de validation pour différents types d'objets d'identité. Chaque fichier YAML correspond à une `objectClass` spécifique et définit les attributs requis et leurs types pour cette classe.

## Fichiers de Configuration

Le fichier de configuration YAML doit être nommé selon le nom de l'`objectClass` qu'il définit, par exemple `supann.yml` pour l'`objectClass` `supannPerson`. Il doit être placé dans le dossier `TBD`.

### Exemple de Fichier YAML (`supann.yml`)

Ce fichier définit la structure et les attributs requis pour l'`objectClass` `supannPerson`.

```yaml
objectClasses:
  - name: supannPerson
    desc: 'SUPANN person object class'
    attributes:
      - supannEmpId
      - supannCivilite
      - supannBirthName
      # more attributes...

attributes:
  - name: supannEmpId
    desc: 'Employee ID'
    type: string

  - name: supannCivilite
    desc: 'Title (Mr, Ms, etc.)'
    type: string

  - name: supannBirthName
    desc: 'Birth name'
    type: string
    # more attributes...
```

### Exemple Générique de Fichier YAML

```yaml
objectClasses:
  - name: [Nom de l'ObjectClass]
    desc: '[Description de l'ObjectClass]'
    attributes:
      - [Nom de l'attribut 1]
      - [Nom de l'attribut 2]
      # plus d'attributs...

attributes:
  - name: [Nom de l'attribut 1]
    desc: '[Description de l'attribut]'
    type: [Type de l'attribut]
    required: [true/false]
    # plus de détails d'attributs...
```

## JSON de Validation

Pour valider une entrée, un objet JSON doit être fourni avec les champs suivants :

- `state`: État de l'entrée, -1 pour une création.
- `inetOrgPerson`: Informations générales de la personne.
- `additionalFields`: Contient `objectClasses` (un tableau de noms d'`objectClass`) et `attributes` (les attributs spécifiques pour chaque `objectClass`).

## Exemple

Voici un exemple de JSON à valider :

```json
{
  "state": -1,
  "inetOrgPerson": {
    // [Détails de inetOrgPerson]
  },
  "additionalFields": {
    "objectClasses": ["supann"],
    "attributes": {
      "supann": {
        // [Détails des attributs supann]
      }
    }
  }
}
```

## Remarques

Assurez-vous que le fichier YAML correspondant à votre `objectClass` est disponible et correctement configuré.

