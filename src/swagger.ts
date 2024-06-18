// import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';
import { Response } from 'express';
import { readFileSync } from 'fs';
// import { RedocModule } from 'nestjs-redoc';
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes';

export default async function swagger(app: NestExpressApplication) {
  const config = app.get<ConfigService>(ConfigService);
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  const build = new DocumentBuilder()
    .setTitle(pkg.name)
    .setDescription(pkg.description)
    .setVersion(pkg.version)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jwt')
    .addSecurityRequirements('jwt')

    .build();
  const document = SwaggerModule.createDocument(app, build);
  const theme = new SwaggerTheme();
  SwaggerModule.setup(config.get<string>('swagger.path'), app, document, {
    ...config.get<SwaggerCustomOptions>('swagger.options'),
    explorer: false,
    customSiteTitle: `Swagger <${pkg.name}>`,
    swaggerOptions: {
      persistAuthorization: true,
    },
    customCss: theme.getBuffer(SwaggerThemeNameEnum.ONE_DARK),
  });

  // await RedocModule.setup('swagger', app as any, document, {
  //   title: 'Hello Nest',
  //   logo: {
  //     url: 'https://redocly.github.io/redoc/petstore-logo.png',
  //     backgroundColor: '#F0F0F0',
  //     altText: 'PetStore logo'
  //   },
  //   sortPropsAlphabetically: true,
  //   hideDownloadButton: false,
  //   hideHostname: false,
  //   // auth: {
  //   //   enabled: true,
  //   //   user: 'admin',
  //   //   password: '123'
  //   // },
  //   // tagGroups: [
  //   //   {
  //   //     name: 'Core resources',
  //   //     tags: ['cats'],
  //   //   },
  //   // ],
  // })
  // Logger.warn(`Swagger is READY on <http://`)
  // const router = app.getHttpAdapter().getInstance()._router
  // console.log('app', router.stack[router.stack.length - 1])

  app.getHttpAdapter().get(config.get<string>('swagger.api'), (_, res: Response) => res.json(document));
}
