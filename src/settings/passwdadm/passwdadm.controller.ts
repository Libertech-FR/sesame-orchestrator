import {Controller, Post, Body, Res, Logger, HttpStatus, Get} from '@nestjs/common';
import { PasswdadmService } from './passwdadm.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import {omit} from "radash";


@Controller('passwd')
@ApiTags('settings/passwd')
export class PasswdadmController {
  private readonly logger = new Logger(PasswdadmController.name);

  public constructor(private passwdadmService: PasswdadmService) { }

}
