# 맥북 → 회사 PC : gws 열쇠 가져오기 안내

> **🔑 맥북이 줘야 할 것 = 2가지:** ①열쇠 파일 `~/.config/gws/`(= `client_secret.json` 구글 OAuth 열쇠 + `token.json` 로그인 토큰) ②설치 방법(brew/npm 등). 이 둘만 USB로 넘기면 됨.
>
> **왜 있나:** 회사 PC엔 gws(구글 워크스페이스 연결 도구)가 안 깔려 있고, 열쇠 파일도 없다.
> 열쇠는 비밀이라 일부러 USB에 안 넣었기 때문(맥북 안에만 있음). 그래서 맥북에서 직접 가져와야 한다.
> **쓰는 법:** 맥북 켜서 Claude에게 "이어가기 읽고 gws 열쇠 가져와줘" 라고 하면, 아래 〔맥북에서 할 일〕을 실행한다.
> 회사 PC로 옮긴 뒤엔 〔회사 PC에서 할 일〕을 한다.

---

## 〔맥북에서 할 일〕 (맥북 Claude가 실행)

### 1. gws 설치 정보 캐기 (회사 PC에서 똑같이 깔 수 있게)
```bash
echo "=== gws 위치 ==="; which gws
echo "=== 어떻게 깔았나 ==="; brew list 2>/dev/null | grep -i gws; npm ls -g 2>/dev/null | grep -i gws; pipx list 2>/dev/null | grep -i gws
echo "=== 버전 ==="; gws --version 2>&1 | head -3
echo "=== 열쇠 폴더 내용 ==="; ls -la ~/.config/gws/
```
→ 결과를 **아래 〔맥북이 적어둘 칸〕에 기록**한다. (특히 "어떻게 설치했는지" — brew인지 npm인지 직접 빌드인지)

### 2. 열쇠 + 토큰을 USB로 복사
USB가 마운트된 위치를 먼저 확인한다 (보통 `/Volumes/...`). 이 사업 폴더가 들어 있는 USB의 **최상단**에 임시 폴더를 만들어 복사한다.
```bash
# 예시 — USB 이름은 실제 것으로 바꾼다 (ls /Volumes 로 확인)
USB="/Volumes/USB이름"
mkdir -p "$USB/_gws_transfer"
cp -R ~/.config/gws/. "$USB/_gws_transfer/"
ls -la "$USB/_gws_transfer/"
```
> ⚠️ 이 폴더엔 **비밀(열쇠·토큰)** 이 들어 있다. 회사 PC로 옮긴 직후 USB에서 지운다(아래 회사 PC 4번).

### 3. (gws 프로그램 자체가 brew/npm 같은 표준 설치가 아니면)
설치 본체가 특정 폴더에 있는 커스텀이면, 그 폴더나 설치 스크립트도 `$USB/_gws_transfer/program/` 에 같이 복사하고 아래 칸에 적는다.

---

## 〔회사 PC에서 할 일〕 (회사 PC Claude가 실행)

```bash
# 1. 열쇠 폴더 복원
mkdir -p ~/.config/gws
cp -R "/f/이어(CAB-STARTER)/../_gws_transfer/." ~/.config/gws/    # 경로는 실제 USB 드라이브에 맞게(_gws_transfer는 USB 최상단)
ls -la ~/.config/gws/

# 2. gws 프로그램 설치 — 맥북이 아래 칸에 적어둔 방법 그대로

# 3. 동작 확인
gws --version
gws gmail +triage      # 안읽음 요약 떠야 정상

# 4. 비밀 지우기 (USB에 열쇠 남기지 않기)
rm -rf "<USB 최상단>/_gws_transfer"
```

---

## 〔맥북이 적어둘 칸〕 (맥북 세션에서 채운다)

- gws 위치(which): <!-- 여기 -->
- 설치 방법: <!-- brew? npm? 직접 빌드? 명령 그대로 -->
- 버전: <!-- -->
- ~/.config/gws/ 안 파일들: <!-- client_secret.json / token.json 등 -->
- USB로 복사한 것: <!-- -->
- 특이사항: <!-- -->
