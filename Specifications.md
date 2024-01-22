# Cahier des charges pour le Projet Sésame

## Objectif du Projet
Le projet Sésame vise à développer une application open source de synchronisation d'identités, permettant de gérer la synchronisation entre différentes sources de données (bases de données, annuaires LDAP/Active Directory, applications tierces). Le système se compose de deux modules principaux, l'orchestrateur et le daemon. Et de scripts et projets tel que les backends de synchronisation et les interfaces utilisateur frontend pour la configuration et la manipulation des données.

## Schemas
  <iframe style="border: 1px solid rgba(0, 0, 0, 0.1);min-height: 750px;" width="1080" height="1350" src="https://www.figma.com/embed?embed_host=share&url=https%3A%2F%2Fwww.figma.com%2Ffile%2FOplQ0tHFHS5rFz5K6OCgEd%2FSesame%3Ftype%3Dwhiteboard%26node-id%3D0%253A1%26t%3DYRLiiC1pQyJ7uT2U-1" allowfullscreen></iframe>

## Fonctionnalités Principales
1. **Orchestrateur :**
  - Gestion de la synchronisation des identités stockés dans MongoDB.
  - Maintenance d'une base d'identités pour faciliter la synchronisation.
  - Configuration flexible des schémas additionnels.
  - Exposition d'entrypoints via une API REST avec des tokens JWT.
  - Gestion du cycle de vie des identités.

2. **Daemon :**
  - Déclenchement des scripts backend pour la synchronisation.
  - Utilisation de BullMQ et Redis pour la communication avec l'orchestrateur.

3. **Schémas d'Identité :**
  - Utilisation du schéma LDAP `NnetOrgPerson` comme base de stockage dans MongoDB.
  - Configuration possible de schémas additionnels pour une variabilité des champs dans chaque enregistrement.
  - Définition du typage, des règles, et de la présence des champs dans les identités.
  - Pré-intégration de schémas optionnels, notamment `Supann` et/ou `Renater`.

4. **Technologies Utilisées :**
  - Langages : NodeJS avec les frameworks NestJS et NuxtJS.
  - Communication daemon-Orchestrateur : BullMQ et Redis.
  - Authentification Orchestrateur : Comptes stockés dans MongoDB, possibilité de stocker les mots de passe dans un serveur tiers (OpenLDAP, ...).
  - Backends : Scripts système utilisant les sorties standards, indépendant du langage de l'application principale (Python, PowerShell, Perl, Bash, etc).

5. **Interfaces Utilisateur Frontend :**
  - Configuration de l'orchestrateur.
  - Manipulation et completion des données à synchroniser.
  - Gestion des schémas d'identité.
  - Affichage des logs.

## Exigences Techniques
1. **Sécurité :**
  - Toutes les communications doivent être sécurisées par des protocoles cryptographiques standards.
  - Gestion sécurisée des tokens JWT pour l'API REST de l'orchestrateur.
  - Mise en place de mécanismes de chiffrement appropriés pour les données sensibles.

2. **Extensibilité :**
  - Le système doit être conçu de manière modulaire pour permettre l'ajout aisé de nouveaux schémas d'identité et sources de données.

3. **Documentation :**
  - Une documentation exhaustive doit être fournie pour permettre aux développeurs, administrateurs système et utilisateurs de comprendre et utiliser efficacement l'application.

4. **Tests Automatisés :**
  - Les développements doivent être accompagnés de suites de tests automatisés pour garantir la stabilité et la fiabilité du système.

5. **Performance :**
  - Le système doit être optimisé pour gérer un grand nombre d'identités et de sources de données tout en maintenant des performances élevées.

## Livrables
1. **Code Source :**
  - L'ensemble du code source doit être bien commenté et respecter les normes de codage définies.
  - Le code doit être versionné et accessible à travers la plateforme de gestion de versions GitHub.

2. **Documentation Technique :**
  - Manuels d'installation et de configuration.
  - Guides d'utilisation pour les développeurs, administrateurs système et utilisateurs finaux.

3. **Tests Automatisés :**
  - Les résultats des tests automatisés doivent être fournis en accompagnement du code source.

## Planning
Le projet sera découpé en sprints avec des jalons précis pour chaque fonctionnalité. Les délais de livraison doivent être respectés, et tout écart significatif doit être justifié et discuté avec l'équipe de gestion de projet.
