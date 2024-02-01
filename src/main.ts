import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import config from 'config';
import * as dotenv from 'dotenv';

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: config.Origin,
    credentials: true,
    // exposedHeaders:['Authorization'],
  });
  await app.listen(3000);
}
bootstrap();
