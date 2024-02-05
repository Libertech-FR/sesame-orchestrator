import { Controller, Get, Res } from "@nestjs/common";
import { AppService } from "./app.service";
import { Response } from "express";
import { AbstractController } from "~/_common/abstracts/abstract.controller";

@Controller()
export class AppController extends AbstractController {
  constructor(private readonly appService: AppService) {
    super()
  }

  @Get()
  public getInfo(@Res() res: Response): Response {
    return res.json({
      ...this.appService.getInfo(),
    })
  }
}
