import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    // Validate input
    const requiredFields = ['userId', 'sensations', 'oneWord', 'scene', 'sceneSensation', 'sceneInterpretation', 'voiceA', 'voiceB', 'oneSentence', 'sentenceFeeling', 'tomorrowAction', 'gratitude'];

    for (const field of requiredFields) {
      if (!body[field] || (typeof body[field] === 'string' && !body[field].trim())) {
        return res.status(400).json({ success: false, error: `Missing: ${field}` });
      }
    }

    // Generate mirror prompt
    const prompt = `당신은 거울입니다. 고객이 쓴 기록을 정렬하고 비춰주는 것이 전부입니다.

[입력된 기록]
- 감각: ${body.sensations}
- 한 단어: ${body.oneWord}
- 장면: ${body.scene}
- 그때 감각: ${body.sceneSensation}
- 내 해석: ${body.sceneInterpretation}
- 목소리 A: ${body.voiceA}
- 목소리 B: ${body.voiceB}
- 오늘의 한 문장: ${body.oneSentence}
- 문장 읽을 때: ${body.sentenceFeeling}
- 내일 행동: ${body.tomorrowAction}
- 감사: ${Array.isArray(body.gratitude) ? body.gratitude.join(', ') : body.gratitude}

[규칙]
1. 고객의 단어를 그대로 사용하되, 문단처럼 자연스럽게 정렬
2. 반복되는 패턴 1가지를 짚고, 괄호로 의미를 기울임체로 표현 (단 한 번만)
3. 마지막 문단에서 "평온함을 찾게 하는" 내용 추가 (판단/조언/해석 없음)
4. 금지: 명상, 소마틱, 치유, 회복, 성장, 코칭, 이모지, 동기부여
5. 출력: ○○님, [정돈된 기록] [패턴 비춤] [마지막 문단] — 이어`;

    // Call Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 1024,
      },
    });

    const mirrorText = result.response.text();

    if (!mirrorText || !mirrorText.trim()) {
      throw new Error('Empty response from Claude');
    }

    // Save to Supabase (optional)
    const today = new Date().toISOString().split('T')[0];
    const sessionId = `session-${Date.now()}`;
    const mirrorId = `mirror-${Date.now()}`;

    // Try to save (non-blocking)
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

      supabase
        .from('sessions')
        .insert([{
          user_id: body.userId,
          recorded_at: today,
          sensations: body.sensations,
          one_word: body.oneWord,
          scene: body.scene,
          scene_sensation: body.sceneSensation,
          scene_interpretation: body.sceneInterpretation,
          voice_a: body.voiceA,
          voice_b: body.voiceB,
          one_sentence: body.oneSentence,
          sentence_feeling: body.sentenceFeeling,
          tomorrow_action: body.tomorrowAction,
          gratitude: Array.isArray(body.gratitude) ? body.gratitude : [body.gratitude],
        }])
        .catch(e => console.error('Supabase save error:', e));
    }

    return res.status(200).json({
      success: true,
      mirrorText,
      mirrorId,
      sessionId,
    });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || '요청 처리 중 오류가 발생했습니다.',
    });
  }
};
