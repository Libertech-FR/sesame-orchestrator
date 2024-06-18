import { Controller, Post, Body, Res, Logger, HttpStatus } from '@nestjs/common';
import { PasswdService } from './passwd.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AskTokenDto } from './dto/ask-token.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('passwd')
@ApiTags('management/passwd')
export class PasswdController {
  private readonly logger = new Logger(PasswdController.name);

  public constructor(private passwdService: PasswdService) { }

  @Post('change')
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Password has been successfully changed.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Old password wrong' })
  public async change(@Body() body: ChangePasswordDto, @Res() res: Response): Promise<Response> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, data] = await this.passwdService.change(body);
    this.logger.log(`Call passwd change for : ${body.uid}`);

    return res.status(HttpStatus.OK).json(data);
  }

  @Post('gettoken')
  @ApiOperation({ summary: 'Ask token for reseting password' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Token' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST })
  public async gettoken(@Body() asktoken: AskTokenDto, @Res() res: Response): Promise<Response> {
    this.logger.log('GetToken for : ' + asktoken.uid);
    const token = await this.passwdService.askToken(asktoken);

    return res.status(HttpStatus.OK).json({ token });
  }

  @Post('verifytoken')
  @ApiOperation({ summary: 'Ask token for reseting password' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST })
  public async verifyToken(@Body() body: VerifyTokenDto, @Res() res: Response): Promise<Response> {
    this.logger.log('Verify token : ' + body.token);
    const data = await this.passwdService.decryptToken(body.token);

    return res.status(HttpStatus.OK).json(data);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST })
  public async reset(@Body() body: ResetPasswordDto, @Res() res: Response): Promise<Response> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, data] = await this.passwdService.reset(body);
    return res.status(HttpStatus.OK).json(data);
  }
}
