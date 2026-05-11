import { Injectable } from '@nestjs/common';

export interface HealthResponse {
  status: 'ok';
  service: '@tickr/api';
  version: string;
  timestamp: string;
}

@Injectable()
export class AppService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: '@tickr/api',
      version: process.env.npm_package_version ?? '0.0.1',
      timestamp: new Date().toISOString(),
    };
  }
}
