// API HTTP 클라이언트 — axios 인스턴스 + 인증 헤더 주입
// 모든 API 호출은 본 인스턴스를 경유한다 (queryFn 안에서 fetch 직접 호출 금지)
import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/shared/config/env';
import { storage } from '@/shared/lib/storage';

const ACCESS_TOKEN_KEY = 'tickr.accessToken';

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 — 액세스 토큰 자동 첨부
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await storage.get(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// 응답 인터셉터 — 표준 에러 구조로 변환
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // axios 에러는 그대로 throw — 호출처(mutation onError, query error)에서 처리
    // 401 자동 로그아웃은 W3 Auth 모듈에서 추가
    return Promise.reject(error);
  },
);

// 토큰 저장 헬퍼 (auth feature에서 사용)
export const tokenStorage = {
  key: ACCESS_TOKEN_KEY,
  get: () => storage.get(ACCESS_TOKEN_KEY),
  set: (token: string) => storage.set(ACCESS_TOKEN_KEY, token),
  clear: () => storage.remove(ACCESS_TOKEN_KEY),
};
