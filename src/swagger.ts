import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { readFileSync } from "fs";

export default function swagger(app: NestExpressApplication) {
  const config = app.get<ConfigService>(ConfigService);
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
  const build = new DocumentBuilder()
    .setTitle(pkg.name)
    .setDescription(pkg.description)
    .setVersion(pkg.version)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  const document = SwaggerModule.createDocument(app, build);
  SwaggerModule.setup(config.get<string>('swagger.path'), app, document, {
    ...config.get<SwaggerCustomOptions>('swagger.options'),
    explorer: true,
    swaggerOptions: {},
  });

  app.getHttpAdapter().get(config.get<string>('swagger.api'), (req: Request, res: Response) => {
    res.json(document);
  });
}
