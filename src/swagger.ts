import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";
export default function swagger(app){
    const config = new DocumentBuilder()
        .setTitle('Sesame Orchestrator API')
        .setDescription('Sesame')
        .setVersion('0.1')
        .addTag('sesame-orchestrator')
        .addBearerAuth({type: 'http',scheme : 'bearer'})
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
}
