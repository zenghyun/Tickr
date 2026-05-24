// AuthUser 타입 + Express Request 모듈 augment.
// d.ts가 아닌 일반 ts 파일에 두어 빌드 도구 호환성 확보 (한 번이라도 import되면 글로벌 적용).
// `as` 타입 단언 금지 룰 준수.

export interface AuthUser {
  id: string; // Supabase auth.users.id (UUID, JWT sub claim)
  email?: string; // OAuth provider 또는 이메일 가입에서 추출
  role?: string; // Supabase 기본 'authenticated'
}

declare module 'express' {
  interface Request {
    user?: AuthUser;
  }
}
