import {Controller, Post, Body, Res, Logger, HttpStatus, Get} from '@nestjs/common';
import { PasswdadmService } from './passwdadm.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import {omit} from "radash";
import {InitAccountDto} from "~/management/passwd/_dto/init-account.dto";
import {PasswordPoliciesDto} from "~/settings/passwdadm/dto/password-policy.dto";


@Controller('passwd')
@ApiTags('settings/passwd')
export class PasswdadmController {
  private readonly logger = new Logger(PasswdadmController.name);

  public constructor(private passwdadmService: PasswdadmService) { }

  @Post('setpolicies')
  @ApiOperation({summary: 'enregistre la police de mdp'})
  @ApiResponse({status: HttpStatus.OK})
  public async setPolicies(@Body() body: PasswordPoliciesDto,@Res() res: Response): Promise<Response> {
    const data = await this.passwdadmService.setPolicies(body)
    //const datax=omit(data.toObject,['_id'])
    return res.status(HttpStatus.OK).json({data})
  }
  @Get('getpolicies')
  @ApiOperation({summary: 'Retourne la police de mot de passe'})
  @ApiResponse({status: HttpStatus.OK})
  public async getPolicies(@Res() res:Response):Promise<Response>{
    const test=await this.passwdadmService.getPolicies()
    return res.status(HttpStatus.OK).json(test)
  }
}
