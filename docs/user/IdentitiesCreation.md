
# Création et Modification d'Identité dans le Système


## Sommaire

- [Création et Modification d'Identité dans le Système](#création-et-modification-didentité-dans-le-système)
  - [Sommaire](#sommaire)
  - [Création d'Identité](#création-didentité)
    - [Endpoint pour la Création d'Identité](#endpoint-pour-la-création-didentité)
    - [Corps de la Requête (Body)](#corps-de-la-requête-body)
      - [Informations de Base (`inetOrgPerson`)](#informations-de-base-inetorgperson)
        - [Champs obligatoires :](#champs-obligatoires-)
        - [Champs facultatifs :](#champs-facultatifs-)
    - [Champs Additionnels](#champs-additionnels)
    - [Exemple de Corps de Requête](#exemple-de-corps-de-requête)
    - [Exemple de requete avec cUrl](#exemple-de-requete-avec-curl)
    - [États (`IdentityState`)](#états-identitystate)
    - [Gestion Automatique du `lifecycle`](#gestion-automatique-du-lifecycle)
  - [Réponse Attendue](#réponse-attendue)
- [Modification de l'identité](#modification-de-lidentité)


## Création d'Identité

Pour créer une identité dans le système, suivez les instructions ci-dessous. Ces instructions sont destinées à des utilisateurs ayant une certaine connaissance technique, notamment en matière de requêtes HTTP.

### Endpoint pour la Création d'Identité

**URL:** `/management/identities` : Adresse de l'endpoint pour la création d'identité.

**Méthode:** `POST` : Verbe HTTP utilisé pour créer une nouvelle ressource.

**Header Requis** : `Content-Type: application/json` : Indique que le corps de la requête est au format JSON.

### Corps de la Requête (Body)

Lors de la création d'une identité, le corps de la requête doit inclure les informations de base de l'identité (`inetOrgPerson`), ainsi que tout champ additionnel nécessaire selon l'`objectClass` spécifique. Notez que l'objet `inetOrgPerson` est validé en dur et non via un fichier YAML.

#### Informations de Base (`inetOrgPerson`)

Les informations de base de l'identité sont définies dans l'objet `inetOrgPerson`. Les champs requis sont `cn` (Nom Commun), `sn` (Nom de Famille), et `uid` (Identifiant Unique). Ces champs sont validés en dur.

##### Champs obligatoires :
- `cn`  
- `sn`
- `uid`

##### Champs facultatifs :
- `displayName`
- `facsimileTelephoneNumber`
- `givenName`
- `labeledURI`
- `mail`
- `mobile`
- `postalAddress`
- `preferredLanguage`
- `telephoneNumber`
- `title`
- `userCertificate`
- `userPassword`

### Champs Additionnels

Pour les champs additionnels, assurez-vous que les valeurs sont conformes aux attentes du système. Voici comment il se structure :

```json
{
  "additionalFields": {
    "objectClasses": [],
    "attributes": {}
  }
}
```

- `objectClasses` : Un tableau contenant les noms des `objectClasses` concernées. Par exemple, si vous attendez des informations supann, vous devez inclure une valeur `supann` en chaine de charactères dans ce tableau.

- `attributes` : Un objet contenant les attributs spécifiques à chaque `objectClass`. Par exemple, si vous attendez des informations supann, vous devez inclure un objet `supann` contenant les attributs spécifiques à cette `objectClass`.

ATTENTION : Les champs additionnels sont validés via des fichiers de configuration YAML spécifiques à chaque `objectClass`. Assurez-vous que les valeurs envoyées sont conformes à ces fichiers de configuration pour garantir le succès de la création de l'identité. Ces fichiers de configuration sont définis dans la documentation [Validation d'identité](https://libertech-fr.github.io/sesame-orchestrator/additional-documentation/documentation-utilisateur/validation-des-schemas-compl%C3%A9mentaires-de-l'identit%C3%A9.html) et doivent être nommés selon le nom de l'`objectClass` qu'ils définissent, par exemple `supann.yml` pour l'`objectClass` `supann`.

### Exemple de Corps de Requête

Voici un exemple de corps de requête pour la création d'une identité avec les informations minimales requises et un état (`state`) défini à `-1` pour indiquer une création :

```json
{
  "state": -1,
  "inetOrgPerson": {
    "cn": "Nom Commun",
    "sn": "Nom de Famille",
    "uid": "Identifiant Unique"
  },
  "additionalFields": {
    "objectClasses": ["supann"],
    "attributes": {
      "supann": {
        "supannEmpId": "123456",
        "supannCivilite": "M.",
        "supannBirthName": "Dupont",
        "supannBirthDate": "1980-12-15"
      }
    }
  }
}
```

### Exemple de requete avec cUrl

```bash
curl -X POST "http://<adresse-du-serveur>/identities" \
     -H "Content-Type: application/json" \
     -d '{
           "state": -1,
           "inetOrgPerson": {
             "cn": "Nom Commun",
             "sn": "Nom de Famille",
             "uid": "Identifiant Unique"
           },
           "additionalFields": {
             "objectClasses": ["supann"],
             "attributes": {
               "supann": {
                 "supannEmpId": "123456",
                 "supannCivilite": "M.",
                 "supannBirthName": "Dupont",
                 "supannBirthDate": "1980-12-15"
               }
             }
           }
         }'
```

### États (`IdentityState`)

Le state doit être défini à `-1` pour indiquer une création. Par la suite, le système gère automatiquement l'état de l'identité en fonction des actions de validations ou de syncronisation effectuées sur celle-ci.

### Gestion Automatique du `lifecycle`

Le cycle de vie de l'identité (`lifecycle`) est géré automatiquement par le système. Vous n'avez pas besoin de le spécifier dans votre requête.

## Réponse Attendue

En cas de succès, le système renvoie un statut `201 Created` avec les détails de l'identité créée. Si des informations supplémentaires sont requises, le statut peut être `202 Accepted` avec un message indiquant que des champs additionnels sont manquants ou invalides.

# Modification de l'identité

A venir.
