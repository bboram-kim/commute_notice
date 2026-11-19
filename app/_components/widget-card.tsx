"use client";

import { useState, useTransition } from "react";

import { reissueWidgetToken } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function WidgetCard({ origin, initialToken }: { origin: string; initialToken: string }) {
  const [token, setToken] = useState(initialToken);
  const [pending, start] = useTransition();
  const url = `${origin}/api/widget?token=${token}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>위젯용 JSON 주소</CardTitle>
        <CardDescription>
          오전에는 출근, 오후에는 퇴근 정보가 나옵니다. 내 주소이니 다른 사람에게 알려 주지 마세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <a href={url} className="block break-all font-mono text-sm underline underline-offset-4">
          {url}
        </a>
      </CardContent>
      <CardFooter>
        <Button variant="outline" disabled={pending} onClick={() => start(async () => setToken(await reissueWidgetToken()))}>
          {pending ? "발급하는 중…" : "주소 다시 발급"}
        </Button>
      </CardFooter>
    </Card>
  );
}
