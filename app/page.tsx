import type { Metadata } from "next";

import { CommuteForm } from "@/app/_components/commute-form";
import { PushPanel } from "@/app/_components/push-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { COMMUTE_KINDS } from "@/features/commute";
import { listCommuteSettings } from "@/features/commute/server";
import { isValidKey } from "@/lib/access";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { key } = await searchParams;
  if (!isValidKey(key)) return { title: "출퇴근 알림" };
  return {
    title: "출퇴근 알림",
    manifest: `/api/manifest?key=${encodeURIComponent(key)}`,
    appleWebApp: { capable: true, title: "출퇴근 알림", statusBarStyle: "default" },
  };
}

export default async function Home({ searchParams }: Props) {
  const { key } = await searchParams;

  if (!isValidKey(key)) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
        <h1 className="font-heading text-2xl font-semibold">출퇴근 알림</h1>
        <p className="mt-2 text-muted-foreground">이 페이지를 열려면 접근 키가 붙은 주소가 필요합니다.</p>
      </main>
    );
  }

  const settings = await listCommuteSettings();
  const widgetPath = `/api/widget?key=${encodeURIComponent(key)}`;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">출퇴근 알림</h1>
        <p className="text-muted-foreground">출발 시각 전에 날씨와 버스 도착 예정 시각을 알려 드립니다.</p>
      </header>

      <PushPanel accessKey={key} />

      {COMMUTE_KINDS.map((kind) => (
        <CommuteForm key={kind} accessKey={key} kind={kind} setting={settings.find((s) => s.kind === kind)} />
      ))}

      <Card>
        <CardHeader>
          <CardTitle>위젯용 JSON 주소</CardTitle>
          <CardDescription>오전에는 출근, 오후에는 퇴근 정보가 나옵니다. Scriptable 위젯에서 이 주소를 읽으세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <a href={widgetPath} className="block break-all font-mono text-sm underline underline-offset-4">
            {widgetPath}
          </a>
        </CardContent>
      </Card>
    </main>
  );
}
