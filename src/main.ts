import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import ConfigInstance from './config'
import { LogLevel } from '@nestjs/common'

async function bootstrap() {
  const app = await NestFactory.create(AppModule,{logger: setLogLevel() as LogLevel[]});
  if ( process.env.production != "production"){
    require("./swagger").default(app)
  }
  await app.listen(3000);
}
bootstrap();


function setLogLevel():Array<string>{
  let loggerOptions=['error', 'warn','fatal']
  let configInstance=ConfigInstance()
  switch(configInstance['logLevel']){
    case 'fatal' :
      loggerOptions=['fatal']
      break;
    case 'error' :
      loggerOptions=['error','fatal']
      break;
    case 'warn':
      loggerOptions=['error', 'warn','fatal']
      break;
    case 'info' :
      loggerOptions=['error', 'warn','fatal','log','verbose']
      break;
    case 'debug' :
      loggerOptions=['error', 'warn','fatal','log','verbose','debug']
      break;
  }
  return loggerOptions
}