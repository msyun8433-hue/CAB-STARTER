---
description: (제대로) 스킬을 임의 판단 없이 처음부터 끝까지 밟게 강제한다. 만들기·고치기·코드작성에 쓴다. (CLAUDE.md §13)
---

# /properly — 스킬대로 제대로

윤미선이 이 명령을 쳤다는 것은 **"네 판단으로 절차를 줄이지 말고, 해당 superpowers 스킬을 있는 그대로 끝까지 따르라"** 는 직접 지시다. (CLAUDE.md §13)

## 너(AI)가 할 일 — 반드시 이 순서

1. **작업 성격을 보고 알맞은 process 스킬을 고른다** (아래 표). 고르는 것 외엔 임의 판단 금지.
2. **고른 스킬을 `Skill` 도구로 즉시 호출한다.** 호출 전에 코드를 만지거나 답을 쓰지 않는다.
3. **스킬이 시키는 단계를 처음부터 끝까지 그대로 밟는다.** "단순해 보인다 / 빨리 끝낼 수 있다 / 이건 생략해도 된다" 같은 이유로 어떤 단계도 빼지 않는다.
4. 스킬이 "다음은 이 스킬을 부르라"고 하면 **그대로 이어서 부른다.** (예: brainstorming → writing-plans → subagent-driven-development)
5. 시작할 때 어떤 스킬을 부르는지 한 줄로 알린다.

## 어떤 스킬을 고르나

| 요청 성격 | 부를 스킬 |
|---|---|
| 무언가 **만들기**(기능·도구·화면·웹·자동화) | `superpowers:brainstorming` 먼저 → 이어서 writing-plans → subagent-driven-development |
| **버그·문제 고치기** | `superpowers:systematic-debugging` |
| **코드 작성**(테스트 포함) | `superpowers:test-driven-development` |
| 윤미선이 본문에서 특정 스킬을 콕 집었으면 | 그 스킬 |

판단이 애매하면 줄이는 쪽으로 가지 말고 **「상의드릴 말이 있습니다」** 로 물어본다. (§13)

## 처리할 요청

$ARGUMENTS
