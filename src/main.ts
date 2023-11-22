import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  if ( process.env.production != "production"){
    require("./swagger").default(app)
  }
  await app.listen(3000);
}
bootstrap();
