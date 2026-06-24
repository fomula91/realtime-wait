// 참가자 상태 polling 부하 테스트.
// CLAUDE.md 의 부하 계산(참가자 N명 × 5초 polling)을 실제로 재현한다.
//
// 각 VU 는 한 번 등록한 뒤 5초마다 자신의 상태를 조회한다.
// 실행: k6 run load-test/k6/participant-polling.js

import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, EVENT_ID, BOOTH_ID, jsonHeaders } from "./lib/config.js";

const POLL_INTERVAL_S = 5;

export const options = {
  scenarios: {
    // 동시 참가자 100명을 2분간 유지 → 이론상 초당 약 20 req
    polling_steady: {
      executor: "constant-vus",
      vus: 100,
      duration: "2m",
    },
  },
  thresholds: {
    // 로컬 wrangler dev 의 버스트 연결 리셋(애플리케이션 오류 아님)을 감안.
    // 자세한 배경은 mixed-scenario.js 참고. (부하 리포트는 내부 설계 위키에서 관리)
    http_req_failed: ["rate<0.05"],
    "http_req_duration{name:status}": ["p(95)<500"],
  },
};

// k6 에는 VU-local 영속 상태가 없으므로, 각 iteration 을
// "등록 → 일정 시간 폴링" 한 흐름으로 처리한다.
export default function () {
  const regRes = http.post(
    `${BASE_URL}/api/events/${EVENT_ID}/booths/${BOOTH_ID}/register`,
    JSON.stringify({ participant_name: `poll_${__VU}_${__ITER}` }),
    { headers: jsonHeaders, tags: { name: "register" } },
  );
  check(regRes, { "register 201": (r) => r.status === 201 });

  // 연결 리셋 등으로 body 가 없을 수 있으므로 방어적으로 파싱한다.
  const entryId =
    regRes.status === 201 && regRes.body ? regRes.json("data.id") : null;
  if (!entryId) {
    sleep(POLL_INTERVAL_S);
    return;
  }

  // 동일 entry 를 5초 주기로 6회 폴링 (약 30초간 대기 화면을 본다고 가정)
  for (let i = 0; i < 6; i++) {
    const statusRes = http.get(
      `${BASE_URL}/api/queue/${entryId}/status`,
      { tags: { name: "status" } },
    );
    check(statusRes, {
      "status 200": (r) => r.status === 200,
      "has ahead_count": (r) => r.json("data.ahead_count") !== undefined,
    });
    sleep(POLL_INTERVAL_S);
  }
}
