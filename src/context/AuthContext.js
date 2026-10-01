import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { authService } from '../services/authService';
import { migrationService } from '../services/migrationService';
import { localStorage } from '../storage/localStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize and restore session on app start
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        if (isSupabaseConfigured()) {
          const { data: { session: initialSession } } = await supabase.auth.getSession();
          if (mounted) {
            setSession(initialSession);
            setUser(initialSession?.user || null);

            if (initialSession?.user) {
              const userProfile = await authService.getProfile(initialSession.user.id);
              if (mounted) setProfile(userProfile);

              // Run one-time local data migration if needed
              migrationService.migrateLocalDataToSupabase(initialSession.user).catch((e) => {
                console.warn('[AuthProvider] Background migration error:', e);
              });
            }
          }
        } else {
          // If Supabase not yet configured, check cached profile for offline demo mode
          const cachedProfile = await localStorage.getCachedProfile();
          if (mounted && cachedProfile) {
            setProfile(cachedProfile);
          }
        }
      } catch (err) {
        console.warn('[AuthProvider] Session initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    // Listen to Supabase auth events
    let subscription = null;
    if (isSupabaseConfigured()) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (!mounted) return;
        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (event === 'SIGNED_IN' && currentSession?.user) {
          const userProfile = await authService.getProfile(currentSession.user.id);
          if (mounted) setProfile(userProfile);

          // Trigger local data migration
          migrationService.migrateLocalDataToSupabase(currentSession.user).catch((e) => {
            console.warn('[AuthProvider] Migration trigger error:', e);
          });
        } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            setProfile(null);
          }
        }
      });
      subscription = authListener?.subscription;
    }

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const result = await authService.signIn({ email, password });
    if (result.user) {
      setUser(result.user);
      setSession(result.session);
      const userProfile = await authService.getProfile(result.user.id);
      setProfile(userProfile);
    }
    return result;
  }, []);

  const signUp = useCallback(async ({ email, password, fullName, phone }) => {
    const result = await authService.signUp({ email, password, fullName, phone });
    if (result.user) {
      setUser(result.user);
      setSession(result.session);
    }
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data: { session: freshSession } } = await supabase.auth.refreshSession();
      setSession(freshSession);
      setUser(freshSession?.user || null);
    } catch (err) {
      console.warn('[AuthProvider] refreshSession error:', err);
    }
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    if (!user) return { error: 'Not authenticated' };
    const result = await authService.updateProfile(user.id, profileData);
    if (result.profile) {
      setProfile(result.profile);
    }
    return result;
  }, [user]);

  const value = {
    user,
    session,
    profile,
    loading,
    isAuthenticated: Boolean(user),
    signIn,
    signUp,
    signOut,
    refreshSession,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
