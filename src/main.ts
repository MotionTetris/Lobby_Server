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
  process.on('SIGINT', async () => {
    console.log('애플리케이션 종료 중...');
    await app.close();
    console.log('애플리케이션이 안전하게 종료되었습니다.');
    process.exit(0);
  });
  await app.listen(3000);
}
bootstrap();
