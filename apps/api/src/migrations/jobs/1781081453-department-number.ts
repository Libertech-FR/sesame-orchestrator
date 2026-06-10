import { Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export default class DepartmentNumber1781081453 {
  private readonly logger = new Logger(DepartmentNumber1781081453.name);

  public constructor(@InjectConnection() private mongo: Connection) {}

  public async up(): Promise<void> {
    this.logger.log('DepartmentNumber1781081453 up started');

    await this._migrateDepartmentNumberToArray();
  }

  private async _migrateDepartmentNumberToArray(): Promise<void> {
    const identities = await this.mongo.collection('identities').find();

    for await (const identity of identities) {
      const departmentNumber = identity.inetOrgPerson?.departmentNumber;

      if (typeof departmentNumber === 'string') {
        this.logger.log(`Migrating departmentNumber for identity ${identity._id}`);
        await this.mongo
          .collection('identities')
          .updateOne({ _id: identity._id }, { $set: { 'inetOrgPerson.departmentNumber': [departmentNumber] } });
      } else if (Array.isArray(departmentNumber)) {
        if (typeof departmentNumber[0] === 'number') {
          this.logger.log(`Migrating departmentNumber for identity ${identity._id}`);
          await this.mongo
            .collection('identities')
            .updateOne(
              { _id: identity._id },
              { $set: { 'inetOrgPerson.departmentNumber': departmentNumber.map(String) } },
            );
        }
      }
    }

    this.logger.log('Migration terminée avec succès');
  }
}
