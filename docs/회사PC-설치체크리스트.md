# 회사 PC 설치 체크리스트

> 맥북엔 다 깔려 있음. 이 회사 PC(Windows)에 아직 없는 것만 천천히 채우면 됨.
> **설치는 앤트로픽(Anthropic) 공식 문서 기반으로.** 급하지 않음 — 시간 날 때 위에서부터.
> 마지막 확인: 2026-06-23

## ❌ 아직 없음 (이것만 깔면 됨)

- [ ] **GWS CLI (Google Workspace CLI)** — 구글 문서·시트·캘린더·슬라이드 제어.
  - 현재: 프로그램·열쇠(`~/.config/gws/`) 둘 다 없음.
  - 맥북에 열쇠가 있음 → 안내 `docs/맥북에서-gws-가져오기.md` 대로 **맥북에서 열쇠+토큰을 USB로 가져와** 회사 PC에 복원하는 게 가장 빠름. (프로젝트=gws-ieo-021258, 열쇠=`~/.config/gws/client_secret.json`)
- [ ] **UI/UX Pro Max** — 디자인 시스템·UI/UX 설계 도구.
  - 현재: `~/.claude/skills/`에 안 보임.
  - 맥북에 깔린 것의 **정확한 이름·출처(깃허브 주소 등)** 를 윤미선이 알려주면 그대로 설치. (앤트로픽 공식 스킬인지 깃허브인지 확인 필요)

## ◐ 확인 필요 (있긴 한데 맥북 것과 같은지)

- [ ] **Skill Creator** — 반복 업무 자동화 스킬 제작 도구.
  - 현재: `/skill-create` 명령 + `writing-skills` 스킬은 있음. 맥북에서 쓰던 "Skill Creator"와 같은 것인지 확인.
- [ ] **I'm Not AI (humanizer)** — AI 글을 자연스러운 문체로.
  - 현재: 6/23에 `blader/humanizer` 설치함. 맥북에서 쓰던 "I'm Not AI"가 **이거랑 같은지** 확인(다르면 통일).

## ✅ 이미 있음 (안 깔아도 됨)

- **Playwright MCP** — 브라우저 자동화. `.mcp.json`에 등록·작동 확인.
- **Supabase MCP** — DB 연동. `.mcp.json` 등록 + 6/22 OAuth 인증 완료. (⚠️ 인증은 PC마다 `/mcp`로 한 번씩)
- **Superpowers** — 업무 절차 엔진(brainstorming·writing-plans·executing-plans·subagent-driven-development 등). 6/22 설치, 작동 확인.
- **Marketing Skillkit** — copywriting·cro·ads·emails·pricing·seo-audit 등. 6/22 설치.

## 🔑 기준 — "어디에 저장되느냐" (PC 바뀌면 다시 깔까?)

딱 하나로 갈린다: **그 프로그램이 USB(프로젝트 폴더) 안에 사나, PC(C:) 안에 사나.**

세 가지 동작:
1. **🟢 그냥 따라옴 (USB)** — 다시 안 깔아도 됨.
   - `.mcp.json` = MCP *목록* (Playwright·Supabase·notion·youtube-transcript)
   - `.claude/commands/` = 슬래시 명령 (`/mirror`·`/properly`·`/brainstorm`)
   - business·docs·하루끝-키트 등 모든 사업 파일
2. **🟡 따라오지만 로그인은 다시 (MCP 인증)** — 설치는 한 번, PC마다 `/mcp`로 로그인만.
   - Supabase MCP · notion MCP (OAuth)
3. **🔴 아예 다시 설치 (PC 거라 USB 안 따라감)** — PC마다 따로.
   - 스킬 `~/.claude/skills/` : Superpowers · Marketing Skillkit · humanizer · UI/UX Pro Max · Skill Creator
   - CLI 프로그램(gws) + 열쇠 `~/.config/` + Node.js 등

> 헷갈릴 때: "이건 f:\ 안에 있나, C:\ 안에 있나?" → f:면 따라옴, C:면 다시.
