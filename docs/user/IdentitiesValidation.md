
# Documentation Utilisateur - Validation des Identités

## Introduction
Ce guide explique comment interagir avec le système de validation des identités dans notre application. Cette fonctionnalité assure que toutes les données relatives aux identités sont valides et conformes aux exigences de l'organisation.

## Validation des Données

### Résumé
Lorsque vous soumettez des données d'identité (par exemple, via un formulaire ou une API), le système effectue les vérifications suivantes :
- Tous les champs obligatoires sont présents.
- Les données correspondent aux types attendus (chaînes, nombres, dates, etc.).
- Les valeurs respectent les contraintes spécifiques (par exemple, formats d'email ou de téléphone).

### Données a passer
Pour valider les données, vous devez fournir :
Un fichier XML nommé selon le nom de l'objet à valider (par exemple, `supann.xml`).
Dans le json de la requête, vous devez fournir :
- Le champs "state" a -1 pour une creation
- l'object avec comme clé inetorgperson et comme valeur un objet contenant les champs a valider
- un objet "additionalFields" contenant deux champs :
- - "objectClasses" : un tableau de string contenant les objectClasses a ajouter a l'objet
- - "attributes" : un objet contenant les champs a ajouter a l'objet

Par exemple, pour valider un objet supann, vous devez fournir :
```json
{
    "state": -1,
    "inetorgperson": {
        "sn": "Doe",
        "uid": "John",
        "cn": "John Doe",
    },
    "additionalFields": {
        "objectClasses": ["supann"],
		"attributes":{
			"supann": {
				"supannEmpId": "123456",
                "supannCivilite": "Mr",
                "supannBirthName": "Doe"
            }
        }
    }
}
```

Avec comme fichier de configuration :
```yml
objectClasses:
  - name: supannPerson
    desc: 'SUPANN person object class'
    attributes:
      - supannEmpId
      - supannCivilite
      - supannBirthName

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
```


## Erreurs de Validation
En cas d'erreur de validation, le système vous fournira un retour détaillé sur les problèmes rencontrés. Cela peut inclure :
- Des champs manquants.
- Des données de type incorrect.
- Des violations de contraintes spécifiques.

## Conseils d'Utilisation
- Assurez-vous de fournir toutes les informations requises.
- Vérifiez que les données sont dans le bon format.
- En cas d'erreur, consultez le message de retour pour des corrections spécifiques.

## Contact
Pour toute question ou problème, veuillez contacter notre équipe de support technique.
