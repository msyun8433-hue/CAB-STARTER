# CAB 스타터 — 1인 기업 최적화 폴더

> Claude Code 로 내 사업을 시스템으로 만드는 출발 폴더예요.
> 빈 노트북에서 맨땅부터 만들 필요 없이, **이 폴더 하나만 열면 인프라가 이미 갖춰져 있어요.**
> 보안(위험 명령 차단)·토큰 절약·W1 워크북과 슬래시 커맨드가 미리 들어 있어요.
> **4주 내내 이 폴더 하나에서** 작업해요. W2~W4 자료는 매주 단톡으로 받아 이 폴더에 더해요.

---

## 1. 폴더 받기 (셋 중 편한 길)

**A. 가장 쉬운 길 — ZIP 다운로드** (git 몰라도 OK)
1. 단톡의 `cab-starter.zip` (또는 이 페이지 `Code` → `Download ZIP`)
2. 압축을 풀면 `cab-starter` 폴더가 생겨요
3. **열기 전에 폴더 이름부터** 내 사업·브랜드 이름으로 바꾸세요 (예: `미선공방`, `내사업`)
4. **그 폴더를** VS Code 로 열기 (파일 → 폴더 열기) → 이제 이게 내 사업 본부예요

**B. Use this template** (GitHub 계정 있으면)
- 위쪽 `Use this template` 버튼 → 내 깨끗한 사본이 생겨요 (repo 이름을 내 사업 이름으로)

**C. git clone** (명령이 익숙하면)
```bash
git clone https://github.com/[계정]/cab-starter.git 내사업
cd 내사업
```

> **이름을 바꾸는 이유** — cab-starter 는 강의 자료가 아니라 **내 사업 폴더 그 자체**가 돼요. 4주 내내 창·경로에 내 사업 이름이 떠요. (ZIP 은 열기 전에 폴더 이름을 바꿔두면 깔끔해요.)

---

## 2. 처음 한 번 셋업 (5분)

1. **Claude Code 설치 + 로그인** (Claude Max 계정)
   - VS Code 에서 Claude Code 확장 설치 → 로그인
2. **이 폴더를 VS Code 로 열기** → Claude Code 실행
3. **첫 명령으로 확인** — Claude Code 채팅창에 한 줄:
   ```
   안녕? 이 폴더 구조 한 번 설명해줘
   ```
   답이 오면 셋업 성공이에요.

> 💡 이 폴더엔 **아직 CLAUDE.md(내 사업 매뉴얼)가 없어요. 정상이에요** — W1 에서 인터뷰로 사업 파일을 채운 뒤 `/init` 이 만들어줘요. 완성 꼴이 궁금하면 `CLAUDE.md.예시` 를 열어보세요.

> ⚠️ 비밀번호·API 키는 절대 폴더에 직접 적지 마세요. `.env.example` 을 복사해 `.env` 로 만들어 거기에만 넣어요. `.env` 는 깃에 올라가지 않게 막혀 있어요.

---

## 3. 4주 흐름 (매주 워크북 한 장)

매주 `workbook/` 안의 그 주 워크북을 열고 위에서부터 따라가요. **W1 은 폴더에 이미 있고**, W2~W4 는 그 주에 단톡으로 받아 (`넣는법.md` 참고) 이 폴더에 더해요.

| 주차 | 워크북 / 명령 | 끝나면 손에 남는 것 | 받는 법 |
|---|---|---|---|
| W1 | `workbook/W1.md` → `/cab-interview` → `/init` | business/ 사업 파일 + CLAUDE.md + 8부서 지도 + 자동화 후보 1개 | 폴더에 있음 |
| W2 | `workbook/W2.md` → `/cab-w2-tools` | 실제로 도는 자동화 1개 | 단톡 `W2 자료` |
| W3 | `workbook/W3.md` → `/cab-w3-meeting` | 랜딩 1개 또는 에이전트 1개 | 단톡 `W3 자료` |
| W4 | `workbook/W4.md` → `/cab-w4-validate` | 운영 OS + 다음 12주 계획 + 졸업 | 단톡 `W4 자료` |

---

## 4. 폴더 안내

