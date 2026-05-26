// 인증(auth) 도메인 스키마 — 이메일/비밀번호 기반 로그인·회원가입
// (.claude/rules/monorepo-boundary.md) — FE 폼 검증 + BE/RPC 입력 검증 양쪽에서 재사용.
//
// 단일 출처 원칙:
//   - 비밀번호 정책(길이/형식)을 여기서만 정의. mobile RHF zodResolver와 NestJS pipe가 동일 스키마로 검증.
//   - 핸드폰 본인인증(phone)은 별도 이슈 #43에서 signupBodySchema에 phone 필드 추가 예정.
//
// 보안 메모:
//   - email은 transform으로 trim + lowercase 정규화(Supabase는 소문자 비교).
//   - password는 절대 transform 금지(공백/대소문자 의미 있는 입력값). 검증만.
//   - bcrypt 한도(72byte) 이상은 잘리는 사일런트 버그가 있어 max 72.
import { z } from 'zod';

// 로그인 — Supabase 기본 정책(6자) 호환. 기존 가입자가 로그인 못 하는 일이 없도록 가입 정책보다 느슨.
export const loginBodySchema = z.object({
  email: z.string().trim().toLowerCase().email('올바른 이메일 형식이 아닙니다'),
  password: z
    .string()
    .min(6, '비밀번호는 최소 6자 이상이어야 합니다')
    .max(72, '비밀번호는 최대 72자입니다'),
});
export type LoginBody = z.infer<typeof loginBodySchema>;

// 회원가입 — 신규 사용자에 한해 강화된 정책. passwordConfirm은 refine로 일치 검증.
// 닉네임/핸드폰 번호는 본 단계에서 미수집:
//   - 닉네임: handle_new_user 트리거에서 자동 생성, W8 온보딩에서 변경 UX
//   - 핸드폰: #43에서 phone + OTP 게이트 추가
//
// 비밀번호 정책:
//   - min 8 / max 72 (bcrypt 한도)
//   - 영문(a-z/A-Z) 1개 이상
//   - 숫자(0-9) 1개 이상
//   - 특수문자 1개 이상 — ASCII 화이트리스트로 명시(한국어/공백 회피)
// 정규식 체이닝 순서 = UX 안내 순서. 길이 → 영문 → 숫자 → 특수문자 순서로
// 첫 번째 실패 메시지가 RHF fieldState.error로 노출되어 사용자가 한 단계씩 해결.
export const SIGNUP_PASSWORD_SPECIAL_CHARS = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/;

export const signupBodySchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('올바른 이메일 형식이 아닙니다'),
    password: z
      .string()
      .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
      .max(72, '비밀번호는 최대 72자입니다')
      .regex(/[a-zA-Z]/, '영문을 1개 이상 포함해야 합니다')
      .regex(/\d/, '숫자를 1개 이상 포함해야 합니다')
      .regex(
        SIGNUP_PASSWORD_SPECIAL_CHARS,
        '특수문자(!@#$ 등)를 1개 이상 포함해야 합니다',
      ),
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ['passwordConfirm'],
    message: '비밀번호가 일치하지 않습니다',
  });
export type SignupBody = z.infer<typeof signupBodySchema>;
