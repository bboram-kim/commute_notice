"use client";

import { useActionState, useState } from "react";

import { logIn, signUp, type AuthState } from "@/app/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Mode = "login" | "signup";

function AuthFields({ mode }: { mode: Mode }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? logIn : signUp, {});
  const label = mode === "login" ? "로그인" : "가입하기";
  const id = (name: string) => `${mode}-${name}`;

  return (
    <form action={action} aria-label={label}>
      <CardContent>
        <FieldGroup>
          {mode === "signup" && (
            <Field>
              <FieldLabel htmlFor={id("inviteCode")}>초대 코드</FieldLabel>
              <Input id={id("inviteCode")} name="inviteCode" autoComplete="off" required />
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor={id("email")}>이메일</FieldLabel>
            <Input
              id={id("email")}
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={state.email}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={id("password")}>비밀번호{mode === "signup" && " (8자 이상)"}</FieldLabel>
            <Input
              id={id("password")}
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="mt-4 flex-col items-stretch gap-3">
        {state.error && (
          <Alert variant="destructive" role="status">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "확인하는 중…" : label}
        </Button>
      </CardFooter>
    </form>
  );
}

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("login");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "login" ? "로그인" : "가입하기"}</CardTitle>
        <CardDescription>
          {mode === "login" ? "가입한 이메일과 비밀번호로 로그인하세요." : "초대 코드를 받은 분만 가입할 수 있습니다."}
        </CardDescription>
      </CardHeader>
      <AuthFields key={mode} mode={mode} />
      <CardFooter className="pt-0">
        <Button variant="link" type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "초대 코드가 있나요? 가입하기" : "이미 계정이 있나요? 로그인"}
        </Button>
      </CardFooter>
    </Card>
  );
}
