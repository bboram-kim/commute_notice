import { describe, expect, test } from "vitest";

import { INVALID_INVITE, parseSignupForm } from "./signup";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

const valid = { inviteCode: "friends-2026", email: "Friend@Example.com", password: "longenough" };

describe("parseSignupForm (AC2, AC3)", () => {
  test("accepts a correct invite code, email and password; lowercases the email", () => {
    expect(parseSignupForm(form(valid), "friends-2026")).toEqual({
      ok: true,
      value: { email: "friend@example.com", password: "longenough" },
    });
  });

  test.each([[""], ["wrong"]])("rejects invite code %j", (inviteCode) => {
    expect(parseSignupForm(form({ ...valid, inviteCode }), "friends-2026")).toEqual({
      ok: false,
      error: INVALID_INVITE,
    });
  });

  test("an unset server invite code lets nobody in, even with an empty code", () => {
    expect(parseSignupForm(form({ ...valid, inviteCode: "" }), undefined).ok).toBe(false);
    expect(parseSignupForm(form({ ...valid, inviteCode: "" }), "").ok).toBe(false);
  });

  test("rejects a short password and a malformed email with a reason", () => {
    const short = parseSignupForm(form({ ...valid, password: "1234567" }), "friends-2026");
    expect(!short.ok && short.error).toContain("8자 이상");
    const bad = parseSignupForm(form({ ...valid, email: "nope" }), "friends-2026");
    expect(!bad.ok && bad.error).toContain("이메일");
  });
});
