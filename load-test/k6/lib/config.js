// k6 공통 설정. 환경변수로 대상과 데모 데이터를 주입한다.
//
//   BASE_URL    대상 worker 주소 (기본 http://localhost:8787)
//   EVENT_ID    부하 테스트 대상 행사 ID (기본 evt_demo)
//   BOOTH_ID    부하 테스트 대상 부스 ID (기본 booth_a)
//   ADMIN_KEY   관리자 API 호출용 데모 키 (기본 demo-admin-key)

export const BASE_URL = __ENV.BASE_URL || "http://localhost:8787";
export const EVENT_ID = __ENV.EVENT_ID || "evt_demo";
export const BOOTH_ID = __ENV.BOOTH_ID || "booth_a";
export const ADMIN_KEY = __ENV.ADMIN_KEY || "demo-admin-key";

export const jsonHeaders = { "Content-Type": "application/json" };
export const adminHeaders = {
  "Content-Type": "application/json",
  "x-admin-key": ADMIN_KEY,
};
