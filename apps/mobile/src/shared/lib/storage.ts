// 보안 저장소 래퍼 — expo-secure-store를 entity/feature에서 직접 import 금지
// (.claude/rules/monorepo-boundary.md — RN-only 격리)
import * as SecureStore from 'expo-secure-store';

export const storage = {
  async get(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};

// Supabase 어댑터 (Storage 인터페이스 호환)
// auth.persistSession 옵션에 전달
export const supabaseStorageAdapter = {
  getItem: (key: string) => storage.get(key),
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.remove(key),
};
