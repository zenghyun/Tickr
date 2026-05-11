import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);
  // 0.0.0.0 으로 바인딩해서 같은 네트워크의 모바일 디바이스(Expo Go)에서도 접근 가능
  await app.listen(port, '0.0.0.0');
  Logger.log(`API listening on http://0.0.0.0:${port}`, 'Bootstrap');
}
void bootstrap();
