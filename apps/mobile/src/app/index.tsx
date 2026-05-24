// 앱 진입점 — 현재는 항상 LoginPage 렌더.
// `<Redirect />` 대신 직접 렌더 — 라우터 트랜지션 1프레임 빈 화면(마키 깜빡임) 회피.
// #7(로그인·회원가입) 도입 시 세션 분기 교체:
//   세션 있음 → <Redirect href="/(tabs)" /> / 세션 없음 → <LoginPage />
import { LoginPage } from '@/pages/login';

export default LoginPage;
