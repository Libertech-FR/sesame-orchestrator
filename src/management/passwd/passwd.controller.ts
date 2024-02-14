import { Controller, Post, Body, Res, UseGuards, Logger } from '@nestjs/common';
import { PasswdService } from './passwd.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { AskTokenDto } from './dto/ask-token.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('passwd')
@ApiTags('management')
export class PasswdController {
  private readonly logger = new Logger(PasswdController.name);

  constructor(private passwdService: PasswdService) {}

  @Post('change')
  @ApiOperation({ summary: 'change password' })
  @ApiResponse({
    status: 200,
    description: 'Password has been successfully changed.',
  })
  @ApiResponse({ status: 403, description: 'Old password wrong' })
  @ApiResponse({ status: 500, description: 'Backend error' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('api-key'))
  async change(@Body() cpwd: ChangePasswordDto, @Res() res: Response): Promise<Response> {
    const data = await this.passwdService.change(cpwd);
    console.log(data);
    data.data.uid = cpwd.uid;
    this.logger.log('call passwd change for : ' + cpwd.uid);
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
  @ApiBearerAuth()
  @UseGuards(AuthGuard('api-key'))
  async gettoken(@Body() asktoken: AskTokenDto, @Res() res: Response): Promise<Response> {
    this.logger.log('GetToken for : ' + asktoken.uid);
    const data = await this.passwdService.askToken(asktoken);
    const ret = { token: data };
    console.log(ret);
    return res.status(200).json(ret);
  }
  @Post('verifytoken')
  @ApiOperation({ summary: 'ask token for reseting password' })
  @ApiResponse({ status: 201, description: 'Token OK' })
  @ApiResponse({ status: 500, description: 'Token KO' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('api-key'))
  async verifyToken(@Body() token: VerifyTokenDto, @Res() res: Response): Promise<Response> {
    this.logger.log('Verify token : ' + token.token);
    const ok = await this.passwdService.verifyToken(token.token);
    console.log('reponse : ' + ok);
    if (ok === true) {
      console.log('reponse : 200');
      return res.status(200).json({ status: 0 });
    } else {
      return res.status(200).json({ status: 1 });
    }
  }
  @Post('reset')
  @ApiOperation({ summary: 'reset password' })
  @ApiResponse({ status: 200, description: 'Reset OK' })
  @ApiResponse({ status: 500, description: 'Reset KO' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('api-key'))
  async reset(@Body() data: ResetPasswordDto, @Res() res: Response): Promise<Response> {
    //this.logger.log('password reset : ' + data)
    const resetData = await this.passwdService.reset(data);
    //this.logger.log(resetData)
    if (resetData.status === 0) {
      return res.status(200).json(resetData);
    } else {
      return res.status(200).json({ status: 1, error: 'invalid token' });
    }
  }
}
