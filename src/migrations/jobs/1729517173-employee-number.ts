import { Logger } from "@nestjs/common"
import { InjectConnection, InjectModel } from "@nestjs/mongoose"
import { Connection, Model } from "mongoose"

export default class EmployeeNumber1729517173 {
  private readonly logger = new Logger(EmployeeNumber1729517173.name)

  public constructor(
    @InjectConnection() private mongo: Connection,
  ) {
  }

  public async up(): Promise<void> {
    this.logger.log('EmployeeNumber1729092660 up started')

    await this._migrateEmployeeNumberToArray()
  }

  private async _migrateEmployeeNumberToArray(): Promise<void> {
    const identities = await this.mongo.collection('identities').find();

    for await (const identity of identities) {
      const employeeNumber = identity.inetOrgPerson.employeeNumber;

      if (typeof employeeNumber === 'string') {
        this.logger.log(`Migrating employeeNumber for identity ${identity._id}`);
        identity.inetOrgPerson.employeeNumber = [employeeNumber];
        this.mongo.collection('identities').updateOne({ _id: identity._id }, { $set: { 'inetOrgPerson.employeeNumber': [employeeNumber] } });
      }
    }

    this.logger.log('Migration terminée avec succès');
  }
}
