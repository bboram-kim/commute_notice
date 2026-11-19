"use client";

import { useActionState } from "react";

import { saveCommute, type SaveState } from "@/app/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DEFAULT_LEAD_MINUTES, KIND_LABEL, type CommuteKind, type CommuteSetting } from "@/features/commute";

export function CommuteForm({
  kind,
  setting,
}: {
  kind: CommuteKind;
  setting?: CommuteSetting;
}) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveCommute, { status: "idle" });
  const label = KIND_LABEL[kind];
  const id = (name: string) => `${kind}-${name}`;
  const stationName = state.status === "saved" ? state.stationName : setting?.stationName;
  const submitted = state.status === "idle" ? undefined : state.values;
  const initial = {
    departureTime: submitted?.departureTime ?? setting?.departureTime,
    arsId: submitted?.arsId ?? setting?.arsId,
    routeName: submitted?.routeName ?? setting?.routeName,
    leadMinutes: submitted?.leadMinutes ?? String(setting?.leadMinutes ?? DEFAULT_LEAD_MINUTES),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardDescription>
          {stationName ? `${stationName} 정류소` : "아직 저장된 설정이 없습니다."}
        </CardDescription>
      </CardHeader>
      <form action={action} aria-label={`${label} 설정`}>
        <input type="hidden" name="kind" value={kind} />
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={id("departureTime")}>출발 시각</FieldLabel>
              <Input
                id={id("departureTime")}
                name="departureTime"
                type="time"
                required
                defaultValue={initial.departureTime}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor={id("arsId")}>정류소 번호</FieldLabel>
                <Input
                  id={id("arsId")}
                  name="arsId"
                  inputMode="numeric"
                  pattern="\d{5}"
                  maxLength={5}
                  placeholder="01001"
                  required
                  defaultValue={initial.arsId}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={id("routeName")}>노선 번호</FieldLabel>
                <Input id={id("routeName")} name="routeName" placeholder="146" required defaultValue={initial.routeName} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={id("leadMinutes")}>알림 시점 (출발 몇 분 전)</FieldLabel>
              <Input
                id={id("leadMinutes")}
                name="leadMinutes"
                type="number"
                min={1}
                max={120}
                defaultValue={initial.leadMinutes}
              />
              <FieldDescription>월–금 출발 {initial.leadMinutes}분 전에 알림이 옵니다.</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-4 flex-col items-stretch gap-3">
          {state.status !== "idle" && (
            <Alert variant={state.status === "error" ? "destructive" : "default"} role="status">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "확인하는 중…" : `${label} 설정 저장`}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
