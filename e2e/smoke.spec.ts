import { expect, test } from "@playwright/test";

test("접근 키 없이 열면 설정 내용이 보이지 않는다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("출퇴근 알림");
  await expect(page.getByText("접근 키가 붙은 주소가 필요합니다")).toBeVisible();
  await expect(page.getByRole("form")).toHaveCount(0);
});
