// className 머지 헬퍼 — NativeWind와 함께 conditional class 적용
// truthy 값만 살리고 공백으로 join. 의존성 없이 단순 구현 (clsx 대체).

type ClassValue = string | number | false | null | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const value of inputs) {
    if (!value && value !== 0) continue;
    if (typeof value === 'string') {
      if (value) out.push(value);
    } else if (typeof value === 'number') {
      out.push(String(value));
    } else if (Array.isArray(value)) {
      const inner = cn(...value);
      if (inner) out.push(inner);
    }
  }
  return out.join(' ');
}
