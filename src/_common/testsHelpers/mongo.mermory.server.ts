// test-mongo.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection } from 'mongoose';

export class MongoDbTestInstance {
  mongod: MongoMemoryServer;
  mongoConnection: Connection;

  async start() {
    this.mongod = await MongoMemoryServer.create({
      binary: {
        version: '5.0.22',
      },
    });
    const uri = await this.mongod.getUri();
    this.mongoConnection = (await connect(uri)).connection;
  }

  async stop() {
    await this.mongoConnection.dropDatabase();
    await this.mongoConnection.close();
    if (this.mongod) await this.mongod.stop();
  }

  async clearDatabase() {
    const collections = this.mongoConnection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }

  async getModel<T>(name: string, schema: any) {
    return this.mongoConnection.model<T>(name, schema);
  }
}
