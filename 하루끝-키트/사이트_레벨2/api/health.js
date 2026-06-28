module.exports = async (req, res) => {
  return res.json({
    status: 'ok',
    env: {
      GOOGLE_GEMINI_API_KEY: !!process.env.GOOGLE_GEMINI_API_KEY,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_KEY: !!process.env.SUPABASE_KEY,
    },
    node_version: process.version,
  });
};
