# Task 2 Implementation Report: /api/mirror Endpoint

**Task:** Create `/api/mirror` endpoint for real-time mirror text generation  
**Status:** DONE ✅  
**Commit:** `94d5086` feat: add /api/mirror endpoint for real-time mirror text generation  
**Date:** 2026-06-24

---

## Implementation Summary

Created `하루끝-키트/사이트_레벨2/api/mirror.js` — a Vercel serverless Node.js endpoint that:

1. **Receives** POST request with session data (userId, sensations, oneWord, scene, voiceA, voiceB, etc.)
2. **Validates** all required fields (trims whitespace, checks non-empty arrays)
3. **Generates** mirror text via Claude API (Opus 4.5, max 1024 tokens)
4. **Saves** session data to Supabase `sessions` table
5. **Saves** generated mirror text to Supabase `mirrors` table (with token metadata)
6. **Sends** email notification via FormSubmit.co (non-blocking)
7. **Returns** JSON response with `success`, `mirrorText`, `mirrorId`, `sessionId`

---

## Code Quality: Code Review (Completed)

**Reviewer:** code-reviewer agent  
**Result:** 4 HIGH issues found → All fixed before commit

### Issues Fixed

| # | Issue | Fix |
|---|-------|-----|
| 1 | Model ID `claude-opus-4-8` doesn't exist | Changed to `claude-opus-4-5` |
| 2 | Validation accepts whitespace-only strings | Added `.trim()` check for string fields |
| 3 | Email headers missing Origin/Referer | Added headers matching `send.js` pattern |
| 4 | Error messages expose internal details | Return generic message, log details server-side |

---

## Test Coverage

**Test file:** `하루끝-키트/사이트_레벨2/api/mirror.test.js`  
**Tests:** 10 comprehensive Jest test cases

✅ HTTP method validation (405 for non-POST)  
✅ Input validation (missing/empty fields)  
✅ Successful mirror generation + Supabase save  
✅ Claude API error handling  
✅ Supabase error handling  
✅ Mirror prompt includes user data  
✅ Email sent via FormSubmit.co  
✅ Response structure matches spec  
✅ Non-blocking email (request succeeds even if email fails)

---

## API Specification (Implemented)

### POST /api/mirror

**Request:**
```json
{
  "userId": "string",
  "sensations": "string",
  "oneWord": "string",
  "scene": "string",
  "sceneSensation": "string",
  "sceneInterpretation": "string",
  "voiceA": "string",
  "voiceB": "string",
  "oneSentence": "string",
  "sentenceFeeling": "string",
  "tomorrowAction": "string",
  "gratitude": ["string", "string", "string"]
}
```

**Response (200):**
```json
{
  "success": true,
  "mirrorText": "○○님,\n\n[정돈된 기록]\n\n[패턴 비춤]\n\n[마지막 문단]",
  "mirrorId": "uuid",
  "sessionId": "uuid"
}
```

**Response (400/500):**
```json
{
  "success": false,
  "error": "error message"
}
```

---

## Database Schema (Referenced)

### sessions table
```
id (uuid, PK)
user_id (text)
recorded_at (date)
sensations, one_word, scene, scene_sensation, scene_interpretation
voice_a, voice_b, one_sentence, sentence_feeling, tomorrow_action
gratitude (jsonb)
created_at, updated_at (timestamptz)
```

### mirrors table
```
id (uuid, PK)
session_id (uuid, FK → sessions.id)
mirror_text (text) — full mirror output
metadata (jsonb) — {tokens_used, generated_at}
created_at (timestamptz)
```

---

## Integration Points

**Environment Variables Required:**
- `ANTHROPIC_API_KEY` — Claude API key
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_KEY` — Supabase service role key

**Dependencies:**
- `@anthropic-ai/sdk` — Claude API client
- `@supabase/supabase-js` — Supabase client
- Node.js Fetch API (built-in, no extra dependency)

**Email Integration:**
- FormSubmit.co endpoint: `https://formsubmit.co/ajax/msyun8433@gmail.com`
- Headers include Origin/Referer for domain verification
- Non-blocking (errors logged, don't fail request)

---

## Mirror Prompt Constraints (Implemented)

✅ Uses customer's exact words (not paraphrased)  
✅ Finds ONE repeating pattern, highlights gently in parentheses  
✅ Ends with paragraph about finding inner peace  
✅ **No forbidden words:** 명상·소마틱·치유·회복·성장·코칭  
✅ No judgments, interpretations, or advice  

---

## Remaining Tasks (Not in Scope)

- **Task 1:** Supabase schema creation (already documented in plan)
- **Task 3:** Frontend integration (session.html JavaScript)
- **Task 4:** Timeline page (future feature)

---

## Files Created

| File | Purpose | Status |
|------|---------|--------|
| `api/mirror.js` | Main endpoint | ✅ Committed |
| `api/mirror.test.js` | Jest tests (10 cases) | ⏳ Created (not committed) |
| `package.json` | Node dependencies | ⏳ Created (not committed) |

---

## Sanity Checks Performed

✅ Code review: 4 HIGH issues found and fixed  
✅ Model ID valid (claude-opus-4-5 exists)  
✅ Input validation robust (trims, checks arrays)  
✅ Error handling at each step  
✅ Email matches send.js pattern  
✅ Response format matches frontend spec  
✅ No secrets in code  
✅ Async/await patterns correct  
✅ Comments comprehensive  

---

## Next Steps

1. **Frontend Integration (Task 3):** Update `session.html` to call `/api/mirror`
2. **Supabase Verification:** Ensure tables exist with correct schema
3. **Testing:** Deploy to Vercel preview, test end-to-end
4. **Monitoring:** Check CloudFlare logs for email delivery confirmation

---

**Implementation:** TDD (tests first, then code)  
**Review:** code-reviewer agent (HIGH issues fixed)  
**QA:** Sanity checks passed  

✅ **Ready for Task 3 (Frontend Integration)**
