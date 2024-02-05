import { Injectable } from "@nestjs/common";
import { PackageJson } from "types-package-json";
import { ModuleRef } from "@nestjs/core";
import { readFileSync } from "fs";
import { AbstractService } from "~/_common/abstracts/abstract.service";
import { pick } from "radash";

@Injectable()
export class AppService extends AbstractService {
  protected package: Partial<PackageJson>;

  public constructor(protected moduleRef: ModuleRef) {
    super({ moduleRef })
    this.package = JSON.parse(readFileSync('package.json', 'utf-8'))
  }

  public getInfo(): Partial<PackageJson> {
    return pick(this.package, ['name', 'version'])
  }
}
