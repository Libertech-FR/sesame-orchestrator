import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import { UseRoles } from '~/_common/decorators/use-roles.decorator'
import { AC_ACTIONS, AC_DEFAULT_POSSESSION } from '~/_common/types/ac-types'
import { MailSendManyDto } from './_dto/mail-send-many.dto'
import { MailSendService } from './mail-send.service'

@Controller('mail')
@ApiTags('management/mail')
export class MailSendController {
  public constructor(private readonly mailSend: MailSendService) {}

  @Post('sendmany')
  @UseRoles({
    resource: '/management/mail',
    action: AC_ACTIONS.CREATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiOperation({ summary: 'Envoie un template mail à plusieurs identités' })
  @ApiResponse({ status: HttpStatus.OK })
  public async sendMany(@Body() body: MailSendManyDto, @Res() res: Response): Promise<Response> {
    const result = await this.mailSend.sendTemplateToIdentities({
      ids: (body.ids || []).map((id) => String(id)),
      template: body.template,
      variables: body.variables,
    })
    return res.status(HttpStatus.OK).json({ statusCode: HttpStatus.OK, data: result })
  }
}