```
(CLAUDE.md)        ← 처음엔 없음. W1 에서 /init 이 생성 · AI가 매번 이걸 보고 일함
CLAUDE.md.예시     ← 완성된 매뉴얼 꼴 참고용 (Claude 는 안 읽음)
workbook/          ← 매주 따라가는 워크북 (W1 있음 · W2~W4 매주 추가)
  W1.md            ← 이번 주 한 장 (이름바꾸기 → /cab-interview → /init → 점검)
.claude/           ← Claude Code 가 뒤져서 기능으로 켜는 폴더만
  settings.json    ← 보안 자물쇠 + 어떤 기능 쓸지 (훅도 여기 설정 · 손대지 않아도 됨)
  commands/        ← 슬래시 커맨드 · 반복 절차 묶기 (지금 cab-interview · W2~W4 매주 추가)
  agents/          ← 전문 인턴 = Agent (W2부터 · 지금은 비어 있음)
  skills/          ← 묶어둔 반복 절차 = Skill (필요할 때 · 슬래시/자연어로 호출)
  rules/           ← 특정 상황에만 로드되는 규칙 (필요할 때)
business/          ← 내 사업 두뇌 (사명·고객·8부서·도구·회고) · /init 의 재료
content/           ← 콘텐츠 작업방 (5채널)
docs/              ← 문서 자동화 결과 (견적·계획서)
automations/       ← 내가 만든 자동화 (폴더마다 7구성 CLAUDE.md)
  _예시-콘텐츠-자동화/ ← 복사해서 쓰는 템플릿
```

> **폴더엔 두 종류가 있어요.** `.claude/` 안 4칸(commands·agents·skills·rules)은 Claude Code 가 **뒤져서 기능으로 켜는** 폴더예요. `business·content·docs·automations` 는 그냥 **내 자료·결과물을 두는 서랍**이고요.
> **그리고 모든 게 폴더는 아니에요** — 아래 "용어 한 장" 참고.

---

## 5. 헷갈리는 용어 한 장 (정확히)

> 영상·블로그마다 말이 달라서 헷갈려요. Claude Code 실제 구조 기준으로 정리하면:

| 용어 | 정확히 뭐냐 | 어디에 / 어떻게 |
|---|---|---|
| **CLAUDE.md** | 내 사업 매뉴얼 (매 세션 자동 로드) | 루트 (`/init` 이 생성) |
| **Workflow** | 일이 굴러가는 *방식* — CLAUDE.md + Skills + Hooks 가 정의 · **슬래시든 그냥 말이든** 트리거 | 폴더 한 칸이 아님 (여러 조각이 합쳐진 흐름) |
| **Skill** | 묶어둔 반복 절차 (슬래시 `/이름` 또는 자연어로 호출) | `.claude/skills/` (`commands/` 는 옛 이름 · 하위호환) |
| **Agent** | 분야 하나 맡는 전문 인턴 | `.claude/agents/` |
| **Hook** | "~할 때마다" 자동 실행 | `settings.json` 에 설정 (**폴더 아님**) |
| **Tool** | Claude 가 **쥐고 쓰는** 도구 — 내장(Read·Write·**Bash**·Grep…) + MCP 외부 도구 | 내장 or `.mcp.json` (**폴더 아님 · 내가 만드는 게 아니라 쥠**) |
| **MCP** | 노션·슬랙 같은 외부 서비스를 도구로 연결 | `.mcp.json` |
| **파이썬 자동화** | 내가 만든 결정론 코드 (예: `정리.py`) | `automations/` **서랍** · Claude 가 **Bash(=Tool)로 실행** |

> 헷갈림 1순위 — **"Tool 을 파이썬으로 만든다"?** 아니에요. 파이썬은 *내 자동화 자산*이고, Claude 는 그걸 **Bash 라는 내장 Tool 로 돌려요**(`python 정리.py`). Tool 자체(내장·MCP)는 이미 쥐고 있어요.
> 헷갈림 2순위 — **"Workflow = 슬래시 명령"?** 너무 좁혀요. 슬래시는 트리거 *방법 하나*일 뿐, Workflow 는 CLAUDE.md·Skills·Hooks 가 합쳐 만드는 *흐름*이에요.

막히면 단톡방에 그대로 물어보세요. 혼자 끙끙대지 말고요.
