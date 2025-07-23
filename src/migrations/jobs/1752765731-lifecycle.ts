import { Logger } from "@nestjs/common"
import { InjectConnection, InjectModel } from "@nestjs/mongoose"
import { Connection, Model } from "mongoose"

export default class LifeCycle1752765731 {
  private readonly logger = new Logger(LifeCycle1752765731.name)

  public constructor(
    @InjectConnection() private mongo: Connection,
  ) {
  }

  public async up(): Promise<void> {
    this.logger.log('LifeCycle1752765731 up started')

    await this._migrateLifeCycleToChar()
  }

  private async _migrateLifeCycleToChar(): Promise<void> {
    const identities = await this.mongo.collection('identities').find();

    for await (const identity of identities) {
      const lifecycle = identity.lifecycle;

      if (typeof lifecycle === 'number') {
        this.logger.log(`Migrating lifecycle for identity ${identity._id}`);

        switch (lifecycle) {
          case 0:
            identity.lifecycle = 'P'; // PROVISIONAL
            break;
          case 1:
            identity.lifecycle = 'A'; // ACTIVE
            break;
          case 2:
            identity.lifecycle = 'O'; // OFFICIAL
            break;
          case 3:
            identity.lifecycle = 'W'; // WAIT
            break;
          case -1:
            identity.lifecycle = 'I'; // INACTIVE
            break;
          case -2:
            identity.lifecycle = 'D'; // DELETED
            break;
          default:
            this.logger.warn(`Unknown lifecycle value ${lifecycle} for identity ${identity._id} ! Applying default ACTIVE`);
            identity.lifecycle = 'A'; // ACTIVE
            break;
        }

        this.mongo.collection('identities').updateOne(
          { _id: identity._id },
          {
            $set: {
              'inetOrgPerson.lifecycle': identity.lifecycle,
              ignoreLifecycle: false,
            }
          },
        );
      }
    }

    this.logger.log('Migration terminée avec succès');
  }
}
