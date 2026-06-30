# 거울글 이메일 발송 켜기 — Gmail 앱 비밀번호 (윤미선 1회 작업)

> 코드는 이미 다 돼 있어요. **Vercel에 환경변수 6개만 넣으면** 보낸 사람에게 거울글이 메일로 갑니다.
> 비밀번호(앱 비밀번호)는 비밀이라 AI가 대신 못 넣어요 — 아래대로 한 번만 직접 하면 끝.

---

## 1단계 — 구글 앱 비밀번호 받기 (5분)

> 앱 비밀번호 = "이 프로그램만 쓰는 16자리 전용 비밀번호". 진짜 비밀번호는 안 알려줘서 안전해요.

1. **2단계 인증부터 켜기** (안 켜져 있으면 앱 비밀번호 메뉴가 안 보여요)
   - https://myaccount.google.com/security → "2단계 인증" 켜기
2. **앱 비밀번호 만들기**
   - https://myaccount.google.com/apppasswords 접속
   - 앱 이름에 **이어** 입력 → "만들기"
   - 화면에 뜨는 **16자리**(예: `abcd efgh ijkl mnop`)를 복사. **공백은 빼고** 붙여요 → `abcdefghijklmnop`
   - ⚠️ 이 16자리는 그 창을 닫으면 다시 못 봐요. 못 옮겼으면 지우고 새로 만들면 됩니다.

---

## 2단계 — Vercel에 환경변수 6개 넣기 (5분)

1. https://vercel.com → **harukkeut-site** 프로젝트 클릭
2. 위 탭 **Settings → Environment Variables**
3. 아래 6개를 하나씩 추가 (Key / Value 넣고, Environment는 **Production** 체크 후 Save):

| Key | Value |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | `msyun8433@gmail.com` |
| `SMTP_PASS` | (1단계의 16자리, 공백 뺀 것) |
| `SMTP_FROM` | `msyun8433@gmail.com` |

> `SMTP_PASS`만 비밀, 나머지 5개는 위 값 그대로 복사하면 돼요.

---

## 3단계 — 다시 배포하기 (1분)

환경변수는 **다시 배포해야** 적용돼요.
- Vercel → **Deployments** 탭 → 맨 위 최신 줄 오른쪽 **⋯ → Redeploy** → Redeploy.
- (또는 AI에게 "사이트 재배포해줘" 하면 `vercel --prod`로 올려요)

---

## 4단계 — 확인

- 사이트에서 **연락처 칸에 이메일을 넣고** 보내기 → 그 주소로 거울글 메일이 도착하면 성공.
- 안 오면: 스팸함 확인 → 그래도 없으면 Vercel → 그 배포 → **Logs**에서 `Email send error` 줄을 AI에게 보여주세요. (대개 16자리 오타·공백, 2단계 인증 미설정 둘 중 하나)

---

### 참고 (AI/개발용)
- 메일 코드: `api/mirror.js` 의 nodemailer 부분 (130~162줄). 일반 SMTP라 위 6개만 맞으면 작동.
- 연락처 칸이 비어 있으면 메일은 건너뛰고 거울글만 화면에 표시·DB 저장됨 (정상).
- Gmail 무료 발송 한도 ≈ 하루 500통. 베타엔 충분.
