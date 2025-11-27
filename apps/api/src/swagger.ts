import { ConfigService } from '@nestjs/config'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger'
import { Response } from 'express'
import { readFileSync } from 'fs'
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes'

export default async function swagger(app: NestExpressApplication) {
  const config = app.get<ConfigService>(ConfigService)
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))

  const build = new DocumentBuilder()
    .setTitle(pkg.name)
    .setDescription(pkg.description)
    .setVersion(pkg.version)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jwt')
    .addSecurityRequirements('jwt')

    .build()

  const document = SwaggerModule.createDocument(app, build)
  const theme = new SwaggerTheme()

  SwaggerModule.setup(config.get<string>('swagger.path'), app, document, {
    ...config.get<SwaggerCustomOptions>('swagger.options'),
    explorer: false,
    customSiteTitle: `Swagger <${pkg.name}>`,
    swaggerOptions: {
      persistAuthorization: true,
    },
    customCss: theme.getBuffer(SwaggerThemeNameEnum.ONE_DARK),
  })

  app.getHttpAdapter().get(config.get<string>('swagger.api'), (_, res: Response) => res.json(document))
}
