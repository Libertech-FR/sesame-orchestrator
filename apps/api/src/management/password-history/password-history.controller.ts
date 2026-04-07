import { Controller, Get, HttpStatus, Param, Res } from '@nestjs/common'
import { ApiParam, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import { Types } from 'mongoose'
import { ObjectIdValidationPipe } from '~/_common/pipes/object-id-validation.pipe'
import { UseRoles } from '~/_common/decorators/use-roles.decorator'
import { AC_ACTIONS, AC_DEFAULT_POSSESSION } from '~/_common/types/ac-types'
import { PasswordHistoryService } from './password-history.service'
import { PasswdadmService } from '~/settings/passwdadm.service'

@ApiTags('management/password-history')
@Controller('password-history')
export class PasswordHistoryController {
  public constructor(
    private readonly passwordHistoryService: PasswordHistoryService,
    private readonly passwdadmService: PasswdadmService,
  ) {}

  @Get(':identityId([0-9a-fA-F]{24})')
  @UseRoles({
    resource: '/management/password-history',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: 'identityId', type: String })
  public async listForIdentity(
    @Param('identityId', ObjectIdValidationPipe) identityId: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const policies: any = await this.passwdadmService.getPolicies()
    if (!policies?.passwordHistoryEnabled) {
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: [],
        message: 'Historique des mots de passe désactivé par la politique',
      })
    }

    const historyCount = Number(policies?.passwordHistoryCount || 0)
    const limit = Number.isFinite(historyCount) && historyCount > 0 ? historyCount : 0

    const rows = limit
      ? await this.passwordHistoryService.model
          .find({ identityId })
          .sort({ createdAt: -1 })
          .limit(limit)
          .select({
            _id: 1,
            createdAt: 1,
            expiresAt: 1,
            source: 1,
            hibpLastCheckAt: 1,
            hibpPwnCount: 1,
            hibpSha1Enc: 1,
          })
          .lean()
      : []

    const safeRows = (rows || []).map((row: any) => {
      const hasHibpFingerprint = !!row?.hibpSha1Enc
      const { hibpSha1Enc: _hibpSha1Enc, ...rest } = row || {}
      return { ...rest, hasHibpFingerprint }
    })

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: safeRows,
      total: safeRows.length,
    })
  }
}

