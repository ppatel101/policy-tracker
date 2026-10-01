import { supabase, formatSupabaseError, isSupabaseConfigured } from './supabase';
import { localStorage } from '../storage/localStorage';
import { mapRowToProfile, mapProfileToRow } from '../models/user';

export const authService = {
  /**
   * Register a new user with email and password
   */
  async signUp({ email, password, fullName, phone }) {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured. Please add your credentials to .env.');
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName ? fullName.trim() : '',
            phone: phone ? phone.trim() : '',
          },
        },
      });

      if (error) throw error;

      // If user created, ensure profile exists (in case trigger is delayed or not set)
      if (data?.user) {
        try {
          const profileData = {
            id: data.user.id,
            full_name: fullName ? fullName.trim() : '',
            email: data.user.email,
            phone: phone ? phone.trim() : null,
          };
          await supabase.from('profiles').upsert(profileData);
          await localStorage.setCachedProfile(mapRowToProfile(profileData));
        } catch (profileErr) {
          console.warn('[authService] Profile auto-upsert warning:', profileErr);
        }
      }

      return { user: data.user, session: data.session, error: null };
    } catch (err) {
      console.error('[authService] signUp error:', err);
      return { user: null, session: null, error: formatSupabaseError(err, 'Sign up failed. Please try again.') };
    }
  },

  /**
   * Sign in with email and password
   */
  async signIn({ email, password }) {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured. Please add your credentials to .env.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      // Fetch and cache profile
      if (data?.user) {
        try {
          const profile = await this.getProfile(data.user.id);
          if (profile) {
            await localStorage.setCachedProfile(profile);
          }
        } catch (profileErr) {
          console.warn('[authService] Could not cache profile on login:', profileErr);
        }
      }

      return { user: data.user, session: data.session, error: null };
    } catch (err) {
      console.error('[authService] signIn error:', err);
      return { user: null, session: null, error: formatSupabaseError(err, 'Sign in failed. Please try again.') };
    }
  },

  /**
   * Sign out and clear local cache
   */
  async signOut() {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('[authService] Supabase signOut error (clearing local regardless):', err);
    } finally {
      await localStorage.clearUserCache();
    }
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    try {
      if (!isSupabaseConfigured()) return null;
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;
      return user;
    } catch (err) {
      console.warn('[authService] getCurrentUser error:', err);
      return null;
    }
  },

  /**
   * Get current active session
   */
  async getSession() {
    try {
      if (!isSupabaseConfigured()) return null;
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) return null;
      return session;
    } catch (err) {
      console.warn('[authService] getSession error:', err);
      return null;
    }
  },

  /**
   * Send password reset email
   */
  async resetPassword(email) {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured.');
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: formatSupabaseError(err, 'Failed to send password reset email.') };
    }
  },

  /**
   * Update user's password (when authenticated or via recovery token)
   */
  async updatePassword(newPassword) {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured.');
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: formatSupabaseError(err, 'Failed to update password.') };
    }
  },

  /**
   * Get user profile from Supabase or local cache
   */
  async getProfile(userId) {
    if (!userId) return null;
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!error && data) {
          const profile = mapRowToProfile(data);
          await localStorage.setCachedProfile(profile);
          return profile;
        }
      }
    } catch (err) {
      console.warn('[authService] Error fetching profile from Supabase:', err);
    }

    // Fallback to local storage
    return localStorage.getCachedProfile();
  },

  /**
   * Update user profile
   */
  async updateProfile(userId, profileData) {
    try {
      const row = mapProfileToRow(profileData);
      row.id = userId;

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('profiles')
          .upsert(row)
          .select()
          .single();

        if (error) throw error;
        const updated = mapRowToProfile(data);
        await localStorage.setCachedProfile(updated);
        return { profile: updated, error: null };
      }

      // Offline fallback
      await localStorage.setCachedProfile({ id: userId, ...profileData });
      return { profile: { id: userId, ...profileData }, error: null };
    } catch (err) {
      return { profile: null, error: formatSupabaseError(err, 'Failed to update profile.') };
    }
  },

  /**
   * Delete account: removes profile data and signs out
   */
  async deleteAccount(userId) {
    try {
      if (isSupabaseConfigured() && userId) {
        // Delete user's profile which cascades to policies & payments in DB
        await supabase.from('profiles').delete().eq('id', userId);
        await supabase.auth.signOut();
      }
      await localStorage.clearUserCache();
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: formatSupabaseError(err, 'Failed to delete account.') };
    }
  },
};
