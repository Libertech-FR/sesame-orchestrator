import {Logger} from "@nestjs/common";
import {CycleDeVieService} from "~/management/cyclevie/cycle-de-vie.service";

export class CycleDeVieController {
  private readonly logger = new Logger(CycleDeVieController.name);

  public constructor(
    private CycleDeVieService: CycleDeVieService
  ) {
  }



}
