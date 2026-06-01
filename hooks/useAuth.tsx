'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { UserProfile } from '../types';
import { createClient } from '../lib/supabase/client';

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  loading: boolean;
  users: UserProfile[];
  addUser: (name: string, email: string, role: 'ADMIN' | 'USER') => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (id: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  clearDraftUsers: () => { success: boolean };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);

  const mapProfile = useCallback((profile: any): UserProfile => ({
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as 'ADMIN' | 'USER',
    accountIds: profile.account_ids || [],
    createdAt: profile.created_at,
  }), []);

  const fetchProfileAndSet = useCallback(async (uid: string) => {
    try {
      const supabase = createClient();
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single();

      if (profile && !error) {
        setUser(mapProfile(profile));
      } else {
        // Self-heal: check if user exists in Auth and provision in public.users if missing
        const { data: { user: authUser } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        if (authUser && authUser.id === uid) {
          const emailLower = authUser.email?.toLowerCase() || '';
          const defaultName = authUser.user_metadata?.name || emailLower.split('@')[0] || 'Colaborador';
          const defaultRole = authUser.user_metadata?.role || (emailLower.includes('admin') || emailLower.includes('ricardomelo') ? 'ADMIN' : 'USER');
          
          const defaultProfile = {
            id: uid,
            name: defaultName,
            email: emailLower,
            role: defaultRole,
            account_ids: []
          };

          const { error: insertError } = await supabase
            .from('users')
            .insert(defaultProfile);

          if (!insertError) {
            setUser(mapProfile(defaultProfile));
          } else {
            console.error('Failed to insert self-healing profile', insertError);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    } catch (e) {
      console.error('Failed to fetch profile', e);
      setUser(null);
    }
  }, [mapProfile]);

  const loadUsersList = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

      if (data && !error) {
        setUsers(data.map(mapProfile));
      }
    } catch (err) {
      console.error('Failed to load users list', err);
    }
  }, [mapProfile]);

  // Handle session and Auth change purely from Supabase state
  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    let subscriptionRef: any = null;

    const initAuth = async () => {
      try {
        // 1. Pre-fetch session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (isMounted) {
          if (session?.user) {
            await fetchProfileAndSet(session.user.id);
          } else {
            setUser(null);
          }
          setLoading(false);
        }

        // 2. Setup live auth state change listener
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          if (!isMounted) return;
          
          if (currentSession?.user) {
            await fetchProfileAndSet(currentSession.user.id);
          } else {
            setUser(null);
          }
          setLoading(false);
        });

        subscriptionRef = authListener?.subscription;
      } catch (err) {
        console.error('Auth initialization failed', err);
        if (isMounted) {
          setLoading(false);
        }
      }

      if (isMounted) {
        await loadUsersList();
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      if (subscriptionRef) {
        subscriptionRef.unsubscribe();
      }
    };
  }, [fetchProfileAndSet, loadUsersList]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    const emailLower = email.trim().toLowerCase();

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailLower,
        password,
      });

      if (error) {
        return { success: false, error: 'Credenciais inválidas: ' + error.message };
      }

      if (data?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile && !profileError) {
          setUser(mapProfile(profile));
        } else {
          // Self-heal: create the missing user profile in the users table on-the-fly
          const emailLower = data.user.email?.toLowerCase() || '';
          const defaultName = data.user.user_metadata?.name || emailLower.split('@')[0] || 'Colaborador';
          const defaultRole = data.user.user_metadata?.role || (emailLower.includes('admin') || emailLower.includes('ricardomelo') ? 'ADMIN' : 'USER');
          
          const defaultProfile = {
            id: data.user.id,
            name: defaultName,
            email: emailLower,
            role: defaultRole,
            account_ids: []
          };

          const { error: insertError } = await supabase
            .from('users')
            .insert(defaultProfile);

          if (!insertError) {
            setUser(mapProfile(defaultProfile));
          } else {
            console.error('Failed to self-heal profile on login', insertError);
            return { success: false, error: 'Perfil do usuário não encontrado no banco de dados.' };
          }
        }
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro inesperado no login.' };
    } finally {
      setLoading(false);
    }
  }, [mapProfile]);

  const logout = useCallback(async () => {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Logout error', e);
    }
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  const addUser = useCallback(async (name: string, email: string, role: 'ADMIN' | 'USER') => {
    const supabase = createClient();
    const emailLower = email.trim().toLowerCase();

    try {
      const { error } = await supabase.auth.signUp({
        email: emailLower,
        password: 'Password123!', // default password for onboarding staff
        options: {
          data: {
            name: name.trim(),
            role: role,
            account_ids: []
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      await loadUsersList();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao adicionar usuário.' };
    }
  }, [loadUsersList]);

  const deleteUser = useCallback(async (id: string) => {
    const supabase = createClient();
    if (user && user.id === id) {
      return { success: false, error: 'Não é possível excluir o colaborador que está atualmente conectado.' };
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      setUsers(prev => prev.filter(u => u.id !== id));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao excluir usuário.' };
    }
  }, [user]);

  const resetUserPassword = useCallback(async (id: string) => {
    const supabase = createClient();
    const target = users.find(u => u.id === id);
    if (!target) {
      return { success: false, error: 'Colaborador não encontrado.' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(target.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, message: `E-mail de redefinição de senha disparado para ${target.email}` };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao redefinir senha.' };
    }
  }, [users]);

  const clearDraftUsers = useCallback(() => {
    return { success: true };
  }, []);

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAdmin,
      loading,
      users,
      addUser,
      deleteUser,
      resetUserPassword,
      clearDraftUsers,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
