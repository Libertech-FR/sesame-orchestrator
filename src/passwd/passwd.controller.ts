import {Controller, Post, Body, Res, UseGuards, Logger} from '@nestjs/common';
import { PasswdService } from './passwd.service';
import {
    ApiTags,
    ApiOperation,
    ApiResponse, ApiBearerAuth
} from '@nestjs/swagger';
import { Response } from 'express';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthGuard } from '@nestjs/passport';


@Controller('passwd')
@ApiTags('passwd')
export class PasswdController {
    private readonly logger = new Logger(PasswdController.name);
  constructor(private passwdService: PasswdService) {
  }
  @Post()
  @ApiOperation({ summary: 'change password' })
  @ApiResponse({ status: 201, description: 'Password has been successfully changed.'})
  @ApiResponse({ status: 403, description: 'Old password wrong'})
  @ApiResponse({ status: 500, description: 'Backend error'})
  @ApiBearerAuth()
  @UseGuards(AuthGuard("api-key"))
  async change(@Body() cpwd: ChangePasswordDto,@Res() res: Response): Promise<Response>{
       const data= await this.passwdService.change(cpwd)
       console.log(data)
       data.data.uid=cpwd.uid
      if ( data.data.status === 0){
            return res.status(201).json(data);
        }else{
          if (data.data.status === 1){
              return res.status(403).json(data);
          }
          return res.status(201).json(data);
        }
  }
}
