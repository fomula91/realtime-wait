// 참가자 대기 등록 부하 테스트.
// 다수의 가상 사용자가 동시에 대기열에 등록하는 상황을 시뮬레이션한다.
//
// 실행: k6 run load-test/k6/participant-register.js

import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, EVENT_ID, BOOTH_ID, jsonHeaders } from "./lib/config.js";

export const options = {
  scenarios: {
    register_burst: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 50 },
        { duration: "30s", target: 50 },
        { duration: "10s", target: 0 },
      ],
    },
  },
  thresholds: {
    // 로컬 wrangler dev 의 버스트 연결 리셋(애플리케이션 오류 아님)을 감안.
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<800"],
  },
};

export default function () {
  const url = `${BASE_URL}/api/events/${EVENT_ID}/booths/${BOOTH_ID}/register`;
  const payload = JSON.stringify({
    participant_name: `load_${__VU}_${__ITER}`,
  });

  const res = http.post(url, payload, { headers: jsonHeaders });
  check(res, {
    "status is 201": (r) => r.status === 201,
    // 연결 리셋 시 body 가 없을 수 있으므로 방어적으로 파싱
    "ok=true": (r) => r.status === 201 && !!r.body && r.json("ok") === true,
  });

  sleep(1);
}
