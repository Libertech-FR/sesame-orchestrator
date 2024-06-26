
# Documentation des Tests Jest et NestJS

## Table des matières
- [Documentation des Tests Jest et NestJS](#documentation-des-tests-jest-et-nestjs)
  - [Table des matières](#table-des-matières)
  - [Introduction](#introduction)
    - [Prérequis](#prérequis)
  - [Stubs](#stubs)
    - [Exemple](#exemple)
  - [Constantes](#constantes)
  - [Utilisation de MongoDbTestInstance](#utilisation-de-mongodbtestinstance)
    - [Fonctions](#fonctions)
    - [Constantes](#constantes-1)
    - [Exemple d'utilisation](#exemple-dutilisation)
  - [Mock du module et créer des modèles simulés avec `createMockModel`](#mock-du-module-et-créer-des-modèles-simulés-avec-createmockmodel)
    - [Exemple](#exemple-1)
  - [Assertions dans les tests](#assertions-dans-les-tests)
    - [Assertions findAndCount](#assertions-findandcount)
      - [Exemple](#exemple-2)
    - [Assertions findById](#assertions-findbyid)
      - [Exemple](#exemple-3)
    - [Assertions findOne](#assertions-findone)
      - [Exemple](#exemple-4)
    - [Assertions create](#assertions-create)
      - [Exemple](#exemple-5)
    - [Assertions update](#assertions-update)
      - [Exemple](#exemple-6)
    - [Assertions delete](#assertions-delete)
      - [Exemple](#exemple-7)
  - [Exemple complet d'un cas de test](#exemple-complet-dun-cas-de-test)
    - [Configuration du Test](#configuration-du-test)
  - [Test d'un controller CRUD](#test-dun-controller-crud)
    - [Vue d'ensemble](#vue-densemble)
    - [Fonction : `createMockService`](#fonction--createmockservice)
      - [But](#but)
      - [Paramètres](#paramètres)
      - [Retours](#retours)
      - [Exemple d'utilisation](#exemple-dutilisation-1)
  - [Références supplémentaires](#références-supplémentaires)

## Introduction
Ce document fournit des directives et des exemples pour tester les services NestJS en utilisant Jest et MongoDB Memory Server. Dans ce document, nous allons prendre comme exemple le service `IdentitiesService` et le modèle `Identities`.

Cette methode ne fonctionne que pour les services CRUD qui héritent d'`AbstractServiceSchema`.

### Prérequis
- Node.js
- NestJS
- Jest
- MongoDB Memory Server

## Stubs

Les stubs sont utilisés pour simuler des données dans les tests. Les stubs sont créés dans le dossier `stubs` au sein du module ou se trouve le test et sont utilisés dans les tests.

### Exemple
```typescript
import { IdentitiesUpdateDto } from './../_dto/identities.dto';
import { IdentitiesDto } from '~/management/identities/_dto/identities.dto';
import { IdentityLifecycle } from '~/management/identities/_enums/lifecycle.enum';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { additionalFieldsPartDtoStub } from './_parts/addtionalFields.dto.stub';
import { inetOrgPersonDtoStub } from './_parts/inetOrgPerson.dto.stub';

export const IdentitiesDtoStub = (): IdentitiesDto => {
  return {
    state: IdentityState.TO_CREATE,
    lifecycle: IdentityLifecycle.INACTIVE,
    inetOrgPerson: inetOrgPersonDtoStub(),
    additionalFields: additionalFieldsPartDtoStub(),
  };
};

export const IdentitiesUpdateDtoStub = (): IdentitiesUpdateDto => {
  const inetOrgPerson = inetOrgPersonDtoStub();
  inetOrgPerson.cn = 'updated-cn';
  return {
    state: IdentityState.TO_CREATE,
    lifecycle: IdentityLifecycle.INACTIVE,
    inetOrgPerson,
    additionalFields: additionalFieldsPartDtoStub(),
  };
};
```

Ici pour clarifier les données, nous avons déporté une partie des données dans des fichiers séparés stocké dans le dossier `_parts` du dossier `stubs`.

Voici un exemple de stub pour `inetOrgPersonDtoStub`:
```typescript
import { inetOrgPersonDto } from '~/management/identities/_dto/_parts/inetOrgPerson.dto';

export const inetOrgPersonDtoStub = (): inetOrgPersonDto => {
  return {
    cn: 'cn',
    sn: 'sn',
    uid: 'uid',
    employeeNumber: 'employeeNumber',
    employeeType: 'employeeType',
    displayName: 'displayName',
    facsimileTelephoneNumber: 'facsimileTelephoneNumber',
    givenName: 'givenName',
    labeledURI: 'labeledURI',
    mail: 'mail',
    mobile: 'mobile',
    postalAddress: 'postalAddress',
    preferredLanguage: 'preferredLanguage',
    telephoneNumber: 'telephoneNumber',
    title: 'title',
    userCertificate: 'userCertificate',
    userPassword: 'userPassword',
  };
};
```

## Constantes 
Les constantes suivantes sont utilisées dans les tests.
```typescript
describe('Identities Service', () => {
  let mongoDbTestInstance: MongoDbTestInstance;
  let service: IdentitiesService;
  let model: Model<Identities>;
  let identitiesModel: Model<Identities>;
  const _id = new Types.ObjectId();
  const newIdentityData = {
    _id,
    ...IdentitiesDtoStub(),
  };
  const updatedIdentityData = {
    _id,
    ...IdentitiesUpdateDtoStub(),
  };

  const options: QueryOptions<Identities> = {
    limit: 10,
    skip: 0,
    sort: {
      'metadata.createdAt': 'asc',
    },
  };
  const projection: ProjectionType<Identities> = {
    state: 1,
    inetOrgPerson: 1,
    additionalFields: 1,
  };
  const filter: FilterQuery<Identities> = {};
});
```


## Utilisation de MongoDbTestInstance
La classe `MongoDbTestInstance` est utilisée pour créer une instance MongoDB temporaire pour les tests.

### Fonctions
`start()` démarre une instance MongoDB temporaire pour les tests.

`stop()` arrête l'instance MongoDB temporaire.

`clearDatabase()` supprime toutes les données de la base de données temporaire.

`getModel()` crée un modèle Mongoose à partir d'un schéma Mongoose.


### Constantes
`mongod: MongoMemoryServer` est l'instance MongoDB temporaire.

`mongoConnection: Connection` est la connexion à l'instance MongoDB temporaire.

### Exemple d'utilisation
```typescript
beforeAll(async () => {
    mongoDbTestInstance = new MongoDbTestInstance();
    await mongoDbTestInstance.start();
    identitiesModel = await mongoDbTestInstance.getModel<Identities>(Identities.name, IdentitiesSchema);
});

afterEach(async () => {
    await mongoDbTestInstance.clearDatabase();
});

afterAll(async () => {
    await mongoDbTestInstance.stop();
});
```

## Mock du module et créer des modèles simulés avec `createMockModel`
`createMockModel` est utilisé pour simuler des modèles Mongoose pour les tests.

```typescript
function createMockModel<T>(model: Model<T>, stub, updatedStub?): Model<T>
```

`model` est le modèle Mongoose à simuler.

`stub` est le stub à utiliser pour simuler les données.

`updatedStub` est le stub à utiliser pour simuler les données mises à jour.

La fonction retourne un modèle Mongoose simulé.

### Exemple
```typescript
  beforeEach(async () => {
    model = createMockModel(identitiesModel, newIdentityData, updatedIdentityData);

    // Mock the module
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentitiesController],
      providers: [
        IdentitiesService,
        {
          provide: getModelToken(Identities.name),
          useValue: identitiesModel,
        },
        IdentitiesValidationService,
      ],
      imports: [IdentitiesValidationModule],
    }).compile();

    // Get the service
    service = module.get<IdentitiesService>(IdentitiesService);
  });
```

## Assertions dans les tests
Les fonctions fournies aident à affirmer diverses conditions dans les tests. Ces méthodes sont utilisables uniquement pour les services CRUD qui héritent d'`AbstractServiceSchema`.

### Assertions findAndCount
`findAndCountAssertions` vérifie la méthode de service `findAndCount`.

#### Exemple
```typescript
  describe('findAndCount', () => {
    it('should return an array of identities or throw an error', async () => {
      findAndCountAssertions<Identities>(service, model, filter, projection, options, newIdentityData);
      findAndCountErrorAssertions<Identities>(service, filter, projection, options);
    });
  });
```

### Assertions findById
`findByIdAssertions` vérifie la fonctionnalité de la méthode de service `findById`.

#### Exemple
```typescript
  describe('findById', () => {
    it('should return a single identity by id or throw an error', async () => {
      findByIdAssertions<Identities>(service, model, _id, projection, options, newIdentityData);
    });
    it('should return an empty array and count 0 documents', async () => {
      findByIdErrorAssertions<Identities>(service, _id, projection, options);
    });
  });
```

### Assertions findOne
`findOneAssertions` assure le bon fonctionnement de la méthode `findOne` du service.

#### Exemple
```typescript
  describe('findOne', () => {
    it('should return a single identity matching the filter or throw an error', async () => {
      findOneAssertions<Identities>(service, model, _id, projection, options, newIdentityData);
    });
    it('should throw a Notfound error', async () => {
      findOneErrorAssertions<Identities>(service, _id, projection, options);
    });
  });
```

### Assertions create
`createAssertions` teste la méthode `create` du service.

#### Exemple
```typescript
  describe('create', () => {
    it('should create and return a new identity or throw an error', async () => {
      createAssertions<Identities>(service, model, newIdentityData, newIdentityData);
    });
    it('should throw a Notfound error', async () => {
      createErrorAssertions<Identities>(service, newIdentityData);
    });
  });
```

### Assertions update
`updateAssertions` évalue la fonctionnalité `update`.

#### Exemple
```typescript
  describe('update', () => {
    it('should update and return an identity or throw an error', async () => {
      const updateData = {
        'field': 'updated-field',
      };
      const updateOptions: QueryOptions<Identities> & { rawResult: true } = {
        options: options,
        rawResult: true,
      };

      updateAssertions(service, model, _id, updateData, updateOptions, updatedIdentityData);
    });
    it('should throw a Notfound error', async () => {
      const updateData = {
        'field': 'updated-field',
      };
      const updateOptions: QueryOptions<Identities> & { rawResult: true } = {
        options: options,
        rawResult: true,
      };

      updateErrorAssertions(service, _id, updateData, updateOptions);
    });
  });
```

### Assertions delete
`deleteAssertions` évalue la méthode `delete` dans le service.

#### Exemple
```typescript
  describe('delete', () => {
    it('should delete and return the deleted identity or throw an error', async () => {
      deleteAssertions<Identities>(service, model, _id, options, newIdentityData);
    });
    it('should throw a Notfound error', async () => {
      deleteErrorAssertions<Identities>(service, _id, options);
    });
  });
```

## Exemple complet d'un cas de test
Un exemple de cas de test pour `IdentitiesService` en utilisant les méthodes ci-dessus.

### Configuration du Test
```typescript
beforeAll(async () => {
    mongoDbTestInstance = new MongoDbTestInstance();
    await mongoDbTestInstance.start();
    identitiesModel = await mongoDbTestInstance.getModel<Identities>(Identities.name, IdentitiesSchema);
});

beforeEach(async () => {
    model = createMockModel(identitiesModel, newIdentityData, updatedIdentityData);
    // Autres configurations de test
});

afterEach(async () => {
    await mongoDbTestInstance.clearDatabase();
    jest.clearAllMocks();
});

afterAll(async () => {
    await mongoDbTestInstance.stop();
});
```

## Test d'un controller CRUD
Cette documentation fournit un aperçu détaillé de la fonction utilitaire `createMockService`, conçue pour faciliter la création de services mock pour les besoins de test dans les applications TypeScript, en mettant un accent particulier sur celles utilisant Jest et NestJS. L'initiation du test est similaire à celle des tests de services au niveau du module et de l'instantiation de la base mongoDB.

### Vue d'ensemble
La fonction `createMockService` améliore dynamiquement la création de services mock, permettant de configurer un nombre arbitraire de comportements d'appel de méthode de manière dynamique. Elle simplifie le processus de configuration des implémentations mock pour les méthodes de service, supportant à la fois des valeurs fixes et des comportements dynamiques définis par des fonctions, y compris des comportements asynchrones basés sur des promesses et la gestion des erreurs.

### Fonction : `createMockService`

#### But

Générer une instance de service mock avec des méthodes simulées selon les comportements spécifiés, rationalisant le test de divers scénarios incluant le succès, l'échec, et les exceptions.

#### Paramètres

- **service** (`new (...args: any[]) => T`): Le constructeur de la classe de service à mocker. Ce paramètre prend une référence de classe que le service mock va imiter.

- **methodStubs** (`Record<string, any[] | any>`): Un objet où les clés représentent les noms des méthodes à mocker, et les valeurs sont les comportements à simuler pour ces méthodes. Ces comportements peuvent être spécifiés comme des valeurs uniques pour un comportement uniforme à travers les appels, des tableaux de valeurs pour définir des comportements séquentiels d'appels, des fonctions pour calculer dynamiquement les valeurs de retour, ou des instances de `Error` pour simuler des exceptions.

#### Retours

- **T**: Une instance mock de la classe de service (`T`), avec des méthodes simulées comme spécifié par le paramètre `methodStubs`.

#### Exemple d'utilisation

```typescript
service = createMockService<IdentitiesService>(IdentitiesService, {
  create: [
    () => Promise.resolve({ ...IdentitiesDtoStub(), _id, state: IdentityState.TO_VALIDATE }),
    () => Promise.resolve({ ...IdentitiesDtoStub(), _id, state: IdentityState.TO_COMPLETE }),
  ],
  findAndCount: [
    () => Promise.resolve([[{ ...IdentitiesDtoStub(), _id }], 1]),
    () => Promise.reject(new Error('Erreur')), // Fonction qui lance une erreur
  ],
  // Autres simulations de méthodes...
});
```

Dans cet exemple, la fonction `createMockService` est utilisée pour mocker un `IdentitiesService` avec des comportements spécifiques pour les méthodes `create`, `findAndCount`, et d'autres, démontrant comment gérer à la fois les opérations réussies et les erreurs.

**Importance de l'ordre des valeurs retournées** : Il est crucial de comprendre que l'ordre des valeurs retournées dans l'exemple a une importance significative car il correspondra à l'ordre des appels dans les tests. Cela signifie que le comportement simulé pour le premier appel sera le premier dans la liste, et ainsi de suite, permettant une simulation précise des scénarios de test.



## Références supplémentaires
Cette documentation couvre l'essentiel des tests des services NestJS en utilisant Jest. Pour plus d'informations détaillées, référez-vous à la documentation de Jest et NestJS.
- [Tests NestJS](https://docs.nestjs.com/fundamentals/testing)
- [Jest](https://jestjs.io/docs/en/getting-started)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Article sur les tests en  NestJS avec Mongo](https://betterprogramming.pub/testing-controllers-in-nestjs-and-mongo-with-jest-63e1b208503c)
