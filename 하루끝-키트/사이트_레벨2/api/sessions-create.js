import { createClient } from '@supabase/supabase-js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    // Validate stateName
    if (!body.stateName || !body.stateName.trim()) {
      return res.status(400).json({ error: 'stateName is required and must not be empty' });
    }

    // Validate materialsText
    if (!body.materialsText) {
      return res.status(400).json({ error: 'materialsText is required' });
    }

    const materialsTextTrimmed = body.materialsText.trim();
    if (!materialsTextTrimmed || materialsTextTrimmed.length < 10) {
      return res.status(400).json({ error: 'materialsText must be at least 10 characters' });
    }

    // Trim inputs
    const stateNameTrimmed = body.stateName.trim();

    // Create session in Supabase
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    const { data, error } = await supabase
      .from('sessions_queue')
      .insert([
        {
          state_name: stateNameTrimmed,
          materials_text: materialsTextTrimmed,
          status: 'created',
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to create session');
    }

    return res.status(201).json({
      success: true,
      sessionId: data.id,
      message: 'Session created successfully',
    });

  } catch (error) {
    console.error('Error creating session:', error.message);
    return res.status(500).json({
      error: error.message || 'Failed to create session',
    });
  }
}

export default handler;
