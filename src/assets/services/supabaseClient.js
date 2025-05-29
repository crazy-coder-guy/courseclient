import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function fetchCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, description, thumbnail, created_at,description','duration_hours');
  if (error) throw error;
  return data;
}