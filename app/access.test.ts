import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { GET as manifest } from "@/app/api/manifest/route";
import { GET as widget } from "@/app/api/widget/route";
import { isValidKey } from "@/lib/access";

vi.mock("@/features/commute/server", () => ({
  listCommuteSettings: vi.fn(async () => {
    throw new Error("must not read settings without a valid key");
  }),
}));

describe("secret key access (AC1)", () => {
  beforeEach(() => vi.stubEnv("APP_SECRET", "s3cret"));
  afterEach(() => vi.unstubAllEnvs());

  test("only the configured key is valid", () => {
    expect(isValidKey("s3cret")).toBe(true);
    expect(isValidKey("wrong")).toBe(false);
    expect(isValidKey(undefined)).toBe(false);
    expect(isValidKey(["s3cret"])).toBe(false);
  });

  test("an unset APP_SECRET never unlocks", () => {
    vi.stubEnv("APP_SECRET", "");
    expect(isValidKey("")).toBe(false);
  });

  test("widget JSON without the key is 401 and reads nothing", async () => {
    const res = await widget(new Request("http://localhost/api/widget"));
    expect(res.status).toBe(401);
    const wrong = await widget(new Request("http://localhost/api/widget?key=nope"));
    expect(wrong.status).toBe(401);
  });

  test("manifest carries the key in start_url only for the right key", async () => {
    expect((await manifest(new Request("http://localhost/api/manifest"))).status).toBe(401);
    const res = await manifest(new Request("http://localhost/api/manifest?key=s3cret"));
    expect((await res.json()).start_url).toBe("/?key=s3cret");
  });
});
