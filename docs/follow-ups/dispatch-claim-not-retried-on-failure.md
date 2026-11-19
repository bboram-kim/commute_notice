# 발송 도중 오류가 나면 그날 알림이 다시 시도되지 않음

**Symptom**: `/api/dispatch`가 `dispatch_log`에 그날 자리를 먼저 잡은 뒤 알림을 만들고 보낸다. 그 사이 예외가 나면 `sent_at`이 빈 행이 남고, 같은 분에 다시 불려도 중복으로 보고 건너뛴다. 같은 분에 출근·퇴근이 둘 다 걸리면 앞쪽 오류가 뒤쪽 처리도 막는다.

**Observed evidence**: 2026-11-19 `code-review low` 지적. `features/dispatch/dispatch.ts`의 `runDispatch`에서 `claim` 다음 `buildBriefing`·`send`·`record`가 try 없이 이어진다. 재현은 하지 않았다(날씨·버스 조회 실패는 이미 내부에서 잡혀 알림이 나간다).

**Suspected cause**: 중복 방지를 위해 선점 후 발송하는 구조에 실패 시 선점을 되돌리는 경로가 없다.

**What was tried**: 수정하지 않았다. 주 경로에서 재현되지 않아 AGENTS.md 검증·리뷰 예산에 따라 기록만 한다.

**Proposed next step**: 발송 기록에 `sent_at`이 비어 있고 예정 시각에서 1분이 지나지 않은 행은 다시 시도하게 하거나, 실패 시 행을 지우고 kind마다 try/catch로 감싼다. 출시 후 점검 스크립트에서 `missing`이 나오면 이 원인부터 본다.
