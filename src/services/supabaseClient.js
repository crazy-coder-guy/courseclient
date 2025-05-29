import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Not set');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Not set');
  throw new Error('Missing Supabase environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function fetchCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('id, course_name, description, thumbnail, created_at, price, offer_discount, offer_start, offer_end, discount_price');
  if (error) throw error;
  return data;
}