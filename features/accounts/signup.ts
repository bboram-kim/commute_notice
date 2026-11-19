export type SignupInput = { email: string; password: string };

export type SignupParse = { ok: true; value: SignupInput } | { ok: false; error: string };

export const MIN_PASSWORD_LENGTH = 8;

export const INVALID_INVITE = "초대 코드가 올바르지 않습니다.";

/** Validates the sign-up form. An unset invite code on the server never lets anyone in. */
export function parseSignupForm(form: FormData, expectedInviteCode: string | undefined): SignupParse {
  const invite = String(form.get("inviteCode") ?? "").trim();
  if (!expectedInviteCode || invite !== expectedInviteCode) return { ok: false, error: INVALID_INVITE };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "이메일 형식이 올바르지 않습니다." };

  const password = String(form.get("password") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` };
  }
  return { ok: true, value: { email, password } };
}
