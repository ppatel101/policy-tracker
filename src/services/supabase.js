import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Read public environment variables provided by Expo
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder-policy-tracker.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = () => {
  return (
    process.env.EXPO_PUBLIC_SUPABASE_URL &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('placeholder')
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Formats Supabase and PostgreSQL errors into user-friendly messages
 * Handles PGRST205 (missing table), RLS violations, network failures, etc.
 * @param {Error|object} error
 * @param {string} fallbackMessage
 * @returns {string}
 */
export function formatSupabaseError(error, fallbackMessage = 'An unexpected error occurred') {
  if (!error) return fallbackMessage;

  const code = error.code || '';
  const message = error.message || '';

  // PGRST205: table not found in schema cache
  if (code === 'PGRST205' || message.includes("Could not find the table 'public.policies'") || message.includes('relation "public.policies" does not exist')) {
    return 'Database setup required: "public.policies" table not found. Please run the migration script in Supabase SQL editor.';
  }

  if (message.includes("Could not find the table 'public.payments'")) {
    return 'Database setup required: "public.payments" table not found. Please run the migration script in Supabase SQL editor.';
  }

  // Network errors
  if (message.includes('Network request failed') || message.includes('Failed to fetch') || code === 'ENOTFOUND') {
    return 'Internet connection unavailable. Operating in offline mode.';
  }

  // Auth specific
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  if (message.includes('User already registered')) {
    return 'An account with this email already exists.';
  }
  if (message.includes('Password should be at least')) {
    return 'Password must be at least 6 characters.';
  }

  // RLS or permission denied
  if (code === '42501' || message.includes('row-level security')) {
    return 'Permission denied by security policy. You can only access your own data.';
  }

  return message || fallbackMessage;
}
