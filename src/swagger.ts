import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";
export default function swagger(app){
    const config = new DocumentBuilder()
        .setTitle('Password manager')
        .setDescription('Change reset password')
        .setVersion('1.0')
        .addTag('passwd')
        .addBearerAuth({type: 'http',scheme : 'bearer'})
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
}
