import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { KisTokenCron } from './../src/kis/kis-token.cron';
import { KisTokenService } from './../src/kis/kis-token.service';
import { stubKisTokenCron, stubKisTokenService } from './helpers/kis-stubs';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(KisTokenService)
      .useValue(stubKisTokenService())
      .overrideProvider(KisTokenCron)
      .useValue(stubKisTokenCron())
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  afterEach(async () => {
    await app.close();
  });
});
