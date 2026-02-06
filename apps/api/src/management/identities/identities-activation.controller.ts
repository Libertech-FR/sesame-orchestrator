import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { IdentitiesActivationService } from '~/management/identities/identities-activation.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ActivationDto } from '~/management/identities/_dto/_parts/activation-dto';
import { DataStatusEnum } from "~/management/identities/_enums/data-status";

/**
 * Contrôleur pour la gestion de l'activation/désactivation des identités
 * Permet de modifier le statut des identités entre ACTIVE et INACTIVE
 */
@ApiTags('management/identities')
@Controller('identities')
export class IdentitiesActivationController extends AbstractController {
  /**
   * Constructeur du contrôleur d'activation des identités
   *
   * @param _service - Service d'activation des identités
   */
  public constructor(protected readonly _service: IdentitiesActivationService) {
    super();
  }

  /**
   * Active ou désactive une identité selon le paramètre status
   *
   * @param res - Objet de réponse Express
   * @param body - Données contenant l'ID de l'identité et le statut souhaité
   * @returns Réponse HTTP avec le résultat de l'opération
   */
  @Post('activation')
  @ApiOperation({ summary: 'Active ou désactive une identité' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Identité activée/désactivée avec succès'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Erreur de validation ou identité introuvable'
  })
  public async activation(
    @Res() res: Response,
    @Body() body: ActivationDto,
  ): Promise<Response> {
    try {
      const result = await this._service.activation(body.id, body.status)

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: `Identity ${body.status === DataStatusEnum.ACTIVE ? 'activated' : 'deactivated'} successfully`,
        data: result,
      });

    } catch (error) {
      // Gestion différenciée des erreurs selon leur type
      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      let message = 'Internal server error';

      if (error.status) {
        // Erreur HTTP avec status défini (BadRequestException, HttpException, etc.)
        statusCode = error.status;
        message = error.message || error.response?.message || 'Request failed';
      } else if (error.message) {
        // Autres erreurs avec message
        statusCode = HttpStatus.BAD_REQUEST;
        message = error.message;
      }

      return res.status(statusCode).json({
        statusCode,
        message,
      });
    }
  }
}
