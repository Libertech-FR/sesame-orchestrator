import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Request, Response } from 'express';

export default function swagger(app: NestExpressApplication) {
  const config = app.get<ConfigService>(ConfigService);
  const build = new DocumentBuilder()
    .setTitle('Sesame Orchestrator API')
    .setDescription('Sesame')
    .setVersion('0.1')
    .addTag('sesame-orchestrator')
    .addBearerAuth({ type: 'http', scheme: 'bearer' })
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
