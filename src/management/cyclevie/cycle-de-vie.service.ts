import {AbstractService} from "~/_common/abstracts/abstract.service";
import {Injectable} from "@nestjs/common";

@Injectable()
export class CycleDeVieService extends AbstractService {
  public constructor() {
    super();
  }
}
