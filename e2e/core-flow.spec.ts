import { test, expect } from "@playwright/test";

/**
 * ADR-0011 핵심 E2E: 폴링 + 상태머신 + 운영자 액션이 함께 동작함을 한 번에 증명.
 * 참가자 등록 → 상태 폴링(대기중) → 운영자 호출 → called 반영 → 체크인 → checked_in 반영.
 */
test("등록 → 상태 폴링 → 운영자 호출 → 체크인", async ({ page, browser }) => {
  const name = `E2E참가자-${Date.now()}`;

  // 1) 참가자 등록 (booth_b: 시드 대기열 없음 → 1번)
  await page.goto("/e/evt_demo");
  await page.locator(".select-card", { hasText: "채용 상담 부스" }).click();
  await page.getByPlaceholder("예: 홍길동 (실명 아님)").fill(name);
  await page.getByRole("button", { name: "대기열 등록하기" }).click();

  // 2) 상태 페이지: 대기중
  await expect(page).toHaveURL(/\/t\//);
  await expect(page.getByText("대기중")).toBeVisible();

  // 3) 운영자 로그인(부스 토큰) → 부스 큐 (별도 컨텍스트)
  const opContext = await browser.newContext();
  const op = await opContext.newPage();
  await op.goto("/login");
  await op.locator("#cred").fill("booth-b-token");
  await op.getByRole("button", { name: /로그인/ }).click();
  await expect(op).toHaveURL(/\/booth\/booth_b/);

  // 4) 우리 참가자 행을 특정해 호출
  const row = op.locator(".qrow", { hasText: name });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "호출" }).click();

  // 5) 참가자 페이지가 폴링으로 called(입장하세요)로 전이
  await expect(page.getByText(/입장하세요/)).toBeVisible({ timeout: 15_000 });

  // 6) 운영자 체크인
  const calledRow = op.locator(".qrow", { hasText: name });
  await expect(calledRow.getByRole("button", { name: "체크인" })).toBeVisible();
  await calledRow.getByRole("button", { name: "체크인" }).click();

  // 7) 참가자 페이지가 폴링으로 checked_in(체크인 완료)로 전이
  await expect(page.getByText(/체크인 완료/)).toBeVisible({ timeout: 15_000 });

  await opContext.close();
});
