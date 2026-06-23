// 운영자(관리자) 호출 처리 부하 테스트.
// 운영자 화면의 대기열 조회(2~3초 polling) + 호출/체크인 액션을 시뮬레이션한다.
//
// 실행: k6 run load-test/k6/operator-calling.js

import http from "k6/http";
import { check, sleep } from "k6";
import {
  BASE_URL,
  BOOTH_ID,
  adminHeaders,
} from "./lib/config.js";

// 동시 호출로 인한 409 는 낙관적 동시성 제어상 정상이므로, http_req_failed
// 에서 2xx/3xx 와 409 를 모두 기대 응답으로 취급한다.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 409));

const POLL_INTERVAL_S = 3;

export const options = {
  scenarios: {
    // 부스 1개당 운영자 1명(현실적 가정). 한 부스를 여러 명이 동시에
    // 조작하면 같은 대기자에 대한 409(동시성 충돌)가 인위적으로 발생한다.
    operators: {
      executor: "constant-vus",
      vus: 1,
      duration: "1m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{name:queue}": ["p(95)<600"],
  },
};

export default function () {
  // 1) 대기열 조회 (운영자 화면 polling)
  const queueRes = http.get(
    `${BASE_URL}/api/admin/booths/${BOOTH_ID}/queue`,
    { headers: adminHeaders, tags: { name: "queue" } },
  );
  check(queueRes, { "queue 200": (r) => r.status === 200 });

  // 2) 대기중(waiting) 인 첫 참가자를 호출
  const entries = queueRes.json("data") || [];
  const waiting = entries.find((e) => e.status === "waiting");
  if (waiting) {
    const callRes = http.post(
      `${BASE_URL}/api/admin/queue/${waiting.id}/call`,
      null,
      { headers: adminHeaders, tags: { name: "call" } },
    );
    // 동시성으로 인해 이미 호출되었을 수 있으므로 200/409 모두 허용
    check(callRes, {
      "call 200 or 409": (r) => r.status === 200 || r.status === 409,
    });
  }

  sleep(POLL_INTERVAL_S);
}
