// 플랫폼 분기 헬퍼 — Platform.OS 직접 참조를 entity/feature/widget/page에서 금지
// 향후 apps/web 확장 시 platform.web.ts로 분기 가능하도록 격리
import { Platform } from 'react-native';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';
export const isNative = isIOS || isAndroid;

/**
 * 플랫폼별 값 선택. RN의 Platform.select 래퍼.
 */
export function platformSelect<T>(opts: { ios?: T; android?: T; web?: T; default: T }): T {
  if (isIOS && opts.ios !== undefined) return opts.ios;
  if (isAndroid && opts.android !== undefined) return opts.android;
  if (isWeb && opts.web !== undefined) return opts.web;
  return opts.default;
}
