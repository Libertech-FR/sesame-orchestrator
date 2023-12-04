# QueueProcessorService

## Vue d'ensemble
`QueueProcessorService` est une classe abstraite conçue pour fournir une configuration de base pour les services de traitement de files d'attente dans une application NestJS. Elle intègre des fonctionnalités de gestion de file d'attente en utilisant `bullmq` et Redis.

## Dépendances
- **ConfigService** : Service de `@nestjs/config` pour accéder aux variables de configuration.
- **Redis** : Client Redis pour interagir avec un serveur Redis.

## Propriétés
- `queue` (`Queue`) : Instance de `Queue` de `bullmq`, représentant la file d'attente à traiter.
- `queueEvents` (`QueueEvents`) : Instance de `QueueEvents` de `bullmq`, utilisée pour gérer les événements liés à la file d'attente.

## Constructeur
```typescript
public constructor(
  protected readonly config: ConfigService,
  protected readonly redis: Redis,
) {
  this.queue = new Queue(this.config.get('nameQueue'), {
    connection: this.redis,
  });
  this.queueEvents = new QueueEvents(this.config.get('nameQueue'), {
    connection: this.redis,
  });
}
```

## Paramètres
- ``config (ConfigService)``:  Service de configuration pour accéder aux variables de configuration de l'application.
- ``redis (Redis)``: Instance du client Redis pour se connecter au serveur Redis.

## Description
Initialise les propriétés ``queue`` et ``queueEvents`` en créant de nouvelles instances de ``Queue`` et ``QueueEvents``, en utilisant la configuration ``nameQueue`` pour le nom de la file d'attente et l'instance Redis pour la connexion.

## Méthodes
Ceci est une classe abstraite et n'implémente pas de méthodes. Les classes dérivées doivent implémenter une logique spécifique de traitement de file d'attente.

## Utilisation
Étendez cette classe dans les services qui nécessitent des capacités de traitement de file d'attente. Implémentez la logique de traitement des éléments dans la file d'attente dans le service étendu.

```ts
import Redis from 'ioredis';
import { InjectRedis } from 'nestjs-ioredis';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { QueueProcessorService } from './queue-processor.service';

@Injectable()
export class ExampleQueueService extends QueueProcessorService {
constructor(
    protected readonly configService: ConfigService,
    @InjectRedis() protected readonly redis: Redis,
)  {
        super(configService, redis);
   }

    async example(params: any) {
        const job = await this.queue.add('EXEMPLE', params);
        this.queueEvents.on('failed', (errors) => {
            console.log(errors);
        });
        return await job.waitUntilFinished(this.queueEvents, 30000);
    }
}
```