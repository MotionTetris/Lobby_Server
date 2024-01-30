import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import config from 'config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: config.Origin,
    credentials: true,
    // exposedHeaders:['Authorization'],
  });
  await app.listen(3000);
}
bootstrap();
