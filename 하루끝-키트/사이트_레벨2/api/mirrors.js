import { createClient } from '@supabase/supabase-js';

export default async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check Authorization header (optional - for future enhancement)
    var authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      // In production, verify JWT token here
      // For now, just check that it exists
    }
    // Initialize Supabase
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    // Query mirrors joined with the session (for sender name/contact)
    const { data, error } = await supabase
      .from('mirrors')
      .select(`
        id,
        session_id,
        mirror_text,
        created_at,
        sessions(user_name, user_contact, sensations, one_word)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw new Error('Database query failed: ' + error.message);
    }

    // Return mirrors data with sender info flattened
    const mirrors = (data || []).map(mirror => {
      const s = mirror.sessions || {};
      return {
        id: mirror.id,
        session_id: mirror.session_id,
        mirror_text: mirror.mirror_text,
        created_at: mirror.created_at,
        user_name: s.user_name,
        user_contact: s.user_contact,
        sensations: s.sensations,
        one_word: s.one_word
      };
    });

    return res.status(200).json({
      success: true,
      data: mirrors,
      count: mirrors.length
    });
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || '요청 처리 중 오류가 발생했습니다.'
    });
  }
};
