import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { IAuthModuleOptions, PassportModule } from '@nestjs/passport';
import { HeaderApiKeyStrategy } from '~/core/auth/_strategies/auth-header-api-key.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AgentsModule } from '~/core/agents/agents.module';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { JwtStrategy } from '~/core/auth/_strategies/jwt.strategy';
import { LocalStrategy } from '~/core/auth/_strategies/local.strategy';

@Module({
  imports: [
    PassportModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        ...configService.get<IAuthModuleOptions>('passport.options', {}),
      }),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        ...configService.get<JwtModuleOptions>('jwt.options', {}),
      }),
    }),
    AgentsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, HeaderApiKeyStrategy, JwtStrategy, LocalStrategy],
})
export class AuthModule {}
