import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class WebAuthnRegisterBeginDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, description: 'Nom affiché pour la clé (ex: “YubiKey bureau”)' })
  public name?: string;
}

export class WebAuthnRegisterFinishDto {
  @ApiProperty({ description: 'Réponse WebAuthn retournée par navigator.credentials.create()' })
  // On évite de lier le DTO aux types internes WebAuthn pour ne pas rendre le build fragile.
  public response: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, description: 'Nom affiché pour la clé (ex: “YubiKey bureau”)' })
  public name?: string;
}
