import { Controller, Post, Body, Res, UseGuards, Logger } from '@nestjs/common';
import { PasswdService } from './passwd.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { AskTokenDto } from './dto/ask-token.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('passwd')
@ApiTags('passwd')
export class PasswdController {
  private readonly logger = new Logger(PasswdController.name);

  public constructor(private passwdService: PasswdService) { }

  @Post('change')
  @ApiOperation({ summary: 'change password' })
  @ApiResponse({ status: 200, description: 'Password has been successfully changed.' })
  @ApiResponse({ status: 403, description: 'Old password wrong' })
  @ApiResponse({ status: 500, description: 'Backend error' })
  @UseGuards(AuthGuard('api-key'))
  public async change(@Body() cpwd: ChangePasswordDto, @Res() res: Response): Promise<Response> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, data] = await this.passwdService.change(cpwd);
    //TODO: uid ou employeeNumber ?
    data.data.uid = cpwd.id;
    this.logger.log(`call passwd change for : ${cpwd.id}`);

    if (data.data.status === 0) {
      return res.status(200).json(data);
    } else {
      if (data.data.status === 1) {
        return res.status(403).json(data);
      }
      return res.status(200).json(data);
    }
  }

  @Post('gettoken')
  @ApiOperation({ summary: 'ask token for reseting password' })
  @ApiResponse({ status: 200, description: 'Token', content: {} })
  @ApiResponse({ status: 500, description: 'Backend error' })
  @UseGuards(AuthGuard('api-key'))
  public async gettoken(@Body() asktoken: AskTokenDto, @Res() res: Response): Promise<Response> {
    this.logger.log('GetToken for : ' + asktoken.id);
    const data = await this.passwdService.askToken(asktoken);
    return res.status(200).json({ token: data });
  }

  @Post('verifytoken')
  @ApiOperation({ summary: 'ask token for reseting password' })
  @ApiResponse({ status: 201, description: 'Token OK' })
  @ApiResponse({ status: 500, description: 'Token KO' })
  @UseGuards(AuthGuard('api-key'))
  public async verifyToken(@Body() token: VerifyTokenDto, @Res() res: Response): Promise<Response> {
    this.logger.log('Verify token : ' + token.token);
    if (await this.passwdService.verifyToken(token.token)) {
      return res.status(200).json({ status: 0 });
    }
    return res.status(200).json({ status: 1 });
  }

  @Post('reset')
  @ApiOperation({ summary: 'reset password' })
  @ApiResponse({ status: 200, description: 'Reset OK' })
  @ApiResponse({ status: 500, description: 'Reset KO' })
  @UseGuards(AuthGuard('api-key'))
  public async reset(@Body() data: ResetPasswordDto, @Res() res: Response): Promise<Response> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, resetData] = await this.passwdService.reset(data);
    if (resetData.status === 0) {
      return res.status(200).json(resetData);
    }
    return res.status(200).json({ status: 1, error: 'invalid token' });
  }
}
