import { headers } from "next/headers";

import { logOut } from "@/app/actions";
import { AuthForm } from "@/app/_components/auth-form";
import { CommuteForm } from "@/app/_components/commute-form";
import { PushPanel } from "@/app/_components/push-panel";
import { WidgetCard } from "@/app/_components/widget-card";
import { Button } from "@/components/ui/button";
import { widgetTokenFor } from "@/features/accounts/server";
import { COMMUTE_KINDS } from "@/features/commute";
import { listCommuteSettings } from "@/features/commute/server";
import { currentUser } from "@/lib/auth";

export default async function Home() {
  const user = await currentUser();

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-4 py-10">
        <header className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">출퇴근 알림</h1>
          <p className="text-muted-foreground">출발 시각 전에 날씨와 버스 도착 예정 시각을 알려 드립니다.</p>
        </header>
        <AuthForm />
      </main>
    );
  }

  const [settings, token, h] = await Promise.all([listCommuteSettings(user.id), widgetTokenFor(user.id), headers()]);
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">출퇴근 알림</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <form action={logOut}>
          <Button type="submit" variant="outline">
            로그아웃
          </Button>
        </form>
      </header>

      <PushPanel />

      {COMMUTE_KINDS.map((kind) => (
        <CommuteForm key={kind} kind={kind} setting={settings.find((s) => s.kind === kind)} />
      ))}

      <WidgetCard origin={origin} initialToken={token} />
    </main>
  );
}
