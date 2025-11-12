import { Logger } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { Command, CommandRunner, SubCommand } from "nest-commander";
import { seedRequestContextId } from "~/contextId";
import { Identities } from "~/management/identities/_schemas/identities.schema";
import { IdentitiesUpsertService } from "~/management/identities/identities-upsert.service";


@SubCommand({ name: 'fingerprint' })
export class IdentitiesFingerprintCommand extends CommandRunner {
  private readonly logger = new Logger(IdentitiesFingerprintCommand.name);

  identitiesUpsertService: IdentitiesUpsertService

  public constructor(
    protected moduleRef: ModuleRef,
    // private readonly identitiesUpsertService: IdentitiesUpsertService,
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {
    const contextId = seedRequestContextId(this.moduleRef)
    this.identitiesUpsertService = await this.moduleRef.resolve(
      IdentitiesUpsertService,
      contextId,
    )

    console.log('Starting identities fingerprint update process...');
    const total = await this.identitiesUpsertService.count();
    console.log('Total identities to process:', total);
    this.logger.log(`Total identities: ${total}`);

    const identities = await this.identitiesUpsertService.find<Identities>() as unknown as Identities[];

    for await (const identity of identities) {
      this.logger.log(`Processing identity: ${identity._id}`);
      const fingerprint = await this.identitiesUpsertService.previewFingerprint(identity.toJSON());
      this.logger.log(`Identity: ${identity._id}, Fingerprint: ${fingerprint}, Old: ${identity.fingerprint}`);

      if (identity.fingerprint !== fingerprint) {
        this.logger.warn(`Updating fingerprint for identity: ${identity._id}`);
        await this.identitiesUpsertService.generateFingerprint(identity, fingerprint);
      } else {
        this.logger.log(`Fingerprint already up to date for identity: ${identity._id}`);
      }
    }
  }
}

@Command({ name: 'identities', arguments: '<task>', subCommands: [IdentitiesFingerprintCommand] })
export class IdentitiesCommand extends CommandRunner {
  public constructor(protected moduleRef: ModuleRef) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> { }
}
