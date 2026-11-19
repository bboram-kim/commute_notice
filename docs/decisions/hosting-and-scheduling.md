# 배포와 예약 실행

## Decisions

- 앱은 Vercel 무료(Hobby) 플랜에 배포한다.
- 사용자 설정과 웹 푸시 구독 정보는 Supabase(무료 플랜)에 저장한다.
- 정해진 시각에 일을 해야 하는 작업(출발 시각 알림 발송 등)은 Supabase `pg_cron`이 매분 실행되어 `pg_net`으로 앱의 발송 주소를 호출하는 방식으로 깨운다. Vercel Cron Jobs나 Vercel Schedules에 시각을 맡기지 않는다.

## Boundaries

- 분 단위 정확도가 필요 없는 하루 한 번짜리 작업까지 Supabase로 옮기라는 결정은 아니다.
- 저장소 선택일 뿐, 인증 방식이나 사용자 모델을 정하지 않는다.

## Why

출발 시각 알림은 분 단위로 맞아야 의미가 있다. Vercel Hobby에서 Cron Jobs는 하루 한 번만 돌고 실행 시각이 ±59분 흔들리며, Schedules는 최소 15분 간격에 오차가 15분이다(2026-11-19 Vercel 문서 확인). Supabase 무료 플랜의 `pg_cron`은 매분 실행할 수 있고, 저장소도 함께 쓰므로 서비스를 하나 더 늘리지 않는다. 비용 없이 분 단위 발송을 얻는 조합이라 사용자가 확정했다.

## Reconsider when

- Supabase 무료 프로젝트가 매분 예약 실행에도 불구하고 비활성으로 일시 정지되는 일이 관찰될 때
- Vercel Pro로 올리거나 Vercel Hobby의 예약 실행이 분 단위 정확도를 제공하게 될 때

## Still-rejected alternatives

- Vercel Hobby Cron Jobs / Schedules — 실행 시각 오차가 15–59분이라 출발 시각 알림이 늦게 온다. Hobby 제한이 바뀌면 다시 본다.
- Vercel Pro(월 20달러)로 분 단위 Cron 사용 — 동작은 되지만 개인용 첫 버전에 고정 비용이 생긴다. 비용을 감수하기로 하면 다시 본다.
