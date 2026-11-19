import { beforeEach, describe, expect, test, vi } from "vitest";

import { GET as widget } from "@/app/api/widget/route";

const settingFor = (route: string) => ({
  kind: "morning" as const,
  departureTime: "08:00",
  arsId: "01001",
  routeName: route,
  stationName: "종로2가사거리",
  location: { lon: 126.98, lat: 37.57 },
  leadMinutes: 10,
});

const mocks = vi.hoisted(() => ({
  userIdForToken: vi.fn(),
  listCommuteSettings: vi.fn(),
  buildBriefing: vi.fn(),
}));

vi.mock("@/features/accounts/server", () => ({ userIdForToken: mocks.userIdForToken }));
vi.mock("@/features/commute/server", () => ({ listCommuteSettings: mocks.listCommuteSettings }));
vi.mock("@/features/briefing", async (orig) => ({
  ...(await orig<typeof import("@/features/briefing")>()),
  buildBriefing: mocks.buildBriefing,
}));

describe("widget JSON access (AC1, AC12, AC13, AC14, AC15)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-11-19T00:00:00+09:00") }); // morning in KST
    mocks.userIdForToken.mockImplementation(async (t: string) => ({ "token-a": "user-a", "token-b": "user-b" })[t] ?? null);
    mocks.listCommuteSettings.mockImplementation(async (userId: string) => [
      settingFor(userId === "user-a" ? "146" : "470"),
    ]);
    mocks.buildBriefing.mockImplementation(async (setting) => ({
      setting,
      departure: new Date(),
      queriedAt: new Date(),
      weather: null,
      buses: [],
    }));
  });

  test("no token, an unknown token, or the old ?key= address are all refused without reading data", async () => {
    for (const q of ["", "?token=nope", "?key=old-shared-secret"]) {
      const res = await widget(new Request(`http://localhost/api/widget${q}`));
      expect(res.status).toBe(401);
    }
    expect(mocks.listCommuteSettings).not.toHaveBeenCalled();
  });

  test("each token returns only its own owner's settings", async () => {
    const a = await (await widget(new Request("http://localhost/api/widget?token=token-a"))).json();
    const b = await (await widget(new Request("http://localhost/api/widget?token=token-b"))).json();
    expect([a.routeName, b.routeName]).toEqual(["146", "470"]);
    expect(mocks.listCommuteSettings.mock.calls.map((c) => c[0])).toEqual(["user-a", "user-b"]);
  });

  test("a reissued token no longer resolves (old address stops working)", async () => {
    mocks.userIdForToken.mockImplementation(async (t: string) => (t === "token-a-new" ? "user-a" : null));
    expect((await widget(new Request("http://localhost/api/widget?token=token-a"))).status).toBe(401);
    expect((await widget(new Request("http://localhost/api/widget?token=token-a-new"))).status).toBe(200);
  });
});
