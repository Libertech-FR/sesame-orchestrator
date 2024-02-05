import { Controller } from "@nestjs/common";
import { AgentsService } from "./agents.service";
import { AbstractController } from "~/_common/abstracts/abstract.controller";

@Controller("agents")
export class AgentsController extends AbstractController {
  constructor(private readonly service: AgentsService) {
    super();
  }
}
