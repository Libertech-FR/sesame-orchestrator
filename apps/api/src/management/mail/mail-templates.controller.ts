import { Body, Controller, Get, HttpStatus, Post, Res } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import { MailTemplatesService } from './mail-templates.service'

@Controller('mail/templates')
@ApiTags('management/mail')
export class MailTemplatesController {
  public constructor(private readonly mailTemplates: MailTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste les templates mails disponibles' })
  @ApiResponse({ status: HttpStatus.OK })
  public async list(@Res() res: Response): Promise<Response> {
    const templates = await this.mailTemplates.listTemplates()
    return res.status(HttpStatus.OK).json({ statusCode: HttpStatus.OK, data: templates })
  }

  @Get('config')
  @ApiOperation({ summary: 'Retourne la config mail_templates (variables possibles)' })
  @ApiResponse({ status: HttpStatus.OK })
  public async config(@Res() res: Response): Promise<Response> {
    const cfg = await this.mailTemplates.getMailTemplatesConfig()
    return res.status(HttpStatus.OK).json({ statusCode: HttpStatus.OK, data: cfg })
  }

  @Post('preview')
  @ApiOperation({ summary: 'Rend un template en HTML (preview)' })
  @ApiResponse({ status: HttpStatus.OK })
  public async preview(
    @Body()
    body: {
      template: string
      variables?: Record<string, unknown>
    },
    @Res() res: Response,
  ): Promise<Response> {
    const templateName = String(body?.template || '').trim()
    if (!templateName) {
      return res.status(HttpStatus.BAD_REQUEST).json({ statusCode: HttpStatus.BAD_REQUEST, message: 'Template requis' })
    }

    const html = await this.mailTemplates.renderPreviewHtml(templateName, body?.variables)
    return res.status(HttpStatus.OK).json({ statusCode: HttpStatus.OK, data: { html } })
  }
}

