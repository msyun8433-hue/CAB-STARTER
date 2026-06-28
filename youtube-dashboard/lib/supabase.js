// Supabase 클라이언트. 키는 서버에서만 쓰며 브라우저로 내보내지 않는다.
import { createClient } from '@supabase/supabase-js';

export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_KEY 환경변수가 없습니다');
  return createClient(url, key, { auth: { persistSession: false } });
}
