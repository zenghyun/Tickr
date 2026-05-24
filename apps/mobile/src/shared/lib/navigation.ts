// expo-router 모듈 래퍼.
// .claude/rules/monorepo-boundary.md — entity/feature/widget/page는 본 래퍼만 사용.
// 추후 apps/web 확장 시 본 파일을 platform별로 분기(.native.ts/.web.ts)하면 호출부 무수정.
export { router, Redirect, Link } from 'expo-router';
export type { Href } from 'expo-router';
