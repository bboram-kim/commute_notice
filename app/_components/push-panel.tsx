"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { sendTestPush, subscribePush, unsubscribePush } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type Support = "checking" | "ios-browser" | "unsupported" | "ready";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function detectSupport(): Support {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (isIOS && !standalone) return "ios-browser";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }
  return "ready";
}

export function PushPanel() {
  const support = useSyncExternalStore<Support>(
    () => () => {},
    detectSupport,
    () => "checking",
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "default" | "destructive"; text: string } | null>(null);

  useEffect(() => {
    if (support !== "ready") return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => reg.pushManager.getSubscription())
      .then(setSubscription)
      .catch((e) => setMessage({ tone: "destructive", text: `서비스 워커를 등록하지 못했습니다: ${e}` }));
  }, [support]);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await task();
    } catch (e) {
      setMessage({ tone: "destructive", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const enable = () =>
    run(async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("알림 권한이 허용되지 않았습니다. 브라우저 설정에서 알림을 허용하세요.");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      await subscribePush(JSON.parse(JSON.stringify(sub)));
      setSubscription(sub);
      setMessage({ tone: "default", text: "이 기기에서 알림을 켰습니다." });
    });

  const disable = () =>
    run(async () => {
      if (!subscription) return;
      await unsubscribePush(subscription.endpoint);
      await subscription.unsubscribe();
      setSubscription(null);
      setMessage({ tone: "default", text: "이 기기의 알림을 껐습니다." });
    });

  const test = () =>
    run(async () => {
      const { success, total } = await sendTestPush();
      setMessage({ tone: "default", text: `테스트 알림을 보냈습니다. (${success}/${total}개 기기 성공)` });
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>이 기기 알림</CardTitle>
        <CardDescription>
          {subscription ? "이 기기에서 알림을 받고 있습니다." : "알림을 받을 기기마다 한 번씩 켜 주세요."}
        </CardDescription>
      </CardHeader>
      {support === "ios-browser" && (
        <CardContent>
          <Alert>
            <AlertTitle>iPhone은 홈 화면에 추가해야 알림을 받을 수 있습니다</AlertTitle>
            <AlertDescription>
              Safari 아래쪽의 공유 버튼을 누르고 &ldquo;홈 화면에 추가&rdquo;를 고르세요. 그다음 홈 화면에 생긴
              &ldquo;출퇴근 알림&rdquo; 앱을 열어 알림을 켜면 됩니다. (iOS 16.4 이상)
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
      {support === "unsupported" && (
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>이 브라우저는 웹 푸시 알림을 지원하지 않습니다. Chrome이나 Edge로 열어 주세요.</AlertDescription>
          </Alert>
        </CardContent>
      )}
      {support === "ready" && (
        <CardFooter className="flex-col items-stretch gap-3">
          {message && (
            <Alert variant={message.tone} role="status">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap gap-2">
            {subscription ? (
              <>
                <Button onClick={test} disabled={busy}>
                  테스트 알림 보내기
                </Button>
                <Button variant="outline" onClick={disable} disabled={busy}>
                  알림 끄기
                </Button>
              </>
            ) : (
              <Button onClick={enable} disabled={busy}>
                알림 켜기
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
