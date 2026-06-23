/** prefix 가 붙은 정렬 가능한 고유 ID 생성 (crypto.randomUUID 기반) */
export function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

/** 현재 시각 ISO8601(UTC) 문자열 */
export function nowIso(): string {
  return new Date().toISOString();
}
