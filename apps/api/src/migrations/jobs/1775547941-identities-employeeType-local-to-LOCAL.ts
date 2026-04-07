import { Logger } from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import { Connection } from 'mongoose'

export default class IdentitiesEmployeeTypeLocalToLOCAL1775547941 {
  private readonly logger = new Logger(IdentitiesEmployeeTypeLocalToLOCAL1775547941.name)

  public constructor(@InjectConnection() private mongo: Connection) {}

  public async up(): Promise<void> {
    this.logger.log('IdentitiesEmployeeTypeLocalToLOCAL1775547941 up started')

    const identitiesCollection = this.mongo.collection('identities')

    // Important: on ne peut pas faire updateMany(local->LOCAL) avant de réallouer employeeNumber,
    // sinon on peut violer l'index unique (employeeNumber, employeeType).
    const cursor = identitiesCollection
      .find({
        'inetOrgPerson.employeeType': "local",
      })
      .project({ _id: 1 })
      .sort({ _id: 1 })

    const toMigrate = await identitiesCollection.countDocuments({
      'inetOrgPerson.employeeType': "local",
    })
    this.logger.log(`Identities matched for migration: ${toMigrate}`)

    let migrated = 0
    let failed = 0
    for await (const doc of cursor) {
      try {
        const newNumber = await this.allocateNextEmployeeNumber()
        await identitiesCollection.updateOne(
          { _id: doc._id },
          {
            $set: {
              'inetOrgPerson.employeeType': 'LOCAL',
              'inetOrgPerson.employeeNumber': [String(newNumber)],
            },
          },
        )
        migrated += 1
      } catch (e: any) {
        failed += 1
        this.logger.error(`Failed to migrate identity <${doc._id}>: ${e?.message || e}`)
      }
    }

    this.logger.log(`EmployeeType migration done (migrated=${migrated}, failed=${failed})`)

    this.logger.log('Migration terminée avec succès')
  }

  /**
   * Réattribue un nouvel employeeNumber aux identités migrées, en utilisant la même source de vérité
   * que l'auto-incrément Mongoose: la collection `identitycounters`.
   *
   * On fait un `findOneAndUpdate($inc)` par identité, ce qui garantit l'unicité et évite
   * toute approximation (max en base / overflow / compteur en retard).
   */
  private async allocateNextEmployeeNumber(): Promise<number> {
    const counters = this.mongo.collection('identitycounters')
    const filter = { field: 'inetOrgPerson.employeeNumber', modelName: 'Identities' }
    const opts: any = { upsert: true, returnDocument: 'after', returnOriginal: false }

    // MongoDB interdit de modifier le même champ dans $setOnInsert et $inc dans la même requête.
    // On s'assure d'abord que le document compteur existe, puis on incrémente.
    await counters.updateOne(
      filter,
      {
        $setOnInsert: {
          ...filter,
          // Mimics AutoIncrementPlugin initialization for startAt=1, incrementBy=1
          count: 0,
        },
      },
      { upsert: true },
    )

    const counter = await counters.findOneAndUpdate(filter, { $inc: { count: 1 } }, opts)

    const counterDoc = counter?.value || (await counters.findOne(filter))
    const allocated = Number(counterDoc?.count)
    if (!Number.isFinite(allocated) || allocated <= 0) {
      throw new Error(`Failed to allocate employeeNumber (allocated=${allocated})`)
    }
    return allocated
  }
}

