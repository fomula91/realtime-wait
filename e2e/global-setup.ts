import { execSync } from "node:child_process";

/**
 * E2E 결정성: 서버 기동 전 로컬 D1 을 스키마 + 시드로 초기화한다.
 * booth_b(채용 상담 부스)는 시드 대기열이 없어 등록 참가자가 1번이 된다.
 */
export default function globalSetup() {
  execSync("corepack pnpm --filter @realtime-wait/worker db:reset", {
    stdio: "inherit",
  });
}
