import { createClient } from '@supabase/supabase-js';

export default async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    // Get all sessions with mirror status
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        id,
        user_id,
        user_name,
        user_contact,
        recorded_at,
        sensations,
        one_word,
        scene,
        scene_sensation,
        scene_interpretation,
        voice_a,
        voice_b,
        one_sentence,
        sentence_feeling,
        tomorrow_action,
        gratitude,
        mirrors(id, mirror_text)
      `)
      .order('recorded_at', { ascending: false })
      .limit(200);

    if (error) {
      throw new Error('Database query failed: ' + error.message);
    }

    // Transform data for frontend
    const sessions = (data || []).map(session => {
      const hasMirror = session.mirrors && session.mirrors.length > 0;
      const mirrorText = hasMirror ? session.mirrors[0].mirror_text : null;

      return {
        id: session.id,
        user_id: session.user_id,
        user_name: session.user_name,
        user_contact: session.user_contact,
        recorded_at: session.recorded_at,
        sensations: session.sensations,
        one_word: session.one_word,
        scene: session.scene,
        has_mirror: hasMirror,
        mirror_text: mirrorText
      };
    });

    return res.status(200).json({
      success: true,
      data: sessions,
      count: sessions.length
    });
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || '요청 처리 중 오류가 발생했습니다.'
    });
  }
};
