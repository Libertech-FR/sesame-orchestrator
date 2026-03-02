import { Logger } from "@nestjs/common"
import { InjectConnection, InjectModel } from "@nestjs/mongoose"
import { Connection, Model } from "mongoose"
import { isNumber } from "radash"

export default class AgentsRoles1772186256 {
  private readonly logger = new Logger(AgentsRoles1772186256.name)

  public constructor(@InjectConnection() private mongo: Connection) {
  }

  public async up(): Promise<void> {
    this.logger.log('AgentsRoles1772186256 up started')

    await this._migrateAgentsRolesToDefaultAdminValue()
  }

  private async _migrateAgentsRolesToDefaultAdminValue(): Promise<void> {
    const agents = await this.mongo.collection('agents').find();

    for await (const agent of agents) {
      let roles = agent.roles;

      if (!roles || roles.length === 0 && agent.metadata.createdAt?.getTime() < 1772186256) {
        this.logger.log(`Migrating role for agent ${agent._id}`);


        this.mongo.collection('agents').updateOne(
          { _id: agent._id },
          {
            $set: {
              roles: ['admin'],
            }
          },
        );
      }
    }

    this.logger.log('Migration terminée avec succès');
  }
}
