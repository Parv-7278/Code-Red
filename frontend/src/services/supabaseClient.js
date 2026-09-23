import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project'))
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => !!supabase;

export async function getAccessToken() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('[Supabase] Could not read active session:', error.message);
    return null;
  }
  return data.session?.access_token || null;
}

/**
 * Fetch a user profile by user UUID
 */
export async function getUserProfile(userId) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('[Supabase] Error fetching user profile:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[Supabase] Exception fetching profile:', err);
    return null;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email, password) {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Sign up with email, password, and create user profile
 */
export async function signUpWithEmail(email, password, fullName, role, stationId = null) {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
        station_id: stationId,
      }
    }
  });
  if (error) throw error;

  if (data?.user) {
    // Attempt to upsert user_profile
    await supabase.from('user_profiles').upsert([
      {
        id: data.user.id,
        full_name: fullName,
        role: role,
        station_id: stationId,
      }
    ]);
  }

  return data;
}

/**
 * Sign out current user
 */
export async function signOutUser() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) console.error('[Supabase] Sign out error:', error.message);
}
