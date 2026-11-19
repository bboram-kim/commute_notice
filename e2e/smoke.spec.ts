import { expect, test } from "@playwright/test";

test("로그인하지 않으면 설정 대신 로그인 화면이 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("출퇴근 알림");
  await expect(page.getByRole("form", { name: "로그인" })).toBeVisible();
  await expect(page.getByRole("form", { name: "출근 설정" })).toHaveCount(0);
});
