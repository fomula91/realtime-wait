#!/usr/bin/env node
// verify 사전 점검: 코드 실행 전에 "환경 실패"를 코드 실패와 분리해 먼저 잡는다.
// - pnpm 버전이 package.json 의 packageManager 핀과 정확히 일치하는지
// - node 메이저 버전이 engines.node 를 만족하는지
// 모든 실패 메시지에 [check-env] ENVIRONMENT ERROR 라벨을 붙여, typecheck/test 의
// 코드 실패와 출력으로 구분 가능하게 한다.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
);

/** [check-env] ENVIRONMENT ERROR 라벨로 종료(코드 실패와 구분되는 신호). */
function envError(message, hint) {
  console.error(`[check-env] ENVIRONMENT ERROR: ${message}`);
  if (hint) console.error(`[check-env]   → ${hint}`);
  process.exit(1);
}

// 1) pnpm 버전 == packageManager 핀.
// pnpm 으로 실행되면 npm_config_user_agent 에 "pnpm/<ver> ..." 가 들어온다.
const expected = (pkg.packageManager ?? "").replace(/^pnpm@/, "");
const agent = process.env.npm_config_user_agent ?? "";
const actual = agent.match(/pnpm\/(\S+)/)?.[1];
if (!expected) {
  envError("package.json 에 packageManager 핀이 없습니다");
}
if (!actual) {
  envError(
    "pnpm 으로 실행되지 않았습니다(npm_config_user_agent 에 pnpm 없음)",
    "pnpm verify 로 실행하세요",
  );
}
if (actual !== expected) {
  envError(
    `pnpm 버전 불일치: 실행 중 ${actual}, 요구 ${expected}`,
    `corepack enable && corepack use pnpm@${expected} 로 핀 버전을 활성화하세요`,
  );
}

// 2) node 메이저 버전 >= engines.node 의 하한.
const required = pkg.engines?.node ?? "";
const minMajor = Number(required.match(/(\d+)/)?.[1]);
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (minMajor && nodeMajor < minMajor) {
  envError(
    `node 버전 미달: 실행 중 v${process.versions.node}, 요구 "${required}"`,
    `node ${minMajor} 이상으로 전환하세요`,
  );
}

// 3) node:sqlite 로드 가능 여부(테스트 셰임 D1 이 요구).
// 메이저 하한만으론 flag/백포트 차이(22.5~22.12 는 --experimental-sqlite 필요)를 못 걸러서,
// 능력 자체를 실제 로드로 확인한다. Node 20 CI 실패("No such built-in module: node:sqlite")를 여기서 먼저 잡는다.
try {
  createRequire(import.meta.url)("node:sqlite");
} catch {
  envError(
    "node:sqlite 를 로드할 수 없습니다(테스트 셰임 D1 이 요구)",
    "node 22.5+ (flag 없이 node:sqlite 지원 — 권장 22 LTS 또는 24) 로 전환하세요",
  );
}

console.log(
  `[check-env] OK — pnpm ${actual}, node v${process.versions.node}`,
);
