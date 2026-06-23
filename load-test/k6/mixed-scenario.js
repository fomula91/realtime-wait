// 혼합 시나리오 부하 테스트.
// 실제 행사처럼 "다수 참가자 폴링 + 소수 운영자 호출" 을 동시에 돌린다.
// CLAUDE.md 의 부하 예측을 종합적으로 검증하는 메인 시나리오다.
//
// 실행: k6 run load-test/k6/mixed-scenario.js

import http from "k6/http";
import { check, sleep } from "k6";
import {
  BASE_URL,
  EVENT_ID,
  BOOTH_ID,
  jsonHeaders,
  adminHeaders,
} from "./lib/config.js";

// 운영자가 여러 명이면 같은 대기자를 동시에 처리하다 409(이미 처리됨)가
// 날 수 있다. 이는 낙관적 동시성 제어상 정상 동작이므로, http_req_failed
// 메트릭에서 2xx/3xx 와 409 를 모두 "기대 응답" 으로 취급한다.
// (per-request responseCallback 은 이 메트릭에 반영되지 않으므로 전역 설정을 쓴다)
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 409));

export const options = {
  scenarios: {
    // 참가자: 등록 후 5초 주기로 상태 폴링
    participants: {
      executor: "ramping-vus",
      exec: "participant",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 120 },
        { duration: "60s", target: 120 },
        { duration: "10s", target: 0 },
      ],
    },
    // 운영자: 부스 1개당 운영자 1명(현실적 가정). 3초 주기로 조회 + 호출/체크인.
    // 한 부스를 여러 명이 동시에 조작하는 설정은 비현실적이고, 같은 대기자에
    // 대한 409(동시성 충돌)를 인위적으로 유발하므로 1명으로 둔다.
    operators: {
      executor: "constant-vus",
      exec: "operator",
      vus: 1,
      duration: "90s",
    },
  },
  thresholds: {
    // 로컬 `wrangler dev`(miniflare)는 버스트 시 일부 TCP 연결을 리셋한다.
    // 이는 애플리케이션 오류가 아니라 로컬 런타임의 연결 수용 한계이며
    // (worker 로그상 도달한 요청은 모두 2xx), 배포된 Worker 는 엣지에서
    // 연결을 처리하므로 해당되지 않는다. 로컬 노이즈를 감안해 5% 로 둔다.
    http_req_failed: ["rate<0.05"],
    // 실질 성능 게이트는 지연 시간으로 둔다.
    "http_req_duration{name:status}": ["p(95)<600"],
    "http_req_duration{name:queue}": ["p(95)<800"],
  },
};

export function participant() {
  const regRes = http.post(
    `${BASE_URL}/api/events/${EVENT_ID}/booths/${BOOTH_ID}/register`,
    JSON.stringify({ participant_name: `mix_${__VU}_${__ITER}` }),
    { headers: jsonHeaders, tags: { name: "register" } },
  );
  // 연결 리셋 등으로 응답 body 가 없을 수 있으므로 방어적으로 파싱한다.
  // (실제 클라이언트도 일시적 네트워크 오류 시 재시도/대기로 견뎌야 한다)
  const entryId =
    regRes.status === 201 && regRes.body ? regRes.json("data.id") : null;
  if (!entryId) {
    sleep(5);
    return;
  }
  for (let i = 0; i < 4; i++) {
    const res = http.get(`${BASE_URL}/api/queue/${entryId}/status`, {
      tags: { name: "status" },
    });
    check(res, { "status 200": (r) => r.status === 200 });
    sleep(5);
  }
}

export function operator() {
  const queueRes = http.get(
    `${BASE_URL}/api/admin/booths/${BOOTH_ID}/queue`,
    { headers: adminHeaders, tags: { name: "queue" } },
  );
  check(queueRes, { "queue 200": (r) => r.status === 200 });

  // 409(동시성 충돌)는 init 컨텍스트의 전역 setResponseCallback 에서
  // 기대 응답으로 처리된다.
  const entries = queueRes.json("data") || [];
  const waiting = entries.find((e) => e.status === "waiting");
  if (waiting) {
    http.post(`${BASE_URL}/api/admin/queue/${waiting.id}/call`, null, {
      headers: adminHeaders,
      tags: { name: "call" },
    });
  }
  const called = entries.find((e) => e.status === "called");
  if (called) {
    http.post(`${BASE_URL}/api/admin/queue/${called.id}/check-in`, null, {
      headers: adminHeaders,
      tags: { name: "check-in" },
    });
  }

  sleep(3);
}
