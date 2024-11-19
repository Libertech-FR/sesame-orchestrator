import { Logger } from "@nestjs/common"
import { InjectConnection, InjectModel } from "@nestjs/mongoose"
import { Connection, Model } from "mongoose"

export default class EmployeeNumber1700395200 {
  private readonly logger = new Logger(EmployeeNumber1700395200.name)

  public constructor(
    @InjectConnection() private mongo: Connection,
  ) {
  }

  public async up(): Promise<void> {
    this.logger.log('EmployeeNumber1700395200 up started')

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
      } else if (Array.isArray(employeeNumber)) {
        if (typeof employeeNumber[0] === 'number') {
          this.logger.log(`Migrating employeeNumber for identity ${identity._id}`);
          identity.inetOrgPerson.employeeNumber = employeeNumber.map(String);
          this.mongo.collection('identities').updateOne({ _id: identity._id }, { $set: { 'inetOrgPerson.employeeNumber': employeeNumber.map(String) } });
        }
      }
    }

    this.logger.log('Migration terminée avec succès');
  }
}
